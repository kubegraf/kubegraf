// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Connector represents an external service connector
type Connector struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`      // "github", "slack", "pagerduty", "webhook", "email", "teams", "discord"
	Name      string                 `json:"name"`
	Enabled   bool                   `json:"enabled"`
	Config    map[string]interface{} `json:"config"`
	Status    string                 `json:"status"`     // "connected", "disconnected", "error"
	LastTest  *time.Time             `json:"lastTest,omitempty"`
	CreatedAt time.Time              `json:"createdAt"`
	UpdatedAt time.Time              `json:"updatedAt"`
}

// ConnectorManager manages all connectors
type ConnectorManager struct {
	connectors []Connector
	mu         sync.RWMutex
	app        *App
}

// NewConnectorManager creates a new connector manager
func NewConnectorManager(app *App) *ConnectorManager {
	return &ConnectorManager{
		connectors: make([]Connector, 0),
		app:        app,
	}
}

// GetConnectors returns all connectors
func (cm *ConnectorManager) GetConnectors() []Connector {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	result := make([]Connector, len(cm.connectors))
	copy(result, cm.connectors)
	return result
}

// GetConnector returns a connector by ID
func (cm *ConnectorManager) GetConnector(id string) (*Connector, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	for i := range cm.connectors {
		if cm.connectors[i].ID == id {
			return &cm.connectors[i], nil
		}
	}
	return nil, fmt.Errorf("connector not found")
}

// CreateConnector creates a new connector
func (cm *ConnectorManager) CreateConnector(connector Connector) (*Connector, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	connector.ID = uuid.New().String()
	connector.CreatedAt = time.Now()
	connector.UpdatedAt = time.Now()
	connector.Status = "disconnected"

	cm.connectors = append(cm.connectors, connector)
	return &connector, nil
}

// UpdateConnector updates an existing connector
func (cm *ConnectorManager) UpdateConnector(id string, updates map[string]interface{}) (*Connector, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	for i := range cm.connectors {
		if cm.connectors[i].ID == id {
			if name, ok := updates["name"].(string); ok {
				cm.connectors[i].Name = name
			}
			if enabled, ok := updates["enabled"].(bool); ok {
				cm.connectors[i].Enabled = enabled
			}
			if config, ok := updates["config"].(map[string]interface{}); ok {
				cm.connectors[i].Config = config
			}
			cm.connectors[i].UpdatedAt = time.Now()
			return &cm.connectors[i], nil
		}
	}
	return nil, fmt.Errorf("connector not found")
}

// DeleteConnector deletes a connector
func (cm *ConnectorManager) DeleteConnector(id string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	for i, connector := range cm.connectors {
		if connector.ID == id {
			cm.connectors = append(cm.connectors[:i], cm.connectors[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("connector not found")
}

// TestConnector tests a connector connection
func (cm *ConnectorManager) TestConnector(id string) error {
	connector, err := cm.GetConnector(id)
	if err != nil {
		return err
	}

	// Test based on connector type
	var testErr error
	switch connector.Type {
	case "slack", "webhook", "teams", "discord":
		testErr = cm.testWebhookConnector(connector)
	case "github":
		testErr = cm.testGitHubConnector(connector)
	case "pagerduty":
		testErr = cm.testPagerDutyConnector(connector)
	case "email":
		testErr = cm.testEmailConnector(connector)
	default:
		testErr = fmt.Errorf("unsupported connector type: %s", connector.Type)
	}

	// Update status
	cm.mu.Lock()
	for i := range cm.connectors {
		if cm.connectors[i].ID == id {
			now := time.Now()
			cm.connectors[i].LastTest = &now
			if testErr == nil {
				cm.connectors[i].Status = "connected"
			} else {
				cm.connectors[i].Status = "error"
			}
			cm.connectors[i].UpdatedAt = now
			break
		}
	}
	cm.mu.Unlock()

	return testErr
}

// testWebhookConnector tests a webhook connector
func (cm *ConnectorManager) testWebhookConnector(connector *Connector) error {
	url, ok := connector.Config["webhook_url"].(string)
	if !ok {
		if url, ok = connector.Config["url"].(string); !ok {
			return fmt.Errorf("webhook URL not found in config")
		}
	}

	payload := map[string]interface{}{
		"test":      true,
		"timestamp": time.Now().Unix(),
		"message":   "Test message from KubeGraf",
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")

	// Add custom headers if provided
	if headers, ok := connector.Config["headers"].(string); ok {
		var headerMap map[string]string
		if err := json.Unmarshal([]byte(headers), &headerMap); err == nil {
			for k, v := range headerMap {
				req.Header.Set(k, v)
			}
		}
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("webhook returned status %d: %s", resp.StatusCode, string(body))
}

// testGitHubConnector tests a GitHub connector
func (cm *ConnectorManager) testGitHubConnector(connector *Connector) error {
	token, ok := connector.Config["token"].(string)
	if !ok || token == "" {
		return fmt.Errorf("GitHub token not found in config")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/user", nil)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", fmt.Sprintf("token %s", token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return nil
	}

	return fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
}

// testPagerDutyConnector tests a PagerDuty connector
func (cm *ConnectorManager) testPagerDutyConnector(connector *Connector) error {
	integrationKey, ok := connector.Config["integration_key"].(string)
	if !ok || integrationKey == "" {
		return fmt.Errorf("PagerDuty integration key not found in config")
	}

	payload := map[string]interface{}{
		"routing_key": integrationKey,
		"event_action": "trigger",
		"payload": map[string]interface{}{
			"summary":     "Test alert from KubeGraf",
			"source":      "kubegraf",
			"severity":     "info",
			"custom_details": map[string]interface{}{
				"test": true,
			},
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", "https://events.pagerduty.com/v2/enqueue", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("PagerDuty API returned status %d: %s", resp.StatusCode, string(body))
}

// testEmailConnector tests an email connector (basic validation)
func (cm *ConnectorManager) testEmailConnector(connector *Connector) error {
	// Basic validation - in production, you'd actually test SMTP connection
	required := []string{"smtp_host", "smtp_port", "username", "password", "from_email", "to_emails"}
	for _, key := range required {
		if val, ok := connector.Config[key].(string); !ok || val == "" {
			return fmt.Errorf("missing required field: %s", key)
		}
	}
	return nil
}

// SendNotification sends a notification through enabled connectors
func (cm *ConnectorManager) SendNotification(eventType string, severity string, message string, details map[string]interface{}) {
	cm.mu.RLock()
	connectors := make([]Connector, len(cm.connectors))
	copy(connectors, cm.connectors)
	cm.mu.RUnlock()

	for _, connector := range connectors {
		if !connector.Enabled {
			continue
		}

		// Send in background to avoid blocking
		go func(c Connector) {
			if err := cm.sendToConnector(c, eventType, severity, message, details); err != nil {
				fmt.Printf("Failed to send notification via connector %s: %v\n", c.Name, err)
			}
		}(connector)
	}
}

// sendToConnector sends a notification to a specific connector
func (cm *ConnectorManager) sendToConnector(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	switch connector.Type {
	case "slack":
		return cm.sendToSlack(connector, eventType, severity, message, details)
	case "webhook":
		return cm.sendToWebhook(connector, eventType, severity, message, details)
	case "teams":
		return cm.sendToTeams(connector, eventType, severity, message, details)
	case "discord":
		return cm.sendToDiscord(connector, eventType, severity, message, details)
	case "pagerduty":
		return cm.sendToPagerDuty(connector, eventType, severity, message, details)
	case "github":
		return cm.sendToGitHub(connector, eventType, severity, message, details)
	case "email":
		return cm.sendToEmail(connector, eventType, severity, message, details)
	default:
		return fmt.Errorf("unsupported connector type: %s", connector.Type)
	}
}

// sendToSlack sends a notification to Slack
func (cm *ConnectorManager) sendToSlack(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	webhookURL, ok := connector.Config["webhook_url"].(string)
	if !ok {
		return fmt.Errorf("Slack webhook URL not found")
	}

	color := "#36a64f" // green
	if severity == "critical" || severity == "high" {
		color = "#ff0000" // red
	} else if severity == "medium" {
		color = "#ffaa00" // orange
	}

	payload := map[string]interface{}{
		"text": message,
		"attachments": []map[string]interface{}{
			{
				"color":     color,
				"title":     fmt.Sprintf("KubeGraf Alert: %s", eventType),
				"text":      message,
				"fields":    []map[string]interface{}{},
				"timestamp": time.Now().Unix(),
			},
		},
	}

	if channel, ok := connector.Config["channel"].(string); ok && channel != "" {
		payload["channel"] = channel
	}
	if username, ok := connector.Config["username"].(string); ok && username != "" {
		payload["username"] = username
	}

	jsonData, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("Slack webhook returned status %d", resp.StatusCode)
}

// sendToWebhook sends a notification to a generic webhook
func (cm *ConnectorManager) sendToWebhook(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	url, ok := connector.Config["url"].(string)
	if !ok {
		return fmt.Errorf("webhook URL not found")
	}

	method := "POST"
	if m, ok := connector.Config["method"].(string); ok {
		method = m
	}

	payload := map[string]interface{}{
		"event_type": eventType,
		"severity":   severity,
		"message":    message,
		"timestamp":   time.Now().Unix(),
		"details":    details,
	}

	jsonData, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, method, url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	// Add custom headers
	if headers, ok := connector.Config["headers"].(string); ok {
		var headerMap map[string]string
		if err := json.Unmarshal([]byte(headers), &headerMap); err == nil {
			for k, v := range headerMap {
				req.Header.Set(k, v)
			}
		}
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("webhook returned status %d", resp.StatusCode)
}

// sendToTeams sends a notification to Microsoft Teams
func (cm *ConnectorManager) sendToTeams(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	webhookURL, ok := connector.Config["webhook_url"].(string)
	if !ok {
		return fmt.Errorf("Teams webhook URL not found")
	}

	color := "00ff00" // green
	if severity == "critical" || severity == "high" {
		color = "ff0000" // red
	} else if severity == "medium" {
		color = "ffaa00" // orange
	}

	payload := map[string]interface{}{
		"@type":    "MessageCard",
		"@context": "https://schema.org/extensions",
		"summary":  message,
		"themeColor": color,
		"title":    fmt.Sprintf("KubeGraf Alert: %s", eventType),
		"text":     message,
		"sections": []map[string]interface{}{
			{
				"activityTitle": eventType,
				"activitySubtitle": severity,
				"facts": []map[string]interface{}{},
			},
		},
	}

	jsonData, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("Teams webhook returned status %d", resp.StatusCode)
}

// sendToDiscord sends a notification to Discord
func (cm *ConnectorManager) sendToDiscord(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	webhookURL, ok := connector.Config["webhook_url"].(string)
	if !ok {
		return fmt.Errorf("Discord webhook URL not found")
	}

	color := 3066993 // green
	if severity == "critical" || severity == "high" {
		color = 15158332 // red
	} else if severity == "medium" {
		color = 16776960 // orange
	}

	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{
			{
				"title":       fmt.Sprintf("KubeGraf Alert: %s", eventType),
				"description": message,
				"color":      color,
				"timestamp":   time.Now().Format(time.RFC3339),
				"fields":     []map[string]interface{}{},
			},
		},
	}

	if username, ok := connector.Config["username"].(string); ok && username != "" {
		payload["username"] = username
	}

	jsonData, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("Discord webhook returned status %d", resp.StatusCode)
}

// sendToPagerDuty sends a notification to PagerDuty
func (cm *ConnectorManager) sendToPagerDuty(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	integrationKey, ok := connector.Config["integration_key"].(string)
	if !ok {
		return fmt.Errorf("PagerDuty integration key not found")
	}

	pagerDutySeverity := "info"
	if severity == "critical" {
		pagerDutySeverity = "critical"
	} else if severity == "high" {
		pagerDutySeverity = "error"
	} else if severity == "medium" {
		pagerDutySeverity = "warning"
	}

	payload := map[string]interface{}{
		"routing_key": integrationKey,
		"event_action": "trigger",
		"payload": map[string]interface{}{
			"summary":  message,
			"source":   "kubegraf",
			"severity": pagerDutySeverity,
			"custom_details": details,
		},
	}

	jsonData, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "POST", "https://events.pagerduty.com/v2/enqueue", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("PagerDuty API returned status %d", resp.StatusCode)
}

// sendToGitHub creates a GitHub issue
func (cm *ConnectorManager) sendToGitHub(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	token, ok := connector.Config["token"].(string)
	if !ok {
		return fmt.Errorf("GitHub token not found")
	}

	repo, ok := connector.Config["repository"].(string)
	if !ok {
		return fmt.Errorf("GitHub repository not found")
	}

	labels := []string{"kubegraf", "alert"}
	if severity == "critical" {
		labels = append(labels, "critical")
	}

	payload := map[string]interface{}{
		"title":  fmt.Sprintf("[%s] %s", severity, message),
		"body":   fmt.Sprintf("**Event Type:** %s\n\n**Message:** %s\n\n**Details:**\n```json\n%s\n```", eventType, message, formatDetails(details)),
		"labels": labels,
	}

	jsonData, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://api.github.com/repos/%s/issues", repo)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", fmt.Sprintf("token %s", token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
}

// sendToEmail sends an email notification (placeholder - requires SMTP library)
func (cm *ConnectorManager) sendToEmail(connector Connector, eventType string, severity string, message string, details map[string]interface{}) error {
	// In production, use a proper SMTP library like net/smtp or gomail
	// For now, just validate configuration
	required := []string{"smtp_host", "smtp_port", "username", "password", "from_email", "to_emails"}
	for _, key := range required {
		if val, ok := connector.Config[key].(string); !ok || val == "" {
			return fmt.Errorf("missing required field: %s", key)
		}
	}
	// TODO: Implement actual SMTP sending
	return fmt.Errorf("email sending not yet implemented")
}

// formatDetails formats details as JSON string
func formatDetails(details map[string]interface{}) string {
	jsonData, err := json.MarshalIndent(details, "", "  ")
	if err != nil {
		return fmt.Sprintf("%v", details)
	}
	return string(jsonData)
}

