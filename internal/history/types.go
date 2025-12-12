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

package history

import (
	"time"
)

// TimeWindow represents a time range for querying historical data
type TimeWindow struct {
	Since time.Time
	Until time.Time
}

// K8sEvent represents a Kubernetes event with metadata
type K8sEvent struct {
	Namespace      string
	Name           string
	Type           string
	Reason         string
	Message        string
	InvolvedKind   string
	InvolvedName   string
	FirstTimestamp time.Time
	LastTimestamp  time.Time
}

// DeploymentChange represents a change in deployment status
type DeploymentChange struct {
	Namespace   string
	Name        string
	ChangeType  string // "rollout", "rollback", "failure", "recovery"
	OldReplicas int32
	NewReplicas int32
	OldReady    int32
	NewReady    int32
	Timestamp   time.Time
	Reason      string
	Message     string
}

// NodeChange represents a change in node status/conditions
type NodeChange struct {
	NodeName     string
	ChangeType   string // "ready", "notready", "memory_pressure", "disk_pressure", "pid_pressure"
	OldCondition string
	NewCondition string
	Timestamp    time.Time
	Reason       string
	Message      string
}

// ChangeEvent represents a normalized change event
type ChangeEvent struct {
	Type         string // "event", "deployment", "node"
	Timestamp    time.Time
	Namespace    string
	ResourceKind string
	ResourceName string
	ChangeType   string
	Severity     string // "info", "warning", "error"
	Reason       string
	Message      string
	Metadata     map[string]interface{}
}

// IncidentCandidate represents a potential incident detected from historical data
type IncidentCandidate struct {
	Symptom           string // "CrashLoop", "NodeNotReady", "DeploymentFailure", "MemoryPressure", etc.
	Service           string // Inferred service/deployment name
	Namespace         string
	Severity          string // "warning", "error", "critical"
	FirstSeen         time.Time
	LastSeen          time.Time
	Evidence          []string // Related event messages or reasons
	AffectedResources []string // List of affected pods/deployments/nodes
	Count             int      // Number of occurrences
}

// HistoryQueryResult contains the results of a history query
type HistoryQueryResult struct {
	Window             TimeWindow
	ChangeEvents       []ChangeEvent
	IncidentCandidates []IncidentCandidate
	TotalChanges       int
	TotalIncidents     int
}


