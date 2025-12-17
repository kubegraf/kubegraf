// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

// Package telemetry provides anonymous, privacy-respecting telemetry for KubeGraf.
// It tracks only download, install, and usage heartbeat events.
// No cluster data, kubeconfig, IPs, or user identity is ever collected.
package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/google/uuid"
)

const (
	// TelemetryEndpoint is the endpoint for telemetry events
	TelemetryEndpoint = "https://api.kubegraf.io/telemetry"

	// Timeout for telemetry requests
	requestTimeout = 2 * time.Second

	// HeartbeatInterval is the minimum interval between heartbeats
	HeartbeatInterval = 24 * time.Hour

	// ConfigFileName is the name of the config file
	ConfigFileName = "config.yaml"

	// InstallIDFileName is the name of the install ID file
	InstallIDFileName = "install_id"

	// TelemetryStateFileName is the name of the telemetry state file
	TelemetryStateFileName = "telemetry_state.json"

	// TransparencyMessage is shown to users about telemetry
	TransparencyMessage = `Anonymous telemetry helps us understand adoption and improve KubeGraf.
No cluster data or personal information is ever collected.`
)

// EventType represents the type of telemetry event
type EventType string

const (
	EventDownload  EventType = "download"
	EventInstall   EventType = "install"
	EventHeartbeat EventType = "heartbeat"
)

// Event represents a telemetry event
type Event struct {
	Event     EventType `json:"event"`
	InstallID string    `json:"install_id,omitempty"`
	OS        string    `json:"os"`
	Arch      string    `json:"arch"`
	Version   string    `json:"version"`
	Timestamp string    `json:"timestamp"`
}

// Config represents the telemetry configuration
type Config struct {
	Enabled bool `json:"enabled" yaml:"enabled"`
}

// State represents the telemetry state
type State struct {
	LastHeartbeat time.Time `json:"last_heartbeat"`
}

// Client is the telemetry client
type Client struct {
	mu          sync.Mutex
	baseDir     string
	version     string
	config      *Config
	installID   string
	state       *State
	httpClient  *http.Client
	initialized bool
	debug       bool
}

// NewClient creates a new telemetry client
func NewClient(version string) *Client {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	return &Client{
		baseDir: filepath.Join(homeDir, ".kubegraf"),
		version: version,
		httpClient: &http.Client{
			Timeout: requestTimeout,
		},
		debug: os.Getenv("KUBEGRAF_TELEMETRY_DEBUG") == "1",
	}
}

// Initialize initializes the telemetry client.
// This should be called once at startup.
// It never blocks or fails the application startup.
func (c *Client) Initialize(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.initialized {
		return
	}

	// Ensure base directory exists
	if err := os.MkdirAll(c.baseDir, 0755); err != nil {
		c.debugLog("failed to create base directory: %v", err)
		return
	}

	// Load config
	c.loadConfig()

	// If telemetry is disabled, skip initialization
	if c.config != nil && !c.config.Enabled {
		c.debugLog("telemetry is disabled")
		c.initialized = true
		return
	}

	// Load or create install ID
	c.loadOrCreateInstallID()

	// Load state
	c.loadState()

	c.initialized = true
}

// IsEnabled returns true if telemetry is enabled
func (c *Client) IsEnabled() bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.config == nil {
		return true // Default to enabled
	}
	return c.config.Enabled
}

// Enable enables telemetry
func (c *Client) Enable() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.config == nil {
		c.config = &Config{}
	}
	c.config.Enabled = true
	return c.saveConfig()
}

// Disable disables telemetry
func (c *Client) Disable() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.config == nil {
		c.config = &Config{}
	}
	c.config.Enabled = false
	return c.saveConfig()
}

// GetInstallID returns the install ID (for display purposes)
func (c *Client) GetInstallID() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.installID
}

// TrackInstall tracks the first-time installation event.
// This should be called once on first startup.
func (c *Client) TrackInstall(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.initialized || (c.config != nil && !c.config.Enabled) {
		return
	}

	// Check if already installed
	installIDPath := filepath.Join(c.baseDir, InstallIDFileName)
	if _, err := os.Stat(installIDPath); err == nil {
		// Install ID already exists, this is not a first-time install
		c.debugLog("install already tracked")
		return
	}

	// Generate and save install ID
	c.installID = uuid.New().String()
	if err := os.WriteFile(installIDPath, []byte(c.installID), 0644); err != nil {
		c.debugLog("failed to save install ID: %v", err)
		return
	}

	// Send install event
	event := Event{
		Event:     EventInstall,
		InstallID: c.installID,
		OS:        runtime.GOOS,
		Arch:      runtime.GOARCH,
		Version:   c.version,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	c.sendEventAsync(ctx, event)
}

// TrackHeartbeat tracks a heartbeat event.
// This is rate-limited to once per 24 hours.
func (c *Client) TrackHeartbeat(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.initialized || (c.config != nil && !c.config.Enabled) {
		return
	}

	if c.installID == "" {
		c.debugLog("no install ID, skipping heartbeat")
		return
	}

	// Check rate limit
	if c.state != nil && time.Since(c.state.LastHeartbeat) < HeartbeatInterval {
		c.debugLog("heartbeat rate limited, last: %v", c.state.LastHeartbeat)
		return
	}

	// Send heartbeat event
	event := Event{
		Event:     EventHeartbeat,
		InstallID: c.installID,
		Version:   c.version,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	// Update state before sending (optimistic)
	if c.state == nil {
		c.state = &State{}
	}
	c.state.LastHeartbeat = time.Now()
	c.saveState()

	c.sendEventAsync(ctx, event)
}

// sendEventAsync sends an event asynchronously.
// It never blocks and silently ignores errors.
func (c *Client) sendEventAsync(ctx context.Context, event Event) {
	go func() {
		c.sendEvent(ctx, event)
	}()
}

// sendEvent sends an event to the telemetry endpoint.
// It silently ignores all errors.
func (c *Client) sendEvent(ctx context.Context, event Event) {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()

	body, err := json.Marshal(event)
	if err != nil {
		c.debugLog("failed to marshal event: %v", err)
		return
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, TelemetryEndpoint, bytes.NewReader(body))
	if err != nil {
		c.debugLog("failed to create request: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", fmt.Sprintf("KubeGraf/%s", c.version))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.debugLog("failed to send event: %v", err)
		return
	}
	defer resp.Body.Close()

	c.debugLog("event sent: %s, status: %d", event.Event, resp.StatusCode)
}

// loadConfig loads the telemetry config from disk
func (c *Client) loadConfig() {
	configPath := filepath.Join(c.baseDir, ConfigFileName)
	data, err := os.ReadFile(configPath)
	if err != nil {
		// Config doesn't exist, use defaults
		c.config = &Config{Enabled: true}
		return
	}

	// Parse YAML config
	config := &Config{Enabled: true} // Default to enabled

	// Simple YAML parsing for telemetry.enabled
	// We look for "telemetry:" section and "enabled:" key
	lines := bytes.Split(data, []byte("\n"))
	inTelemetry := false
	for _, line := range lines {
		trimmed := bytes.TrimSpace(line)
		if bytes.HasPrefix(trimmed, []byte("telemetry:")) {
			inTelemetry = true
			continue
		}
		if inTelemetry && bytes.HasPrefix(trimmed, []byte("enabled:")) {
			if bytes.Contains(trimmed, []byte("false")) {
				config.Enabled = false
			}
			break
		}
		// Check if we're leaving the telemetry section
		if inTelemetry && len(trimmed) > 0 && !bytes.HasPrefix(line, []byte(" ")) && !bytes.HasPrefix(line, []byte("\t")) {
			break
		}
	}

	c.config = config
}

// saveConfig saves the telemetry config to disk
func (c *Client) saveConfig() error {
	configPath := filepath.Join(c.baseDir, ConfigFileName)

	// Read existing config or create new
	var existingContent []byte
	var err error
	if existingContent, err = os.ReadFile(configPath); err != nil {
		existingContent = []byte{}
	}

	// Simple YAML update/append
	var newContent []byte
	lines := bytes.Split(existingContent, []byte("\n"))
	found := false
	inTelemetry := false

	for i, line := range lines {
		trimmed := bytes.TrimSpace(line)
		if bytes.HasPrefix(trimmed, []byte("telemetry:")) {
			inTelemetry = true
			newContent = append(newContent, line...)
			newContent = append(newContent, '\n')
			continue
		}
		if inTelemetry && bytes.HasPrefix(trimmed, []byte("enabled:")) {
			// Replace the enabled line
			newContent = append(newContent, []byte(fmt.Sprintf("  enabled: %t", c.config.Enabled))...)
			newContent = append(newContent, '\n')
			found = true
			inTelemetry = false // Done with telemetry section
			continue
		}
		// Check if we're leaving the telemetry section without finding enabled
		if inTelemetry && len(trimmed) > 0 && !bytes.HasPrefix(line, []byte(" ")) && !bytes.HasPrefix(line, []byte("\t")) {
			// Insert enabled before this line
			newContent = append(newContent, []byte(fmt.Sprintf("  enabled: %t\n", c.config.Enabled))...)
			found = true
			inTelemetry = false
		}
		newContent = append(newContent, line...)
		if i < len(lines)-1 {
			newContent = append(newContent, '\n')
		}
	}

	// If we ended while still in telemetry section
	if inTelemetry && !found {
		newContent = append(newContent, []byte(fmt.Sprintf("  enabled: %t\n", c.config.Enabled))...)
		found = true
	}

	// If telemetry section not found, append it
	if !found {
		if len(newContent) > 0 && !bytes.HasSuffix(newContent, []byte("\n")) {
			newContent = append(newContent, '\n')
		}
		newContent = append(newContent, []byte(fmt.Sprintf("telemetry:\n  enabled: %t\n", c.config.Enabled))...)
	}

	return os.WriteFile(configPath, newContent, 0644)
}

// loadOrCreateInstallID loads or creates the install ID
func (c *Client) loadOrCreateInstallID() {
	installIDPath := filepath.Join(c.baseDir, InstallIDFileName)
	data, err := os.ReadFile(installIDPath)
	if err == nil && len(data) > 0 {
		c.installID = string(bytes.TrimSpace(data))
		return
	}
	// Install ID will be created on first TrackInstall call
}

// loadState loads the telemetry state from disk
func (c *Client) loadState() {
	statePath := filepath.Join(c.baseDir, TelemetryStateFileName)
	data, err := os.ReadFile(statePath)
	if err != nil {
		c.state = &State{}
		return
	}

	state := &State{}
	if err := json.Unmarshal(data, state); err != nil {
		c.state = &State{}
		return
	}

	c.state = state
}

// saveState saves the telemetry state to disk
func (c *Client) saveState() error {
	statePath := filepath.Join(c.baseDir, TelemetryStateFileName)
	data, err := json.MarshalIndent(c.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(statePath, data, 0644)
}

// debugLog logs a debug message if debug mode is enabled
func (c *Client) debugLog(format string, args ...interface{}) {
	if c.debug {
		log.Printf("[telemetry] "+format, args...)
	}
}

// Status returns a human-readable status of telemetry
func (c *Client) Status() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	var status string
	if c.config != nil && !c.config.Enabled {
		status = "Telemetry: DISABLED\n"
	} else {
		status = "Telemetry: ENABLED\n"
	}

	if c.installID != "" {
		status += fmt.Sprintf("Install ID: %s\n", c.installID)
	}

	if c.state != nil && !c.state.LastHeartbeat.IsZero() {
		status += fmt.Sprintf("Last heartbeat: %s\n", c.state.LastHeartbeat.Format(time.RFC3339))
	}

	status += "\n" + TransparencyMessage

	return status
}

