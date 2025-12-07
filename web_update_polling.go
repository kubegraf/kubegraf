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
	"log"
	"time"

	"github.com/kubegraf/kubegraf/internal/update"
)

// startUpdatePolling starts a background goroutine that checks for updates every 4 hours
func (ws *WebServer) startUpdatePolling() {
	// Initial check after 1 minute (to not slow down startup)
	time.Sleep(1 * time.Minute)

	// Then check every 4 hours
	ticker := time.NewTicker(4 * time.Hour)
	defer ticker.Stop()

	// Do initial check
	ws.checkForUpdatesBackground()

	// Continue checking every 4 hours
	for {
		select {
		case <-ticker.C:
			ws.checkForUpdatesBackground()
		case <-ws.stopCh:
			return
		}
	}
}

// checkForUpdatesBackground performs a background update check and caches the result
func (ws *WebServer) checkForUpdatesBackground() {
	currentVersion := GetVersion()
	
	// This will cache the result automatically
	_, err := update.CheckGitHubLatestRelease(currentVersion)
	if err != nil {
		// Log error but don't fail - we'll use cached result if available
		log.Printf("Background update check failed: %v (will retry in 4 hours)", err)
		return
	}

	// Log success (only if update is available to reduce noise)
	cached := update.CacheLatestRelease()
	if cached != nil && cached.UpdateAvailable {
		log.Printf("Update available: %s -> %s", cached.CurrentVersion, cached.LatestVersion)
	}
}

