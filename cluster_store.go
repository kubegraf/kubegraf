package main

import (
	"database/sql"
	"fmt"
	"time"
)

// ClusterEntry represents a persisted cluster connection record
type ClusterEntry struct {
	ID             int        `json:"id"`
	Name           string     `json:"name"`
	Provider       string     `json:"provider"`
	KubeconfigPath string     `json:"kubeconfigPath"`
	Connected      bool       `json:"connected"`
	LastUsed       *time.Time `json:"lastUsed,omitempty"`
	Error          string     `json:"error,omitempty"`
	IsDefault      bool       `json:"isDefault"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// ListClusters returns all stored cluster entries
func (d *Database) ListClusters() ([]*ClusterEntry, error) {
	rows, err := d.db.Query(`
		SELECT id, name, provider, kubeconfig_path, connected, last_used, error, is_default, created_at, updated_at
		FROM clusters
		ORDER BY name COLLATE NOCASE`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]*ClusterEntry, 0)
	for rows.Next() {
		var entry ClusterEntry
		var lastUsed sql.NullTime
		var errMsg sql.NullString
		if err := rows.Scan(
			&entry.ID,
			&entry.Name,
			&entry.Provider,
			&entry.KubeconfigPath,
			&entry.Connected,
			&lastUsed,
			&errMsg,
			&entry.IsDefault,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if lastUsed.Valid {
			entry.LastUsed = &lastUsed.Time
		}
		if errMsg.Valid {
			entry.Error = errMsg.String
		}
		entries = append(entries, &entry)
	}

	return entries, rows.Err()
}

// GetClusterByName returns a single cluster entry by name
func (d *Database) GetClusterByName(name string) (*ClusterEntry, error) {
	var entry ClusterEntry
	var lastUsed sql.NullTime
	var errMsg sql.NullString
	if err := d.db.QueryRow(`
		SELECT id, name, provider, kubeconfig_path, connected, last_used, error, is_default, created_at, updated_at
		FROM clusters WHERE name = ?`, name).
		Scan(&entry.ID, &entry.Name, &entry.Provider, &entry.KubeconfigPath, &entry.Connected, &lastUsed, &errMsg, &entry.IsDefault, &entry.CreatedAt, &entry.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("cluster %s not found", name)
		}
		return nil, err
	}

	if lastUsed.Valid {
		entry.LastUsed = &lastUsed.Time
	}
	if errMsg.Valid {
		entry.Error = errMsg.String
	}
	return &entry, nil
}

// UpsertCluster saves or updates a cluster entry
func (d *Database) UpsertCluster(entry *ClusterEntry) error {
	if entry == nil {
		return fmt.Errorf("cluster entry is nil")
	}
	now := time.Now()
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = now
	}
	entry.UpdatedAt = now
	lastUsed := interface{}(nil)
	if entry.LastUsed != nil {
		lastUsed = *entry.LastUsed
	}

	_, err := d.db.Exec(`
		INSERT INTO clusters (name, provider, kubeconfig_path, connected, last_used, error, is_default, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(name) DO UPDATE SET
			provider = excluded.provider,
			kubeconfig_path = excluded.kubeconfig_path,
			connected = excluded.connected,
			last_used = excluded.last_used,
			error = excluded.error,
			is_default = excluded.is_default,
			updated_at = excluded.updated_at
	`, entry.Name, entry.Provider, entry.KubeconfigPath, entry.Connected, lastUsed, entry.Error, entry.IsDefault, entry.CreatedAt, entry.UpdatedAt)
	return err
}

// UpdateClusterConnection updates the connection status for a specific cluster
func (d *Database) UpdateClusterConnection(name string, connected bool, errMsg string) error {
	_, err := d.db.Exec(`
		UPDATE clusters
		SET connected = ?, error = ?, last_used = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE last_used END, updated_at = CURRENT_TIMESTAMP
		WHERE name = ?
	`, connected, errMsg, connected, name)
	return err
}

// ClearClusterConnections marks all clusters as disconnected
func (d *Database) ClearClusterConnections() error {
	_, err := d.db.Exec(`
		UPDATE clusters
		SET connected = 0, updated_at = CURRENT_TIMESTAMP`)
	return err
}

// SetDefaultCluster marks the provided cluster as default and clears others
func (d *Database) SetDefaultCluster(name string) error {
	if name == "" {
		return fmt.Errorf("cluster name is required")
	}
	if _, err := d.db.Exec(`UPDATE clusters SET is_default = CASE WHEN name = ? THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP`, name); err != nil {
		return err
	}
	return nil
}
