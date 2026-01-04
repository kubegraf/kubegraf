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

package health

import (
	"context"
	"fmt"
	"sync"
	"time"

	"k8s.io/client-go/kubernetes"
)

// ClusterHealthStatus represents the health status of a cluster connection
type ClusterHealthStatus struct {
	Healthy        bool      `json:"healthy"`
	LastCheck      time.Time `json:"lastCheck"`
	LastSuccess    time.Time `json:"lastSuccess,omitempty"`
	ErrorMessage   string    `json:"errorMessage,omitempty"`
	ResponseTimeMs int64     `json:"responseTimeMs,omitempty"`
	ServerVersion  string    `json:"serverVersion,omitempty"`
}

// HealthCheck represents a single health check result
type HealthCheck struct {
	Timestamp      time.Time
	Success        bool
	Error          error
	ResponseTimeMs int64
	ServerVersion  string
}

// ClusterHealthMonitor monitors cluster connection health
type ClusterHealthMonitor struct {
	mu              sync.RWMutex
	clientset       kubernetes.Interface
	status          *ClusterHealthStatus
	checkInterval   time.Duration
	timeout         time.Duration
	stopCh          chan struct{}
	running         bool
	onStatusChange  func(*ClusterHealthStatus)
	consecutiveFails int
	maxConsecutiveFails int
}

// NewClusterHealthMonitor creates a new cluster health monitor
func NewClusterHealthMonitor(clientset kubernetes.Interface, checkInterval, timeout time.Duration) *ClusterHealthMonitor {
	if checkInterval == 0 {
		checkInterval = 30 * time.Second
	}
	if timeout == 0 {
		timeout = 5 * time.Second
	}

	return &ClusterHealthMonitor{
		clientset:           clientset,
		checkInterval:       checkInterval,
		timeout:             timeout,
		stopCh:              make(chan struct{}),
		maxConsecutiveFails: 3, // Mark unhealthy after 3 consecutive failures
		status: &ClusterHealthStatus{
			Healthy:   true, // Assume healthy initially
			LastCheck: time.Now(),
		},
	}
}

// Start begins periodic health checks
func (m *ClusterHealthMonitor) Start() {
	m.mu.Lock()
	if m.running {
		m.mu.Unlock()
		return
	}
	m.running = true
	m.mu.Unlock()

	// Perform immediate health check
	go m.performCheck()

	// Start periodic checks
	ticker := time.NewTicker(m.checkInterval)
	go func() {
		for {
			select {
			case <-ticker.C:
				m.performCheck()
			case <-m.stopCh:
				ticker.Stop()
				return
			}
		}
	}()
}

// Stop stops the health monitor
func (m *ClusterHealthMonitor) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.running {
		return
	}

	close(m.stopCh)
	m.running = false
}

// performCheck executes a single health check
func (m *ClusterHealthMonitor) performCheck() {
	ctx, cancel := context.WithTimeout(context.Background(), m.timeout)
	defer cancel()

	start := time.Now()
	result := &HealthCheck{
		Timestamp: start,
	}

	// Perform the health check - try to get server version
	done := make(chan error, 1)
	go func() {
		version, err := m.clientset.Discovery().ServerVersion()
		if err != nil {
			done <- err
			return
		}
		result.ServerVersion = version.GitVersion
		done <- nil
	}()

	select {
	case err := <-done:
		result.ResponseTimeMs = time.Since(start).Milliseconds()
		if err != nil {
			result.Success = false
			result.Error = err
		} else {
			result.Success = true
		}
	case <-ctx.Done():
		result.Success = false
		result.Error = fmt.Errorf("health check timeout after %v", m.timeout)
		result.ResponseTimeMs = m.timeout.Milliseconds()
	}

	m.updateStatus(result)
}

// updateStatus updates the health status based on check result
func (m *ClusterHealthMonitor) updateStatus(check *HealthCheck) {
	m.mu.Lock()
	defer m.mu.Unlock()

	previousHealthy := m.status.Healthy

	m.status.LastCheck = check.Timestamp
	m.status.ResponseTimeMs = check.ResponseTimeMs

	if check.Success {
		m.status.Healthy = true
		m.status.LastSuccess = check.Timestamp
		m.status.ErrorMessage = ""
		m.status.ServerVersion = check.ServerVersion
		m.consecutiveFails = 0
	} else {
		m.consecutiveFails++
		m.status.ErrorMessage = check.Error.Error()

		// Only mark unhealthy after consecutive failures
		if m.consecutiveFails >= m.maxConsecutiveFails {
			m.status.Healthy = false
		}
	}

	// Notify status change
	if m.onStatusChange != nil && previousHealthy != m.status.Healthy {
		statusCopy := *m.status
		go m.onStatusChange(&statusCopy)
	}
}

// GetStatus returns the current health status
func (m *ClusterHealthMonitor) GetStatus() *ClusterHealthStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy to prevent external modification
	statusCopy := *m.status
	return &statusCopy
}

// SetStatusChangeCallback sets a callback for health status changes
func (m *ClusterHealthMonitor) SetStatusChangeCallback(callback func(*ClusterHealthStatus)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.onStatusChange = callback
}

// IsHealthy returns whether the cluster is currently healthy
func (m *ClusterHealthMonitor) IsHealthy() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.status.Healthy
}

// ForceCheck triggers an immediate health check
func (m *ClusterHealthMonitor) ForceCheck() *ClusterHealthStatus {
	m.performCheck()
	return m.GetStatus()
}
