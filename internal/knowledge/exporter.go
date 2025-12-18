// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package knowledge

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// KnowledgeEntry represents a shareable knowledge entry.
type KnowledgeEntry struct {
	Fingerprint string    `json:"fingerprint"`
	Pattern     string    `json:"pattern"`
	RootCause   string    `json:"rootCause"`
	FixSummary  string    `json:"fixSummary"`
	Outcome     string    `json:"outcome"` // "success", "partial", "failed"
	Confidence  float64   `json:"confidence"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Tags        []string  `json:"tags,omitempty"`
	Notes       string    `json:"notes,omitempty"`
}

// KnowledgeExport represents the exported knowledge package.
type KnowledgeExport struct {
	Version     string           `json:"version"`
	ExportedAt  time.Time        `json:"exportedAt"`
	ExportedBy  string           `json:"exportedBy"`
	Description string           `json:"description"`
	EntryCount  int              `json:"entryCount"`
	Entries     []KnowledgeEntry `json:"entries"`
	Metadata    ExportMetadata   `json:"metadata"`
}

// ExportMetadata contains metadata about the export.
type ExportMetadata struct {
	KubeGrafVersion string            `json:"kubegrafVersion"`
	SourceCluster   string            `json:"sourceCluster,omitempty"`
	PatternCounts   map[string]int    `json:"patternCounts"`
	OutcomeCounts   map[string]int    `json:"outcomeCounts"`
}

// KnowledgeExporter exports knowledge entries to a file.
type KnowledgeExporter struct {
	version string
}

// NewKnowledgeExporter creates a new exporter.
func NewKnowledgeExporter(version string) *KnowledgeExporter {
	return &KnowledgeExporter{version: version}
}

// Export creates an export package from the given entries.
func (e *KnowledgeExporter) Export(entries []KnowledgeEntry, description string) *KnowledgeExport {
	patternCounts := make(map[string]int)
	outcomeCounts := make(map[string]int)

	for _, entry := range entries {
		patternCounts[entry.Pattern]++
		outcomeCounts[entry.Outcome]++
	}

	return &KnowledgeExport{
		Version:     "1.0",
		ExportedAt:  time.Now(),
		ExportedBy:  "kubegraf",
		Description: description,
		EntryCount:  len(entries),
		Entries:     entries,
		Metadata: ExportMetadata{
			KubeGrafVersion: e.version,
			PatternCounts:   patternCounts,
			OutcomeCounts:   outcomeCounts,
		},
	}
}

// ExportToFile writes the export to a file.
func (e *KnowledgeExporter) ExportToFile(export *KnowledgeExport, filePath string) error {
	// Ensure directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Marshal to JSON with indentation for readability
	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal export: %w", err)
	}

	// Write to file
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// ExportToBytes returns the export as JSON bytes.
func (e *KnowledgeExporter) ExportToBytes(export *KnowledgeExport) ([]byte, error) {
	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal export: %w", err)
	}
	return data, nil
}

