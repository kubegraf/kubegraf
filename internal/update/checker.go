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

package update

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// UpdateInfo contains information about available updates
type UpdateInfo struct {
	CurrentVersion  string `json:"currentVersion"`
	LatestVersion   string `json:"latestVersion"`
	UpdateAvailable bool   `json:"updateAvailable"`
	ReleaseNotes    string `json:"releaseNotes"`
	HTMLURL         string `json:"htmlUrl"`
}

// GitHubRelease represents a GitHub release response
type GitHubRelease struct {
	TagName  string `json:"tag_name"`
	Name     string `json:"name"`
	Body     string `json:"body"`
	HTMLURL  string `json:"html_url"`
	PublishedAt string `json:"published_at"`
}

var (
	cachedInfo     *UpdateInfo
	cacheMu        sync.RWMutex
	lastChecked    time.Time
	cacheDuration  = 4 * time.Hour
	checkInProgress bool
	checkMu        sync.Mutex
)

// CheckGitHubLatestRelease fetches the latest release from GitHub API
func CheckGitHubLatestRelease(currentVersion string) (*UpdateInfo, error) {
	// Check cache first
	cacheMu.RLock()
	if cachedInfo != nil && time.Since(lastChecked) < cacheDuration {
		info := *cachedInfo
		cacheMu.RUnlock()
		return &info, nil
	}
	cacheMu.RUnlock()

	// Prevent concurrent checks
	checkMu.Lock()
	if checkInProgress {
		checkMu.Unlock()
		// Wait a bit and return cached result if available
		time.Sleep(100 * time.Millisecond)
		cacheMu.RLock()
		if cachedInfo != nil {
			info := *cachedInfo
			cacheMu.RUnlock()
			return &info, nil
		}
		cacheMu.RUnlock()
		return &UpdateInfo{
			CurrentVersion:  currentVersion,
			LatestVersion:   currentVersion,
			UpdateAvailable: false,
		}, nil
	}
	checkInProgress = true
	checkMu.Unlock()

	defer func() {
		checkMu.Lock()
		checkInProgress = false
		checkMu.Unlock()
	}()

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// GitHub API endpoint
	apiURL := "https://api.github.com/repos/kubegraf/kubegraf/releases/latest"

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers to avoid rate limiting
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "KubeGraf-Update-Checker/1.0")

	resp, err := client.Do(req)
	if err != nil {
		// Return cached result if available
		cacheMu.RLock()
		if cachedInfo != nil {
			info := *cachedInfo
			cacheMu.RUnlock()
			return &info, nil
		}
		cacheMu.RUnlock()
		return nil, fmt.Errorf("failed to fetch releases: %w", err)
	}
	defer resp.Body.Close()

	// Handle rate limiting
	if resp.StatusCode == http.StatusTooManyRequests {
		// Return cached result if available
		cacheMu.RLock()
		if cachedInfo != nil {
			info := *cachedInfo
			cacheMu.RUnlock()
			return &info, nil
		}
		cacheMu.RUnlock()
		return nil, fmt.Errorf("GitHub API rate limit exceeded (HTTP 429)")
	}

	if resp.StatusCode != http.StatusOK {
		// Return cached result if available
		cacheMu.RLock()
		if cachedInfo != nil {
			info := *cachedInfo
			cacheMu.RUnlock()
			return &info, nil
		}
		cacheMu.RUnlock()
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		// Return cached result if available
		cacheMu.RLock()
		if cachedInfo != nil {
			info := *cachedInfo
			cacheMu.RUnlock()
			return &info, nil
		}
		cacheMu.RUnlock()
		return nil, fmt.Errorf("failed to parse release data: %w", err)
	}

	// Strip 'v' prefix from version tags
	latestVersion := strings.TrimPrefix(release.TagName, "v")
	currentVersionClean := strings.TrimPrefix(currentVersion, "v")

	// Compare versions
	updateAvailable := CompareVersions(currentVersionClean, latestVersion) < 0

	info := &UpdateInfo{
		CurrentVersion:  currentVersion,
		LatestVersion:   latestVersion,
		UpdateAvailable: updateAvailable,
		ReleaseNotes:    release.Body,
		HTMLURL:         release.HTMLURL,
	}

	// Update cache
	cacheMu.Lock()
	cachedInfo = info
	lastChecked = time.Now()
	cacheMu.Unlock()

	return info, nil
}

// CompareVersions compares two version strings
// Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
func CompareVersions(v1, v2 string) int {
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for i := 0; i < maxLen; i++ {
		var p1, p2 int
		if i < len(parts1) {
			fmt.Sscanf(parts1[i], "%d", &p1)
		}
		if i < len(parts2) {
			fmt.Sscanf(parts2[i], "%d", &p2)
		}

		if p1 < p2 {
			return -1
		}
		if p1 > p2 {
			return 1
		}
	}

	return 0
}

// CacheLatestRelease returns the cached update info if available
func CacheLatestRelease() *UpdateInfo {
	cacheMu.RLock()
	defer cacheMu.RUnlock()
	if cachedInfo != nil {
		info := *cachedInfo
		return &info
	}
	return nil
}

// GetCacheAge returns how long ago the cache was last updated
func GetCacheAge() time.Duration {
	cacheMu.RLock()
	defer cacheMu.RUnlock()
	return time.Since(lastChecked)
}

