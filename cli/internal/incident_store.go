// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")
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

package cli

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// IncidentStore provides an interface for accessing incidents
type IncidentStore interface {
	List(filter IncidentFilter) ([]*IncidentRecord, error)
	Get(id string) (*IncidentRecord, error)
}

// IncidentFilter defines filtering options for incidents
type IncidentFilter struct {
	Since     time.Duration
	Severity  string
	Namespace string
	Context   string
}

// IncidentRecord wraps the incident data for CLI use
type IncidentRecord struct {
	ID            string
	Severity      string
	Started       time.Time
	Namespace     string
	PrimaryObject string
	Summary       string
	FullIncident  *incidents.IncidentRecord
}

// knowledgeBankStore wraps the KnowledgeBank to implement IncidentStore
type knowledgeBankStore struct {
	kb *incidents.KnowledgeBank
}

// NewIncidentStore creates a new incident store instance
// This is safe to use concurrently with the web UI as it uses SQLite's built-in
// concurrency controls. Reads are non-blocking and won't interfere with web UI operations.
func NewIncidentStore() (IncidentStore, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("get home directory: %w", err)
	}

	kubegrafDir := filepath.Join(homeDir, ".kubegraf")
	dataDir := filepath.Join(kubegrafDir, "incidents")

	// Create KnowledgeBank with separate connection - SQLite handles concurrent access
	// CLI uses read-only operations, so it won't block web UI writes
	kb, err := incidents.NewKnowledgeBank(dataDir)
	if err != nil {
		// Check if it's a database lock error (web UI might be writing)
		if isDatabaseLocked(err) {
			return nil, fmt.Errorf("database is locked (web UI may be writing). Retry in a moment: %w", err)
		}
		return nil, fmt.Errorf("initialize knowledge bank: %w", err)
	}

	return &knowledgeBankStore{kb: kb}, nil
}

// isDatabaseLocked is defined in safety.go

// List returns incidents matching the filter
// This is a read-only operation and won't interfere with web UI writes
func (s *knowledgeBankStore) List(filter IncidentFilter) ([]*IncidentRecord, error) {
	// Get recent incidents (both resolved and unresolved)
	// Use a high limit to get all relevant incidents, then filter
	// SQLite RWMutex allows concurrent reads, so this is safe
	allIncidents, err := s.kb.GetRecentIncidents(10000)
	if err != nil {
		// Handle database lock errors gracefully
		if isDatabaseLocked(err) {
			return nil, fmt.Errorf("database temporarily locked (web UI may be writing). Retry in a moment: %w", err)
		}
		return nil, fmt.Errorf("get recent incidents: %w", err)
	}

	var results []*IncidentRecord
	cutoffTime := time.Now().Add(-filter.Since)

	for _, inc := range allIncidents {
		// Apply filters
		if filter.Namespace != "" && inc.Resource.Namespace != filter.Namespace {
			continue
		}
		if filter.Severity != "" && string(inc.Severity) != filter.Severity {
			continue
		}
		if filter.Context != "" && inc.ClusterContext != filter.Context {
			continue
		}
		if !inc.FirstSeen.After(cutoffTime) {
			continue
		}

		record := &IncidentRecord{
			ID:            inc.ID,
			Severity:      string(inc.Severity),
			Started:       inc.FirstSeen,
			Namespace:     inc.Resource.Namespace,
			PrimaryObject: fmt.Sprintf("%s/%s", inc.Resource.Kind, inc.Resource.Name),
			Summary:       inc.Title,
			FullIncident:  inc,
		}
		results = append(results, record)
	}

	return results, nil
}

// Get retrieves an incident by ID
// This is a read-only operation and won't interfere with web UI writes
func (s *knowledgeBankStore) Get(id string) (*IncidentRecord, error) {
	inc, err := s.kb.GetIncident(id)
	if err != nil {
		// Handle database lock errors gracefully
		if isDatabaseLocked(err) {
			return nil, fmt.Errorf("database temporarily locked (web UI may be writing). Retry in a moment: %w", err)
		}
		return nil, fmt.Errorf("get incident: %w", err)
	}
	if inc == nil {
		return nil, fmt.Errorf("incident not found: %s", id)
	}

	return &IncidentRecord{
		ID:            inc.ID,
		Severity:      string(inc.Severity),
		Started:       inc.FirstSeen,
		Namespace:     inc.Resource.Namespace,
		PrimaryObject: fmt.Sprintf("%s/%s", inc.Resource.Kind, inc.Resource.Name),
		Summary:       inc.Title,
		FullIncident:  inc,
	}, nil
}
