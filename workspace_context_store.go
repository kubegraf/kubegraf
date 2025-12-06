package main

import (
	"database/sql"
	"encoding/json"
	"time"
)

// GetWorkspaceContext loads the persisted workspace context or returns the default.
func (d *Database) GetWorkspaceContext() (*WorkspaceContext, error) {
	if d == nil || d.db == nil {
		return DefaultWorkspaceContext(), nil
	}

	row := d.db.QueryRow(`SELECT payload, updated_at FROM workspace_context WHERE id = 1`)
	var payload sql.NullString
	var updatedAt sql.NullTime
	if err := row.Scan(&payload, &updatedAt); err != nil {
		if err == sql.ErrNoRows {
			return DefaultWorkspaceContext(), nil
		}
		return nil, err
	}

	ctx := DefaultWorkspaceContext()
	if payload.Valid && payload.String != "" {
		if err := json.Unmarshal([]byte(payload.String), ctx); err != nil {
			// If payload is corrupt, fall back to default
			ctx = DefaultWorkspaceContext()
		}
	}
	if updatedAt.Valid {
		ctx.UpdatedAt = updatedAt.Time
	}
	ctx.Normalize()
	return ctx, nil
}

// SaveWorkspaceContext persists the workspace context atomically.
func (d *Database) SaveWorkspaceContext(ctx *WorkspaceContext) error {
	if d == nil || d.db == nil {
		return nil
	}
	if ctx == nil {
		ctx = DefaultWorkspaceContext()
	}
	ctx.Normalize()
	ctx.UpdatedAt = time.Now()
	payload, err := json.Marshal(ctx)
	if err != nil {
		return err
	}

	_, err = d.db.Exec(`
		INSERT INTO workspace_context (id, payload, updated_at)
		VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			payload = excluded.payload,
			updated_at = excluded.updated_at
	`, string(payload), ctx.UpdatedAt)
	return err
}
