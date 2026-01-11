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

package database

import (
	"database/sql"
	"fmt"
	"time"
)

// EnhancedClusterEntry represents a cluster with enhanced status tracking
type EnhancedClusterEntry struct {
	ID                  int        `json:"id"`
	ClusterID           string     `json:"clusterId"` // Stable hash ID
	Name                string     `json:"name"`
	ContextName          string     `json:"contextName"`
	SourceID            *int       `json:"sourceId,omitempty"`
	Provider            string     `json:"provider"`
	Environment         string     `json:"environment"`
	KubeconfigPath      string     `json:"kubeconfigPath"`
	Status              string     `json:"status"` // UNKNOWN, CONNECTING, CONNECTED, DEGRADED, DISCONNECTED, AUTH_ERROR
	Connected           bool       `json:"connected"` // Legacy field
	Active              bool       `json:"active"`
	LastUsed            *time.Time `json:"lastUsed,omitempty"`
	LastChecked         *time.Time `json:"lastChecked,omitempty"`
	LastError           string     `json:"lastError,omitempty"`
	ConsecutiveFailures int        `json:"consecutiveFailures"`
	ConsecutiveSuccesses int       `json:"consecutiveSuccesses"`
	Error               string     `json:"error,omitempty"` // Legacy field
	IsDefault           bool       `json:"isDefault"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// ListEnhancedClusters returns all enhanced cluster entries
func (d *Database) ListEnhancedClusters() ([]*EnhancedClusterEntry, error) {
	rows, err := d.db.Query(`
		SELECT id, cluster_id, name, context_name, source_id, provider, environment,
		       kubeconfig_path, status, connected, active, last_used, last_checked,
		       last_error, consecutive_failures, consecutive_successes, error,
		       is_default, created_at, updated_at
		FROM clusters
		ORDER BY active DESC, name COLLATE NOCASE`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	clusters := make([]*EnhancedClusterEntry, 0)
	for rows.Next() {
		cluster := &EnhancedClusterEntry{}
		var sourceID sql.NullInt64
		var lastUsed sql.NullTime
		var lastChecked sql.NullTime
		var lastError sql.NullString
		var errMsg sql.NullString

		if err := rows.Scan(
			&cluster.ID,
			&cluster.ClusterID,
			&cluster.Name,
			&cluster.ContextName,
			&sourceID,
			&cluster.Provider,
			&cluster.Environment,
			&cluster.KubeconfigPath,
			&cluster.Status,
			&cluster.Connected,
			&cluster.Active,
			&lastUsed,
			&lastChecked,
			&lastError,
			&cluster.ConsecutiveFailures,
			&cluster.ConsecutiveSuccesses,
			&errMsg,
			&cluster.IsDefault,
			&cluster.CreatedAt,
			&cluster.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if sourceID.Valid {
			id := int(sourceID.Int64)
			cluster.SourceID = &id
		}
		if lastUsed.Valid {
			cluster.LastUsed = &lastUsed.Time
		}
		if lastChecked.Valid {
			cluster.LastChecked = &lastChecked.Time
		}
		if lastError.Valid {
			cluster.LastError = lastError.String
		}
		if errMsg.Valid {
			cluster.Error = errMsg.String
		}

		clusters = append(clusters, cluster)
	}

	return clusters, rows.Err()
}

// GetEnhancedClusterByClusterID returns a cluster by its stable cluster_id
func (d *Database) GetEnhancedClusterByClusterID(clusterID string) (*EnhancedClusterEntry, error) {
	cluster := &EnhancedClusterEntry{}
	var sourceID sql.NullInt64
	var lastUsed sql.NullTime
	var lastChecked sql.NullTime
	var lastError sql.NullString
	var errMsg sql.NullString

	if err := d.db.QueryRow(`
		SELECT id, cluster_id, name, context_name, source_id, provider, environment,
		       kubeconfig_path, status, connected, active, last_used, last_checked,
		       last_error, consecutive_failures, consecutive_successes, error,
		       is_default, created_at, updated_at
		FROM clusters WHERE cluster_id = ?`, clusterID).
		Scan(
			&cluster.ID,
			&cluster.ClusterID,
			&cluster.Name,
			&cluster.ContextName,
			&sourceID,
			&cluster.Provider,
			&cluster.Environment,
			&cluster.KubeconfigPath,
			&cluster.Status,
			&cluster.Connected,
			&cluster.Active,
			&lastUsed,
			&lastChecked,
			&lastError,
			&cluster.ConsecutiveFailures,
			&cluster.ConsecutiveSuccesses,
			&errMsg,
			&cluster.IsDefault,
			&cluster.CreatedAt,
			&cluster.UpdatedAt,
		); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("cluster %s not found", clusterID)
		}
		return nil, err
	}

	if sourceID.Valid {
		id := int(sourceID.Int64)
		cluster.SourceID = &id
	}
	if lastUsed.Valid {
		cluster.LastUsed = &lastUsed.Time
	}
	if lastChecked.Valid {
		cluster.LastChecked = &lastChecked.Time
	}
	if lastError.Valid {
		cluster.LastError = lastError.String
	}
	if errMsg.Valid {
		cluster.Error = errMsg.String
	}

	return cluster, nil
}

// UpsertEnhancedCluster saves or updates an enhanced cluster entry
func (d *Database) UpsertEnhancedCluster(cluster *EnhancedClusterEntry) error {
	if cluster == nil {
		return fmt.Errorf("cluster entry is nil")
	}
	if cluster.ClusterID == "" {
		return fmt.Errorf("cluster_id is required")
	}

	now := time.Now()
	if cluster.CreatedAt.IsZero() {
		cluster.CreatedAt = now
	}
	cluster.UpdatedAt = now

	lastUsed := interface{}(nil)
	if cluster.LastUsed != nil {
		lastUsed = *cluster.LastUsed
	}
	lastChecked := interface{}(nil)
	if cluster.LastChecked != nil {
		lastChecked = *cluster.LastChecked
	}

	_, err := d.db.Exec(`
		INSERT INTO clusters (
			cluster_id, name, context_name, source_id, provider, environment,
			kubeconfig_path, status, connected, active, last_used, last_checked,
			last_error, consecutive_failures, consecutive_successes, error,
			is_default, created_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(cluster_id) DO UPDATE SET
			name = excluded.name,
			context_name = excluded.context_name,
			source_id = excluded.source_id,
			provider = excluded.provider,
			environment = excluded.environment,
			kubeconfig_path = excluded.kubeconfig_path,
			status = excluded.status,
			connected = excluded.connected,
			active = excluded.active,
			last_used = excluded.last_used,
			last_checked = excluded.last_checked,
			last_error = excluded.last_error,
			consecutive_failures = excluded.consecutive_failures,
			consecutive_successes = excluded.consecutive_successes,
			error = excluded.error,
			is_default = excluded.is_default,
			updated_at = excluded.updated_at
	`, cluster.ClusterID, cluster.Name, cluster.ContextName, cluster.SourceID,
		cluster.Provider, cluster.Environment, cluster.KubeconfigPath,
		cluster.Status, cluster.Connected, cluster.Active,
		lastUsed, lastChecked, cluster.LastError,
		cluster.ConsecutiveFailures, cluster.ConsecutiveSuccesses,
		cluster.Error, cluster.IsDefault, cluster.CreatedAt, cluster.UpdatedAt)
	return err
}

// SetActiveCluster sets the active cluster and clears others
func (d *Database) SetActiveCluster(clusterID string) error {
	if clusterID == "" {
		return fmt.Errorf("cluster_id is required")
	}
	_, err := d.db.Exec(`
		UPDATE clusters
		SET active = CASE WHEN cluster_id = ? THEN 1 ELSE 0 END,
		    updated_at = CURRENT_TIMESTAMP
	`, clusterID)
	return err
}

// GetActiveCluster returns the currently active cluster
func (d *Database) GetActiveCluster() (*EnhancedClusterEntry, error) {
	cluster := &EnhancedClusterEntry{}
	var sourceID sql.NullInt64
	var lastUsed sql.NullTime
	var lastChecked sql.NullTime
	var lastError sql.NullString
	var errMsg sql.NullString

	if err := d.db.QueryRow(`
		SELECT id, cluster_id, name, context_name, source_id, provider, environment,
		       kubeconfig_path, status, connected, active, last_used, last_checked,
		       last_error, consecutive_failures, consecutive_successes, error,
		       is_default, created_at, updated_at
		FROM clusters WHERE active = 1 LIMIT 1`).
		Scan(
			&cluster.ID,
			&cluster.ClusterID,
			&cluster.Name,
			&cluster.ContextName,
			&sourceID,
			&cluster.Provider,
			&cluster.Environment,
			&cluster.KubeconfigPath,
			&cluster.Status,
			&cluster.Connected,
			&cluster.Active,
			&lastUsed,
			&lastChecked,
			&lastError,
			&cluster.ConsecutiveFailures,
			&cluster.ConsecutiveSuccesses,
			&errMsg,
			&cluster.IsDefault,
			&cluster.CreatedAt,
			&cluster.UpdatedAt,
		); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No active cluster
		}
		return nil, err
	}

	if sourceID.Valid {
		id := int(sourceID.Int64)
		cluster.SourceID = &id
	}
	if lastUsed.Valid {
		cluster.LastUsed = &lastUsed.Time
	}
	if lastChecked.Valid {
		cluster.LastChecked = &lastChecked.Time
	}
	if lastError.Valid {
		cluster.LastError = lastError.String
	}
	if errMsg.Valid {
		cluster.Error = errMsg.String
	}

	return cluster, nil
}

// UpdateClusterStatus updates the status and health check fields for a cluster
func (d *Database) UpdateClusterStatus(clusterID string, status string, lastError string, consecutiveFailures, consecutiveSuccesses int) error {
	now := time.Now()
	_, err := d.db.Exec(`
		UPDATE clusters
		SET status = ?,
		    last_checked = ?,
		    last_error = ?,
		    consecutive_failures = ?,
		    consecutive_successes = ?,
		    connected = CASE WHEN status IN ('CONNECTED', 'DEGRADED') THEN 1 ELSE 0 END,
		    updated_at = CURRENT_TIMESTAMP
		WHERE cluster_id = ?
	`, status, now, lastError, consecutiveFailures, consecutiveSuccesses, clusterID)
	return err
}

// DeleteEnhancedClusterByClusterID deletes a cluster by its cluster ID
func (d *Database) DeleteEnhancedClusterByClusterID(clusterID string) error {
	_, err := d.db.Exec("DELETE FROM clusters WHERE cluster_id = ?", clusterID)
	return err
}
