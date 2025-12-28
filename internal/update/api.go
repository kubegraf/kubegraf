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

package update

import (
	"context"
	"encoding/json"
	"net/http"
)

// APIHandler provides HTTP handlers for the update API
type APIHandler struct {
	updater *Updater
}

// NewAPIHandler creates a new API handler
func NewAPIHandler(currentVersion string) (*APIHandler, error) {
	updater, err := NewUpdater(currentVersion)
	if err != nil {
		return nil, err
	}

	return &APIHandler{
		updater: updater,
	}, nil
}

// HandleCheckUpdate handles GET /api/update/check
// Returns information about available updates
func (h *APIHandler) HandleCheckUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	info, err := h.updater.CheckForUpdate(ctx)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to check for updates", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, info)
}

// HandleApplyUpdate handles POST /api/update/apply
// Downloads and applies an update
func (h *APIHandler) HandleApplyUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ApplyUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	// Validate required fields
	if req.DownloadURL == "" {
		writeJSONError(w, http.StatusBadRequest, "Missing download URL", "downloadUrl is required")
		return
	}

	ctx := r.Context()
	resp, err := h.updater.ApplyUpdate(ctx, req)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to apply update", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// HandleGetPlatformInfo handles GET /api/update/platform
// Returns information about the current platform and installation
func (h *APIHandler) HandleGetPlatformInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	info := h.updater.GetPlatformInfo()
	writeJSON(w, http.StatusOK, info)
}

// HandleClearCache handles POST /api/update/clear-cache
// Clears the update check cache
func (h *APIHandler) HandleClearCache(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	h.updater.ClearCache()
	writeJSON(w, http.StatusOK, map[string]string{"status": "cache cleared"})
}

// RegisterRoutes registers the update API routes with an HTTP mux
func (h *APIHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/update/check", h.HandleCheckUpdate)
	mux.HandleFunc("/api/update/apply", h.HandleApplyUpdate)
	mux.HandleFunc("/api/update/platform", h.HandleGetPlatformInfo)
	mux.HandleFunc("/api/update/clear-cache", h.HandleClearCache)
}

// APIResponse is a generic API response wrapper
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// writeJSON writes a JSON response
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// writeJSONError writes a JSON error response
func writeJSONError(w http.ResponseWriter, status int, message, detail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIResponse{
		Success: false,
		Error:   detail,
		Message: message,
	})
}

// Convenience functions for use with existing web server

// CheckUpdateHandler returns an http.HandlerFunc for checking updates
func CheckUpdateHandler(currentVersion string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := Init(currentVersion); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to initialize updater", err.Error())
			return
		}

		ctx := r.Context()
		info, err := CheckForUpdateGlobal(ctx)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to check for updates", err.Error())
			return
		}

		writeJSON(w, http.StatusOK, info)
	}
}

// ApplyUpdateHandler returns an http.HandlerFunc for applying updates
func ApplyUpdateHandler(currentVersion string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := Init(currentVersion); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to initialize updater", err.Error())
			return
		}

		var req ApplyUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "Invalid request body", err.Error())
			return
		}

		if req.DownloadURL == "" {
			writeJSONError(w, http.StatusBadRequest, "Missing download URL", "downloadUrl is required")
			return
		}

		ctx := r.Context()
		resp, err := ApplyUpdateGlobal(ctx, req)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to apply update", err.Error())
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// PlatformInfoHandler returns an http.HandlerFunc for platform info
func PlatformInfoHandler(currentVersion string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := Init(currentVersion); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to initialize updater", err.Error())
			return
		}

		info, err := GetPlatformInfoGlobal()
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to get platform info", err.Error())
			return
		}

		writeJSON(w, http.StatusOK, info)
	}
}

// Simple functional API for direct use

// CheckUpdate checks for available updates
func CheckUpdate(ctx context.Context, currentVersion string) (*UpdateInfo, error) {
	if err := Init(currentVersion); err != nil {
		return nil, err
	}
	return CheckForUpdateGlobal(ctx)
}

// ApplyUpdateWithDefaults applies an update with default settings
func ApplyUpdateWithDefaults(ctx context.Context, currentVersion, downloadURL string) (*ApplyUpdateResponse, error) {
	if err := Init(currentVersion); err != nil {
		return nil, err
	}

	return ApplyUpdateGlobal(ctx, ApplyUpdateRequest{
		DownloadURL: downloadURL,
		AutoRestart: true,
	})
}
