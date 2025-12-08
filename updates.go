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
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// GitHubRelease represents a GitHub release
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

// UpdateInfo contains information about available updates
type UpdateInfo struct {
	CurrentVersion  string `json:"currentVersion"`
	LatestVersion   string `json:"latestVersion"`
	UpdateAvailable bool   `json:"updateAvailable"`
	ReleaseNotes    string `json:"releaseNotes"`
	DownloadURL     string `json:"downloadUrl"`
	HTMLURL         string `json:"htmlUrl"`
	PublishedAt     string `json:"publishedAt"`
	Error           string `json:"error,omitempty"`
}

// CheckForUpdates checks GitHub releases for a newer version
func CheckForUpdates() (*UpdateInfo, error) {
	currentVersion := GetVersion()

	// GitHub API endpoint for releases
	apiURL := "https://api.github.com/repos/kubegraf/kubegraf/releases/latest"

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers to avoid rate limiting
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "KubeGraf-Update-Checker")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch releases: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to parse release data: %w", err)
	}

	// Remove 'v' prefix if present for comparison
	latestVersion := strings.TrimPrefix(release.TagName, "v")
	currentVersionClean := strings.TrimPrefix(currentVersion, "v")

	updateAvailable := compareVersions(currentVersionClean, latestVersion) < 0

	// Construct GitHub release URL
	htmlURL := fmt.Sprintf("https://github.com/kubegraf/kubegraf/releases/tag/%s", release.TagName)
	if release.HTMLURL != "" {
		htmlURL = release.HTMLURL
	}

	info := &UpdateInfo{
		CurrentVersion:  currentVersion,
		LatestVersion:   latestVersion,
		UpdateAvailable: updateAvailable,
		ReleaseNotes:    release.Body,
		HTMLURL:         htmlURL,
		PublishedAt:     release.PublishedAt,
	}

	// Find the appropriate binary for this OS/arch
	if updateAvailable {
		osType := runtime.GOOS
		arch := runtime.GOARCH

		// Map Go arch to common names
		archMap := map[string]string{
			"amd64": "amd64",
			"arm64": "arm64",
			"386":   "386",
		}
		archName := archMap[arch]
		if archName == "" {
			archName = arch
		}

		// Map Go OS to common names
		osMap := map[string]string{
			"darwin":  "darwin",
			"linux":   "linux",
			"windows": "windows",
		}
		osName := osMap[osType]
		if osName == "" {
			osName = osType
		}

		// Look for matching asset
		ext := ""
		if osType == "windows" {
			ext = ".exe"
		}

		expectedName := fmt.Sprintf("kubegraf_%s_%s_%s%s", latestVersion, osName, archName, ext)
		expectedNameAlt := fmt.Sprintf("kubegraf-%s-%s-%s%s", latestVersion, osName, archName, ext)

		for _, asset := range release.Assets {
			if asset.Name == expectedName || asset.Name == expectedNameAlt ||
				strings.Contains(asset.Name, osName) && strings.Contains(asset.Name, archName) {
				info.DownloadURL = asset.BrowserDownloadURL
				break
			}
		}

		// If no specific binary found, try to find any archive
		if info.DownloadURL == "" {
			for _, asset := range release.Assets {
				if strings.Contains(asset.Name, ".tar.gz") || strings.Contains(asset.Name, ".zip") {
					info.DownloadURL = asset.BrowserDownloadURL
					break
				}
			}
		}
	}

	return info, nil
}

// compareVersions compares two version strings
// Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
func compareVersions(v1, v2 string) int {
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

// PerformUpdate downloads and installs the latest version
func PerformUpdate(downloadURL string) error {
	// Get the current executable path
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Resolve symlinks to get the real path
	realPath, err := filepath.EvalSymlinks(execPath)
	if err == nil {
		execPath = realPath
	}

	// Create temporary file for download
	tmpDir := os.TempDir()
	tmpFile := filepath.Join(tmpDir, "kubegraf-update")

	// Download the new binary
	client := &http.Client{
		Timeout: 5 * time.Minute,
	}

	resp, err := client.Get(downloadURL)
	if err != nil {
		return fmt.Errorf("failed to download update: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	// Check if it's an archive or a binary
	isArchive := strings.HasSuffix(downloadURL, ".tar.gz") ||
		strings.HasSuffix(downloadURL, ".zip") ||
		strings.Contains(downloadURL, ".tar.gz") ||
		strings.Contains(downloadURL, ".zip")

	if isArchive {
		// Handle archive extraction
		if strings.HasSuffix(downloadURL, ".tar.gz") || strings.Contains(downloadURL, ".tar.gz") {
			return extractAndInstallFromTarGz(resp.Body, execPath, tmpFile)
		} else if strings.HasSuffix(downloadURL, ".zip") || strings.Contains(downloadURL, ".zip") {
			return extractAndInstallFromZip(resp.Body, execPath, tmpFile)
		}
	}

	// Direct binary download
	out, err := os.Create(tmpFile)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer out.Close()

	// Make it executable (Unix-like)
	if runtime.GOOS != "windows" {
		if err := out.Chmod(0755); err != nil {
			return fmt.Errorf("failed to set permissions: %w", err)
		}
	}

	if _, err := io.Copy(out, resp.Body); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	if err := out.Close(); err != nil {
		return fmt.Errorf("failed to close temp file: %w", err)
	}

	// On Windows, we need to replace the file differently
	if runtime.GOOS == "windows" {
		// Move old binary to backup
		backupPath := execPath + ".old"
		if err := os.Rename(execPath, backupPath); err != nil {
			return fmt.Errorf("failed to backup old binary: %w", err)
		}

		// Move new binary into place
		if err := os.Rename(tmpFile, execPath); err != nil {
			// Restore backup on failure
			os.Rename(backupPath, execPath)
			return fmt.Errorf("failed to install new binary: %w", err)
		}

		// Clean up backup after a delay (in background)
		go func() {
			time.Sleep(5 * time.Second)
			os.Remove(backupPath)
		}()
	} else {
		// Unix-like: replace atomically
		if err := os.Rename(tmpFile, execPath); err != nil {
			return fmt.Errorf("failed to install new binary: %w", err)
		}
	}

	return nil
}

// extractAndInstallFromTarGz extracts kubegraf binary from tar.gz archive
func extractAndInstallFromTarGz(r io.Reader, execPath, tmpFile string) error {
	gzr, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar: %w", err)
		}

		// Look for kubegraf binary
		if header.Typeflag == tar.TypeReg &&
			(strings.Contains(header.Name, "kubegraf") || strings.HasSuffix(header.Name, "/kubegraf")) {
			out, err := os.Create(tmpFile)
			if err != nil {
				return fmt.Errorf("failed to create temp file: %w", err)
			}

			if runtime.GOOS != "windows" {
				out.Chmod(0755)
			}

			if _, err := io.Copy(out, tr); err != nil {
				out.Close()
				return fmt.Errorf("failed to extract binary: %w", err)
			}
			out.Close()

			// Install it
			if runtime.GOOS == "windows" {
				backupPath := execPath + ".old"
				os.Rename(execPath, backupPath)
				if err := os.Rename(tmpFile, execPath); err != nil {
					os.Rename(backupPath, execPath)
					return fmt.Errorf("failed to install: %w", err)
				}
				go func() {
					time.Sleep(5 * time.Second)
					os.Remove(backupPath)
				}()
			} else {
				if err := os.Rename(tmpFile, execPath); err != nil {
					return fmt.Errorf("failed to install: %w", err)
				}
			}

			return nil
		}
	}

	return fmt.Errorf("kubegraf binary not found in archive")
}

// extractAndInstallFromZip extracts kubegraf binary from zip archive
func extractAndInstallFromZip(r io.Reader, execPath, tmpFile string) error {
	// Read all data into memory (zip needs seek)
	data, err := io.ReadAll(r)
	if err != nil {
		return fmt.Errorf("failed to read zip: %w", err)
	}

	// Create a reader from bytes
	readerAt := bytes.NewReader(data)
	zipReader, err := zip.NewReader(readerAt, int64(len(data)))
	if err != nil {
		return fmt.Errorf("failed to open zip: %w", err)
	}

	for _, file := range zipReader.File {
		if strings.Contains(file.Name, "kubegraf") && !file.FileInfo().IsDir() {
			rc, err := file.Open()
			if err != nil {
				continue
			}

			out, err := os.Create(tmpFile)
			if err != nil {
				rc.Close()
				return fmt.Errorf("failed to create temp file: %w", err)
			}

			if runtime.GOOS != "windows" {
				out.Chmod(0755)
			}

			if _, err := io.Copy(out, rc); err != nil {
				rc.Close()
				out.Close()
				return fmt.Errorf("failed to extract binary: %w", err)
			}
			rc.Close()
			out.Close()

			// Install it
			if runtime.GOOS == "windows" {
				backupPath := execPath + ".old"
				os.Rename(execPath, backupPath)
				if err := os.Rename(tmpFile, execPath); err != nil {
					os.Rename(backupPath, execPath)
					return fmt.Errorf("failed to install: %w", err)
				}
				go func() {
					time.Sleep(5 * time.Second)
					os.Remove(backupPath)
				}()
			} else {
				if err := os.Rename(tmpFile, execPath); err != nil {
					return fmt.Errorf("failed to install: %w", err)
				}
			}

			return nil
		}
	}

	return fmt.Errorf("kubegraf binary not found in archive")
}

// RestartApplication restarts the application with the new binary
func RestartApplication() error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Get command line arguments (excluding the executable name)
	args := os.Args[1:]

	// Start new process
	cmd := exec.Command(execPath, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	// Start in background
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start new process: %w", err)
	}

	// Give it a moment to start
	time.Sleep(500 * time.Millisecond)

	// Exit current process
	os.Exit(0)

	return nil
}
