package main

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/kubegraf/kubegraf/internal/database"
)

// WorkspaceContextDB wraps database operations for workspace context
// Since we can't add methods to database.Database from main package,
// we use helper functions that work with the database package
type WorkspaceContextDB struct {
	db *database.Database
}

// NewWorkspaceContextDB creates a new workspace context database helper
func NewWorkspaceContextDB(db *database.Database) *WorkspaceContextDB {
	return &WorkspaceContextDB{db: db}
}

// GetWorkspaceContext loads the persisted workspace context or returns the default.
func (w *WorkspaceContextDB) GetWorkspaceContext() (*WorkspaceContext, error) {
	if w.db == nil {
		return DefaultWorkspaceContext(), nil
	}

	sqlDB := w.db.GetDB()
	row := sqlDB.QueryRow(`SELECT payload, updated_at FROM workspace_context WHERE id = 1`)
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
func (w *WorkspaceContextDB) SaveWorkspaceContext(ctx *WorkspaceContext) error {
	if w.db == nil {
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

	sqlDB := w.db.GetDB()
	_, err = sqlDB.Exec(`
		INSERT INTO workspace_context (id, payload, updated_at)
		VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			payload = excluded.payload,
			updated_at = excluded.updated_at
	`, string(payload), ctx.UpdatedAt)
	return err
}
