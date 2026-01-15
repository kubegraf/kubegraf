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
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

type HelmRelease struct {
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	Revision   int    `json:"revision"`
	Status     string `json:"status"`
	Chart      string `json:"chart"`
	AppVersion string `json:"appVersion"`
	Updated    string `json:"updated"`
}

// handleHelmReleases returns all Helm releases in the cluster
func (ws *WebServer) handleHelmReleases(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")

	var releases []HelmRelease

	// Helm stores releases as secrets with owner=helm label
	listOptions := metav1.ListOptions{
		LabelSelector: "owner=helm",
	}

	var secrets *v1.SecretList
	var err error

	if namespace == "" || namespace == "All Namespaces" {
		secrets, err = ws.app.clientset.CoreV1().Secrets("").List(ws.app.ctx, listOptions)
	} else {
		secrets, err = ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, listOptions)
	}

	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Parse Helm secrets to extract release information
	releaseMap := make(map[string]*HelmRelease)

	for _, secret := range secrets.Items {
		// Get release name from label
		releaseName := secret.Labels["name"]
		if releaseName == "" {
			continue
		}

		// Get status from label
		status := secret.Labels["status"]
		if status == "" {
			status = "unknown"
		}

		// Get version/revision
		versionStr := secret.Labels["version"]
		version := 1
		if versionStr != "" {
			if v, err := strconv.Atoi(versionStr); err == nil {
				version = v
			}
		}

		key := fmt.Sprintf("%s/%s", secret.Namespace, releaseName)

		// Keep only the latest revision
		if existing, ok := releaseMap[key]; ok {
			if version > existing.Revision {
				releaseMap[key] = &HelmRelease{
					Name:      releaseName,
					Namespace: secret.Namespace,
					Revision:  version,
					Status:    status,
					Chart:     extractChartName(secret.Data),
					Updated:   secret.CreationTimestamp.Format("2006-01-02 15:04:05"),
				}
			}
		} else {
			releaseMap[key] = &HelmRelease{
				Name:      releaseName,
				Namespace: secret.Namespace,
				Revision:  version,
				Status:    status,
				Chart:     extractChartName(secret.Data),
				Updated:   secret.CreationTimestamp.Format("2006-01-02 15:04:05"),
			}
		}
	}

	// Convert map to slice
	for _, release := range releaseMap {
		releases = append(releases, *release)
	}

	// Sort by namespace then name
	sort.Slice(releases, func(i, j int) bool {
		if releases[i].Namespace != releases[j].Namespace {
			return releases[i].Namespace < releases[j].Namespace
		}
		return releases[i].Name < releases[j].Name
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"releases": releases,
		"count":    len(releases),
	})
}

// extractChartName tries to extract chart name from Helm secret data
func extractChartName(data map[string][]byte) string {
	// Helm 3 stores release data in a "release" key, gzip compressed and base64 encoded
	// For simplicity, we'll just return a placeholder
	// Full implementation would decode and decompress the data
	return "chart"
}

// handleHelmReleaseDetails returns details for a specific Helm release
func (ws *WebServer) handleHelmReleaseDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	// Get all secrets for this release
	listOptions := metav1.ListOptions{
		LabelSelector: fmt.Sprintf("owner=helm,name=%s", name),
	}

	secrets, err := ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, listOptions)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	var history []map[string]interface{}
	for _, secret := range secrets.Items {
		versionStr := secret.Labels["version"]
		version := 1
		if versionStr != "" {
			if v, err := strconv.Atoi(versionStr); err == nil {
				version = v
			}
		}

		history = append(history, map[string]interface{}{
			"revision":  version,
			"status":    secret.Labels["status"],
			"updated":   secret.CreationTimestamp.Format("2006-01-02 15:04:05"),
			"createdAt": secret.CreationTimestamp,
		})
	}

	// Sort by revision descending
	sort.Slice(history, func(i, j int) bool {
		return history[i]["revision"].(int) > history[j]["revision"].(int)
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"name":      name,
		"namespace": namespace,
		"history":   history,
	})
}

// helmSecretRelease represents the decoded Helm release from secret data (internal format)
type helmSecretRelease struct {
	Name      string                 `json:"name"`
	Info      *helmSecretReleaseInfo `json:"info"`
	Chart     *helmSecretChart       `json:"chart"`
	Config    map[string]interface{} `json:"config"`   // User-supplied values
	Manifest  string                 `json:"manifest"` // The rendered manifest YAML
	Hooks     []*helmSecretHook      `json:"hooks"`    // Release hooks (pre/post install/upgrade/delete)
	Version   int                    `json:"version"`
	Namespace string                 `json:"namespace"`
}

// helmSecretHook represents a Helm hook from the release
type helmSecretHook struct {
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	Path     string `json:"path"`
	Manifest string `json:"manifest"`
}

// helmSecretReleaseInfo contains the release info from Helm secret
type helmSecretReleaseInfo struct {
	FirstDeployed string `json:"first_deployed"`
	LastDeployed  string `json:"last_deployed"`
	Deleted       string `json:"deleted"`
	Description   string `json:"description"`
	Status        string `json:"status"`
	Notes         string `json:"notes"` // Rendered NOTES.txt output
}

// helmSecretChart represents chart data from Helm secret
type helmSecretChart struct {
	Metadata  *helmSecretChartMetadata `json:"metadata"`
	Templates []*helmSecretTemplate    `json:"templates"` // Chart templates including NOTES.txt
}

// helmSecretTemplate represents a template file from the chart
type helmSecretTemplate struct {
	Name string `json:"name"` // Template file path (e.g., "templates/NOTES.txt")
	Data []byte `json:"data"` // Template content (base64 encoded in JSON)
}

// helmSecretChartMetadata contains chart metadata from Helm secret
type helmSecretChartMetadata struct {
	Name       string `json:"name"`
	Version    string `json:"version"`
	AppVersion string `json:"appVersion"`
}

// decodeHelmSecretData decodes Helm release data from a Kubernetes secret
// Helm 3 stores release data as: base64(gzip(json))
func decodeHelmSecretData(data []byte) (*helmSecretRelease, error) {
	// Step 1: Base64 decode
	decoded, err := base64.StdEncoding.DecodeString(string(data))
	if err != nil {
		return nil, fmt.Errorf("base64 decode failed: %w", err)
	}

	// Step 2: Gzip decompress
	reader, err := gzip.NewReader(bytes.NewReader(decoded))
	if err != nil {
		return nil, fmt.Errorf("gzip reader failed: %w", err)
	}
	defer reader.Close()

	decompressed, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("gzip decompress failed: %w", err)
	}

	// Step 3: JSON unmarshal
	var release helmSecretRelease
	if err := json.Unmarshal(decompressed, &release); err != nil {
		return nil, fmt.Errorf("json unmarshal failed: %w", err)
	}

	return &release, nil
}

// handleHelmReleaseHistory returns the full history for a Helm release
// by reading and decoding Helm secrets directly from Kubernetes
func (ws *WebServer) handleHelmReleaseHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	// Get all secrets for this release
	// Helm 3 stores releases as secrets with labels: owner=helm, name=<release>
	listOptions := metav1.ListOptions{
		LabelSelector: fmt.Sprintf("owner=helm,name=%s", name),
	}

	secrets, err := ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, listOptions)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	var history []map[string]interface{}
	for _, secret := range secrets.Items {
		// Get version from labels
		versionStr := secret.Labels["version"]
		version := 1
		if versionStr != "" {
			if v, err := strconv.Atoi(versionStr); err == nil {
				version = v
			}
		}

		// Default values
		chart := "unknown"
		appVersion := ""
		description := ""
		status := secret.Labels["status"]
		updated := secret.CreationTimestamp.Format(time.RFC3339)

		// Try to decode the release data from the secret
		if releaseData, ok := secret.Data["release"]; ok {
			release, err := decodeHelmSecretData(releaseData)
			if err == nil && release != nil {
				// Extract chart info
				if release.Chart != nil && release.Chart.Metadata != nil {
					chart = release.Chart.Metadata.Name + "-" + release.Chart.Metadata.Version
					appVersion = release.Chart.Metadata.AppVersion
				}
				// Extract description and status from release info
				if release.Info != nil {
					description = release.Info.Description
					if release.Info.Status != "" {
						status = release.Info.Status
					}
					if release.Info.LastDeployed != "" {
						updated = release.Info.LastDeployed
					}
				}
			}
		}

		history = append(history, map[string]interface{}{
			"revision":    version,
			"status":      status,
			"chart":       chart,
			"appVersion":  appVersion,
			"description": description,
			"updated":     updated,
		})
	}

	// Sort by revision descending
	sort.Slice(history, func(i, j int) bool {
		return history[i]["revision"].(int) > history[j]["revision"].(int)
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"name":      name,
		"namespace": namespace,
		"history":   history,
		"total":     len(history),
	})
}

// handleHelmRollback rolls back a Helm release to a specific revision
func (ws *WebServer) handleHelmRollback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	// Parse request body
	var req struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
		Revision  int    `json:"revision"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Name == "" || req.Namespace == "" || req.Revision == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name, namespace, and revision are required",
		})
		return
	}

	// Native rollback implementation using Kubernetes secrets
	// 1. Find the secret for the target revision
	// 2. Find the current latest revision
	// 3. Create a new secret with the target revision's data but new version

	// Get all release secrets
	listOptions := metav1.ListOptions{
		LabelSelector: fmt.Sprintf("owner=helm,name=%s", req.Name),
	}
	secrets, err := ws.app.clientset.CoreV1().Secrets(req.Namespace).List(ws.app.ctx, listOptions)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to list Helm secrets: %v", err),
		})
		return
	}

	// Find target revision and max revision
	var targetSecret *v1.Secret
	maxVersion := 0
	for i := range secrets.Items {
		versionStr := secrets.Items[i].Labels["version"]
		version, _ := strconv.Atoi(versionStr)
		if version == req.Revision {
			targetSecret = &secrets.Items[i]
		}
		if version > maxVersion {
			maxVersion = version
		}
	}

	if targetSecret == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Revision %d not found for release %s", req.Revision, req.Name),
		})
		return
	}

	// Decode the target release data
	targetReleaseData, ok := targetSecret.Data["release"]
	if !ok {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Target revision secret does not contain release data",
		})
		return
	}

	targetRelease, err := decodeHelmSecretData(targetReleaseData)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to decode target release: %v", err),
		})
		return
	}

	// Update the release for rollback
	newVersion := maxVersion + 1
	targetRelease.Version = newVersion
	if targetRelease.Info == nil {
		targetRelease.Info = &helmSecretReleaseInfo{}
	}
	targetRelease.Info.Status = "deployed"
	targetRelease.Info.Description = fmt.Sprintf("Rollback to %d", req.Revision)
	targetRelease.Info.LastDeployed = time.Now().UTC().Format(time.RFC3339)

	// Encode the new release data
	newReleaseData, err := encodeHelmSecretData(targetRelease)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to encode rollback release: %v", err),
		})
		return
	}

	// Create new secret for the rollback release
	newSecretName := fmt.Sprintf("sh.helm.release.v1.%s.v%d", req.Name, newVersion)
	newSecret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      newSecretName,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"owner":      "helm",
				"name":       req.Name,
				"version":    strconv.Itoa(newVersion),
				"status":     "deployed",
				"modifiedAt": strconv.FormatInt(time.Now().Unix(), 10),
			},
		},
		Type: "helm.sh/release.v1",
		Data: map[string][]byte{
			"release": newReleaseData,
		},
	}

	_, err = ws.app.clientset.CoreV1().Secrets(req.Namespace).Create(ws.app.ctx, newSecret, metav1.CreateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to create rollback release: %v", err),
		})
		return
	}

	// Update the old "deployed" release to "superseded"
	for i := range secrets.Items {
		if secrets.Items[i].Labels["status"] == "deployed" {
			secrets.Items[i].Labels["status"] = "superseded"
			_, err = ws.app.clientset.CoreV1().Secrets(req.Namespace).Update(ws.app.ctx, &secrets.Items[i], metav1.UpdateOptions{})
			if err != nil {
				// Log but don't fail - the rollback was successful
				fmt.Printf("Warning: failed to mark previous release as superseded: %v\n", err)
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  fmt.Sprintf("Successfully rolled back %s to revision %d (created revision %d)", req.Name, req.Revision, newVersion),
		"name":     req.Name,
		"revision": newVersion,
	})
}

// encodeHelmSecretData encodes a Helm release to base64(gzip(json)) format
func encodeHelmSecretData(release *helmSecretRelease) ([]byte, error) {
	// Step 1: JSON marshal
	jsonData, err := json.Marshal(release)
	if err != nil {
		return nil, fmt.Errorf("json marshal failed: %w", err)
	}

	// Step 2: Gzip compress
	var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(&buf)
	_, err = gzipWriter.Write(jsonData)
	if err != nil {
		return nil, fmt.Errorf("gzip write failed: %w", err)
	}
	err = gzipWriter.Close()
	if err != nil {
		return nil, fmt.Errorf("gzip close failed: %w", err)
	}

	// Step 3: Base64 encode
	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())
	return []byte(encoded), nil
}

// getLatestHelmRelease gets the latest deployed Helm release from Kubernetes secrets
func (ws *WebServer) getLatestHelmRelease(name, namespace string) (*helmSecretRelease, error) {
	if ws.app.clientset == nil {
		return nil, fmt.Errorf("not connected to cluster")
	}

	// List all secrets for this release
	listOptions := metav1.ListOptions{
		LabelSelector: fmt.Sprintf("owner=helm,name=%s", name),
	}
	secrets, err := ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, listOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to list Helm secrets: %w", err)
	}

	if len(secrets.Items) == 0 {
		return nil, fmt.Errorf("no Helm release found with name %s in namespace %s", name, namespace)
	}

	// Find the latest version (highest version number with deployed status, or just highest version)
	var latestSecret *v1.Secret
	maxVersion := 0
	for i := range secrets.Items {
		versionStr := secrets.Items[i].Labels["version"]
		version, _ := strconv.Atoi(versionStr)
		if version > maxVersion {
			maxVersion = version
			latestSecret = &secrets.Items[i]
		}
	}

	if latestSecret == nil {
		return nil, fmt.Errorf("could not find latest release for %s", name)
	}

	// Decode the release data
	releaseData, ok := latestSecret.Data["release"]
	if !ok {
		return nil, fmt.Errorf("secret does not contain release data")
	}

	release, err := decodeHelmSecretData(releaseData)
	if err != nil {
		return nil, fmt.Errorf("failed to decode release data: %w", err)
	}

	return release, nil
}

// formatHelmValues formats Helm values as YAML-like output
func formatHelmValues(config map[string]interface{}) string {
	if config == nil || len(config) == 0 {
		return "USER-SUPPLIED VALUES:\n(none)"
	}

	// Use JSON marshaling with indentation for readable output
	jsonBytes, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Sprintf("USER-SUPPLIED VALUES:\n(error formatting: %v)", err)
	}
	return fmt.Sprintf("USER-SUPPLIED VALUES:\n%s", string(jsonBytes))
}

// getNotes extracts the NOTES.txt content from the release
// Helm stores the rendered notes in release.Info.Notes field
func (release *helmSecretRelease) getNotes() string {
	// Helm stores the rendered notes in the Info.Notes field
	if release.Info != nil && release.Info.Notes != "" {
		return release.Info.Notes
	}
	return ""
}

// handleHelmReleaseDescribe returns the describe output for a Helm release
// Uses native Kubernetes API to read Helm release data from secrets
func (ws *WebServer) handleHelmReleaseDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	// Get the latest Helm release from Kubernetes secrets
	release, err := ws.getLatestHelmRelease(name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get Helm release: %v", err),
		})
		return
	}

	// Build describe-like output similar to helm get all
	describe := fmt.Sprintf("Name: %s\nNamespace: %s\n", name, namespace)

	// Add release info
	if release.Info != nil {
		describe += fmt.Sprintf("Status: %s\n", release.Info.Status)
		describe += fmt.Sprintf("Revision: %d\n", release.Version)
		if release.Info.Description != "" {
			describe += fmt.Sprintf("Description: %s\n", release.Info.Description)
		}
		if release.Info.LastDeployed != "" {
			describe += fmt.Sprintf("Last Deployed: %s\n", release.Info.LastDeployed)
		}
	}

	// Add chart info
	if release.Chart != nil && release.Chart.Metadata != nil {
		describe += fmt.Sprintf("\nChart: %s-%s\n", release.Chart.Metadata.Name, release.Chart.Metadata.Version)
		if release.Chart.Metadata.AppVersion != "" {
			describe += fmt.Sprintf("App Version: %s\n", release.Chart.Metadata.AppVersion)
		}
	}

	// Add manifest
	describe += fmt.Sprintf("\n=== Manifest ===\n%s\n", release.Manifest)

	// Add values
	valuesOutput := formatHelmValues(release.Config)
	describe += fmt.Sprintf("\n=== Values ===\n%s\n", valuesOutput)

	// Add notes
	notes := release.getNotes()
	if notes != "" {
		describe += fmt.Sprintf("\n=== Notes ===\n%s\n", notes)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleHelmReleaseYAML returns the YAML manifest for a Helm release
// Uses native Kubernetes API to read Helm release data from secrets
func (ws *WebServer) handleHelmReleaseYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	// Get the latest Helm release from Kubernetes secrets
	release, err := ws.getLatestHelmRelease(name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get Helm release manifest: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    release.Manifest,
	})
}

// getArgoCDApplication fetches an ArgoCD Application using the dynamic client
func (ws *WebServer) getArgoCDApplication(name, namespace string) (*unstructured.Unstructured, error) {
	if ws.app.config == nil {
		return nil, fmt.Errorf("no REST config available")
	}

	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %v", err)
	}

	appGVR := schema.GroupVersionResource{
		Group:    "argoproj.io",
		Version:  "v1alpha1",
		Resource: "applications",
	}

	// Try the provided namespace first
	app, err := dynamicClient.Resource(appGVR).Namespace(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err == nil {
		return app, nil
	}

	// Try argocd namespace as fallback
	if namespace != "argocd" {
		app, err = dynamicClient.Resource(appGVR).Namespace("argocd").Get(ws.app.ctx, name, metav1.GetOptions{})
		if err == nil {
			return app, nil
		}
	}

	return nil, fmt.Errorf("application %s not found in namespace %s or argocd: %v", name, namespace, err)
}

// formatArgoCDAppDescribe formats an ArgoCD Application as a describe-style output
func formatArgoCDAppDescribe(app *unstructured.Unstructured) string {
	var sb strings.Builder

	// Name and Namespace
	sb.WriteString(fmt.Sprintf("Name:         %s\n", app.GetName()))
	sb.WriteString(fmt.Sprintf("Namespace:    %s\n", app.GetNamespace()))

	// Labels
	labels := app.GetLabels()
	if len(labels) > 0 {
		sb.WriteString("Labels:\n")
		for k, v := range labels {
			sb.WriteString(fmt.Sprintf("              %s=%s\n", k, v))
		}
	} else {
		sb.WriteString("Labels:       <none>\n")
	}

	// Annotations
	annotations := app.GetAnnotations()
	if len(annotations) > 0 {
		sb.WriteString("Annotations:\n")
		for k, v := range annotations {
			// Truncate long annotations
			if len(v) > 100 {
				v = v[:100] + "..."
			}
			sb.WriteString(fmt.Sprintf("              %s: %s\n", k, v))
		}
	} else {
		sb.WriteString("Annotations:  <none>\n")
	}

	sb.WriteString(fmt.Sprintf("API Version:  %s\n", app.GetAPIVersion()))
	sb.WriteString(fmt.Sprintf("Kind:         %s\n", app.GetKind()))

	// Creation timestamp
	sb.WriteString(fmt.Sprintf("Created:      %s\n", app.GetCreationTimestamp().Format(time.RFC3339)))

	// Spec section
	spec, found, _ := unstructured.NestedMap(app.Object, "spec")
	if found {
		sb.WriteString("\nSpec:\n")

		// Project
		if project, ok, _ := unstructured.NestedString(spec, "project"); ok {
			sb.WriteString(fmt.Sprintf("  Project:    %s\n", project))
		}

		// Source
		source, sourceFound, _ := unstructured.NestedMap(spec, "source")
		if sourceFound {
			sb.WriteString("  Source:\n")
			if repoURL, ok, _ := unstructured.NestedString(source, "repoURL"); ok {
				sb.WriteString(fmt.Sprintf("    Repo URL:       %s\n", repoURL))
			}
			if targetRevision, ok, _ := unstructured.NestedString(source, "targetRevision"); ok {
				sb.WriteString(fmt.Sprintf("    Target Revision: %s\n", targetRevision))
			}
			if path, ok, _ := unstructured.NestedString(source, "path"); ok {
				sb.WriteString(fmt.Sprintf("    Path:           %s\n", path))
			}
			if chart, ok, _ := unstructured.NestedString(source, "chart"); ok {
				sb.WriteString(fmt.Sprintf("    Chart:          %s\n", chart))
			}
			// Helm values
			if helm, ok, _ := unstructured.NestedMap(source, "helm"); ok {
				sb.WriteString("    Helm:\n")
				if valueFiles, ok, _ := unstructured.NestedStringSlice(helm, "valueFiles"); ok && len(valueFiles) > 0 {
					sb.WriteString(fmt.Sprintf("      Value Files: %s\n", strings.Join(valueFiles, ", ")))
				}
			}
		}

		// Destination
		dest, destFound, _ := unstructured.NestedMap(spec, "destination")
		if destFound {
			sb.WriteString("  Destination:\n")
			if server, ok, _ := unstructured.NestedString(dest, "server"); ok {
				sb.WriteString(fmt.Sprintf("    Server:    %s\n", server))
			}
			if namespace, ok, _ := unstructured.NestedString(dest, "namespace"); ok {
				sb.WriteString(fmt.Sprintf("    Namespace: %s\n", namespace))
			}
			if name, ok, _ := unstructured.NestedString(dest, "name"); ok {
				sb.WriteString(fmt.Sprintf("    Name:      %s\n", name))
			}
		}

		// Sync Policy
		syncPolicy, syncPolicyFound, _ := unstructured.NestedMap(spec, "syncPolicy")
		if syncPolicyFound {
			sb.WriteString("  Sync Policy:\n")
			if automated, ok, _ := unstructured.NestedMap(syncPolicy, "automated"); ok {
				sb.WriteString("    Automated:\n")
				if prune, ok, _ := unstructured.NestedBool(automated, "prune"); ok {
					sb.WriteString(fmt.Sprintf("      Prune:      %t\n", prune))
				}
				if selfHeal, ok, _ := unstructured.NestedBool(automated, "selfHeal"); ok {
					sb.WriteString(fmt.Sprintf("      Self Heal:  %t\n", selfHeal))
				}
			}
			if syncOptions, ok, _ := unstructured.NestedStringSlice(syncPolicy, "syncOptions"); ok && len(syncOptions) > 0 {
				sb.WriteString("    Sync Options:\n")
				for _, opt := range syncOptions {
					sb.WriteString(fmt.Sprintf("      - %s\n", opt))
				}
			}
		}
	}

	// Status section
	status, found, _ := unstructured.NestedMap(app.Object, "status")
	if found {
		sb.WriteString("\nStatus:\n")

		// Health
		health, healthFound, _ := unstructured.NestedMap(status, "health")
		if healthFound {
			if healthStatus, ok, _ := unstructured.NestedString(health, "status"); ok {
				sb.WriteString(fmt.Sprintf("  Health Status:  %s\n", healthStatus))
			}
			if message, ok, _ := unstructured.NestedString(health, "message"); ok && message != "" {
				sb.WriteString(fmt.Sprintf("  Health Message: %s\n", message))
			}
		}

		// Sync
		sync, syncFound, _ := unstructured.NestedMap(status, "sync")
		if syncFound {
			if syncStatus, ok, _ := unstructured.NestedString(sync, "status"); ok {
				sb.WriteString(fmt.Sprintf("  Sync Status:    %s\n", syncStatus))
			}
			if revision, ok, _ := unstructured.NestedString(sync, "revision"); ok {
				sb.WriteString(fmt.Sprintf("  Sync Revision:  %s\n", revision))
			}
		}

		// Operation State
		operationState, opFound, _ := unstructured.NestedMap(status, "operationState")
		if opFound {
			sb.WriteString("  Operation State:\n")
			if phase, ok, _ := unstructured.NestedString(operationState, "phase"); ok {
				sb.WriteString(fmt.Sprintf("    Phase:        %s\n", phase))
			}
			if message, ok, _ := unstructured.NestedString(operationState, "message"); ok && message != "" {
				sb.WriteString(fmt.Sprintf("    Message:      %s\n", message))
			}
			if startedAt, ok, _ := unstructured.NestedString(operationState, "startedAt"); ok {
				sb.WriteString(fmt.Sprintf("    Started At:   %s\n", startedAt))
			}
			if finishedAt, ok, _ := unstructured.NestedString(operationState, "finishedAt"); ok {
				sb.WriteString(fmt.Sprintf("    Finished At:  %s\n", finishedAt))
			}
		}

		// Resources
		resources, resFound, _ := unstructured.NestedSlice(status, "resources")
		if resFound && len(resources) > 0 {
			sb.WriteString(fmt.Sprintf("  Resources:      %d managed resources\n", len(resources)))
			// Show first few resources
			maxShow := 10
			if len(resources) < maxShow {
				maxShow = len(resources)
			}
			for i := 0; i < maxShow; i++ {
				if res, ok := resources[i].(map[string]interface{}); ok {
					kind, _ := res["kind"].(string)
					name, _ := res["name"].(string)
					ns, _ := res["namespace"].(string)
					resStatus, _ := res["status"].(string)
					health, _ := res["health"].(map[string]interface{})
					healthStatus := ""
					if health != nil {
						healthStatus, _ = health["status"].(string)
					}
					if ns != "" {
						sb.WriteString(fmt.Sprintf("    - %s/%s (%s) [%s/%s]\n", kind, name, ns, resStatus, healthStatus))
					} else {
						sb.WriteString(fmt.Sprintf("    - %s/%s [%s/%s]\n", kind, name, resStatus, healthStatus))
					}
				}
			}
			if len(resources) > maxShow {
				sb.WriteString(fmt.Sprintf("    ... and %d more resources\n", len(resources)-maxShow))
			}
		}

		// Conditions
		conditions, condFound, _ := unstructured.NestedSlice(status, "conditions")
		if condFound && len(conditions) > 0 {
			sb.WriteString("  Conditions:\n")
			for _, cond := range conditions {
				if c, ok := cond.(map[string]interface{}); ok {
					condType, _ := c["type"].(string)
					message, _ := c["message"].(string)
					if len(message) > 100 {
						message = message[:100] + "..."
					}
					sb.WriteString(fmt.Sprintf("    - Type: %s\n", condType))
					if message != "" {
						sb.WriteString(fmt.Sprintf("      Message: %s\n", message))
					}
				}
			}
		}
	}

	return sb.String()
}

// convertUnstructuredToYAML converts an unstructured object to YAML string
func convertUnstructuredToYAML(obj *unstructured.Unstructured) (string, error) {
	// Remove managed fields for cleaner output
	obj.SetManagedFields(nil)

	// Use JSON then convert to YAML-like format for readability
	jsonData, err := json.MarshalIndent(obj.Object, "", "  ")
	if err != nil {
		return "", err
	}

	// Convert JSON to YAML format using sigs.k8s.io/yaml would be ideal,
	// but we can do a simple conversion for display purposes
	var yamlBuilder strings.Builder
	yamlBuilder.WriteString("apiVersion: ")
	yamlBuilder.WriteString(obj.GetAPIVersion())
	yamlBuilder.WriteString("\nkind: ")
	yamlBuilder.WriteString(obj.GetKind())
	yamlBuilder.WriteString("\nmetadata:\n")
	yamlBuilder.WriteString("  name: ")
	yamlBuilder.WriteString(obj.GetName())
	yamlBuilder.WriteString("\n  namespace: ")
	yamlBuilder.WriteString(obj.GetNamespace())
	yamlBuilder.WriteString("\n  uid: ")
	yamlBuilder.WriteString(string(obj.GetUID()))
	yamlBuilder.WriteString("\n  resourceVersion: \"")
	yamlBuilder.WriteString(obj.GetResourceVersion())
	yamlBuilder.WriteString("\"\n  creationTimestamp: ")
	yamlBuilder.WriteString(obj.GetCreationTimestamp().Format(time.RFC3339))
	yamlBuilder.WriteString("\n")

	// Labels
	labels := obj.GetLabels()
	if len(labels) > 0 {
		yamlBuilder.WriteString("  labels:\n")
		for k, v := range labels {
			yamlBuilder.WriteString(fmt.Sprintf("    %s: %s\n", k, v))
		}
	}

	// Annotations
	annotations := obj.GetAnnotations()
	if len(annotations) > 0 {
		yamlBuilder.WriteString("  annotations:\n")
		for k, v := range annotations {
			// Escape multiline values
			if strings.Contains(v, "\n") {
				v = strings.ReplaceAll(v, "\n", "\\n")
			}
			yamlBuilder.WriteString(fmt.Sprintf("    %s: \"%s\"\n", k, v))
		}
	}

	// For spec and status, include the JSON representation for completeness
	yamlBuilder.WriteString("\n# Full object in JSON format:\n")
	yamlBuilder.WriteString(string(jsonData))

	return yamlBuilder.String(), nil
}

// handleArgoCDAppDescribe returns the describe output for an ArgoCD Application
// Uses native Kubernetes dynamic client instead of kubectl
func (ws *WebServer) handleArgoCDAppDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	// Get the ArgoCD Application using native dynamic client
	app, err := ws.getArgoCDApplication(name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to describe ArgoCD Application: %v", err),
		})
		return
	}

	// Format as describe-style output
	describe := formatArgoCDAppDescribe(app)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleArgoCDAppYAML returns the YAML for an ArgoCD Application
// Uses native Kubernetes dynamic client instead of kubectl
func (ws *WebServer) handleArgoCDAppYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	// Get the ArgoCD Application using native dynamic client
	app, err := ws.getArgoCDApplication(name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get ArgoCD Application YAML: %v", err),
		})
		return
	}

	// Convert to YAML-like representation
	yamlOutput, err := convertUnstructuredToYAML(app)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to convert to YAML: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    yamlOutput,
	})
}

// handleArgoCDAppDelete deletes an ArgoCD Application
// Uses native Kubernetes dynamic client instead of kubectl
func (ws *WebServer) handleArgoCDAppDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	// Parse request body
	var req struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name is required",
		})
		return
	}

	// Default to argocd namespace if not specified
	if req.Namespace == "" {
		req.Namespace = "argocd"
	}

	// Delete using native dynamic client
	if ws.app.config == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "No REST config available",
		})
		return
	}

	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to create dynamic client: %v", err),
		})
		return
	}

	appGVR := schema.GroupVersionResource{
		Group:    "argoproj.io",
		Version:  "v1alpha1",
		Resource: "applications",
	}

	// Try to delete in the specified namespace first
	err = dynamicClient.Resource(appGVR).Namespace(req.Namespace).Delete(ws.app.ctx, req.Name, metav1.DeleteOptions{})
	if err != nil {
		// Try argocd namespace as fallback
		if req.Namespace != "argocd" {
			err = dynamicClient.Resource(appGVR).Namespace("argocd").Delete(ws.app.ctx, req.Name, metav1.DeleteOptions{})
		}
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Failed to delete ArgoCD Application: %v", err),
			})
			return
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("ArgoCD Application %s deleted successfully", req.Name),
		"output":  fmt.Sprintf("application.argoproj.io \"%s\" deleted", req.Name),
	})
}

// handleArgoCDAppUpdate updates an ArgoCD Application YAML
// Uses native Kubernetes dynamic client instead of kubectl
func (ws *WebServer) handleArgoCDAppUpdate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	// Parse request body
	var req struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
		YAML      string `json:"yaml"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Name == "" || req.YAML == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and yaml are required",
		})
		return
	}

	// Default to argocd namespace if not specified
	if req.Namespace == "" {
		req.Namespace = "argocd"
	}

	// Parse the YAML/JSON input
	var obj map[string]interface{}
	if err := json.Unmarshal([]byte(req.YAML), &obj); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to parse YAML/JSON: %v", err),
		})
		return
	}

	// Create dynamic client
	if ws.app.config == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "No REST config available",
		})
		return
	}

	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to create dynamic client: %v", err),
		})
		return
	}

	appGVR := schema.GroupVersionResource{
		Group:    "argoproj.io",
		Version:  "v1alpha1",
		Resource: "applications",
	}

	// Create unstructured object
	unstructuredObj := &unstructured.Unstructured{Object: obj}

	// Ensure correct API version and kind
	unstructuredObj.SetAPIVersion("argoproj.io/v1alpha1")
	unstructuredObj.SetKind("Application")

	// Get the existing resource to get resourceVersion for update
	existing, err := dynamicClient.Resource(appGVR).Namespace(req.Namespace).Get(ws.app.ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		// If not found in specified namespace, try argocd namespace
		if req.Namespace != "argocd" {
			existing, err = dynamicClient.Resource(appGVR).Namespace("argocd").Get(ws.app.ctx, req.Name, metav1.GetOptions{})
			if err == nil {
				req.Namespace = "argocd"
			}
		}
	}

	var result *unstructured.Unstructured
	var outputMsg string

	if err != nil {
		// Resource doesn't exist, create it
		unstructuredObj.SetNamespace(req.Namespace)
		result, err = dynamicClient.Resource(appGVR).Namespace(req.Namespace).Create(ws.app.ctx, unstructuredObj, metav1.CreateOptions{})
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Failed to create ArgoCD Application: %v", err),
			})
			return
		}
		outputMsg = fmt.Sprintf("application.argoproj.io/%s created", req.Name)
	} else {
		// Resource exists, update it
		// Set the resourceVersion from existing resource
		unstructuredObj.SetResourceVersion(existing.GetResourceVersion())
		unstructuredObj.SetNamespace(req.Namespace)
		unstructuredObj.SetUID(existing.GetUID())

		result, err = dynamicClient.Resource(appGVR).Namespace(req.Namespace).Update(ws.app.ctx, unstructuredObj, metav1.UpdateOptions{})
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Failed to update ArgoCD Application: %v", err),
			})
			return
		}
		outputMsg = fmt.Sprintf("application.argoproj.io/%s configured", req.Name)
	}

	_ = result // Use result if needed for additional info

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("ArgoCD Application %s updated successfully", req.Name),
		"output":  outputMsg,
	})
}

// KustomizeResource represents a resource managed by Kustomize
type KustomizeResource struct {
	Kind      string            `json:"kind"`
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
}

// handleKustomizeResources returns resources managed by Kustomize
func (ws *WebServer) handleKustomizeResources(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")

	var resources []KustomizeResource

	// Query deployments with kustomize managed-by label
	deploymentListOptions := metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/managed-by=kustomize",
	}

	var deployments interface{}
	var err error

	if namespace == "" || namespace == "All Namespaces" {
		deployments, err = ws.app.clientset.AppsV1().Deployments("").List(ws.app.ctx, deploymentListOptions)
	} else {
		deployments, err = ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, deploymentListOptions)
	}

	if err == nil {
		if depList, ok := deployments.(*appsv1.DeploymentList); ok {
			for _, dep := range depList.Items {
				resources = append(resources, KustomizeResource{
					Kind:      "Deployment",
					Name:      dep.Name,
					Namespace: dep.Namespace,
					Age:       formatAge(time.Since(dep.CreationTimestamp.Time)),
					Labels:    dep.Labels,
				})
			}
		}
	}

	// Query services with kustomize managed-by label
	if namespace == "" || namespace == "All Namespaces" {
		svcList, err := ws.app.clientset.CoreV1().Services("").List(ws.app.ctx, deploymentListOptions)
		if err == nil {
			for _, svc := range svcList.Items {
				resources = append(resources, KustomizeResource{
					Kind:      "Service",
					Name:      svc.Name,
					Namespace: svc.Namespace,
					Age:       formatAge(time.Since(svc.CreationTimestamp.Time)),
					Labels:    svc.Labels,
				})
			}
		}
	} else {
		svcList, err := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, deploymentListOptions)
		if err == nil {
			for _, svc := range svcList.Items {
				resources = append(resources, KustomizeResource{
					Kind:      "Service",
					Name:      svc.Name,
					Namespace: svc.Namespace,
					Age:       formatAge(time.Since(svc.CreationTimestamp.Time)),
					Labels:    svc.Labels,
				})
			}
		}
	}

	// Query ConfigMaps with kustomize managed-by label
	if namespace == "" || namespace == "All Namespaces" {
		cmList, err := ws.app.clientset.CoreV1().ConfigMaps("").List(ws.app.ctx, deploymentListOptions)
		if err == nil {
			for _, cm := range cmList.Items {
				resources = append(resources, KustomizeResource{
					Kind:      "ConfigMap",
					Name:      cm.Name,
					Namespace: cm.Namespace,
					Age:       formatAge(time.Since(cm.CreationTimestamp.Time)),
					Labels:    cm.Labels,
				})
			}
		}
	} else {
		cmList, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).List(ws.app.ctx, deploymentListOptions)
		if err == nil {
			for _, cm := range cmList.Items {
				resources = append(resources, KustomizeResource{
					Kind:      "ConfigMap",
					Name:      cm.Name,
					Namespace: cm.Namespace,
					Age:       formatAge(time.Since(cm.CreationTimestamp.Time)),
					Labels:    cm.Labels,
				})
			}
		}
	}

	// Sort by namespace then kind then name
	sort.Slice(resources, func(i, j int) bool {
		if resources[i].Namespace != resources[j].Namespace {
			return resources[i].Namespace < resources[j].Namespace
		}
		if resources[i].Kind != resources[j].Kind {
			return resources[i].Kind < resources[j].Kind
		}
		return resources[i].Name < resources[j].Name
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"resources": resources,
		"count":     len(resources),
	})
}

// ArgoCDApp represents an ArgoCD Application
type ArgoCDApp struct {
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	Project    string `json:"project"`
	SyncStatus string `json:"syncStatus"`
	Health     string `json:"health"`
	RepoURL    string `json:"repoURL"`
	Path       string `json:"path"`
	Revision   string `json:"revision"`
	Cluster    string `json:"cluster"`
	Age        string `json:"age"`
}

// handleArgoCDApps returns ArgoCD Applications
func (ws *WebServer) handleArgoCDApps(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.config == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   false,
			"error":     "Not connected to cluster",
			"installed": false,
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")

	// Create dynamic client for CRD access
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   false,
			"error":     err.Error(),
			"installed": false,
		})
		return
	}

	// ArgoCD Application GVR
	appGVR := schema.GroupVersionResource{
		Group:    "argoproj.io",
		Version:  "v1alpha1",
		Resource: "applications",
	}

	var apps []ArgoCDApp
	var appList *unstructured.UnstructuredList

	if namespace == "" || namespace == "All Namespaces" {
		appList, err = dynamicClient.Resource(appGVR).Namespace("").List(ws.app.ctx, metav1.ListOptions{})
	} else {
		appList, err = dynamicClient.Resource(appGVR).Namespace(namespace).List(ws.app.ctx, metav1.ListOptions{})
	}

	if err != nil {
		// Check if ArgoCD is not installed
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "no matches") {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success":   true,
				"apps":      []ArgoCDApp{},
				"count":     0,
				"installed": false,
				"message":   "ArgoCD is not installed in this cluster",
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   false,
			"error":     err.Error(),
			"installed": false,
		})
		return
	}

	for _, item := range appList.Items {
		spec, _, _ := unstructured.NestedMap(item.Object, "spec")
		status, _, _ := unstructured.NestedMap(item.Object, "status")

		syncStatus := "Unknown"
		health := "Unknown"

		if syncStatusMap, ok := status["sync"].(map[string]interface{}); ok {
			if s, ok := syncStatusMap["status"].(string); ok {
				syncStatus = s
			}
		}

		if healthMap, ok := status["health"].(map[string]interface{}); ok {
			if h, ok := healthMap["status"].(string); ok {
				health = h
			}
		}

		project := "default"
		if p, ok := spec["project"].(string); ok {
			project = p
		}

		repoURL := ""
		path := ""
		revision := ""
		if source, ok := spec["source"].(map[string]interface{}); ok {
			if r, ok := source["repoURL"].(string); ok {
				repoURL = r
			}
			if p, ok := source["path"].(string); ok {
				path = p
			}
			if rev, ok := source["targetRevision"].(string); ok {
				revision = rev
			}
		}

		cluster := ""
		if dest, ok := spec["destination"].(map[string]interface{}); ok {
			if s, ok := dest["server"].(string); ok {
				cluster = s
			} else if n, ok := dest["name"].(string); ok {
				cluster = n
			}
		}

		creationTime := item.GetCreationTimestamp()

		apps = append(apps, ArgoCDApp{
			Name:       item.GetName(),
			Namespace:  item.GetNamespace(),
			Project:    project,
			SyncStatus: syncStatus,
			Health:     health,
			RepoURL:    repoURL,
			Path:       path,
			Revision:   revision,
			Cluster:    cluster,
			Age:        formatAge(time.Since(creationTime.Time)),
		})
	}

	// Sort by namespace then name
	sort.Slice(apps, func(i, j int) bool {
		if apps[i].Namespace != apps[j].Namespace {
			return apps[i].Namespace < apps[j].Namespace
		}
		return apps[i].Name < apps[j].Name
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"apps":      apps,
		"count":     len(apps),
		"installed": true,
	})
}

// handleArgoCDAppDetails returns details for a specific ArgoCD Application
func (ws *WebServer) handleArgoCDAppDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.config == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name is required",
		})
		return
	}

	// Default to argocd namespace if not specified
	if namespace == "" {
		namespace = "argocd"
	}

	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	appGVR := schema.GroupVersionResource{
		Group:    "argoproj.io",
		Version:  "v1alpha1",
		Resource: "applications",
	}

	app, err := dynamicClient.Resource(appGVR).Namespace(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Get detailed info
	spec, _, _ := unstructured.NestedMap(app.Object, "spec")
	status, _, _ := unstructured.NestedMap(app.Object, "status")

	// Extract sync history
	var syncHistory []map[string]interface{}
	if history, found, _ := unstructured.NestedSlice(status, "history"); found {
		for _, h := range history {
			if hMap, ok := h.(map[string]interface{}); ok {
				syncHistory = append(syncHistory, map[string]interface{}{
					"id":         hMap["id"],
					"revision":   hMap["revision"],
					"deployedAt": hMap["deployedAt"],
					"source":     hMap["source"],
				})
			}
		}
	}

	// Extract resource status
	var resources []map[string]interface{}
	if res, found, _ := unstructured.NestedSlice(status, "resources"); found {
		for _, r := range res {
			if rMap, ok := r.(map[string]interface{}); ok {
				resources = append(resources, map[string]interface{}{
					"kind":      rMap["kind"],
					"name":      rMap["name"],
					"namespace": rMap["namespace"],
					"status":    rMap["status"],
					"health":    rMap["health"],
				})
			}
		}
	}

	// Get conditions
	var conditions []map[string]interface{}
	if conds, found, _ := unstructured.NestedSlice(status, "conditions"); found {
		for _, c := range conds {
			if cMap, ok := c.(map[string]interface{}); ok {
				conditions = append(conditions, map[string]interface{}{
					"type":    cMap["type"],
					"status":  cMap["status"],
					"message": cMap["message"],
				})
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"name":         app.GetName(),
		"namespace":    app.GetNamespace(),
		"spec":         spec,
		"status":       status,
		"history":      syncHistory,
		"resources":    resources,
		"conditions":   conditions,
		"historyCount": len(syncHistory),
	})
}

// handleArgoCDSync triggers a sync for an ArgoCD Application
func (ws *WebServer) handleArgoCDSync(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.app.config == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	// Parse request body
	var req struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
		Prune     bool   `json:"prune"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name is required",
		})
		return
	}

	// Default to argocd namespace if not specified
	if req.Namespace == "" {
		req.Namespace = "argocd"
	}

	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	appGVR := schema.GroupVersionResource{
		Group:    "argoproj.io",
		Version:  "v1alpha1",
		Resource: "applications",
	}

	// Get current app
	app, err := dynamicClient.Resource(appGVR).Namespace(req.Namespace).Get(ws.app.ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to get application: " + err.Error(),
		})
		return
	}

	// Set operation to trigger sync
	operation := map[string]interface{}{
		"sync": map[string]interface{}{
			"prune": req.Prune,
		},
	}
	unstructured.SetNestedMap(app.Object, operation, "operation")

	// Update the application to trigger sync
	_, err = dynamicClient.Resource(appGVR).Namespace(req.Namespace).Update(ws.app.ctx, app, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to trigger sync: " + err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Sync triggered for %s", req.Name),
		"name":    req.Name,
	})
}

// handleArgoCDRefresh triggers a refresh for an ArgoCD Application
func (ws *WebServer) handleArgoCDRefresh(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.app.config == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	// Parse request body
	var req struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
		Hard      bool   `json:"hard"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name is required",
		})
		return
	}

	// Default to argocd namespace if not specified
	if req.Namespace == "" {
		req.Namespace = "argocd"
	}

	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	appGVR := schema.GroupVersionResource{
		Group:    "argoproj.io",
		Version:  "v1alpha1",
		Resource: "applications",
	}

	// Get current app
	app, err := dynamicClient.Resource(appGVR).Namespace(req.Namespace).Get(ws.app.ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to get application: " + err.Error(),
		})
		return
	}

	// Update refresh annotation to trigger refresh
	annotations := app.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}

	if req.Hard {
		annotations["argocd.argoproj.io/refresh"] = "hard"
	} else {
		annotations["argocd.argoproj.io/refresh"] = "normal"
	}
	app.SetAnnotations(annotations)

	// Update the application to trigger refresh
	_, err = dynamicClient.Resource(appGVR).Namespace(req.Namespace).Update(ws.app.ctx, app, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to trigger refresh: " + err.Error(),
		})
		return
	}

	refreshType := "normal"
	if req.Hard {
		refreshType = "hard"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"message":     fmt.Sprintf("Refresh (%s) triggered for %s", refreshType, req.Name),
		"name":        req.Name,
		"refreshType": refreshType,
	})
}

// FluxResource represents a Flux resource (Kustomization, HelmRelease, GitRepository, etc.)
type FluxResource struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Ready     string `json:"ready"`
	Status    string `json:"status"`
	Age       string `json:"age"`
	SourceRef string `json:"sourceRef,omitempty"`
	Revision  string `json:"revision,omitempty"`
}

// handleFluxResources returns Flux resources
func (ws *WebServer) handleFluxResources(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.config == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   false,
			"error":     "Not connected to cluster",
			"installed": false,
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")

	// Create dynamic client for CRD access
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   false,
			"error":     err.Error(),
			"installed": false,
		})
		return
	}

	var resources []FluxResource
	fluxInstalled := false

	// Flux CRD definitions
	fluxCRDs := []struct {
		group    string
		version  string
		resource string
		kind     string
	}{
		{"kustomize.toolkit.fluxcd.io", "v1", "kustomizations", "Kustomization"},
		{"helm.toolkit.fluxcd.io", "v2", "helmreleases", "HelmRelease"},
		{"source.toolkit.fluxcd.io", "v1", "gitrepositories", "GitRepository"},
		{"source.toolkit.fluxcd.io", "v1", "helmrepositories", "HelmRepository"},
		{"source.toolkit.fluxcd.io", "v1", "ocirepositories", "OCIRepository"},
	}

	for _, crd := range fluxCRDs {
		gvr := schema.GroupVersionResource{
			Group:    crd.group,
			Version:  crd.version,
			Resource: crd.resource,
		}

		var list *unstructured.UnstructuredList
		if namespace == "" || namespace == "All Namespaces" {
			list, err = dynamicClient.Resource(gvr).Namespace("").List(ws.app.ctx, metav1.ListOptions{})
		} else {
			list, err = dynamicClient.Resource(gvr).Namespace(namespace).List(ws.app.ctx, metav1.ListOptions{})
		}

		if err != nil {
			// CRD not found, skip
			continue
		}

		fluxInstalled = true

		for _, item := range list.Items {
			ready := "Unknown"
			statusMsg := ""
			revision := ""
			sourceRef := ""

			// Get status conditions
			if status, ok := item.Object["status"].(map[string]interface{}); ok {
				if conditions, ok := status["conditions"].([]interface{}); ok {
					for _, cond := range conditions {
						if condMap, ok := cond.(map[string]interface{}); ok {
							if condType, _ := condMap["type"].(string); condType == "Ready" {
								if condStatus, _ := condMap["status"].(string); condStatus == "True" {
									ready = "True"
								} else {
									ready = "False"
								}
								if msg, _ := condMap["message"].(string); msg != "" {
									statusMsg = msg
									// Truncate long messages
									if len(statusMsg) > 50 {
										statusMsg = statusMsg[:47] + "..."
									}
								}
								break
							}
						}
					}
				}

				// Get last applied revision
				if rev, ok := status["lastAppliedRevision"].(string); ok {
					revision = rev
				} else if rev, ok := status["artifact"].(map[string]interface{}); ok {
					if r, ok := rev["revision"].(string); ok {
						revision = r
					}
				}
			}

			// Get source reference for Kustomizations and HelmReleases
			if spec, ok := item.Object["spec"].(map[string]interface{}); ok {
				if sr, ok := spec["sourceRef"].(map[string]interface{}); ok {
					kind, _ := sr["kind"].(string)
					name, _ := sr["name"].(string)
					sourceRef = fmt.Sprintf("%s/%s", kind, name)
				}
			}

			creationTime := item.GetCreationTimestamp()

			resources = append(resources, FluxResource{
				Kind:      crd.kind,
				Name:      item.GetName(),
				Namespace: item.GetNamespace(),
				Ready:     ready,
				Status:    statusMsg,
				Age:       formatAge(time.Since(creationTime.Time)),
				SourceRef: sourceRef,
				Revision:  revision,
			})
		}
	}

	if !fluxInstalled {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   true,
			"resources": []FluxResource{},
			"count":     0,
			"installed": false,
			"message":   "Flux is not installed in this cluster",
		})
		return
	}

	// Sort by kind then namespace then name
	sort.Slice(resources, func(i, j int) bool {
		if resources[i].Kind != resources[j].Kind {
			return resources[i].Kind < resources[j].Kind
		}
		if resources[i].Namespace != resources[j].Namespace {
			return resources[i].Namespace < resources[j].Namespace
		}
		return resources[i].Name < resources[j].Name
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"resources": resources,
		"count":     len(resources),
		"installed": true,
	})
}
