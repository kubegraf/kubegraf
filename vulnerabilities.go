// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NVD API structures
type NVDResponse struct {
	ResultsPerPage  int       `json:"resultsPerPage"`
	StartIndex      int       `json:"startIndex"`
	TotalResults    int       `json:"totalResults"`
	Format          string    `json:"format"`
	Version         string    `json:"version"`
	Timestamp       string    `json:"timestamp"`
	Vulnerabilities []NVDVuln `json:"vulnerabilities"`
}

type NVDVuln struct {
	CVE NVDCVE `json:"cve"`
}

type NVDCVE struct {
	ID               string        `json:"id"`
	SourceIdentifier string        `json:"sourceIdentifier"`
	Published        string        `json:"published"`
	LastModified     string        `json:"lastModified"`
	VulnStatus       string        `json:"vulnStatus"`
	Descriptions     []NVDDesc     `json:"descriptions"`
	Metrics          NVDMetrics    `json:"metrics"`
	Weaknesses       []NVDWeakness `json:"weaknesses"`
	References       []NVDRef      `json:"references"`
}

type NVDDesc struct {
	Lang  string `json:"lang"`
	Value string `json:"value"`
}

type NVDMetrics struct {
	CvssMetricV31 []CVSSMetricV31 `json:"cvssMetricV31"`
	CvssMetricV30 []CVSSMetricV30 `json:"cvssMetricV30"`
	CvssMetricV2  []CVSSMetricV2  `json:"cvssMetricV2"`
}

type CVSSMetricV31 struct {
	Source              string   `json:"source"`
	Type                string   `json:"type"`
	CvssData            CVSSData `json:"cvssData"`
	ExploitabilityScore float64  `json:"exploitabilityScore"`
	ImpactScore         float64  `json:"impactScore"`
}

type CVSSMetricV30 struct {
	Source              string   `json:"source"`
	Type                string   `json:"type"`
	CvssData            CVSSData `json:"cvssData"`
	ExploitabilityScore float64  `json:"exploitabilityScore"`
	ImpactScore         float64  `json:"impactScore"`
}

type CVSSMetricV2 struct {
	Source              string     `json:"source"`
	Type                string     `json:"type"`
	CvssData            CVSSDataV2 `json:"cvssData"`
	BaseSeverity        string     `json:"baseSeverity"`
	ExploitabilityScore float64    `json:"exploitabilityScore"`
	ImpactScore         float64    `json:"impactScore"`
}

type CVSSData struct {
	Version               string  `json:"version"`
	VectorString          string  `json:"vectorString"`
	AttackVector          string  `json:"attackVector"`
	AttackComplexity      string  `json:"attackComplexity"`
	PrivilegesRequired    string  `json:"privilegesRequired"`
	UserInteraction       string  `json:"userInteraction"`
	Scope                 string  `json:"scope"`
	ConfidentialityImpact string  `json:"confidentialityImpact"`
	IntegrityImpact       string  `json:"integrityImpact"`
	AvailabilityImpact    string  `json:"availabilityImpact"`
	BaseScore             float64 `json:"baseScore"`
	BaseSeverity          string  `json:"baseSeverity"`
}

type CVSSDataV2 struct {
	Version               string  `json:"version"`
	VectorString          string  `json:"vectorString"`
	AccessVector          string  `json:"accessVector"`
	AccessComplexity      string  `json:"accessComplexity"`
	Authentication        string  `json:"authentication"`
	ConfidentialityImpact string  `json:"confidentialityImpact"`
	IntegrityImpact       string  `json:"integrityImpact"`
	AvailabilityImpact    string  `json:"availabilityImpact"`
	BaseScore             float64 `json:"baseScore"`
}

type NVDWeakness struct {
	Source      string    `json:"source"`
	Type        string    `json:"type"`
	Description []NVDDesc `json:"description"`
}

type NVDRef struct {
	URL    string   `json:"url"`
	Source string   `json:"source"`
	Tags   []string `json:"tags"`
}

// Vulnerability represents a CVE found in the cluster
type Vulnerability struct {
	CVEID           string   `json:"cveId"`
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Severity        string   `json:"severity"`
	CVSSScore       float64  `json:"cvssScore"`
	CVSSVector      string   `json:"cvssVector"`
	Published       string   `json:"published"`
	LastModified    string   `json:"lastModified"`
	AffectedImage   string   `json:"affectedImage"`
	AffectedPackage string   `json:"affectedPackage"`
	PackageVersion  string   `json:"packageVersion"`
	Namespace       string   `json:"namespace"`
	PodName         string   `json:"podName"`
	ContainerName   string   `json:"containerName"`
	Remediation     string   `json:"remediation"`
	References      []string `json:"references"`
}

// VulnerabilityScanner handles NVD integration and vulnerability scanning
type VulnerabilityScanner struct {
	app          *App
	cacheDir     string
	lastRefresh  time.Time
	refreshMutex sync.RWMutex
	nvdCache     map[string]*NVDCVE
	apiKey       string
}

// NewVulnerabilityScanner creates a new vulnerability scanner
func NewVulnerabilityScanner(app *App) *VulnerabilityScanner {
	cacheDir := filepath.Join(os.TempDir(), "kubegraf-nvd-cache")
	os.MkdirAll(cacheDir, 0755)

	scanner := &VulnerabilityScanner{
		app:      app,
		cacheDir: cacheDir,
		nvdCache: make(map[string]*NVDCVE),
		apiKey:   os.Getenv("NVD_API_KEY"), // Optional API key for higher rate limits
	}

	// Load existing cache on startup
	scanner.loadCache()

	return scanner
}

// RefreshNVDData fetches latest CVE data from NVD
func (vs *VulnerabilityScanner) RefreshNVDData(ctx context.Context) error {
	vs.refreshMutex.Lock()
	defer vs.refreshMutex.Unlock()

	// Check if we need to refresh (daily)
	if time.Since(vs.lastRefresh) < 24*time.Hour && len(vs.nvdCache) > 0 {
		log.Printf("NVD cache is fresh, skipping refresh")
		return nil
	}

	log.Printf("Refreshing NVD vulnerability data...")

	// Fetch recent CVEs (last 30 days)
	// NVD API v2.0 uses ISO 8601 format: YYYY-MM-DDTHH:mm:ss.mmmZ or YYYY-MM-DDTHH:mm:ss.mmm-HH:mm
	now := time.Now()
	startDate := now.AddDate(0, 0, -30).UTC().Format("2006-01-02T15:04:05.000")
	endDate := now.UTC().Format("2006-01-02T15:04:05.000")

	// Use the correct NVD API v2.0 endpoint - try with Z suffix first
	url := fmt.Sprintf("https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=%sZ&pubEndDate=%sZ&resultsPerPage=2000",
		startDate, endDate)

	log.Printf("Fetching NVD data from: %s", url)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Accept", "application/json")
	if vs.apiKey != "" {
		req.Header.Set("apiKey", vs.apiKey)
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch NVD data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("NVD API returned status %d: %s", resp.StatusCode, string(body))
	}

	var nvdResp NVDResponse
	if err := json.NewDecoder(resp.Body).Decode(&nvdResp); err != nil {
		return fmt.Errorf("failed to decode NVD response: %v", err)
	}

	// Cache CVEs
	for _, vuln := range nvdResp.Vulnerabilities {
		vs.nvdCache[vuln.CVE.ID] = &vuln.CVE
	}

	// Save to disk cache
	vs.saveCache()

	vs.lastRefresh = time.Now()
	log.Printf("Refreshed NVD data: %d CVEs cached", len(vs.nvdCache))

	return nil
}

// saveCache saves NVD cache to disk
func (vs *VulnerabilityScanner) saveCache() {
	cacheFile := filepath.Join(vs.cacheDir, "nvd-cache.json")
	data, err := json.Marshal(vs.nvdCache)
	if err != nil {
		log.Printf("Failed to marshal cache: %v", err)
		return
	}
	os.WriteFile(cacheFile, data, 0644)
}

// loadCache loads NVD cache from disk
func (vs *VulnerabilityScanner) loadCache() error {
	cacheFile := filepath.Join(vs.cacheDir, "nvd-cache.json")
	data, err := os.ReadFile(cacheFile)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("No NVD cache found at %s. Run refresh to fetch CVEs.", cacheFile)
			return nil // No cache yet
		}
		log.Printf("Error reading cache file: %v", err)
		return err
	}

	if err := json.Unmarshal(data, &vs.nvdCache); err != nil {
		log.Printf("Error unmarshaling cache: %v", err)
		return err
	}

	log.Printf("Loaded %d CVEs from cache", len(vs.nvdCache))
	return nil
}

// ScanCluster scans the cluster for vulnerabilities
func (vs *VulnerabilityScanner) ScanCluster(ctx context.Context) ([]Vulnerability, error) {
	vs.refreshMutex.RLock()
	defer vs.refreshMutex.RUnlock()

	// Ensure cache is loaded
	if len(vs.nvdCache) == 0 {
		vs.refreshMutex.RUnlock()
		vs.loadCache() // This doesn't need write lock
		vs.refreshMutex.RLock()
	}

	// If still no cache, return empty (cache might be loading)
	if len(vs.nvdCache) == 0 {
		log.Printf("No CVE cache available. Please refresh NVD data first.")
		return []Vulnerability{}, nil
	}

	var vulnerabilities []Vulnerability

	// Scan all pods
	pods, err := vs.app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %v", err)
	}

	log.Printf("Scanning %d pods for vulnerabilities using %d cached CVEs", len(pods.Items), len(vs.nvdCache))

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			image := container.Image

			// Extract image name and tag
			imageName, imageTag := vs.parseImage(image)

			// Scan for known vulnerable images/packages
			vulns := vs.scanImage(imageName, imageTag, pod.Namespace, pod.Name, container.Name)
			vulnerabilities = append(vulnerabilities, vulns...)
		}
	}

	log.Printf("Found %d vulnerabilities", len(vulnerabilities))
	return vulnerabilities, nil
}

// parseImage parses container image into name and tag
func (vs *VulnerabilityScanner) parseImage(image string) (name, tag string) {
	parts := strings.Split(image, ":")
	if len(parts) > 1 {
		return parts[0], parts[1]
	}
	return image, "latest"
}

// scanImage scans a container image for vulnerabilities
func (vs *VulnerabilityScanner) scanImage(imageName, imageTag, namespace, podName, containerName string) []Vulnerability {
	var vulns []Vulnerability

	// Check cache for CVEs that might affect this image
	// This is a simplified check - in production, you'd want to:
	// 1. Extract actual packages from the image
	// 2. Match against CVE affected packages
	// 3. Check package versions

	for cveID, cve := range vs.nvdCache {
		// Get severity
		severity := vs.getSeverity(cve)
		score := vs.getCVSSScore(cve)

		// Filter by severity (only Critical and High for now)
		if severity != "CRITICAL" && severity != "HIGH" {
			continue
		}

		// Check if CVE description mentions common vulnerable components
		description := vs.getDescription(cve)
		if vs.matchesImage(description, imageName) {
			vulns = append(vulns, Vulnerability{
				CVEID:           cveID,
				Title:           cveID,
				Description:     description,
				Severity:        severity,
				CVSSScore:       score,
				CVSSVector:      vs.getCVSSVector(cve),
				Published:       cve.Published,
				LastModified:    cve.LastModified,
				AffectedImage:   fmt.Sprintf("%s:%s", imageName, imageTag),
				AffectedPackage: vs.extractPackage(description),
				PackageVersion:  imageTag,
				Namespace:       namespace,
				PodName:         podName,
				ContainerName:   containerName,
				Remediation:     fmt.Sprintf("Update image %s to a patched version", imageName),
				References:      vs.getReferences(cve),
			})
		}
	}

	return vulns
}

// getSeverity extracts severity from CVE
func (vs *VulnerabilityScanner) getSeverity(cve *NVDCVE) string {
	if len(cve.Metrics.CvssMetricV31) > 0 {
		return cve.Metrics.CvssMetricV31[0].CvssData.BaseSeverity
	}
	if len(cve.Metrics.CvssMetricV30) > 0 {
		return cve.Metrics.CvssMetricV30[0].CvssData.BaseSeverity
	}
	if len(cve.Metrics.CvssMetricV2) > 0 {
		return cve.Metrics.CvssMetricV2[0].BaseSeverity
	}
	return "UNKNOWN"
}

// getCVSSScore extracts CVSS score
func (vs *VulnerabilityScanner) getCVSSScore(cve *NVDCVE) float64 {
	if len(cve.Metrics.CvssMetricV31) > 0 {
		return cve.Metrics.CvssMetricV31[0].CvssData.BaseScore
	}
	if len(cve.Metrics.CvssMetricV30) > 0 {
		return cve.Metrics.CvssMetricV30[0].CvssData.BaseScore
	}
	if len(cve.Metrics.CvssMetricV2) > 0 {
		return cve.Metrics.CvssMetricV2[0].CvssData.BaseScore
	}
	return 0.0
}

// getCVSSVector extracts CVSS vector
func (vs *VulnerabilityScanner) getCVSSVector(cve *NVDCVE) string {
	if len(cve.Metrics.CvssMetricV31) > 0 {
		return cve.Metrics.CvssMetricV31[0].CvssData.VectorString
	}
	if len(cve.Metrics.CvssMetricV30) > 0 {
		return cve.Metrics.CvssMetricV30[0].CvssData.VectorString
	}
	if len(cve.Metrics.CvssMetricV2) > 0 {
		return cve.Metrics.CvssMetricV2[0].CvssData.VectorString
	}
	return ""
}

// getDescription extracts description from CVE
func (vs *VulnerabilityScanner) getDescription(cve *NVDCVE) string {
	for _, desc := range cve.Descriptions {
		if desc.Lang == "en" {
			return desc.Value
		}
	}
	if len(cve.Descriptions) > 0 {
		return cve.Descriptions[0].Value
	}
	return ""
}

// getReferences extracts references from CVE
func (vs *VulnerabilityScanner) getReferences(cve *NVDCVE) []string {
	var refs []string
	for _, ref := range cve.References {
		refs = append(refs, ref.URL)
	}
	return refs
}

// matchesImage checks if CVE description matches image
func (vs *VulnerabilityScanner) matchesImage(description, imageName string) bool {
	desc := strings.ToLower(description)
	img := strings.ToLower(imageName)

	// Common vulnerable components
	vulnerableKeywords := []string{
		"docker", "container", "kubernetes", "k8s",
		"alpine", "ubuntu", "debian", "centos",
		"nginx", "apache", "node", "python", "java",
	}

	for _, keyword := range vulnerableKeywords {
		if strings.Contains(desc, keyword) && strings.Contains(img, keyword) {
			return true
		}
	}

	return false
}

// extractPackage extracts package name from description
func (vs *VulnerabilityScanner) extractPackage(description string) string {
	// Simple extraction - in production, use proper parsing
	words := strings.Fields(description)
	for i, word := range words {
		if i < len(words)-1 && (word == "in" || word == "of" || word == "for") {
			return words[i+1]
		}
	}
	return "unknown"
}

// StartBackgroundRefresh starts a goroutine to refresh NVD data daily
func (vs *VulnerabilityScanner) StartBackgroundRefresh(ctx context.Context) {
	// Load cache on startup
	vs.loadCache()

	// Initial refresh
	go func() {
		if err := vs.RefreshNVDData(ctx); err != nil {
			log.Printf("Failed to refresh NVD data: %v", err)
		}

		// Refresh daily
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := vs.RefreshNVDData(ctx); err != nil {
					log.Printf("Failed to refresh NVD data: %v", err)
				}
			case <-ctx.Done():
				return
			}
		}
	}()
}
