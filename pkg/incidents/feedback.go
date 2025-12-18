// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// FeedbackType defines the type of user feedback
type FeedbackType string

const (
	FeedbackResolved        FeedbackType = "resolved"
	FeedbackRootCauseConfirm FeedbackType = "root_cause_confirmed"
	FeedbackFixWorked       FeedbackType = "fix_worked"
	FeedbackFixFailed       FeedbackType = "fix_failed"
	FeedbackNote            FeedbackType = "note"
	FeedbackCustomRunbook   FeedbackType = "custom_runbook"
	FeedbackDismiss         FeedbackType = "dismiss"
	FeedbackEscalate        FeedbackType = "escalate"
)

// FeedbackRequest represents a user feedback submission
type FeedbackRequest struct {
	IncidentID string       `json:"incidentId"`
	FixID      string       `json:"fixId,omitempty"`
	Type       FeedbackType `json:"type"`
	Content    string       `json:"content,omitempty"`
	RootCause  string       `json:"rootCause,omitempty"`
	Tags       []string     `json:"tags,omitempty"`
}

// FeedbackResponse is the response after submitting feedback
type FeedbackResponse struct {
	ID         string       `json:"id"`
	IncidentID string       `json:"incidentId"`
	Type       FeedbackType `json:"type"`
	CreatedAt  time.Time    `json:"createdAt"`
	Message    string       `json:"message"`
}

// IncidentResolution represents a resolution for an incident
type IncidentResolution struct {
	IncidentID     string    `json:"incidentId"`
	ResolvedBy     string    `json:"resolvedBy"` // user, auto, system
	Resolution     string    `json:"resolution"`
	RootCause      string    `json:"rootCause,omitempty"`
	FixID          string    `json:"fixId,omitempty"`
	RunbookID      string    `json:"runbookId,omitempty"`
	TimeToResolve  int64     `json:"timeToResolveMs"`
	ResolvedAt     time.Time `json:"resolvedAt"`
}

// CustomRunbookRequest represents a request to add a custom runbook
type CustomRunbookRequest struct {
	Name          string         `json:"name"`
	Description   string         `json:"description"`
	Pattern       FailurePattern `json:"pattern"`
	DryRunCmd     string         `json:"dryRunCmd"`
	ApplyCmd      string         `json:"applyCmd"`
	RollbackCmd   string         `json:"rollbackCmd,omitempty"`
	Risk          RunbookRisk    `json:"risk"`
	Tags          []string       `json:"tags,omitempty"`
}

// FeedbackService handles user feedback operations
type FeedbackService struct {
	manager       *Manager
	knowledgeBank *KnowledgeBank
	runbookReg    *RunbookRegistry
	learningEngine *LearningEngine
}

// NewFeedbackService creates a new feedback service
func NewFeedbackService(
	manager *Manager,
	knowledgeBank *KnowledgeBank,
	runbookReg *RunbookRegistry,
	learningEngine *LearningEngine,
) *FeedbackService {
	return &FeedbackService{
		manager:        manager,
		knowledgeBank:  knowledgeBank,
		runbookReg:     runbookReg,
		learningEngine: learningEngine,
	}
}

// SubmitFeedback processes user feedback
func (s *FeedbackService) SubmitFeedback(req FeedbackRequest, userID string) (*FeedbackResponse, error) {
	// Get the incident
	incident := s.manager.GetIncident(req.IncidentID)
	if incident == nil {
		return nil, fmt.Errorf("incident not found: %s", req.IncidentID)
	}

	feedback := &UserFeedback{
		ID:         uuid.New().String(),
		IncidentID: req.IncidentID,
		FixID:      req.FixID,
		Type:       string(req.Type),
		Content:    req.Content,
		CreatedAt:  time.Now(),
		CreatedBy:  userID,
	}

	// Store feedback in knowledge bank
	if s.knowledgeBank != nil {
		if err := s.knowledgeBank.StoreFeedback(feedback); err != nil {
			return nil, fmt.Errorf("failed to store feedback: %w", err)
		}
	}

	// Handle specific feedback types
	switch req.Type {
	case FeedbackResolved:
		s.handleResolved(incident, req, userID)
	case FeedbackRootCauseConfirm:
		s.handleRootCauseConfirm(incident, req)
	case FeedbackFixWorked:
		s.handleFixWorked(incident, req)
	case FeedbackFixFailed:
		s.handleFixFailed(incident, req)
	case FeedbackCustomRunbook:
		s.handleCustomRunbook(req)
	case FeedbackDismiss:
		s.handleDismiss(incident, req)
	case FeedbackEscalate:
		s.handleEscalate(incident, req)
	}

	return &FeedbackResponse{
		ID:         feedback.ID,
		IncidentID: req.IncidentID,
		Type:       req.Type,
		CreatedAt:  feedback.CreatedAt,
		Message:    s.getFeedbackMessage(req.Type),
	}, nil
}

// handleResolved marks an incident as resolved
func (s *FeedbackService) handleResolved(incident *Incident, req FeedbackRequest, userID string) {
	resolution := req.Content
	if resolution == "" {
		resolution = "Marked as resolved by user"
	}

	incident.UpdateStatus(StatusResolved, resolution)
	incident.Resolution = resolution

	// Update timeline
	incident.AddTimelineEntry("feedback", fmt.Sprintf("Resolved by %s: %s", userID, resolution), map[string]interface{}{
		"feedback_type": string(req.Type),
		"root_cause":    req.RootCause,
	})

	// Store resolution in knowledge bank
	if s.knowledgeBank != nil {
		resolutionRecord := &IncidentResolution{
			IncidentID:    incident.ID,
			ResolvedBy:    userID,
			Resolution:    resolution,
			RootCause:     req.RootCause,
			FixID:         req.FixID,
			TimeToResolve: time.Since(incident.FirstSeen).Milliseconds(),
			ResolvedAt:    time.Now(),
		}
		// Store through incident update
		s.knowledgeBank.StoreIncident(incident, nil, nil)
		_ = resolutionRecord // Would be stored in a dedicated table
	}

	// Update learning
	if s.learningEngine != nil {
		s.learningEngine.LearnFromIncident(incident, nil)
	}
}

// handleRootCauseConfirm confirms the root cause analysis
func (s *FeedbackService) handleRootCauseConfirm(incident *Incident, req FeedbackRequest) {
	if incident.Diagnosis != nil {
		// Add confirmation to evidence
		incident.Diagnosis.Evidence = append(incident.Diagnosis.Evidence, 
			fmt.Sprintf("Root cause confirmed by user: %s", req.RootCause))
		
		// Boost confidence
		incident.Diagnosis.Confidence = min(incident.Diagnosis.Confidence+0.1, 1.0)
	}

	incident.AddTimelineEntry("feedback", "Root cause analysis confirmed", map[string]interface{}{
		"confirmed_cause": req.RootCause,
	})
}

// handleFixWorked records that a fix was successful
func (s *FeedbackService) handleFixWorked(incident *Incident, req FeedbackRequest) {
	incident.AddTimelineEntry("feedback", "Fix marked as successful", map[string]interface{}{
		"fix_id": req.FixID,
	})

	// Update fix record in knowledge bank
	if s.knowledgeBank != nil && req.FixID != "" {
		// Would update the fix record with success confirmation
	}

	// Update runbook success rate
	if s.runbookReg != nil {
		// Increment success count for the runbook
	}
}

// handleFixFailed records that a fix failed
func (s *FeedbackService) handleFixFailed(incident *Incident, req FeedbackRequest) {
	incident.AddTimelineEntry("feedback", "Fix marked as failed", map[string]interface{}{
		"fix_id": req.FixID,
		"reason": req.Content,
	})

	// Update fix record in knowledge bank
	if s.knowledgeBank != nil && req.FixID != "" {
		// Would update the fix record with failure info
	}
}

// handleCustomRunbook creates a custom runbook from user input
func (s *FeedbackService) handleCustomRunbook(req FeedbackRequest) {
	// Parse custom runbook from content (would be JSON)
	// For now, just log that we received it
}

// handleDismiss dismisses/suppresses an incident
func (s *FeedbackService) handleDismiss(incident *Incident, req FeedbackRequest) {
	incident.UpdateStatus(StatusSuppressed, req.Content)
	incident.AddTimelineEntry("feedback", "Incident dismissed by user", map[string]interface{}{
		"reason": req.Content,
	})
}

// handleEscalate escalates an incident
func (s *FeedbackService) handleEscalate(incident *Incident, req FeedbackRequest) {
	incident.AddTimelineEntry("feedback", "Incident escalated", map[string]interface{}{
		"reason": req.Content,
		"tags":   req.Tags,
	})

	// Mark as high priority
	if incident.Severity.Weight() < SeverityHigh.Weight() {
		incident.Severity = SeverityHigh
	}
}

// getFeedbackMessage returns a user-friendly message for the feedback type
func (s *FeedbackService) getFeedbackMessage(feedbackType FeedbackType) string {
	messages := map[FeedbackType]string{
		FeedbackResolved:         "Incident marked as resolved",
		FeedbackRootCauseConfirm: "Root cause analysis confirmed",
		FeedbackFixWorked:        "Fix success recorded",
		FeedbackFixFailed:        "Fix failure recorded",
		FeedbackNote:             "Note added to incident",
		FeedbackCustomRunbook:    "Custom runbook submitted",
		FeedbackDismiss:          "Incident dismissed",
		FeedbackEscalate:         "Incident escalated",
	}

	if msg, ok := messages[feedbackType]; ok {
		return msg
	}
	return "Feedback recorded"
}

// GetFeedbackHistory returns feedback history for an incident
func (s *FeedbackService) GetFeedbackHistory(incidentID string) ([]*UserFeedback, error) {
	if s.knowledgeBank == nil {
		return nil, fmt.Errorf("knowledge bank not available")
	}
	return s.knowledgeBank.GetFeedbackForIncident(incidentID)
}

// AddCustomRunbook adds a user-defined runbook
func (s *FeedbackService) AddCustomRunbook(req CustomRunbookRequest) (*Runbook, error) {
	if s.runbookReg == nil {
		return nil, fmt.Errorf("runbook registry not available")
	}

	runbook := &Runbook{
		ID:          fmt.Sprintf("custom-%s", uuid.New().String()[:8]),
		Name:        req.Name,
		Description: req.Description,
		Pattern:     req.Pattern,
		Action: RunbookAction{
			Type:          FixTypePatch, // Default type
			Description:   req.Description,
			DryRunCommand: req.DryRunCmd,
			ApplyCommand:  req.ApplyCmd,
			RollbackCommand: req.RollbackCmd,
		},
		Risk:          req.Risk,
		AutonomyLevel: AutonomyRecommend, // Custom runbooks start at recommend level
		Enabled:       true,
		Tags:          append(req.Tags, "custom"),
	}

	if req.RollbackCmd != "" {
		runbook.Rollback = &RunbookAction{
			Type:            FixTypeRollback,
			RollbackCommand: req.RollbackCmd,
		}
	}

	s.runbookReg.Register(runbook)
	return runbook, nil
}

