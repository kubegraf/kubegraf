// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	ml "github.com/kubegraf/kubegraf/internal/ml"
)

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// handleMLJobCreate creates a new ML training job
func (ws *WebServer) handleMLJobCreate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ml.MLTrainingJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	// Create the job
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	job, err := ws.CreateMLTrainingJob(ctx, req)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"job":     convertJobToMLTrainingJob(*job),
	})
}

// handleMLJobList lists all ML training jobs
func (ws *WebServer) handleMLJobList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = "_all"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	jobs, err := ws.ListMLTrainingJobs(ctx, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
			"jobs":  []ml.MLTrainingJob{},
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"jobs": jobs,
	})
}

// handleMLJobDelete deletes an ML training job
func (ws *WebServer) handleMLJobDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := ws.DeleteMLTrainingJob(ctx, req.Name, req.Namespace); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Job %s deleted successfully", req.Name),
	})
}

// handleMLJobLogs streams logs from an ML training job
func (ws *WebServer) handleMLJobLogs(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	follow := r.URL.Query().Get("follow") == "true"

	if name == "" || namespace == "" {
		http.Error(w, "name and namespace are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	// If follow is true, use WebSocket for streaming
	if follow {
		// WebSocket handler will be set up separately
		http.Error(w, "WebSocket streaming not implemented in this endpoint. Use /api/ml/jobs/logs/ws", http.StatusNotImplemented)
		return
	}

	// Get logs (non-streaming)
	logStream, err := ws.GetMLJobLogs(ctx, name, namespace, false)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer logStream.Close()

	w.Header().Set("Content-Type", "text/plain")
	io.Copy(w, logStream)
}

// handleMLJobLogsWS handles WebSocket streaming of job logs
func (ws *WebServer) handleMLJobLogsWS(w http.ResponseWriter, r *http.Request) {
	// Upgrade connection to WebSocket
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Failed to upgrade connection", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	// Get parameters from query string
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: name and namespace are required\n"))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// Stream logs
	err = StreamMLJobLogs(ctx, ws.app.clientset, name, namespace, &wsWriter{conn: conn})
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: %v\n", err)))
		return
	}
}

// wsWriter wraps websocket.Conn to implement io.Writer
type wsWriter struct {
	conn *websocket.Conn
}

func (w *wsWriter) Write(p []byte) (n int, err error) {
	err = w.conn.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}

// handleMLJobGet gets a specific ML training job
func (ws *WebServer) handleMLJobGet(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		http.Error(w, "name and namespace are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	job, err := ws.GetMLTrainingJob(ctx, name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(job)
}

