// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"net/http"
)

// handleNotificationsList returns all notifications with optional filtering
func (ws *WebServer) handleNotificationsList(w http.ResponseWriter, r *http.Request) {
	filter := r.URL.Query().Get("filter") // "all", "unread"
	severity := r.URL.Query().Get("severity")

	var filterRead *bool
	if filter == "unread" {
		f := false
		filterRead = &f
	} else if filter == "read" {
		f := true
		filterRead = &f
	}

	var sev *string
	if severity != "" {
		sev = &severity
	}

	notifications, err := ws.db.ListNotifications(filterRead, sev)
	if err != nil {
		http.Error(w, "Failed to list notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"notifications": notifications,
	})
}

// handleNotificationMarkRead marks a notification as read
func (ws *WebServer) handleNotificationMarkRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract ID from path: /api/notifications/:id/read
	// Since we don't have a router, we'll parse it manually
	var req struct {
		ID string `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := ws.db.MarkNotificationRead(req.ID); err != nil {
		http.Error(w, "Failed to mark notification as read", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// handleNotificationMarkAllRead marks all notifications as read
func (ws *WebServer) handleNotificationMarkAllRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := ws.db.MarkAllNotificationsRead(); err != nil {
		http.Error(w, "Failed to mark all notifications as read", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// handleNotificationUnreadCount returns the count of unread notifications
func (ws *WebServer) handleNotificationUnreadCount(w http.ResponseWriter, r *http.Request) {
	count, err := ws.db.UnreadNotificationCount()
	if err != nil {
		http.Error(w, "Failed to get unread count", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"unread_count": count,
	})
}

// handleNotificationDelete deletes a single notification
func (ws *WebServer) handleNotificationDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID string `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := ws.db.DeleteNotification(req.ID); err != nil {
		http.Error(w, "Failed to delete notification", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}
