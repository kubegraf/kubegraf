package main

import (
	"net/http"

	"k8s.io/client-go/kubernetes"
)

// currentClientset returns a snapshot of the current clientset.
// It never blocks and callers should treat a nil return as "no active cluster".
func (ws *WebServer) currentClientset() *kubernetes.Clientset {
	if ws.app == nil || !ws.app.connected {
		return nil
	}
	return ws.app.clientset
}

// requireClientset returns the current clientset if a cluster is connected.
// If no cluster is available it writes a 503 and returns nil.
func (ws *WebServer) requireClientset(w http.ResponseWriter) *kubernetes.Clientset {
	clientset := ws.currentClientset()
	if clientset == nil || !ws.app.connected {
		http.Error(w, "No Kubernetes cluster connected", http.StatusServiceUnavailable)
		return nil
	}
	return clientset
}
