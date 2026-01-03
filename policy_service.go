package main

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/kubegraf/kubegraf/internal/database"
)

// Policy version - update this when terms/privacy policy changes
const POLICY_VERSION = "2026-01-03"

// PolicyService manages policy acceptance and enforcement
type PolicyService struct {
	db              *database.Database
	policyRequired  bool
	mu              sync.RWMutex
}

// NewPolicyService creates a new policy service instance
func NewPolicyService(db *database.Database) *PolicyService {
	return &PolicyService{
		db:             db,
		policyRequired: false,
	}
}

// CheckPolicyOnStartup checks if policy needs to be accepted
// Returns true if policy gate should be activated
func (ps *PolicyService) CheckPolicyOnStartup() error {
	acceptedVersion, err := ps.db.GetAppState("accepted_policy_version")
	if err != nil {
		return fmt.Errorf("get accepted policy version: %w", err)
	}

	// If no policy accepted yet or version mismatch
	if acceptedVersion == "" || acceptedVersion != POLICY_VERSION {
		ps.mu.Lock()
		ps.policyRequired = true
		ps.mu.Unlock()

		// Create policy notification
		notification := &database.Notification{
			ID:        uuid.New().String(),
			CreatedAt: time.Now(),
			Severity:  "policy",
			Title:     "Updated Terms & Privacy Policy",
			Body:      "Please review and accept the updated Terms & Privacy Policy to continue using cluster features.",
			Source:    "policy",
			IsRead:    false,
			DedupeKey: fmt.Sprintf("policy:%s", POLICY_VERSION),
		}

		if err := ps.db.CreateNotificationIfNotExists(notification); err != nil {
			return fmt.Errorf("create policy notification: %w", err)
		}
	}

	return nil
}

// IsPolicyRequired returns whether policy acceptance is required
func (ps *PolicyService) IsPolicyRequired() bool {
	ps.mu.RLock()
	defer ps.mu.RUnlock()
	return ps.policyRequired
}

// GetAcceptedPolicyVersion returns the currently accepted policy version
func (ps *PolicyService) GetAcceptedPolicyVersion() (string, error) {
	return ps.db.GetAppState("accepted_policy_version")
}

// AcceptPolicy marks the current policy as accepted
func (ps *PolicyService) AcceptPolicy() error {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	if err := ps.db.SetAppState("accepted_policy_version", POLICY_VERSION); err != nil {
		return fmt.Errorf("set accepted policy version: %w", err)
	}

	ps.policyRequired = false
	return nil
}

// PolicyStatus represents the current policy status
type PolicyStatus struct {
	PolicyRequired        bool   `json:"policy_required"`
	PolicyVersion         string `json:"policy_version"`
	AcceptedPolicyVersion string `json:"accepted_policy_version"`
}

// GetPolicyStatus returns the current policy status
func (ps *PolicyService) GetPolicyStatus() (*PolicyStatus, error) {
	acceptedVersion, err := ps.GetAcceptedPolicyVersion()
	if err != nil {
		return nil, err
	}

	return &PolicyStatus{
		PolicyRequired:        ps.IsPolicyRequired(),
		PolicyVersion:         POLICY_VERSION,
		AcceptedPolicyVersion: acceptedVersion,
	}, nil
}
