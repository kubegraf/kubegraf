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
	"archive/tar"
	"archive/zip"
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// DownloadConfig contains configuration for downloading updates
type DownloadConfig struct {
	URL           string
	ChecksumURL   string
	DestPath      string
	ProgressFunc  func(progress DownloadProgress)
	Timeout       time.Duration
}

// DownloadProgress represents the progress of a download
type DownloadProgress struct {
	BytesDownloaded int64
	BytesTotal      int64
	Speed           int64 // bytes per second
	Percentage      float64
}

// Downloader handles downloading update files
type Downloader struct {
	client    *http.Client
	mu        sync.Mutex
	progress  DownloadProgress
	cancelled bool
}

// NewDownloader creates a new Downloader instance
func NewDownloader() *Downloader {
	return &Downloader{
		client: &http.Client{
			Timeout: 10 * time.Minute,
		},
	}
}

// Download downloads a file from URL to destPath with optional checksum verification
func (d *Downloader) Download(ctx context.Context, config DownloadConfig) error {
	d.mu.Lock()
	d.cancelled = false
	d.progress = DownloadProgress{}
	d.mu.Unlock()

	// Set timeout if specified
	if config.Timeout > 0 {
		d.client.Timeout = config.Timeout
	}

	// Create request with context
	req, err := http.NewRequestWithContext(ctx, "GET", config.URL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "KubeGraf-Updater/1.0")

	// Make the request
	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	// Create destination directory if it doesn't exist
	destDir := filepath.Dir(config.DestPath)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	// Create destination file
	out, err := os.Create(config.DestPath)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer out.Close()

	// Set up progress tracking
	d.mu.Lock()
	d.progress.BytesTotal = resp.ContentLength
	d.mu.Unlock()

	// Create progress reader
	progressReader := &progressReader{
		reader:   resp.Body,
		total:    resp.ContentLength,
		callback: config.ProgressFunc,
		start:    time.Now(),
	}

	// Copy with progress
	_, err = io.Copy(out, progressReader)
	if err != nil {
		os.Remove(config.DestPath)
		return fmt.Errorf("failed to write file: %w", err)
	}

	// Close file before checksum verification
	if err := out.Close(); err != nil {
		return fmt.Errorf("failed to close file: %w", err)
	}

	// Verify checksum if URL provided
	if config.ChecksumURL != "" {
		if err := d.verifyChecksum(ctx, config.DestPath, config.ChecksumURL); err != nil {
			os.Remove(config.DestPath)
			return fmt.Errorf("checksum verification failed: %w", err)
		}
	}

	return nil
}

// verifyChecksum verifies the downloaded file against the checksum from checksumURL
func (d *Downloader) verifyChecksum(ctx context.Context, filePath, checksumURL string) error {
	// Download checksum file
	req, err := http.NewRequestWithContext(ctx, "GET", checksumURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create checksum request: %w", err)
	}

	req.Header.Set("User-Agent", "KubeGraf-Updater/1.0")

	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download checksum: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("checksum download failed with status %d", resp.StatusCode)
	}

	// Read checksum content
	checksumContent, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read checksum: %w", err)
	}

	// Parse checksums (format: "checksum  filename" or "checksum filename")
	expectedChecksum, err := parseChecksumFile(string(checksumContent), filepath.Base(filePath))
	if err != nil {
		return err
	}

	// Calculate actual checksum
	actualChecksum, err := calculateFileSHA256(filePath)
	if err != nil {
		return fmt.Errorf("failed to calculate checksum: %w", err)
	}

	// Compare checksums
	if !strings.EqualFold(expectedChecksum, actualChecksum) {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
	}

	return nil
}

// parseChecksumFile parses a checksum file and returns the checksum for the given filename
func parseChecksumFile(content, filename string) (string, error) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Split by whitespace (handles both "checksum  filename" and "checksum filename")
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			checksum := parts[0]
			name := parts[len(parts)-1]

			// Remove leading * (BSD style) or any path prefix
			name = strings.TrimPrefix(name, "*")
			name = filepath.Base(name)

			if name == filename {
				return checksum, nil
			}
		}

		// Also check if the line is just a checksum (single file)
		if len(parts) == 1 {
			return parts[0], nil
		}
	}

	return "", fmt.Errorf("checksum not found for %s", filename)
}

// calculateFileSHA256 calculates the SHA256 checksum of a file
func calculateFileSHA256(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}

	return hex.EncodeToString(h.Sum(nil)), nil
}

// Cancel cancels the current download
func (d *Downloader) Cancel() {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.cancelled = true
}

// progressReader wraps an io.Reader to track progress
type progressReader struct {
	reader   io.Reader
	total    int64
	current  int64
	callback func(progress DownloadProgress)
	start    time.Time
	lastUpdate time.Time
}

func (pr *progressReader) Read(p []byte) (int, error) {
	n, err := pr.reader.Read(p)
	pr.current += int64(n)

	// Update progress (throttle to every 100ms)
	if pr.callback != nil && time.Since(pr.lastUpdate) > 100*time.Millisecond {
		elapsed := time.Since(pr.start).Seconds()
		var speed int64
		if elapsed > 0 {
			speed = int64(float64(pr.current) / elapsed)
		}

		var percentage float64
		if pr.total > 0 {
			percentage = float64(pr.current) / float64(pr.total) * 100
		}

		pr.callback(DownloadProgress{
			BytesDownloaded: pr.current,
			BytesTotal:      pr.total,
			Speed:           speed,
			Percentage:      percentage,
		})
		pr.lastUpdate = time.Now()
	}

	return n, err
}

// ExtractBinary extracts the kubegraf binary from an archive
func ExtractBinary(archivePath, destPath string) error {
	// Determine archive type from extension
	if strings.HasSuffix(archivePath, ".tar.gz") || strings.HasSuffix(archivePath, ".tgz") {
		return extractFromTarGz(archivePath, destPath)
	} else if strings.HasSuffix(archivePath, ".zip") {
		return extractFromZip(archivePath, destPath)
	}

	// If not an archive, assume it's a direct binary
	return os.Rename(archivePath, destPath)
}

// extractFromTarGz extracts kubegraf binary from a tar.gz archive
func extractFromTarGz(archivePath, destPath string) error {
	f, err := os.Open(archivePath)
	if err != nil {
		return fmt.Errorf("failed to open archive: %w", err)
	}
	defer f.Close()

	gzr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	// Look for kubegraf binary
	binaryName := "kubegraf"
	if runtime.GOOS == "windows" {
		binaryName = "kubegraf.exe"
	}

	// Track all files found for debugging
	var foundFiles []string

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar: %w", err)
		}

		// Track all regular files
		if header.Typeflag == tar.TypeReg {
			foundFiles = append(foundFiles, header.Name)
		}

		// Check if this is the kubegraf binary (case-insensitive)
		name := filepath.Base(header.Name)
		nameLower := strings.ToLower(name)
		binaryNameLower := strings.ToLower(binaryName)

		if header.Typeflag == tar.TypeReg &&
			(nameLower == binaryNameLower ||
			 strings.HasSuffix(strings.ToLower(header.Name), "/"+binaryNameLower) ||
			 nameLower == "kubegraf" || nameLower == "kubegraf.exe") {

			out, err := os.Create(destPath)
			if err != nil {
				return fmt.Errorf("failed to create destination: %w", err)
			}

			if runtime.GOOS != "windows" {
				out.Chmod(0755)
			}

			_, err = io.Copy(out, tr)
			out.Close()
			if err != nil {
				return fmt.Errorf("failed to extract binary: %w", err)
			}

			return nil
		}
	}

	// If we get here, binary was not found - provide helpful error message
	return fmt.Errorf("kubegraf binary not found in archive (expected: %s, found: %v)", binaryName, foundFiles)
}

// extractFromZip extracts kubegraf binary from a zip archive
func extractFromZip(archivePath, destPath string) error {
	// Read entire zip into memory (zip requires seek)
	data, err := os.ReadFile(archivePath)
	if err != nil {
		return fmt.Errorf("failed to read archive: %w", err)
	}

	readerAt := bytes.NewReader(data)
	zipReader, err := zip.NewReader(readerAt, int64(len(data)))
	if err != nil {
		return fmt.Errorf("failed to open zip: %w", err)
	}

	// Look for kubegraf binary
	binaryName := "kubegraf"
	if runtime.GOOS == "windows" {
		binaryName = "kubegraf.exe"
	}

	// Track all files found for debugging
	var foundFiles []string

	for _, file := range zipReader.File {
		// Track all regular files
		if !file.FileInfo().IsDir() {
			foundFiles = append(foundFiles, file.Name)
		}

		// Check if this is the kubegraf binary (case-insensitive)
		name := filepath.Base(file.Name)
		nameLower := strings.ToLower(name)
		binaryNameLower := strings.ToLower(binaryName)

		if !file.FileInfo().IsDir() &&
			(nameLower == binaryNameLower ||
			 strings.HasSuffix(strings.ToLower(file.Name), "/"+binaryNameLower) ||
			 nameLower == "kubegraf" || nameLower == "kubegraf.exe") {

			rc, err := file.Open()
			if err != nil {
				return fmt.Errorf("failed to open file in zip: %w", err)
			}

			out, err := os.Create(destPath)
			if err != nil {
				rc.Close()
				return fmt.Errorf("failed to create destination: %w", err)
			}

			if runtime.GOOS != "windows" {
				out.Chmod(0755)
			}

			_, err = io.Copy(out, rc)
			rc.Close()
			out.Close()

			if err != nil {
				return fmt.Errorf("failed to extract binary: %w", err)
			}

			return nil
		}
	}

	// If we get here, binary was not found - provide helpful error message
	return fmt.Errorf("kubegraf binary not found in archive (expected: %s, found: %v)", binaryName, foundFiles)
}

// GetTempDownloadPath returns a temporary path for downloading updates
func GetTempDownloadPath(filename string) string {
	return filepath.Join(os.TempDir(), "kubegraf-update", filename)
}

// GetExpectedAssetName returns the expected asset name for the current platform
func GetExpectedAssetName(version string) string {
	osName := runtime.GOOS
	archName := runtime.GOARCH

	ext := ""
	if osName == "windows" {
		ext = ".exe"
	}

	// Try different naming conventions
	return fmt.Sprintf("kubegraf_%s_%s_%s%s", version, osName, archName, ext)
}

// FindMatchingAsset finds the best matching asset for the current platform
func FindMatchingAsset(assets []ReleaseAsset, version string) *ReleaseAsset {
	osName := runtime.GOOS
	archName := runtime.GOARCH

	// Build search patterns
	patterns := []string{
		// Exact match patterns
		fmt.Sprintf("kubegraf_%s_%s_%s", version, osName, archName),
		fmt.Sprintf("kubegraf-%s-%s-%s", version, osName, archName),
		fmt.Sprintf("kubegraf_%s_%s", osName, archName),
		fmt.Sprintf("kubegraf-%s-%s", osName, archName),
	}

	// Windows needs .exe
	if osName == "windows" {
		for i, p := range patterns {
			patterns[i] = p + ".exe"
		}
	}

	// First pass: exact match
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		for _, pattern := range patterns {
			if name == strings.ToLower(pattern) {
				return &asset
			}
		}
	}

	// Second pass: contains OS and arch
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)

		// Skip checksums
		if strings.Contains(name, "checksum") || strings.HasSuffix(name, ".txt") {
			continue
		}

		// Check if contains OS and arch
		if strings.Contains(name, osName) && strings.Contains(name, archName) {
			return &asset
		}
	}

	// Third pass: any archive
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)

		// Skip checksums
		if strings.Contains(name, "checksum") || strings.HasSuffix(name, ".txt") {
			continue
		}

		// Accept any tar.gz or zip
		if strings.HasSuffix(name, ".tar.gz") || strings.HasSuffix(name, ".zip") {
			return &asset
		}
	}

	return nil
}

// FindChecksumAsset finds the checksum file asset
func FindChecksumAsset(assets []ReleaseAsset) *ReleaseAsset {
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if strings.Contains(name, "checksum") || strings.Contains(name, "sha256") {
			return &asset
		}
	}
	return nil
}
