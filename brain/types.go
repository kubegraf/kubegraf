// Copyright 2025 KubeGraf Contributors
// Brain types and data structures

package brain

import "time"

// OOMMetrics contains OOM and reliability insights
type OOMMetrics struct {
	Incidents24h   int                   `json:"incidents24h"`
	CrashLoops24h  int                   `json:"crashLoops24h"`
	TopProblematic []ProblematicWorkload `json:"topProblematic"`
}

// ProblematicWorkload represents a workload with issues
type ProblematicWorkload struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Kind      string `json:"kind"`
	Issues    struct {
		OOMKilled  int `json:"oomKilled"`
		Restarts   int `json:"restarts"`
		CrashLoops int `json:"crashLoops"`
	} `json:"issues"`
	Score int `json:"score"`
}

// BrainSummary contains intelligent summary of cluster health
type BrainSummary struct {
	Last24hSummary     string   `json:"last24hSummary"`
	TopRiskAreas       []string `json:"topRiskAreas"`
	RecommendedActions []string `json:"recommendedActions"`
	GeneratedAt        string   `json:"generatedAt"`
}

// TimelineEvent represents a timeline event for the Brain panel
type TimelineEvent struct {
	ID          string       `json:"id"`
	Timestamp   string       `json:"timestamp"`
	Type        string       `json:"type"`     // incident, deployment, pod_restart
	Severity    string       `json:"severity"` // info, warning, critical
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Resource    ResourceInfo `json:"resource"`
}

// ResourceInfo contains resource identification
type ResourceInfo struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// TimelineResponse represents the timeline API response
type TimelineResponse struct {
	Events []TimelineEvent `json:"events"`
	Total  int             `json:"total"`
}

// IncidentScanner interface for scanning incidents
type IncidentScanner interface {
	ScanAllIncidents(namespace string) []KubernetesIncident
}

// KubernetesIncident represents a Kubernetes incident (used by incident scanner)
// This matches the main package's KubernetesIncident structure
type KubernetesIncident struct {
	ID           string
	Type         string
	Severity     string
	ResourceName string
	ResourceKind string
	Namespace    string
	Message      string
	FirstSeen    time.Time
	LastSeen     time.Time
	Count        int
}
