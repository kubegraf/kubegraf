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

package cluster

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// ClusterStatus represents the health status of a cluster
type ClusterStatus string

const (
	StatusUnknown      ClusterStatus = "UNKNOWN"
	StatusConnecting   ClusterStatus = "CONNECTING"
	StatusConnected    ClusterStatus = "CONNECTED"
	StatusDegraded     ClusterStatus = "DEGRADED"
	StatusDisconnected ClusterStatus = "DISCONNECTED"
	StatusAuthError    ClusterStatus = "AUTH_ERROR"
)

// ClusterHealthState tracks the health state of a cluster
type ClusterHealthState struct {
	ClusterID           string
	Status              ClusterStatus
	LastChecked         time.Time
	LastError           string
	ConsecutiveFailures int
	ConsecutiveSuccesses int
	mu                  sync.RWMutex
}

// HealthChecker manages cluster health checking with state machine
type HealthChecker struct {
	states      map[string]*ClusterHealthState
	mu          sync.RWMutex
	clients     map[string]*kubernetes.Clientset
	configs     map[string]*rest.Config
	stopCh      chan struct{}
	checkInterval time.Duration
	minFailures  int // Minimum consecutive failures before marking as DISCONNECTED/AUTH_ERROR
	minSuccesses int // Minimum consecutive successes before marking as CONNECTED
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(checkInterval time.Duration) *HealthChecker {
	return &HealthChecker{
		states:        make(map[string]*ClusterHealthState),
		clients:       make(map[string]*kubernetes.Clientset),
		configs:       make(map[string]*rest.Config),
		stopCh:        make(chan struct{}),
		checkInterval: checkInterval,
		minFailures:   3, // Require 3 consecutive failures
		minSuccesses:  2, // Require 2 consecutive successes
	}
}

// RegisterCluster registers a cluster for health checking
func (hc *HealthChecker) RegisterCluster(clusterID string, clientset *kubernetes.Clientset, config *rest.Config) {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	hc.clients[clusterID] = clientset
	hc.configs[clusterID] = config

	if _, exists := hc.states[clusterID]; !exists {
		hc.states[clusterID] = &ClusterHealthState{
			ClusterID:           clusterID,
			Status:              StatusUnknown,
			ConsecutiveFailures: 0,
			ConsecutiveSuccesses: 0,
		}
	}
}

// UnregisterCluster removes a cluster from health checking
func (hc *HealthChecker) UnregisterCluster(clusterID string) {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	delete(hc.clients, clusterID)
	delete(hc.configs, clusterID)
	delete(hc.states, clusterID)
}

// GetStatus returns the current status of a cluster
func (hc *HealthChecker) GetStatus(clusterID string) *ClusterHealthState {
	hc.mu.RLock()
	defer hc.mu.RUnlock()

	state, exists := hc.states[clusterID]
	if !exists {
		return &ClusterHealthState{
			ClusterID: clusterID,
			Status:    StatusUnknown,
		}
	}

	state.mu.RLock()
	defer state.mu.RUnlock()

	// Return a copy to avoid race conditions
	return &ClusterHealthState{
		ClusterID:           state.ClusterID,
		Status:              state.Status,
		LastChecked:         state.LastChecked,
		LastError:           state.LastError,
		ConsecutiveFailures: state.ConsecutiveFailures,
		ConsecutiveSuccesses: state.ConsecutiveSuccesses,
	}
}

// CheckCluster performs an immediate health check for a cluster
func (hc *HealthChecker) CheckCluster(clusterID string) error {
	hc.mu.RLock()
	clientset, hasClient := hc.clients[clusterID]
	config, hasConfig := hc.configs[clusterID]
	state, hasState := hc.states[clusterID]
	hc.mu.RUnlock()

	if !hasClient || !hasConfig || !hasState {
		return fmt.Errorf("cluster %s not registered", clusterID)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Perform a lightweight health check
	err := hc.performHealthCheck(ctx, clientset, config)

	state.mu.Lock()
	state.LastChecked = time.Now()

	if err != nil {
		state.ConsecutiveFailures++
		state.ConsecutiveSuccesses = 0
		state.LastError = err.Error()

		// Classify error
		errorType := hc.classifyError(err)
		if errorType == StatusAuthError {
			// Auth errors transition immediately after min failures
			if state.ConsecutiveFailures >= hc.minFailures {
				state.Status = StatusAuthError
			} else if state.Status != StatusConnecting {
				state.Status = StatusConnecting
			}
		} else {
			// Network/TLS errors
			if state.ConsecutiveFailures >= hc.minFailures {
				state.Status = StatusDisconnected
			} else if state.Status != StatusConnecting {
				state.Status = StatusConnecting
			}
		}
	} else {
		state.ConsecutiveFailures = 0
		state.ConsecutiveSuccesses++
		state.LastError = ""

		// Transition to CONNECTED after min successes
		if state.ConsecutiveSuccesses >= hc.minSuccesses {
			state.Status = StatusConnected
		} else if state.Status == StatusUnknown || state.Status == StatusDisconnected || state.Status == StatusAuthError {
			state.Status = StatusConnecting
		}
	}
	state.mu.Unlock()

	return err
}

// performHealthCheck performs the actual Kubernetes API call
func (hc *HealthChecker) performHealthCheck(ctx context.Context, clientset *kubernetes.Clientset, config *rest.Config) error {
	// Use ServerVersion as the primary health check
	// This is the most reliable indicator that the cluster is working
	_, err := clientset.Discovery().ServerVersion()
	if err != nil {
		return err
	}

	// ServerVersion succeeded - cluster is healthy
	// The /healthz endpoint is deprecated and may return 404 on some clusters
	// (especially GKE clusters where it's disabled by default)
	// We only check /healthz for auth errors (401/403) which indicate credential issues
	healthzURL := config.Host + "/healthz"
	req, err := http.NewRequestWithContext(ctx, "GET", healthzURL, nil)
	if err == nil {
		transport, err := rest.TransportFor(config)
		if err == nil {
			client := &http.Client{
				Transport: transport,
				Timeout:   2 * time.Second,
			}
			resp, err := client.Do(req)
			if err == nil {
				resp.Body.Close()
				// Only treat auth errors as failures
				// 404 means /healthz is not available, which is fine - ServerVersion already passed
				// 5xx means server error, but we already know the API is working from ServerVersion
				if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
					return fmt.Errorf("healthz returned auth error %d", resp.StatusCode)
				}
			}
		}
	}

	return nil
}

// classifyError classifies an error as AUTH_ERROR, DISCONNECTED, or other
func (hc *HealthChecker) classifyError(err error) ClusterStatus {
	if err == nil {
		return StatusConnected
	}

	errStr := strings.ToLower(err.Error())

	// Check for authentication/authorization errors
	if strings.Contains(errStr, "unauthorized") ||
		strings.Contains(errStr, "forbidden") ||
		strings.Contains(errStr, "401") ||
		strings.Contains(errStr, "403") ||
		strings.Contains(errStr, "exec plugin") ||
		strings.Contains(errStr, "authentication") ||
		strings.Contains(errStr, "credentials") {
		return StatusAuthError
	}

	// Check for network/TLS errors
	if strings.Contains(errStr, "connection refused") ||
		strings.Contains(errStr, "no such host") ||
		strings.Contains(errStr, "timeout") ||
		strings.Contains(errStr, "network") ||
		strings.Contains(errStr, "tls") ||
		strings.Contains(errStr, "certificate") ||
		strings.Contains(errStr, "dial tcp") {
		return StatusDisconnected
	}

	// Default to disconnected for unknown errors
	return StatusDisconnected
}

// Start begins the background health checking loop
func (hc *HealthChecker) Start() {
	go hc.healthCheckLoop()
}

// Stop stops the health checking loop
func (hc *HealthChecker) Stop() {
	close(hc.stopCh)
}

// healthCheckLoop periodically checks all registered clusters
func (hc *HealthChecker) healthCheckLoop() {
	ticker := time.NewTicker(hc.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-hc.stopCh:
			return
		case <-ticker.C:
			hc.checkAllClusters()
		}
	}
}

// checkAllClusters checks all registered clusters
func (hc *HealthChecker) checkAllClusters() {
	hc.mu.RLock()
	clusterIDs := make([]string, 0, len(hc.clients))
	for clusterID := range hc.clients {
		clusterIDs = append(clusterIDs, clusterID)
	}
	hc.mu.RUnlock()

	for _, clusterID := range clusterIDs {
		_ = hc.CheckCluster(clusterID)
	}
}
