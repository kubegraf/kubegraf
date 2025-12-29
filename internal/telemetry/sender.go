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

package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"runtime"
	"time"
)

const (
	// TelemetryEndpoint is the endpoint for install events
	// This should point to a privacy-preserving backend that:
	// - Does NOT store IP addresses
	// - Does NOT log request headers beyond content-type
	// - Does NOT create user profiles
	TelemetryEndpoint = "https://api.kubegraf.io/telemetry/install"

	// RequestTimeout is the timeout for the telemetry request
	RequestTimeout = 3 * time.Second
)

// InstallEvent represents an anonymous install event
type InstallEvent struct {
	Event         string `json:"event"`          // Always "install"
	Version       string `json:"version"`        // KubeGraf version (e.g. "1.7.35")
	OS            string `json:"os"`             // Operating system (windows, darwin, linux)
	Arch          string `json:"arch"`           // Architecture (amd64, arm64)
	InstallMethod string `json:"install_method"` // How it was installed
	Timestamp     string `json:"timestamp"`      // RFC3339 UTC timestamp
}

// SendInstallEvent sends a one-time anonymous install event.
// This function:
// - Is fire-and-forget (does not block on errors)
// - Has a 3-second timeout
// - Does NOT retry on failure
// - Does NOT send any identifiers, IPs, or personal data
func SendInstallEvent(version string) {
	// Run in background goroutine (non-blocking)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), RequestTimeout)
		defer cancel()

		// Detect install method
		installMethod := DetectInstallMethod()

		// Create event payload
		event := InstallEvent{
			Event:         "install",
			Version:       version,
			OS:            runtime.GOOS,
			Arch:          runtime.GOARCH,
			InstallMethod: string(installMethod),
			Timestamp:     time.Now().UTC().Format(time.RFC3339),
		}

		// Marshal to JSON
		payload, err := json.Marshal(event)
		if err != nil {
			// Silent failure (best effort)
			return
		}

		// Create HTTP request
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, TelemetryEndpoint, bytes.NewReader(payload))
		if err != nil {
			// Silent failure
			return
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "KubeGraf/"+version)

		// Send request
		client := &http.Client{
			Timeout: RequestTimeout,
		}

		resp, err := client.Do(req)
		if err != nil {
			// Silent failure (network error, timeout, etc.)
			return
		}
		defer resp.Body.Close()

		// We don't check response status - best effort
		// Event sent successfully (or not, we don't care)
	}()
}

// RunFirstTimeSetup handles the complete first-run telemetry setup.
// This should be called ONCE on application startup, BEFORE any other operations.
// It will:
// 1. Check if this is the first run
// 2. If yes, prompt the user for consent (with timeout)
// 3. If user opts in, send ONE anonymous install event
// 4. Never prompt again
func RunFirstTimeSetup(version string) {
	// Only run on first execution
	if !IsFirstRun() {
		return
	}

	// Prompt user and record decision
	enabled := HandleFirstRun()

	// If user opted in, send install event
	if enabled {
		SendInstallEvent(version)
	}
}
