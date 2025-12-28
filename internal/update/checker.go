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

// GitHubRelease represents a GitHub release response (used internally by checker)
type GitHubRelease struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
	Assets      []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
		Size               int64  `json:"size"`
	} `json:"assets"`
}

var (
	cachedInfo     *UpdateInfo
	cacheMu        sync.RWMutex
	lastChecked    time.Time
	cacheDuration  = 4 * time.Hour // Cache duration for when update is available
	checkInProgress bool
	checkMu        sync.Mutex
)

// CheckGitHubLatestRelease fetches the latest release from GitHub API
func CheckGitHubLatestRelease(currentVersion string) (*UpdateInfo, error) {
	// Check cache first
	cacheMu.RLock()
	if cachedInfo != nil {
		// If cache shows update is available, use it if less than cacheDuration old
		if cachedInfo.UpdateAvailable && time.Since(lastChecked) < cacheDuration {
			info := *cachedInfo
			cacheMu.RUnlock()
			return &info, nil
		}
		// If cache shows no update, only use it if less than 15 minutes old
		// This ensures we detect new releases quickly
		if !cachedInfo.UpdateAvailable && time.Since(lastChecked) < 15*time.Minute {
			info := *cachedInfo
			cacheMu.RUnlock()
			return &info, nil
		}
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
		PublishedAt:     release.PublishedAt,
	}

	// Build assets list
	if len(release.Assets) > 0 {
		info.Assets = make([]ReleaseAsset, 0, len(release.Assets))
		for _, asset := range release.Assets {
			info.Assets = append(info.Assets, ReleaseAsset{
				Name:        asset.Name,
				DownloadURL: asset.BrowserDownloadURL,
				Size:        asset.Size,
			})
		}
	}

	// Find the appropriate download URL for the current OS and architecture
	if updateAvailable && len(release.Assets) > 0 {
		info.DownloadURL = findMatchingAsset(release.Assets, latestVersion)
		// Also try to find checksum URL
		info.ChecksumURL = findChecksumAsset(release.Assets)
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

// ClearCache clears the cached update info to force a fresh check
func ClearCache() {
	cacheMu.Lock()
	defer cacheMu.Unlock()
	cachedInfo = nil
	lastChecked = time.Time{}
}

// findMatchingAsset finds the download URL for the current OS and architecture
func findMatchingAsset(assets []struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}, version string) string {
	// Try to find a reasonable binary or archive
	// The update handler in updates.go will extract the correct binary for the platform
	for _, asset := range assets {
		assetName := strings.ToLower(asset.Name)

		// Skip checksums and non-binary files
		if strings.Contains(assetName, "checksum") || strings.Contains(assetName, ".txt") {
			continue
		}

		// Return the first binary or archive file
		// Prioritize .tar.gz for cross-platform compatibility
		if strings.Contains(assetName, ".tar.gz") {
			return asset.BrowserDownloadURL
		}
	}

	// If no .tar.gz, try .zip
	for _, asset := range assets {
		assetName := strings.ToLower(asset.Name)
		if strings.Contains(assetName, ".zip") {
			return asset.BrowserDownloadURL
		}
	}

	// If no archives, return the first binary-looking file
	for _, asset := range assets {
		assetName := strings.ToLower(asset.Name)
		if strings.Contains(assetName, "kubegraf") && !strings.Contains(assetName, "checksum") {
			return asset.BrowserDownloadURL
		}
	}

	// If no match found, return empty string
	return ""
}

// findChecksumAsset finds the checksum file asset URL
func findChecksumAsset(assets []struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}) string {
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if strings.Contains(name, "checksum") || strings.Contains(name, "sha256") {
			return asset.BrowserDownloadURL
		}
	}
	return ""
}
