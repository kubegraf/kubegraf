// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package knowledge

import (
	"encoding/json"
	"fmt"
	"os"
)

// ImportResult contains the result of an import operation.
type ImportResult struct {
	TotalEntries    int      `json:"totalEntries"`
	ImportedCount   int      `json:"importedCount"`
	SkippedCount    int      `json:"skippedCount"`
	UpdatedCount    int      `json:"updatedCount"`
	Errors          []string `json:"errors,omitempty"`
	SkippedReasons  []string `json:"skippedReasons,omitempty"`
}

// ImportOptions configures the import behavior.
type ImportOptions struct {
	// OverwriteExisting if true, overwrites existing entries with same fingerprint
	OverwriteExisting bool `json:"overwriteExisting"`
	// SkipValidation if true, skips entry validation
	SkipValidation bool `json:"skipValidation"`
	// FilterPattern if set, only imports entries matching this pattern
	FilterPattern string `json:"filterPattern,omitempty"`
	// FilterOutcome if set, only imports entries with this outcome
	FilterOutcome string `json:"filterOutcome,omitempty"`
}

// KnowledgeStore is the interface for storing imported knowledge.
type KnowledgeStore interface {
	// HasEntry checks if an entry exists by fingerprint
	HasEntry(fingerprint string) bool
	// StoreEntry stores a knowledge entry
	StoreEntry(entry KnowledgeEntry) error
	// UpdateEntry updates an existing entry
	UpdateEntry(entry KnowledgeEntry) error
}

// KnowledgeImporter imports knowledge entries from files.
type KnowledgeImporter struct {
	store KnowledgeStore
}

// NewKnowledgeImporter creates a new importer.
func NewKnowledgeImporter(store KnowledgeStore) *KnowledgeImporter {
	return &KnowledgeImporter{store: store}
}

// ImportFromFile imports knowledge from a file.
func (i *KnowledgeImporter) ImportFromFile(filePath string, options ImportOptions) (*ImportResult, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return i.ImportFromBytes(data, options)
}

// ImportFromBytes imports knowledge from JSON bytes.
func (i *KnowledgeImporter) ImportFromBytes(data []byte, options ImportOptions) (*ImportResult, error) {
	var export KnowledgeExport
	if err := json.Unmarshal(data, &export); err != nil {
		return nil, fmt.Errorf("failed to parse export data: %w", err)
	}

	return i.processImport(&export, options)
}

// processImport handles the actual import logic.
func (i *KnowledgeImporter) processImport(export *KnowledgeExport, options ImportOptions) (*ImportResult, error) {
	result := &ImportResult{
		TotalEntries: len(export.Entries),
	}

	for _, entry := range export.Entries {
		// Apply filters
		if options.FilterPattern != "" && entry.Pattern != options.FilterPattern {
			result.SkippedCount++
			result.SkippedReasons = append(result.SkippedReasons, 
				fmt.Sprintf("Entry %s: pattern %s does not match filter %s", entry.Fingerprint, entry.Pattern, options.FilterPattern))
			continue
		}
		if options.FilterOutcome != "" && entry.Outcome != options.FilterOutcome {
			result.SkippedCount++
			result.SkippedReasons = append(result.SkippedReasons,
				fmt.Sprintf("Entry %s: outcome %s does not match filter %s", entry.Fingerprint, entry.Outcome, options.FilterOutcome))
			continue
		}

		// Validate entry
		if !options.SkipValidation {
			if err := i.validateEntry(entry); err != nil {
				result.SkippedCount++
				result.Errors = append(result.Errors, fmt.Sprintf("Entry %s: %s", entry.Fingerprint, err.Error()))
				continue
			}
		}

		// Check if entry exists
		if i.store.HasEntry(entry.Fingerprint) {
			if options.OverwriteExisting {
				if err := i.store.UpdateEntry(entry); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Entry %s: failed to update: %s", entry.Fingerprint, err.Error()))
					continue
				}
				result.UpdatedCount++
			} else {
				result.SkippedCount++
				result.SkippedReasons = append(result.SkippedReasons,
					fmt.Sprintf("Entry %s: already exists", entry.Fingerprint))
			}
		} else {
			if err := i.store.StoreEntry(entry); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Entry %s: failed to store: %s", entry.Fingerprint, err.Error()))
				continue
			}
			result.ImportedCount++
		}
	}

	return result, nil
}

// validateEntry validates a knowledge entry.
func (i *KnowledgeImporter) validateEntry(entry KnowledgeEntry) error {
	if entry.Fingerprint == "" {
		return fmt.Errorf("missing fingerprint")
	}
	if entry.Pattern == "" {
		return fmt.Errorf("missing pattern")
	}
	if entry.RootCause == "" {
		return fmt.Errorf("missing root cause")
	}
	if entry.Outcome == "" {
		return fmt.Errorf("missing outcome")
	}
	if entry.Outcome != "success" && entry.Outcome != "partial" && entry.Outcome != "failed" {
		return fmt.Errorf("invalid outcome: %s", entry.Outcome)
	}
	if entry.Confidence < 0 || entry.Confidence > 1 {
		return fmt.Errorf("confidence must be between 0 and 1")
	}
	return nil
}

// ParseExport parses an export without importing.
func (i *KnowledgeImporter) ParseExport(data []byte) (*KnowledgeExport, error) {
	var export KnowledgeExport
	if err := json.Unmarshal(data, &export); err != nil {
		return nil, fmt.Errorf("failed to parse export data: %w", err)
	}
	return &export, nil
}

