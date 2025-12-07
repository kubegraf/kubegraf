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

package web

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/kubegraf/kubegraf/internal/update"
)

// HandleUpdateCheck handles GET /api/update/check
// Manual check for updates endpoint
// Takes WebServer as parameter instead of method
func HandleUpdateCheck(ws interface{}, w http.ResponseWriter, r *http.Request) {
	// Type assertion needed - this is getting complex
	// Let's keep handlers as methods for now
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentVersion := GetVersion()
	info, err := update.CheckGitHubLatestRelease(currentVersion)
	if err != nil {
		// Check if it's a rate limit error
		if err.Error() == "GitHub API rate limit exceeded (HTTP 429)" {
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"currentVersion":  currentVersion,
				"latestVersion":   currentVersion,
				"updateAvailable": false,
				"error":           "GitHub API rate limit exceeded. Please try again later.",
			})
			return
		}

		// Return cached result if available
		cached := update.CacheLatestRelease()
		if cached != nil {
			json.NewEncoder(w).Encode(cached)
			return
		}

		// Return error response
		json.NewEncoder(w).Encode(map[string]interface{}{
			"currentVersion":  currentVersion,
			"latestVersion":   currentVersion,
			"updateAvailable": false,
			"error":           err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(info)
}

// handleUpdateAutoCheck handles GET /api/update/auto-check
// Silent auto-check endpoint for background polling
func (ws *WebServer) handleUpdateAutoCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentVersion := GetVersion()
	
	// Try to get cached result first (fast path)
	cached := update.CacheLatestRelease()
	if cached != nil && update.GetCacheAge() < 4*time.Hour {
		json.NewEncoder(w).Encode(cached)
		return
	}

	// If cache is stale or missing, check GitHub (but don't block)
	info, err := update.CheckGitHubLatestRelease(currentVersion)
	if err != nil {
		// Return cached result even if stale, or return current version info
		if cached != nil {
			json.NewEncoder(w).Encode(cached)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"currentVersion":  currentVersion,
			"latestVersion":   currentVersion,
			"updateAvailable": false,
			"error":           err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(info)
}

