// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"net/http"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// ServiceAccountInfo represents a ServiceAccount with details
type ServiceAccountInfo struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Secrets   int               `json:"secrets"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
}

// RoleInfo represents a Role with details
type RoleInfo struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Rules     int    `json:"rules"`
	Age       string `json:"age"`
}

// ClusterRoleInfo represents a ClusterRole with details
type ClusterRoleInfo struct {
	Name  string `json:"name"`
	Rules int    `json:"rules"`
	Age   string `json:"age"`
}

// RoleBindingInfo represents a RoleBinding with details
type RoleBindingInfo struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	RoleRef   string `json:"roleRef"`
	Subjects  int    `json:"subjects"`
	Age       string `json:"age"`
}

// ClusterRoleBindingInfo represents a ClusterRoleBinding with details
type ClusterRoleBindingInfo struct {
	Name     string `json:"name"`
	RoleRef  string `json:"roleRef"`
	Subjects int    `json:"subjects"`
	Age      string `json:"age"`
}

// handleServiceAccounts returns list of ServiceAccounts
func (ws *WebServer) handleServiceAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode([]ServiceAccountInfo{})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	serviceAccounts, err := ws.app.clientset.CoreV1().ServiceAccounts(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result := make([]ServiceAccountInfo, 0, len(serviceAccounts.Items))
	for _, sa := range serviceAccounts.Items {
		result = append(result, ServiceAccountInfo{
			Name:      sa.Name,
			Namespace: sa.Namespace,
			Secrets:   len(sa.Secrets),
			Age:       formatAge(time.Since(sa.CreationTimestamp.Time)),
			Labels:    sa.Labels,
		})
	}

	json.NewEncoder(w).Encode(result)
}

// handleServiceAccountDetails returns details of a specific ServiceAccount
func (ws *WebServer) handleServiceAccountDetails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		http.Error(w, "name and namespace required", http.StatusBadRequest)
		return
	}

	if ws.app.clientset == nil {
		http.Error(w, "Not connected to cluster", http.StatusServiceUnavailable)
		return
	}

	sa, err := ws.app.clientset.CoreV1().ServiceAccounts(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(sa)
}

// handleServiceAccountYAML returns YAML of a ServiceAccount
func (ws *WebServer) handleServiceAccountYAML(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		http.Error(w, "name and namespace required", http.StatusBadRequest)
		return
	}

	if ws.app.clientset == nil {
		http.Error(w, "Not connected to cluster", http.StatusServiceUnavailable)
		return
	}

	sa, err := ws.app.clientset.CoreV1().ServiceAccounts(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	gvk := schema.GroupVersionKind{
		Group:   "",
		Version: "v1",
		Kind:    "ServiceAccount",
	}
	yaml, err := toKubectlYAML(sa, gvk)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/yaml")
	w.Write([]byte(yaml))
}

// Note: RBAC handlers (Roles, ClusterRoles, RoleBindings, ClusterRoleBindings) 
// already exist in ai_handlers.go and are registered there

// RegisterAccessControlHandlers registers access control API handlers
func (ws *WebServer) RegisterAccessControlHandlers() {
	// Service Accounts
	http.HandleFunc("/api/serviceaccounts", ws.handleServiceAccounts)
	http.HandleFunc("/api/serviceaccount/details", ws.handleServiceAccountDetails)
	http.HandleFunc("/api/serviceaccount/yaml", ws.handleServiceAccountYAML)

	// Note: RBAC handlers (Roles, ClusterRoles, RoleBindings, ClusterRoleBindings)
	// are already registered in ai_handlers.go via existing endpoints:
	// /api/rbac/role, /api/rbac/clusterrole, /api/rbac/rolebinding, /api/rbac/clusterrolebinding
}

