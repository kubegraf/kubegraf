// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"strings"
	"time"
)

// Citation references a specific piece of evidence supporting a diagnosis or recommendation
type Citation struct {
	// ID uniquely identifies this citation
	ID string `json:"id"`

	// Source type of the citation
	Source CitationSource `json:"source"`

	// Ref is the reference pointer or URL
	Ref string `json:"ref"`

	// Title is a human-readable title for the citation
	Title string `json:"title"`

	// Excerpt is the relevant excerpt from the source
	Excerpt string `json:"excerpt,omitempty"`

	// Timestamp when the cited evidence was observed
	Timestamp time.Time `json:"timestamp,omitempty"`

	// Confidence in this citation's relevance (0.0-1.0)
	Confidence float64 `json:"confidence"`

	// Resource the citation relates to
	Resource *KubeResourceRef `json:"resource,omitempty"`
}

// CitationSource identifies the type of citation source
type CitationSource string

const (
	CitationSourceEvent   CitationSource = "event"
	CitationSourceLog     CitationSource = "log"
	CitationSourceStatus  CitationSource = "status"
	CitationSourceMetric  CitationSource = "metric"
	CitationSourceDoc     CitationSource = "doc"
	CitationSourceRunbook CitationSource = "runbook"
	CitationSourceHistory CitationSource = "history"
)

// CitedDiagnosis extends Diagnosis with citations for evidence backing
type CitedDiagnosis struct {
	// Embed the base Diagnosis
	Diagnosis

	// Citations backing this diagnosis
	Citations []Citation `json:"citations"`

	// KnownFacts are facts we're certain about
	KnownFacts []string `json:"knownFacts"`

	// UnknownFacts are areas where we lack evidence
	UnknownFacts []string `json:"unknownFacts"`

	// Assumptions made in this diagnosis
	Assumptions []string `json:"assumptions,omitempty"`
}

// CitationBuilder builds citations from evidence
type CitationBuilder struct {
	// K8s docs base URL
	k8sDocsBaseURL string
}

// NewCitationBuilder creates a new citation builder
func NewCitationBuilder() *CitationBuilder {
	return &CitationBuilder{
		k8sDocsBaseURL: "https://kubernetes.io/docs",
	}
}

// BuildFromEvidencePack creates citations from an evidence pack
func (b *CitationBuilder) BuildFromEvidencePack(pack *EvidencePack, maxCitations int) []Citation {
	var citations []Citation

	// Get top evidence items
	topEvidence := pack.GetTopEvidence(maxCitations)

	for i, item := range topEvidence {
		citation := b.createCitationFromEvidence(item, i)
		if citation != nil {
			citations = append(citations, *citation)
		}
	}

	return citations
}

// createCitationFromEvidence creates a citation from an evidence item
func (b *CitationBuilder) createCitationFromEvidence(item EvidenceItem, index int) *Citation {
	source := b.mapEvidenceSourceToCitationSource(item.Source)

	return &Citation{
		ID:         fmt.Sprintf("cite-%d-%s", index, item.ID),
		Source:     source,
		Ref:        b.generateRef(item),
		Title:      item.Summary,
		Excerpt:    b.truncateExcerpt(item.Content, 200),
		Timestamp:  item.Timestamp,
		Confidence: item.Relevance,
		Resource:   item.Resource,
	}
}

// mapEvidenceSourceToCitationSource maps evidence source to citation source
func (b *CitationBuilder) mapEvidenceSourceToCitationSource(source EvidenceSource) CitationSource {
	switch source {
	case EvidenceSourceEvent:
		return CitationSourceEvent
	case EvidenceSourceLog:
		return CitationSourceLog
	case EvidenceSourceStatus:
		return CitationSourceStatus
	case EvidenceSourceMetric:
		return CitationSourceMetric
	case EvidenceSourceChange, EvidenceSourceHistory:
		return CitationSourceHistory
	case EvidenceSourceDoc:
		return CitationSourceDoc
	case EvidenceSourceRunbook:
		return CitationSourceRunbook
	default:
		return CitationSourceEvent
	}
}

// generateRef generates a reference string for the evidence
func (b *CitationBuilder) generateRef(item EvidenceItem) string {
	if item.Resource != nil {
		return fmt.Sprintf("%s/%s/%s#%s@%s",
			item.Resource.Namespace,
			item.Resource.Kind,
			item.Resource.Name,
			item.Type,
			item.Timestamp.Format(time.RFC3339),
		)
	}
	return fmt.Sprintf("%s#%s@%s", item.Source, item.Type, item.Timestamp.Format(time.RFC3339))
}

// truncateExcerpt truncates content to max length
func (b *CitationBuilder) truncateExcerpt(content string, maxLen int) string {
	if len(content) <= maxLen {
		return content
	}
	return content[:maxLen-3] + "..."
}

// CreateDocCitation creates a citation to Kubernetes documentation
func (b *CitationBuilder) CreateDocCitation(topic, title, excerpt string) Citation {
	return Citation{
		ID:         fmt.Sprintf("doc-%s", strings.ReplaceAll(topic, "/", "-")),
		Source:     CitationSourceDoc,
		Ref:        fmt.Sprintf("%s/%s", b.k8sDocsBaseURL, topic),
		Title:      title,
		Excerpt:    excerpt,
		Confidence: 1.0, // Docs are always reliable
	}
}

// KnownK8sDocCitations maps failure patterns to relevant K8s documentation
var KnownK8sDocCitations = map[FailurePattern][]Citation{
	PatternCrashLoop: {
		{
			ID:         "doc-crashloop-debug",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/",
			Title:      "Debug Running Pods",
			Excerpt:    "Use kubectl logs and kubectl exec to investigate container crashes",
			Confidence: 1.0,
		},
	},
	PatternOOMPressure: {
		{
			ID:         "doc-oom-resources",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
			Title:      "Managing Resources for Containers",
			Excerpt:    "Configure memory limits and requests to prevent OOM kills",
			Confidence: 1.0,
		},
	},
	PatternImagePullFailure: {
		{
			ID:         "doc-imagepull-debug",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/concepts/containers/images/",
			Title:      "Container Images",
			Excerpt:    "Verify image exists, pull secrets are configured, and registry is accessible",
			Confidence: 1.0,
		},
	},
	PatternReadinessFailure: {
		{
			ID:         "doc-probes",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
			Title:      "Configure Liveness, Readiness and Startup Probes",
			Excerpt:    "Ensure probe configuration matches application behavior",
			Confidence: 1.0,
		},
	},
	PatternLivenessFailure: {
		{
			ID:         "doc-liveness",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
			Title:      "Liveness Probe Configuration",
			Excerpt:    "Application must respond to liveness checks to avoid restarts",
			Confidence: 1.0,
		},
	},
	PatternNoReadyEndpoints: {
		{
			ID:         "doc-endpoints",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/concepts/services-networking/service/",
			Title:      "Service with No Ready Endpoints",
			Excerpt:    "Service selector must match pod labels and pods must be Ready",
			Confidence: 1.0,
		},
	},
	PatternConfigError: {
		{
			ID:         "doc-configmaps",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/concepts/configuration/configmap/",
			Title:      "ConfigMaps",
			Excerpt:    "Verify ConfigMap exists and is mounted correctly",
			Confidence: 1.0,
		},
	},
	PatternSecretMissing: {
		{
			ID:         "doc-secrets",
			Source:     CitationSourceDoc,
			Ref:        "https://kubernetes.io/docs/concepts/configuration/secret/",
			Title:      "Secrets",
			Excerpt:    "Ensure Secret exists in the correct namespace",
			Confidence: 1.0,
		},
	},
}

// GetDocCitationsForPattern returns relevant documentation citations for a pattern
func GetDocCitationsForPattern(pattern FailurePattern) []Citation {
	if citations, ok := KnownK8sDocCitations[pattern]; ok {
		return citations
	}
	return nil
}

// BuildCitedDiagnosis creates a diagnosis with citations
func BuildCitedDiagnosis(incident *Incident, evidencePack *EvidencePack) *CitedDiagnosis {
	builder := NewCitationBuilder()

	// Build citations from evidence
	citations := builder.BuildFromEvidencePack(evidencePack, 10)

	// Add relevant documentation citations
	docCitations := GetDocCitationsForPattern(incident.Pattern)
	citations = append(citations, docCitations...)

	// Determine known and unknown facts
	knownFacts, unknownFacts := analyzeFactsFromEvidence(evidencePack, incident)

	// Start with existing diagnosis if present
	var baseDiagnosis Diagnosis
	if incident.Diagnosis != nil {
		baseDiagnosis = *incident.Diagnosis
	} else {
		baseDiagnosis = Diagnosis{
			Summary:     fmt.Sprintf("Incident detected: %s on %s", incident.Pattern, incident.Resource.Name),
			Confidence:  evidencePack.Confidence,
			GeneratedAt: time.Now(),
		}
	}

	return &CitedDiagnosis{
		Diagnosis:    baseDiagnosis,
		Citations:    citations,
		KnownFacts:   knownFacts,
		UnknownFacts: unknownFacts,
	}
}

// analyzeFactsFromEvidence determines known and unknown facts
func analyzeFactsFromEvidence(pack *EvidencePack, incident *Incident) (known []string, unknown []string) {
	// Known facts from evidence
	if len(pack.Events) > 0 {
		known = append(known, fmt.Sprintf("%d Kubernetes events captured", len(pack.Events)))
	}
	if len(pack.Logs) > 0 {
		known = append(known, fmt.Sprintf("%d relevant log entries found", len(pack.Logs)))
	}
	if len(pack.StatusFacts) > 0 {
		known = append(known, fmt.Sprintf("Resource status: %d facts collected", len(pack.StatusFacts)))
	}

	// Add facts from symptoms
	for _, symptom := range incident.Symptoms {
		// Use severity weight as a proxy for confidence
		confidence := float64(symptom.Severity.Weight()) / 5.0 * 100
		known = append(known, fmt.Sprintf("Detected: %s (confidence: %.0f%%)", symptom.Type, confidence))
	}

	// Unknown facts - what we're missing
	if len(pack.Logs) == 0 {
		unknown = append(unknown, "No application logs available for analysis")
	}
	if len(pack.MetricsFacts) == 0 {
		unknown = append(unknown, "No metrics data available")
	}
	if len(pack.ChangeHistory) == 0 {
		unknown = append(unknown, "No recent change history available")
	}

	// Pattern-specific unknowns
	switch incident.Pattern {
	case PatternOOMPressure:
		if !hasMetricType(pack.MetricsFacts, "memory") {
			unknown = append(unknown, "Memory usage history not available")
		}
	case PatternCrashLoop:
		if len(pack.Logs) == 0 {
			unknown = append(unknown, "Crash cause cannot be determined without logs")
		}
	}

	return known, unknown
}

// hasMetricType checks if metrics contain a specific type
func hasMetricType(metrics []EvidenceItem, metricType string) bool {
	for _, m := range metrics {
		if strings.Contains(strings.ToLower(m.Type), metricType) {
			return true
		}
	}
	return false
}

// FormatCitationRef formats a citation reference for display
func FormatCitationRef(citation Citation) string {
	switch citation.Source {
	case CitationSourceDoc:
		return fmt.Sprintf("[Doc: %s](%s)", citation.Title, citation.Ref)
	case CitationSourceEvent:
		return fmt.Sprintf("[Event: %s]", citation.Title)
	case CitationSourceLog:
		return fmt.Sprintf("[Log: %s]", citation.Title)
	case CitationSourceStatus:
		return fmt.Sprintf("[Status: %s]", citation.Title)
	default:
		return fmt.Sprintf("[%s: %s]", citation.Source, citation.Title)
	}
}

