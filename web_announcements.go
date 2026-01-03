// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"net/http"
)

// handleAnnouncementsStatus returns the announcements opt-in status
func (ws *WebServer) handleAnnouncementsStatus(w http.ResponseWriter, r *http.Request) {
	status, err := ws.announcementsService.GetStatus()
	if err != nil {
		http.Error(w, "Failed to get announcements status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleAnnouncementsOptIn sets the opt-in preference
func (ws *WebServer) handleAnnouncementsOptIn(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		OptIn bool `json:"opt_in"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := ws.announcementsService.SetOptIn(req.OptIn); err != nil {
		http.Error(w, "Failed to set opt-in preference", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"opt_in":  req.OptIn,
	})
}

// handleAnnouncementsCheck manually triggers an announcements fetch
func (ws *WebServer) handleAnnouncementsCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if opted in
	optedIn, err := ws.announcementsService.IsOptedIn()
	if err != nil {
		http.Error(w, "Failed to check opt-in status", http.StatusInternalServerError)
		return
	}

	if !optedIn {
		w.WriteHeader(http.StatusForbidden)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Announcements not opted in",
			"message": "Please enable announcements in settings first",
		})
		return
	}

	// Fetch announcements
	if err := ws.announcementsService.FetchAnnouncements(); err != nil {
		http.Error(w, "Failed to fetch announcements: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Announcements fetched successfully",
	})
}
