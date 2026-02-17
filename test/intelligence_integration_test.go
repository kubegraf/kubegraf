// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

// +build integration

package test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"
)

const (
	baseURL = "http://localhost:8080"
)

// TestIntelligenceAPIIntegration runs integration tests against a running KubeGraf instance
func TestIntelligenceAPIIntegration(t *testing.T) {
	// Check if server is running
	if !isServerRunning(t) {
		t.Skip("KubeGraf server is not running on localhost:8080")
	}

	t.Run("TestWorkspaceInsights", testWorkspaceInsightsIntegration)
	t.Run("TestIncidentsList", testIncidentsListIntegration)
	t.Run("TestIncidentDetails", testIncidentDetailsIntegration)
	t.Run("TestIncidentStory", testIncidentStoryIntegration)
	t.Run("TestRelatedIncidents", testRelatedIncidentsIntegration)
	t.Run("TestPredictSuccess", testPredictSuccessIntegration)
	t.Run("TestRCAGeneration", testRCAGenerationIntegration)
}

func isServerRunning(t *testing.T) bool {
	t.Helper()

	client := &http.Client{
		Timeout: 2 * time.Second,
	}

	resp, err := client.Get(baseURL + "/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func testWorkspaceInsightsIntegration(t *testing.T) {
	resp, err := http.Get(baseURL + "/api/v2/workspace/insights")
	if err != nil {
		t.Fatalf("Failed to get insights: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	insights, ok := result["insights"]
	if !ok {
		t.Fatal("Response should contain 'insights' field")
	}

	t.Logf("✓ Workspace insights API working - got insights: %v", insights)
}

func testIncidentsListIntegration(t *testing.T) {
	resp, err := http.Get(baseURL + "/api/v2/incidents")
	if err != nil {
		t.Fatalf("Failed to get incidents: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	incidents, ok := result["incidents"]
	if !ok {
		t.Fatal("Response should contain 'incidents' field")
	}

	t.Logf("✓ Incidents list API working - got incidents: %v", incidents)
}

func testIncidentDetailsIntegration(t *testing.T) {
	// First get list of incidents
	resp, err := http.Get(baseURL + "/api/v2/incidents")
	if err != nil {
		t.Fatalf("Failed to get incidents: %v", err)
	}
	defer resp.Body.Close()

	var listResult map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&listResult); err != nil {
		t.Fatalf("Failed to decode incidents list: %v", err)
	}

	incidents, ok := listResult["incidents"].([]interface{})
	if !ok || len(incidents) == 0 {
		t.Skip("No incidents available to test details endpoint")
	}

	// Get first incident
	firstIncident, ok := incidents[0].(map[string]interface{})
	if !ok {
		t.Fatal("Invalid incident format")
	}

	incidentID, ok := firstIncident["id"].(string)
	if !ok {
		t.Fatal("Incident should have ID")
	}

	// Get incident details
	detailsResp, err := http.Get(baseURL + "/api/v2/incidents/" + incidentID)
	if err != nil {
		t.Fatalf("Failed to get incident details: %v", err)
	}
	defer detailsResp.Body.Close()

	if detailsResp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", detailsResp.StatusCode)
	}

	var detailsResult map[string]interface{}
	if err := json.NewDecoder(detailsResp.Body).Decode(&detailsResult); err != nil {
		t.Fatalf("Failed to decode details: %v", err)
	}

	t.Logf("✓ Incident details API working - got incident: %s", incidentID)
}

func testIncidentStoryIntegration(t *testing.T) {
	// Get incident ID from list
	incidentID := getFirstIncidentID(t)
	if incidentID == "" {
		t.Skip("No incidents available")
	}

	url := fmt.Sprintf("%s/api/v2/workspace/incidents/%s/story", baseURL, incidentID)
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("Failed to get story: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var story map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&story); err != nil {
		t.Fatalf("Failed to decode story: %v", err)
	}

	if _, ok := story["whatHappened"]; !ok {
		t.Error("Story should have 'whatHappened' field")
	}

	t.Logf("✓ Incident story API working - story sections: %v", getKeys(story))
}

func testRelatedIncidentsIntegration(t *testing.T) {
	incidentID := getFirstIncidentID(t)
	if incidentID == "" {
		t.Skip("No incidents available")
	}

	url := fmt.Sprintf("%s/api/v2/workspace/incidents/%s/related", baseURL, incidentID)
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("Failed to get related incidents: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode result: %v", err)
	}

	related, ok := result["related"]
	if !ok {
		t.Error("Result should have 'related' field")
	}

	t.Logf("✓ Related incidents API working - found: %v", related)
}

func testPredictSuccessIntegration(t *testing.T) {
	incidentID := getFirstIncidentID(t)
	if incidentID == "" {
		t.Skip("No incidents available")
	}

	url := fmt.Sprintf("%s/api/v2/workspace/incidents/%s/predict-success", baseURL, incidentID)
	reqBody := bytes.NewBufferString(`{"fixId":"fix-1"}`)

	resp, err := http.Post(url, "application/json", reqBody)
	if err != nil {
		t.Fatalf("Failed to predict success: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Logf("Response body: %s", body)
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var prediction map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&prediction); err != nil {
		t.Fatalf("Failed to decode prediction: %v", err)
	}

	if _, ok := prediction["probability"]; !ok {
		t.Error("Prediction should have 'probability' field")
	}

	if _, ok := prediction["factors"]; !ok {
		t.Error("Prediction should have 'factors' field")
	}

	t.Logf("✓ Predict success API working - prediction: %v", prediction)
}

func testRCAGenerationIntegration(t *testing.T) {
	incidentID := getFirstIncidentID(t)
	if incidentID == "" {
		t.Skip("No incidents available")
	}

	formats := []string{"json", "markdown", "html"}

	for _, format := range formats {
		t.Run("Format_"+format, func(t *testing.T) {
			url := fmt.Sprintf("%s/api/v2/workspace/incidents/%s/rca?format=%s", baseURL, incidentID, format)
			resp, err := http.Get(url)
			if err != nil {
				t.Fatalf("Failed to get RCA: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				t.Errorf("Expected status 200, got %d", resp.StatusCode)
			}

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("Failed to read body: %v", err)
			}

			if len(body) == 0 {
				t.Error("RCA body should not be empty")
			}

			t.Logf("✓ RCA generation API working (%s format) - size: %d bytes", format, len(body))
		})
	}
}

// Helper functions

func getFirstIncidentID(t *testing.T) string {
	t.Helper()

	resp, err := http.Get(baseURL + "/api/v2/incidents")
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return ""
	}

	incidents, ok := result["incidents"].([]interface{})
	if !ok || len(incidents) == 0 {
		return ""
	}

	firstIncident, ok := incidents[0].(map[string]interface{})
	if !ok {
		return ""
	}

	incidentID, ok := firstIncident["id"].(string)
	if !ok {
		return ""
	}

	return incidentID
}

func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// TestManualAPIVerification provides manual verification commands
func TestManualAPIVerification(t *testing.T) {
	if !isServerRunning(t) {
		t.Skip("Server not running")
	}

	t.Log("\n" + `
==========================================================================
Manual API Verification Commands
==========================================================================

1. Get Workspace Insights:
   curl http://localhost:8080/api/v2/workspace/insights

2. List Incidents:
   curl http://localhost:8080/api/v2/incidents

3. Get Incident Details:
   curl http://localhost:8080/api/v2/incidents/{incident-id}

4. Get Incident Story:
   curl http://localhost:8080/api/v2/workspace/incidents/{incident-id}/story

5. Get Related Incidents:
   curl http://localhost:8080/api/v2/workspace/incidents/{incident-id}/related

6. Predict Fix Success:
   curl -X POST http://localhost:8080/api/v2/workspace/incidents/{incident-id}/predict-success \
     -H "Content-Type: application/json" \
     -d '{"fixId":"fix-1"}'

7. Execute Fix (Preview):
   curl -X POST http://localhost:8080/api/v2/workspace/incidents/{incident-id}/execute-fix \
     -H "Content-Type: application/json" \
     -d '{"fixId":"fix-1","dryRun":true,"confirmed":false}'

8. Generate RCA Report (JSON):
   curl http://localhost:8080/api/v2/workspace/incidents/{incident-id}/rca?format=json

9. Generate RCA Report (Markdown):
   curl http://localhost:8080/api/v2/workspace/incidents/{incident-id}/rca?format=markdown

10. Generate RCA Report (HTML):
    curl http://localhost:8080/api/v2/workspace/incidents/{incident-id}/rca?format=html

==========================================================================
`)
}
