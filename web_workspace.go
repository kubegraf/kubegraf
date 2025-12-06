package main

import (
	"encoding/json"
	"net/http"
)

// getWorkspaceContext retrieves the current workspace context from the database.
func (ws *WebServer) getWorkspaceContext() *WorkspaceContext {
	if ws.db == nil {
		return DefaultWorkspaceContext()
	}
	ctx, err := ws.db.GetWorkspaceContext()
	if err != nil {
		return DefaultWorkspaceContext()
	}
	return ctx
}

// persistWorkspaceContext saves the workspace context to the database.
func (ws *WebServer) persistWorkspaceContext(ctx *WorkspaceContext) (*WorkspaceContext, error) {
	if ws.db == nil {
		return ctx, nil
	}
	if err := ws.db.SaveWorkspaceContext(ctx); err != nil {
		return nil, err
	}
	return ctx, nil
}

// handleWorkspaceContext manages the persisted workspace context (namespaces, filters, etc.).
func (ws *WebServer) handleWorkspaceContext(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ws.getWorkspaceContext())
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var payload WorkspaceContext
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	payload.Normalize()

	updated, err := ws.persistWorkspaceContext(&payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_ = json.NewEncoder(w).Encode(updated)
}
