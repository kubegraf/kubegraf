// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// TestWorkspaceInsights tests the insights generation API
func TestWorkspaceInsights(t *testing.T) {
	// Create test server
	ws := &WebServer{
		incidentIntelligence: createMockIncidentIntelligence(t),
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/insights", nil)
	w := httptest.NewRecorder()

	ws.handleWorkspaceInsights(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	insights, ok := response["insights"].([]interface{})
	if !ok {
		t.Fatal("Expected insights array in response")
	}

	if len(insights) == 0 {
		t.Log("Warning: No insights generated (this may be expected for empty incident list)")
	}

	t.Logf("Generated %d insights", len(insights))
}

// TestIncidentStory tests incident story generation
func TestIncidentStory(t *testing.T) {
	ws := &WebServer{
		incidentIntelligence: createMockIncidentIntelligence(t),
	}

	// Add a test incident
	incident := createTestIncident("INC-001", incidents.PatternCrashLoop)
	ws.incidentIntelligence.manager.AddIncident(incident)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/incidents/INC-001/story", nil)
	w := httptest.NewRecorder()

	ws.handleIncidentStory(w, req, "INC-001")

	if w.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %d", w.Code)
	}

	var story IncidentStory
	if err := json.NewDecoder(w.Body).Decode(&story); err != nil {
		t.Fatalf("Failed to decode story: %v", err)
	}

	if story.WhatHappened == "" {
		t.Error("Story should have 'what happened' section")
	}

	if story.WhenStarted == "" {
		t.Error("Story should have 'when started' section")
	}

	t.Logf("Story generated successfully:\n%s", story.WhatHappened)
}

// TestRelatedIncidents tests related incident finding
func TestRelatedIncidents(t *testing.T) {
	ws := &WebServer{
		incidentIntelligence: createMockIncidentIntelligence(t),
	}

	// Add test incidents
	incident1 := createTestIncident("INC-001", incidents.PatternCrashLoop)
	incident2 := createTestIncident("INC-002", incidents.PatternCrashLoop) // Same pattern
	incident3 := createTestIncident("INC-003", incidents.PatternOOMKilled) // Different pattern

	ws.incidentIntelligence.manager.AddIncident(incident1)
	ws.incidentIntelligence.manager.AddIncident(incident2)
	ws.incidentIntelligence.manager.AddIncident(incident3)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/incidents/INC-001/related", nil)
	w := httptest.NewRecorder()

	ws.handleRelatedIncidents(w, req, "INC-001")

	if w.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	related, ok := response["related"].([]interface{})
	if !ok {
		t.Fatal("Expected related array in response")
	}

	// Should find INC-002 as related (same pattern)
	if len(related) == 0 {
		t.Log("Warning: No related incidents found")
	} else {
		t.Logf("Found %d related incident(s)", len(related))
	}
}

// TestPredictSuccess tests fix success prediction
func TestPredictSuccess(t *testing.T) {
	ws := &WebServer{
		incidentIntelligence: createMockIncidentIntelligence(t),
	}

	// Add test incident
	incident := createTestIncident("INC-001", incidents.PatternCrashLoop)
	incident.Diagnosis = &incidents.Diagnosis{
		Summary:        "Pod crashing due to configuration error",
		ProbableCauses: []string{"Invalid configuration"},
		Confidence:     0.95,
		Evidence:       []string{"Config validation failed"},
	}
	ws.incidentIntelligence.manager.AddIncident(incident)

	reqBody := bytes.NewBufferString(`{"fixId":"fix-1"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v2/workspace/incidents/INC-001/predict-success", reqBody)
	w := httptest.NewRecorder()

	ws.handlePredictSuccess(w, req, "INC-001")

	if w.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %d", w.Code)
	}

	var prediction SuccessPrediction
	if err := json.NewDecoder(w.Body).Decode(&prediction); err != nil {
		t.Fatalf("Failed to decode prediction: %v", err)
	}

	if prediction.Probability == 0 {
		t.Error("Prediction probability should not be 0")
	}

	if len(prediction.Factors) != 5 {
		t.Errorf("Expected 5 factors, got %d", len(prediction.Factors))
	}

	if prediction.Risk == "" {
		t.Error("Risk assessment should not be empty")
	}

	t.Logf("Prediction: %.0f%% probability, risk: %s", prediction.Probability, prediction.Risk)
}

// TestExecuteFix tests fix execution
func TestExecuteFix(t *testing.T) {
	ws := &WebServer{
		incidentIntelligence: createMockIncidentIntelligence(t),
	}

	// Add test incident with recommendation
	incident := createTestIncident("INC-001", incidents.PatternCrashLoop)
	incident.Recommendations = []incidents.Recommendation{
		{
			ID:          "fix-1",
			Title:       "Restart Pod",
			Explanation: "Restart the pod to apply new configuration",
			Risk:        incidents.RiskLow,
			Priority:    1,
			ProposedFix: &incidents.ProposedFix{
				Type:        incidents.FixTypeRestart,
				Description: "Restart pod to recover from crash loop",
				Safe:        true,
			},
		},
	}
	ws.incidentIntelligence.manager.AddIncident(incident)

	// Test preview mode
	t.Run("Preview Mode", func(t *testing.T) {
		reqBody := bytes.NewBufferString(`{"fixId":"fix-1","dryRun":true,"confirmed":false}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v2/workspace/incidents/INC-001/execute-fix", reqBody)
		w := httptest.NewRecorder()

		ws.handleExecuteFix(w, req, "INC-001")

		if w.Code != http.StatusOK {
			t.Errorf("Expected status OK, got %d", w.Code)
		}

		var response map[string]interface{}
		if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		status, ok := response["status"].(string)
		if !ok || status != "preview" {
			t.Errorf("Expected status 'preview', got %v", response["status"])
		}

		t.Log("Preview mode working correctly")
	})

	// Test execution mode
	t.Run("Execution Mode", func(t *testing.T) {
		reqBody := bytes.NewBufferString(`{"fixId":"fix-1","dryRun":false,"confirmed":true}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v2/workspace/incidents/INC-001/execute-fix", reqBody)
		w := httptest.NewRecorder()

		ws.handleExecuteFix(w, req, "INC-001")

		if w.Code != http.StatusOK {
			t.Errorf("Expected status OK, got %d", w.Code)
		}

		var result ExecutionResult
		if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode result: %v", err)
		}

		if result.Status == "" {
			t.Error("Execution result should have status")
		}

		t.Logf("Execution result: %s", result.Status)
	})
}

// TestGenerateRCA tests RCA report generation
func TestGenerateRCA(t *testing.T) {
	ws := &WebServer{
		incidentIntelligence: createMockIncidentIntelligence(t),
	}

	// Add test incident
	incident := createTestIncident("INC-001", incidents.PatternCrashLoop)
	incident.Diagnosis = &incidents.Diagnosis{
		Summary:        "Pod crashing due to configuration error",
		ProbableCauses: []string{"Invalid configuration"},
		Confidence:     0.95,
		Evidence:       []string{"Config validation failed"},
	}
	ws.incidentIntelligence.manager.AddIncident(incident)

	// Test JSON format
	t.Run("JSON Format", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/incidents/INC-001/rca?format=json", nil)
		w := httptest.NewRecorder()

		ws.handleGenerateRCA(w, req, "INC-001")

		if w.Code != http.StatusOK {
			t.Errorf("Expected status OK, got %d", w.Code)
		}

		contentType := w.Header().Get("Content-Type")
		if contentType != "application/json" {
			t.Errorf("Expected JSON content type, got %s", contentType)
		}

		var rca RCAReport
		if err := json.NewDecoder(w.Body).Decode(&rca); err != nil {
			t.Fatalf("Failed to decode RCA: %v", err)
		}

		if rca.Metadata.IncidentID != "INC-001" {
			t.Errorf("Expected incident ID 'INC-001', got %s", rca.Metadata.IncidentID)
		}

		t.Log("JSON RCA generated successfully")
	})

	// Test Markdown format
	t.Run("Markdown Format", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/incidents/INC-001/rca?format=markdown", nil)
		w := httptest.NewRecorder()

		ws.handleGenerateRCA(w, req, "INC-001")

		if w.Code != http.StatusOK {
			t.Errorf("Expected status OK, got %d", w.Code)
		}

		contentType := w.Header().Get("Content-Type")
		if contentType != "text/markdown" {
			t.Errorf("Expected markdown content type, got %s", contentType)
		}

		markdown := w.Body.String()
		if len(markdown) == 0 {
			t.Error("Markdown output should not be empty")
		}

		t.Logf("Markdown RCA generated (%d bytes)", len(markdown))
	})

	// Test HTML format
	t.Run("HTML Format", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/incidents/INC-001/rca?format=html", nil)
		w := httptest.NewRecorder()

		ws.handleGenerateRCA(w, req, "INC-001")

		if w.Code != http.StatusOK {
			t.Errorf("Expected status OK, got %d", w.Code)
		}

		contentType := w.Header().Get("Content-Type")
		if contentType != "text/html" {
			t.Errorf("Expected HTML content type, got %s", contentType)
		}

		html := w.Body.String()
		if len(html) == 0 {
			t.Error("HTML output should not be empty")
		}

		t.Logf("HTML RCA generated (%d bytes)", len(html))
	})
}

// TestInvalidRequests tests error handling
func TestInvalidRequests(t *testing.T) {
	ws := &WebServer{
		incidentIntelligence: createMockIncidentIntelligence(t),
	}

	tests := []struct {
		name           string
		method         string
		path           string
		body           string
		expectedStatus int
	}{
		{
			name:           "Invalid method for insights",
			method:         http.MethodPost,
			path:           "/api/v2/workspace/insights",
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "Nonexistent incident",
			method:         http.MethodGet,
			path:           "/api/v2/workspace/incidents/NONEXISTENT/story",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			path:           "/api/v2/workspace/incidents/INC-001/predict-success",
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != "" {
				req = httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(tt.body))
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}
			w := httptest.NewRecorder()

			// Route to appropriate handler
			if tt.path == "/api/v2/workspace/insights" {
				ws.handleWorkspaceInsights(w, req)
			}

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

// Helper functions for testing

func createMockIncidentIntelligence(t *testing.T) *IncidentIntelligence {
	t.Helper()

	mockApp := &App{
		ctx: nil,
	}

	config := incidents.DefaultManagerConfig()
	manager := incidents.NewManager(config)

	ii := &IncidentIntelligence{
		app:          mockApp,
		manager:      manager,
		eventAdapter: incidents.NewEventAdapter(manager),
		scanCacheTTL: 30 * time.Second,
	}

	return ii
}

func createTestIncident(id string, pattern incidents.FailurePattern) *incidents.Incident {
	now := time.Now()

	incident := &incidents.Incident{
		ID:          id,
		Fingerprint: "test-fingerprint",
		Pattern:     pattern,
		Severity:    incidents.SeverityCritical,
		Status:      incidents.StatusOpen,
		Resource: incidents.KubeResourceRef{
			Kind:      "Pod",
			Name:      "test-pod",
			Namespace: "default",
		},
		Title:       "Test Incident",
		Description: "This is a test incident",
		Occurrences: 1,
		FirstSeen:   now.Add(-1 * time.Hour),
		LastSeen:    now,
		Signals:     incidents.IncidentSignals{},
	}

	return incident
}

// Benchmark tests

func BenchmarkWorkspaceInsights(b *testing.B) {
	ws := &WebServer{
		incidentIntelligence: createBenchmarkIncidentIntelligence(b),
	}

	// Add 100 test incidents
	for i := 0; i < 100; i++ {
		incident := createTestIncident(string(rune(i)), incidents.PatternCrashLoop)
		ws.incidentIntelligence.manager.AddIncident(incident)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/insights", nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		ws.handleWorkspaceInsights(w, req)
	}
}

func BenchmarkRelatedIncidents(b *testing.B) {
	ws := &WebServer{
		incidentIntelligence: createBenchmarkIncidentIntelligence(b),
	}

	// Add test incidents
	incident1 := createTestIncident("INC-001", incidents.PatternCrashLoop)
	ws.incidentIntelligence.manager.AddIncident(incident1)

	// Add 50 related incidents
	for i := 0; i < 50; i++ {
		incident := createTestIncident(string(rune(i+2)), incidents.PatternCrashLoop)
		ws.incidentIntelligence.manager.AddIncident(incident)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v2/workspace/incidents/INC-001/related", nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		ws.handleRelatedIncidents(w, req, "INC-001")
	}
}

func createBenchmarkIncidentIntelligence(b *testing.B) *IncidentIntelligence {
	b.Helper()

	mockApp := &App{
		ctx: nil,
	}

	config := incidents.DefaultManagerConfig()
	manager := incidents.NewManager(config)

	ii := &IncidentIntelligence{
		app:          mockApp,
		manager:      manager,
		eventAdapter: incidents.NewEventAdapter(manager),
		scanCacheTTL: 30 * time.Second,
	}

	return ii
}
