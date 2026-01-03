// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"net/http"
)

// handlePolicyStatus returns the current policy status
func (ws *WebServer) handlePolicyStatus(w http.ResponseWriter, r *http.Request) {
	status, err := ws.policyService.GetPolicyStatus()
	if err != nil {
		http.Error(w, "Failed to get policy status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handlePolicyAccept marks the policy as accepted
func (ws *WebServer) handlePolicyAccept(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		PolicyVersion string `json:"policy_version"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Verify the version matches
	if req.PolicyVersion != POLICY_VERSION {
		http.Error(w, "Policy version mismatch", http.StatusBadRequest)
		return
	}

	if err := ws.policyService.AcceptPolicy(); err != nil {
		http.Error(w, "Failed to accept policy", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Policy accepted",
	})
}

// policyRequiredMiddleware blocks requests if policy hasn't been accepted
// Use this middleware on cluster-related endpoints
func (ws *WebServer) policyRequiredMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if ws.policyService.IsPolicyRequired() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error_code": "POLICY_NOT_ACCEPTED",
				"policy_version": POLICY_VERSION,
				"message": "Policy acceptance required to access cluster features",
			})
			return
		}
		next(w, r)
	}
}
