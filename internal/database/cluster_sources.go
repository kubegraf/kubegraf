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

// ClusterSource represents a kubeconfig source (default, file, or inline)
type ClusterSource struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"` // "default", "file", "inline"
	Path        string    `json:"path,omitempty"` // For "file" type
	ContentPath string    `json:"contentPath,omitempty"` // For "inline" type (saved file path)
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ListClusterSources returns all cluster sources
func (d *Database) ListClusterSources() ([]*ClusterSource, error) {
	rows, err := d.db.Query(`
		SELECT id, name, type, path, content_path, created_at, updated_at
		FROM cluster_sources
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sources := make([]*ClusterSource, 0)
	for rows.Next() {
		var source ClusterSource
		var path sql.NullString
		var contentPath sql.NullString
		if err := rows.Scan(
			&source.ID,
			&source.Name,
			&source.Type,
			&path,
			&contentPath,
			&source.CreatedAt,
			&source.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if path.Valid {
			source.Path = path.String
		}
		if contentPath.Valid {
			source.ContentPath = contentPath.String
		}
		sources = append(sources, &source)
	}

	return sources, rows.Err()
}

// GetClusterSourceByID returns a cluster source by ID
func (d *Database) GetClusterSourceByID(id int) (*ClusterSource, error) {
	var source ClusterSource
	var path sql.NullString
	var contentPath sql.NullString
	if err := d.db.QueryRow(`
		SELECT id, name, type, path, content_path, created_at, updated_at
		FROM cluster_sources WHERE id = ?`, id).
		Scan(&source.ID, &source.Name, &source.Type, &path, &contentPath, &source.CreatedAt, &source.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("cluster source %d not found", id)
		}
		return nil, err
	}
	if path.Valid {
		source.Path = path.String
	}
	if contentPath.Valid {
		source.ContentPath = contentPath.String
	}
	return &source, nil
}

// UpsertClusterSource saves or updates a cluster source
func (d *Database) UpsertClusterSource(source *ClusterSource) error {
	if source == nil {
		return fmt.Errorf("cluster source is nil")
	}
	now := time.Now()
	if source.CreatedAt.IsZero() {
		source.CreatedAt = now
	}
	source.UpdatedAt = now

	_, err := d.db.Exec(`
		INSERT INTO cluster_sources (name, type, path, content_path, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(name, type) DO UPDATE SET
			path = excluded.path,
			content_path = excluded.content_path,
			updated_at = excluded.updated_at
	`, source.Name, source.Type, source.Path, source.ContentPath, source.CreatedAt, source.UpdatedAt)
	return err
}

// DeleteClusterSource deletes a cluster source by ID
func (d *Database) DeleteClusterSource(id int) error {
	_, err := d.db.Exec(`DELETE FROM cluster_sources WHERE id = ?`, id)
	return err
}
