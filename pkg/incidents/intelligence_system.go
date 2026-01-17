// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
)

// MonitoringStats holds scan statistics for the intelligence system
type MonitoringStats struct {
	PodsMonitored   int
	NodesMonitored  int
	EventsProcessed int
	LastScanTime    string
}

// IntelligenceSystem is the main orchestrator for the autonomous SRE system
type IntelligenceSystem struct {
	// Core components
	manager         *Manager
	knowledgeBank   *KnowledgeBank
	runbookReg      *RunbookRegistry
	runbookExecutor *RunbookExecutor
	autoEngine      *AutoRemediationEngine
	learningEngine  *LearningEngine
	feedbackService *FeedbackService
	apiHandler      *IntelligenceHandler

	// Configuration
	config IntelligenceConfig

	// State
	mu              sync.RWMutex
	running         bool
	monitoringStats MonitoringStats
}

// IntelligenceConfig configures the intelligence system
type IntelligenceConfig struct {
	// DataDir is where persistent data is stored
	DataDir string `json:"dataDir"`

	// EnableAutoRemediation enables the auto-remediation engine
	EnableAutoRemediation bool `json:"enableAutoRemediation"`

	// AutoConfig is the auto-remediation configuration
	AutoConfig AutoRemediationConfig `json:"autoConfig"`

	// EnableLearning enables the learning engine
	EnableLearning bool `json:"enableLearning"`

	// EnableKnowledgeBank enables SQLite-based persistence
	EnableKnowledgeBank bool `json:"enableKnowledgeBank"`
}

// DefaultIntelligenceConfig returns sensible defaults
func DefaultIntelligenceConfig() IntelligenceConfig {
	homeDir, _ := os.UserHomeDir()
	dataDir := filepath.Join(homeDir, ".kubegraf", "intelligence")

	return IntelligenceConfig{
		DataDir:               dataDir,
		EnableAutoRemediation: false, // Disabled by default for safety
		AutoConfig:            DefaultAutoRemediationConfig(),
		EnableLearning:        true,
		EnableKnowledgeBank:   true,
	}
}

// NewIntelligenceSystem creates a new intelligence system
func NewIntelligenceSystem(manager *Manager, kubeClient KubeFixExecutor, config IntelligenceConfig) (*IntelligenceSystem, error) {
	system := &IntelligenceSystem{
		manager: manager,
		config:  config,
	}

	// Initialize runbook registry
	system.runbookReg = NewRunbookRegistry()
	log.Printf("[INTELLIGENCE] Registered %d default runbooks", len(system.runbookReg.GetAll()))

	// Initialize runbook executor
	system.runbookExecutor = NewRunbookExecutor(system.runbookReg, kubeClient)

	// Initialize knowledge bank if enabled
	if config.EnableKnowledgeBank {
		kb, err := NewKnowledgeBank(config.DataDir)
		if err != nil {
			log.Printf("[INTELLIGENCE] Warning: Failed to initialize knowledge bank: %v", err)
		} else {
			system.knowledgeBank = kb
			log.Printf("[INTELLIGENCE] Knowledge bank initialized at %s", config.DataDir)
		}
	}

	// Initialize learning engine if enabled
	if config.EnableLearning {
		system.learningEngine = NewLearningEngine(system.knowledgeBank, system.runbookReg)
		log.Printf("[INTELLIGENCE] Learning engine initialized")
	}

	// Initialize auto-remediation engine if enabled
	if config.EnableAutoRemediation {
		system.autoEngine = NewAutoRemediationEngine(
			config.AutoConfig,
			system.runbookReg,
			system.runbookExecutor,
			system.knowledgeBank,
		)
		log.Printf("[INTELLIGENCE] Auto-remediation engine initialized (enabled=%v)", config.AutoConfig.Enabled)
	}

	// Initialize feedback service
	system.feedbackService = NewFeedbackService(
		manager,
		system.knowledgeBank,
		system.runbookReg,
		system.learningEngine,
	)

	// Initialize API handler
	system.apiHandler = NewIntelligenceHandler(
		manager,
		system.knowledgeBank,
		system.runbookReg,
		system.runbookExecutor,
		system.autoEngine,
		system.learningEngine,
	)

	return system, nil
}

// Start starts all intelligence system components
func (s *IntelligenceSystem) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return fmt.Errorf("intelligence system already running")
	}

	// Start auto-remediation engine if available
	if s.autoEngine != nil {
		if err := s.autoEngine.Start(); err != nil {
			log.Printf("[INTELLIGENCE] Warning: Failed to start auto-remediation engine: %v", err)
		}
	}

	s.running = true
	log.Printf("[INTELLIGENCE] System started")
	return nil
}

// Stop stops all intelligence system components
func (s *IntelligenceSystem) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return nil
	}

	// Stop auto-remediation engine
	if s.autoEngine != nil {
		s.autoEngine.Stop()
	}

	// Close knowledge bank
	if s.knowledgeBank != nil {
		s.knowledgeBank.Close()
	}

	s.running = false
	log.Printf("[INTELLIGENCE] System stopped")
	return nil
}

// ProcessIncident processes an incident through the intelligence pipeline
func (s *IntelligenceSystem) ProcessIncident(incident *Incident) {
	s.mu.RLock()
	running := s.running
	s.mu.RUnlock()

	if !running {
		return
	}

	// Build evidence pack
	evidenceBuilder := NewEvidencePackBuilder()
	evidencePack := evidenceBuilder.BuildFromIncident(incident)

	// Build cited diagnosis
	citedDiagnosis := BuildCitedDiagnosis(incident, evidencePack)

	// Store in knowledge bank
	if s.knowledgeBank != nil {
		if err := s.knowledgeBank.StoreIncident(incident, evidencePack, citedDiagnosis); err != nil {
			log.Printf("[INTELLIGENCE] Failed to store incident in knowledge bank: %v", err)
		}
	}

	// Feed to learning engine
	if s.learningEngine != nil {
		s.learningEngine.LearnFromIncident(incident, evidencePack)
	}

	// Enqueue for auto-remediation evaluation
	if s.autoEngine != nil && s.config.EnableAutoRemediation {
		s.autoEngine.EnqueueIncident(incident)
	}
	// Per-incident processing log removed for production (too verbose)
}

// GetAPIHandler returns the API handler for route registration
func (s *IntelligenceSystem) GetAPIHandler() *IntelligenceHandler {
	return s.apiHandler
}

// GetManager returns the incident manager
func (s *IntelligenceSystem) GetManager() *Manager {
	return s.manager
}

// GetKnowledgeBank returns the knowledge bank
func (s *IntelligenceSystem) GetKnowledgeBank() *KnowledgeBank {
	return s.knowledgeBank
}

// GetRunbookRegistry returns the runbook registry
func (s *IntelligenceSystem) GetRunbookRegistry() *RunbookRegistry {
	return s.runbookReg
}

// GetAutoEngine returns the auto-remediation engine
func (s *IntelligenceSystem) GetAutoEngine() *AutoRemediationEngine {
	return s.autoEngine
}

// GetLearningEngine returns the learning engine
func (s *IntelligenceSystem) GetLearningEngine() *LearningEngine {
	return s.learningEngine
}

// GetFeedbackService returns the feedback service
func (s *IntelligenceSystem) GetFeedbackService() *FeedbackService {
	return s.feedbackService
}

// EnableAutoRemediation enables auto-remediation
func (s *IntelligenceSystem) EnableAutoRemediation() error {
	if s.autoEngine == nil {
		return fmt.Errorf("auto-remediation engine not initialized")
	}
	s.autoEngine.Enable()
	s.config.EnableAutoRemediation = true
	return nil
}

// DisableAutoRemediation disables auto-remediation
func (s *IntelligenceSystem) DisableAutoRemediation() error {
	if s.autoEngine == nil {
		return nil
	}
	s.autoEngine.Disable()
	s.config.EnableAutoRemediation = false
	return nil
}

// GetStatus returns the overall system status
func (s *IntelligenceSystem) GetStatus() *IntelligenceSystemStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := &IntelligenceSystemStatus{
		Running:              s.running,
		KnowledgeBankEnabled: s.knowledgeBank != nil,
		LearningEnabled:      s.learningEngine != nil,
		// Use actual monitoring stats from SetMonitoringStats
		PodsMonitored:     s.monitoringStats.PodsMonitored,
		NodesMonitored:    s.monitoringStats.NodesMonitored,
		EventsProcessed:   s.monitoringStats.EventsProcessed,
		LastScanTime:      s.monitoringStats.LastScanTime,
		RunbooksAvailable: 0,
		SystemHealth:      "healthy",
	}

	if s.autoEngine != nil {
		autoStatus := s.autoEngine.GetStatus()
		status.AutoRemediationStatus = &autoStatus
	}

	if s.learningEngine != nil {
		status.ClusterCount = len(s.learningEngine.GetAllClusters())
		status.LearnedPatternCount = len(s.learningEngine.GetLearnedPatterns(true))
	}

	// Get runbooks count
	if s.runbookReg != nil {
		status.RunbooksAvailable = len(s.runbookReg.GetAll())
	}

	// Determine system health based on component status
	if !s.running {
		status.SystemHealth = "offline"
	} else if s.knowledgeBank == nil && s.learningEngine == nil {
		status.SystemHealth = "degraded"
	} else {
		status.SystemHealth = "healthy"
	}

	return status
}

// IntelligenceSystemStatus represents the system status
type IntelligenceSystemStatus struct {
	Running               bool                    `json:"running"`
	KnowledgeBankEnabled  bool                    `json:"knowledgeBankEnabled"`
	LearningEnabled       bool                    `json:"learningEnabled"`
	AutoRemediationStatus *AutoRemediationStatus  `json:"autoRemediationStatus,omitempty"`
	ClusterCount          int                     `json:"clusterCount"`
	LearnedPatternCount   int                     `json:"learnedPatternCount"`
	// Fields required by frontend MonitoringStatus component
	PodsMonitored     int    `json:"podsMonitored"`
	NodesMonitored    int    `json:"nodesMonitored"`
	EventsProcessed   int    `json:"eventsProcessed"`
	LastScanTime      string `json:"lastScanTime"`
	RunbooksAvailable int    `json:"runbooksAvailable"`
	SystemHealth      string `json:"systemHealth"`
}

// SetMonitoringStats updates the monitoring statistics from the scanner
func (s *IntelligenceSystem) SetMonitoringStats(pods, nodes, events int, scanTime string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.monitoringStats = MonitoringStats{
		PodsMonitored:   pods,
		NodesMonitored:  nodes,
		EventsProcessed: events,
		LastScanTime:    scanTime,
	}
}

