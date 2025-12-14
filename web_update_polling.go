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

// startUpdatePolling starts a background goroutine that checks for updates every 15 minutes
// This ensures long-running apps (like kubegraf web --port 3003) detect new releases quickly
func (ws *WebServer) startUpdatePolling() {
	// Initial check after 1 minute (to not slow down startup)
	time.Sleep(1 * time.Minute)

	// Do initial check
	ws.checkForUpdatesBackground()

	// Check every 15 minutes to match frontend cache expiration
	// This ensures long-running apps detect new releases within 15 minutes
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	// Continue checking every 15 minutes
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
		log.Printf("Background update check failed: %v (will retry in 15 minutes)", err)
		return
	}

	// Log success (only if update is available to reduce noise)
	cached := update.CacheLatestRelease()
	if cached != nil && cached.UpdateAvailable {
		log.Printf("Update available: %s -> %s", cached.CurrentVersion, cached.LatestVersion)
	}
}


