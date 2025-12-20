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

package core

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
)

// ResourceKind represents supported Kubernetes resource types
type ResourceKind string

const (
	ResourcePods         ResourceKind = "Pods"
	ResourceDeployments  ResourceKind = "Deployments"
	ResourceStatefulSets ResourceKind = "StatefulSets"
	ResourceDaemonSets   ResourceKind = "DaemonSets"
	ResourceJobs         ResourceKind = "Jobs"
	ResourceCronJobs     ResourceKind = "CronJobs"
	ResourceServices     ResourceKind = "Services"
)

// JobStatus represents the status of an async job
type JobStatus string

const (
	JobPending   JobStatus = "pending"
	JobRunning   JobStatus = "running"
	JobSuccess   JobStatus = "success"
	JobFailed    JobStatus = "failed"
	JobCancelled JobStatus = "cancelled"
)

// Job represents an async Kubernetes operation
type Job struct {
	ID          string
	Kind        string
	Description string
	Status      JobStatus
	Error       error
	Output      string
	Progress    float64
	Cancel      context.CancelFunc
}

// Resource wraps a Kubernetes object with metadata
type Resource struct {
	Kind      ResourceKind
	Name      string
	Namespace string
	Object    runtime.Object
}

// LogsOptions configures log streaming
type LogsOptions struct {
	PodName       string
	Namespace     string
	Container     string
	Follow        bool
	TailLines     int64
	SinceSeconds  int64
	Previous      bool
	Timestamps    bool
}

// ExecOptions configures pod exec
type ExecOptions struct {
	PodName   string
	Namespace string
	Container string
	Command   []string
}

// PortForwardOptions configures port forwarding
type PortForwardOptions struct {
	PodName    string
	Namespace  string
	LocalPort  int
	RemotePort int
	StopChan   chan struct{}
	ReadyChan  chan struct{}
}
