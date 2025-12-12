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

package main

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MetricSample represents a single metric data point
type MetricSample struct {
	Timestamp     time.Time `json:"timestamp"`
	Namespace     string    `json:"namespace"`
	PodName       string    `json:"podName"`
	Deployment    string    `json:"deployment,omitempty"` // Deprecated: use OwnerName
	OwnerKind     string    `json:"ownerKind,omitempty"`  // e.g., "Deployment", "StatefulSet", "DaemonSet"
	OwnerName     string    `json:"ownerName,omitempty"`  // Name of the owner resource
	CPUUsage      float64   `json:"cpuUsage"`             // CPU usage in millicores
	MemoryUsage   float64   `json:"memoryUsage"`          // Memory usage in bytes
	CPURequest    float64   `json:"cpuRequest"`           // CPU request in millicores
	MemoryRequest float64   `json:"memoryRequest"`        // Memory request in bytes
	RestartCount  int32     `json:"restartCount"`
	Phase         string    `json:"phase"`
	Ready         bool      `json:"ready"`
}

// FeatureVector represents processed features for ML
type FeatureVector struct {
	CPUUsagePercent    float64 `json:"cpuUsagePercent"`
	MemoryUsagePercent float64 `json:"memoryUsagePercent"`
	CPUPerMemory       float64 `json:"cpuPerMemory"`
	RestartFlag        float64 `json:"restartFlag"`
	NotReadyFlag       float64 `json:"notReadyFlag"`
	CrashLoopFlag      float64 `json:"crashLoopFlag"`
}

// Anomaly represents a detected anomaly
type Anomaly struct {
	ID             string       `json:"id"`
	Timestamp      time.Time    `json:"timestamp"`
	Severity       string       `json:"severity"` // "critical", "warning", "info"
	Type           string       `json:"type"`     // "cpu_spike", "memory_spike", "crash_loop", "hpa_maxed", "resource_exhaustion"
	Namespace      string       `json:"namespace"`
	PodName        string       `json:"podName"`
	Deployment     string       `json:"deployment,omitempty"`
	Message        string       `json:"message"`
	Score          float64      `json:"score"` // Anomaly score (0-1, higher = more anomalous)
	Recommendation string       `json:"recommendation"`
	AutoRemediate  bool         `json:"autoRemediate"` // Whether auto-remediation is available
	Metrics        MetricSample `json:"metrics"`
}

// AnomalyDetector handles anomaly detection
type AnomalyDetector struct {
	app            *App
	metricsHistory []MetricSample
	mu             sync.RWMutex
	maxHistory     int     // Maximum number of samples to keep
	threshold      float64 // Anomaly threshold (0-1)
}

// NewAnomalyDetector creates a new anomaly detector
// Note: Uses online learning - automatically adapts as new metrics arrive.
// No separate model training/retraining needed. The model continuously updates
// its baseline (mean/std) from the rolling window of historical data.
func NewAnomalyDetector(app *App) *AnomalyDetector {
	return &AnomalyDetector{
		app:        app,
		maxHistory: 10000, // Keep last 10k samples (rolling window)
		threshold:  0.7,   // 70% threshold for anomalies (can be auto-tuned)
	}
}

// CollectMetrics collects current cluster metrics
func (ad *AnomalyDetector) CollectMetrics(ctx context.Context) ([]MetricSample, error) {
	if ad.app.clientset == nil {
		return nil, fmt.Errorf("clientset not initialized")
	}

	var samples []MetricSample
	now := time.Now()

	// Get all pods across all namespaces
	pods, err := ad.app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	// Get pod metrics if available
	metricsMap := make(map[string]struct {
		cpu    int64
		memory int64
	})
	if ad.app.metricsClient != nil {
		if metricsList, err := ad.app.metricsClient.MetricsV1beta1().PodMetricses("").List(ctx, metav1.ListOptions{}); err == nil {
			for _, pm := range metricsList.Items {
				var totalCPU, totalMemory int64
				for _, cm := range pm.Containers {
					totalCPU += cm.Usage.Cpu().MilliValue()
					totalMemory += cm.Usage.Memory().Value()
				}
				key := pm.Namespace + "/" + pm.Name
				metricsMap[key] = struct {
					cpu    int64
					memory int64
				}{
					cpu:    totalCPU,
					memory: totalMemory,
				}
			}
		}
	}

	// Process each pod
	for _, pod := range pods.Items {
		// Get owner information from owner references
		ownerKind := ""
		ownerName := ""
		deployment := "" // Deprecated but kept for backwards compatibility

		if len(pod.OwnerReferences) > 0 {
			// Get the first owner reference (typically the controller)
			owner := pod.OwnerReferences[0]
			ownerKind = owner.Kind
			ownerName = owner.Name

			// Handle ReplicaSet - need to find the Deployment that owns it
			if ownerKind == "ReplicaSet" {
				// Try to get the ReplicaSet to find its owner (Deployment)
				rs, err := ad.app.clientset.AppsV1().ReplicaSets(pod.Namespace).Get(ctx, ownerName, metav1.GetOptions{})
				if err == nil && len(rs.OwnerReferences) > 0 {
					rsOwner := rs.OwnerReferences[0]
					ownerKind = rsOwner.Kind
					ownerName = rsOwner.Name
				}
			}

			// Set deprecated Deployment field for backwards compatibility
			if ownerKind == "Deployment" {
				deployment = ownerName
			}
		}

		// Fallback to labels if no owner reference found
		if ownerName == "" && pod.Labels != nil {
			if dep, ok := pod.Labels["app"]; ok {
				deployment = dep
				ownerName = dep
				ownerKind = "Unknown" // We don't know the actual kind from labels
			} else if dep, ok := pod.Labels["app.kubernetes.io/name"]; ok {
				deployment = dep
				ownerName = dep
				ownerKind = "Unknown"
			}
		}

		// Calculate resource requests
		var cpuRequest, memRequest int64
		for _, container := range pod.Spec.Containers {
			cpuRequest += container.Resources.Requests.Cpu().MilliValue()
			memRequest += container.Resources.Requests.Memory().Value()
		}

		// Get actual usage from metrics
		key := pod.Namespace + "/" + pod.Name
		var cpuUsage, memUsage int64
		if metrics, ok := metricsMap[key]; ok {
			cpuUsage = metrics.cpu
			memUsage = metrics.memory
		}

		// Calculate restart count
		restartCount := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			restartCount += cs.RestartCount
		}

		// Determine if ready
		ready := false
		if pod.Status.Phase == corev1.PodRunning {
			for _, cs := range pod.Status.ContainerStatuses {
				if cs.Ready {
					ready = true
					break
				}
			}
		}

		sample := MetricSample{
			Timestamp:     now,
			Namespace:     pod.Namespace,
			PodName:       pod.Name,
			Deployment:    deployment,
			OwnerKind:     ownerKind,
			OwnerName:     ownerName,
			CPUUsage:      float64(cpuUsage),
			MemoryUsage:   float64(memUsage),
			CPURequest:    float64(cpuRequest),
			MemoryRequest: float64(memRequest),
			RestartCount:  restartCount,
			Phase:         string(pod.Status.Phase),
			Ready:         ready,
		}

		samples = append(samples, sample)
	}

	return samples, nil
}

// ExtractFeatures converts a metric sample to a feature vector
func (ad *AnomalyDetector) ExtractFeatures(sample MetricSample) FeatureVector {
	// Calculate CPU usage percentage
	cpuPercent := 0.0
	if sample.CPURequest > 0 {
		cpuPercent = (sample.CPUUsage / sample.CPURequest) * 100.0
	}

	// Calculate memory usage percentage
	memPercent := 0.0
	if sample.MemoryRequest > 0 {
		memPercent = (sample.MemoryUsage / sample.MemoryRequest) * 100.0
	}

	// CPU per memory ratio (normalized)
	cpuPerMem := 0.0
	if sample.MemoryUsage > 0 {
		cpuPerMem = sample.CPUUsage / (sample.MemoryUsage / 1024 / 1024) // CPU millicores per MB
	}

	// Flags
	restartFlag := 0.0
	if sample.RestartCount > 0 {
		restartFlag = 1.0
	}

	notReadyFlag := 0.0
	if !sample.Ready {
		notReadyFlag = 1.0
	}

	crashLoopFlag := 0.0
	if sample.Phase == "CrashLoopBackOff" {
		crashLoopFlag = 1.0
	}

	return FeatureVector{
		CPUUsagePercent:    cpuPercent,
		MemoryUsagePercent: memPercent,
		CPUPerMemory:       cpuPerMem,
		RestartFlag:        restartFlag,
		NotReadyFlag:       notReadyFlag,
		CrashLoopFlag:      crashLoopFlag,
	}
}

// IsolationForestScore calculates an anomaly score using Isolation Forest algorithm
// This is a simplified version - for production, use a proper ML library
func (ad *AnomalyDetector) IsolationForestScore(features FeatureVector, historical []FeatureVector) float64 {
	if len(historical) < 10 {
		// Not enough data, use simple heuristics
		return ad.SimpleHeuristicScore(features)
	}

	// Calculate mean and std for each feature
	means := ad.calculateMeans(historical)
	stds := ad.calculateStds(historical, means)

	// Calculate z-scores (how many standard deviations away from mean)
	zScores := []float64{
		math.Abs((features.CPUUsagePercent - means.CPUUsagePercent) / (stds.CPUUsagePercent + 1e-6)),
		math.Abs((features.MemoryUsagePercent - means.MemoryUsagePercent) / (stds.MemoryUsagePercent + 1e-6)),
		math.Abs((features.CPUPerMemory - means.CPUPerMemory) / (stds.CPUPerMemory + 1e-6)),
		features.RestartFlag,   // Binary flag
		features.NotReadyFlag,  // Binary flag
		features.CrashLoopFlag, // Binary flag
	}

	// Anomaly score: weighted average of z-scores
	weights := []float64{0.25, 0.25, 0.15, 0.15, 0.10, 0.10}
	score := 0.0
	for i, z := range zScores {
		score += weights[i] * math.Min(z/3.0, 1.0) // Normalize z-score to 0-1
	}

	return math.Min(score, 1.0)
}

// SimpleHeuristicScore uses simple rules when not enough historical data
func (ad *AnomalyDetector) SimpleHeuristicScore(features FeatureVector) float64 {
	score := 0.0

	// CPU spike (>90% usage)
	if features.CPUUsagePercent > 90 {
		score += 0.3
	} else if features.CPUUsagePercent > 80 {
		score += 0.2
	}

	// Memory spike (>90% usage)
	if features.MemoryUsagePercent > 90 {
		score += 0.3
	} else if features.MemoryUsagePercent > 80 {
		score += 0.2
	}

	// Crash loop
	if features.CrashLoopFlag > 0 {
		score += 0.4
	}

	// Not ready
	if features.NotReadyFlag > 0 {
		score += 0.2
	}

	// Restarts
	if features.RestartFlag > 0 {
		score += 0.1
	}

	return math.Min(score, 1.0)
}

// calculateMeans calculates mean values for each feature
func (ad *AnomalyDetector) calculateMeans(historical []FeatureVector) FeatureVector {
	if len(historical) == 0 {
		return FeatureVector{}
	}

	means := FeatureVector{}
	for _, f := range historical {
		means.CPUUsagePercent += f.CPUUsagePercent
		means.MemoryUsagePercent += f.MemoryUsagePercent
		means.CPUPerMemory += f.CPUPerMemory
	}

	n := float64(len(historical))
	means.CPUUsagePercent /= n
	means.MemoryUsagePercent /= n
	means.CPUPerMemory /= n

	return means
}

// calculateStds calculates standard deviations for each feature
func (ad *AnomalyDetector) calculateStds(historical []FeatureVector, means FeatureVector) FeatureVector {
	if len(historical) == 0 {
		return FeatureVector{CPUUsagePercent: 1.0, MemoryUsagePercent: 1.0, CPUPerMemory: 1.0}
	}

	var cpuVariance, memVariance, cpuMemVariance float64
	for _, f := range historical {
		cpuVariance += math.Pow(f.CPUUsagePercent-means.CPUUsagePercent, 2)
		memVariance += math.Pow(f.MemoryUsagePercent-means.MemoryUsagePercent, 2)
		cpuMemVariance += math.Pow(f.CPUPerMemory-means.CPUPerMemory, 2)
	}

	n := float64(len(historical))
	return FeatureVector{
		CPUUsagePercent:    math.Sqrt(cpuVariance / n),
		MemoryUsagePercent: math.Sqrt(memVariance / n),
		CPUPerMemory:       math.Sqrt(cpuMemVariance / n),
	}
}

// DetectAnomalies runs anomaly detection on current metrics
func (ad *AnomalyDetector) DetectAnomalies(ctx context.Context) ([]Anomaly, error) {
	// Collect current metrics
	currentMetrics, err := ad.CollectMetrics(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to collect metrics: %w", err)
	}

	// Update history
	ad.mu.Lock()
	ad.metricsHistory = append(ad.metricsHistory, currentMetrics...)
	// Keep only recent history
	if len(ad.metricsHistory) > ad.maxHistory {
		ad.metricsHistory = ad.metricsHistory[len(ad.metricsHistory)-ad.maxHistory:]
	}
	historical := make([]MetricSample, len(ad.metricsHistory))
	copy(historical, ad.metricsHistory)
	ad.mu.Unlock()

	// Sync metrics to ML recommender (if available)
	if ad.app.mlRecommender != nil {
		ad.app.mlRecommender.UpdateMetricsHistory(currentMetrics)
	}

	// Convert historical metrics to features
	historicalFeatures := make([]FeatureVector, 0, len(historical))
	for _, m := range historical {
		historicalFeatures = append(historicalFeatures, ad.ExtractFeatures(m))
	}

	var anomalies []Anomaly

	// Check HPA status
	hpaAnomalies, err := ad.checkHPAStatus(ctx)
	if err == nil {
		anomalies = append(anomalies, hpaAnomalies...)
	}

	// Detect anomalies in each pod
	for _, sample := range currentMetrics {
		features := ad.ExtractFeatures(sample)
		score := ad.IsolationForestScore(features, historicalFeatures)

		if score >= ad.threshold {
			anomaly := ad.createAnomaly(sample, features, score)
			anomalies = append(anomalies, anomaly)
		}
	}

	return anomalies, nil
}

// checkHPAStatus checks for HPA-related anomalies
func (ad *AnomalyDetector) checkHPAStatus(ctx context.Context) ([]Anomaly, error) {
	if ad.app.clientset == nil {
		return nil, nil
	}

	var anomalies []Anomaly

	// Get all HPAs
	hpas, err := ad.app.clientset.AutoscalingV2().HorizontalPodAutoscalers("").List(ctx, metav1.ListOptions{})
	if err != nil {
		// HPA API might not be available
		return nil, nil
	}

	for _, hpa := range hpas.Items {
		currentReplicas := hpa.Status.CurrentReplicas
		maxReplicas := hpa.Spec.MaxReplicas

		// Check if HPA is maxed out
		if currentReplicas >= maxReplicas {
			anomaly := Anomaly{
				ID:             fmt.Sprintf("hpa-%s-%s", hpa.Namespace, hpa.Name),
				Timestamp:      time.Now(),
				Severity:       "warning",
				Type:           "hpa_maxed",
				Namespace:      hpa.Namespace,
				Deployment:     hpa.Name,
				Message:        fmt.Sprintf("HPA %s is at maximum replicas (%d/%d)", hpa.Name, currentReplicas, maxReplicas),
				Score:          0.8,
				Recommendation: fmt.Sprintf("Consider increasing maxReplicas for HPA %s or optimizing resource usage", hpa.Name),
				AutoRemediate:  true,
			}
			anomalies = append(anomalies, anomaly)
		}
	}

	return anomalies, nil
}

// createAnomaly creates an Anomaly from a metric sample
func (ad *AnomalyDetector) createAnomaly(sample MetricSample, features FeatureVector, score float64) Anomaly {
	anomaly := Anomaly{
		ID:            fmt.Sprintf("%s-%s-%d", sample.Namespace, sample.PodName, time.Now().Unix()),
		Timestamp:     sample.Timestamp,
		Namespace:     sample.Namespace,
		PodName:       sample.PodName,
		Deployment:    sample.Deployment,
		Score:         score,
		Metrics:       sample,
		AutoRemediate: false,
	}

	// Determine anomaly type and severity
	if features.CrashLoopFlag > 0 {
		anomaly.Type = "crash_loop"
		anomaly.Severity = "critical"
		anomaly.Message = fmt.Sprintf("Pod %s is in CrashLoopBackOff state", sample.PodName)
		anomaly.Recommendation = fmt.Sprintf("Restart deployment for %s or check pod logs for errors", sample.Deployment)
		anomaly.AutoRemediate = true
	} else if features.CPUUsagePercent > 95 {
		anomaly.Type = "cpu_spike"
		anomaly.Severity = "critical"
		anomaly.Message = fmt.Sprintf("Pod %s has extremely high CPU usage: %.1f%%", sample.PodName, features.CPUUsagePercent)
		anomaly.Recommendation = fmt.Sprintf("Scale deployment %s or increase CPU requests/limits", sample.Deployment)
		anomaly.AutoRemediate = true
	} else if features.MemoryUsagePercent > 95 {
		anomaly.Type = "memory_spike"
		anomaly.Severity = "critical"
		anomaly.Message = fmt.Sprintf("Pod %s has extremely high memory usage: %.1f%%", sample.PodName, features.MemoryUsagePercent)
		anomaly.Recommendation = fmt.Sprintf("Scale deployment %s or increase memory requests/limits", sample.Deployment)
		anomaly.AutoRemediate = true
	} else if features.CPUUsagePercent > 80 {
		anomaly.Type = "cpu_spike"
		anomaly.Severity = "warning"
		anomaly.Message = fmt.Sprintf("Pod %s has high CPU usage: %.1f%%", sample.PodName, features.CPUUsagePercent)
		anomaly.Recommendation = fmt.Sprintf("Monitor and consider scaling deployment %s", sample.Deployment)
	} else if features.MemoryUsagePercent > 80 {
		anomaly.Type = "memory_spike"
		anomaly.Severity = "warning"
		anomaly.Message = fmt.Sprintf("Pod %s has high memory usage: %.1f%%", sample.PodName, features.MemoryUsagePercent)
		anomaly.Recommendation = fmt.Sprintf("Monitor and consider scaling deployment %s", sample.Deployment)
	} else if features.NotReadyFlag > 0 {
		anomaly.Type = "pod_not_ready"
		anomaly.Severity = "warning"
		anomaly.Message = fmt.Sprintf("Pod %s is not ready", sample.PodName)
		anomaly.Recommendation = fmt.Sprintf("Check pod logs and readiness probes for %s", sample.PodName)
	} else if features.RestartFlag > 0 && sample.RestartCount > 5 {
		anomaly.Type = "frequent_restarts"
		anomaly.Severity = "warning"
		anomaly.Message = fmt.Sprintf("Pod %s has restarted %d times", sample.PodName, sample.RestartCount)
		anomaly.Recommendation = fmt.Sprintf("Investigate restart causes for pod %s", sample.PodName)
	} else {
		// Generic anomaly based on score
		anomaly.Type = "resource_anomaly"
		if score > 0.85 {
			anomaly.Severity = "critical"
		} else if score > 0.75 {
			anomaly.Severity = "warning"
		} else {
			anomaly.Severity = "info"
		}
		anomaly.Message = fmt.Sprintf("Anomalous resource usage detected for pod %s", sample.PodName)
		anomaly.Recommendation = "Review pod resource usage and adjust requests/limits if needed"
	}

	return anomaly
}

// AutoRemediate attempts to automatically fix an anomaly
func (ad *AnomalyDetector) AutoRemediate(ctx context.Context, anomaly Anomaly) error {
	if !anomaly.AutoRemediate {
		return fmt.Errorf("auto-remediation not available for this anomaly type")
	}

	switch anomaly.Type {
	case "crash_loop":
		return ad.restartDeployment(ctx, anomaly.Namespace, anomaly.Deployment)
	case "cpu_spike", "memory_spike", "hpa_maxed":
		return ad.scaleDeployment(ctx, anomaly.Namespace, anomaly.Deployment, 5)
	case "pod_not_ready":
		return ad.restartPod(ctx, anomaly.Namespace, anomaly.PodName)
	default:
		return fmt.Errorf("no auto-remediation available for anomaly type: %s", anomaly.Type)
	}
}

// restartDeployment restarts a deployment
func (ad *AnomalyDetector) restartDeployment(ctx context.Context, namespace, deployment string) error {
	if ad.app.clientset == nil {
		return fmt.Errorf("clientset not initialized")
	}

	appsV1 := ad.app.clientset.AppsV1()
	deploy, err := appsV1.Deployments(namespace).Get(ctx, deployment, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment: %w", err)
	}

	// Add/update restart annotation to trigger rollout
	annotations := deploy.Spec.Template.ObjectMeta.Annotations
	if annotations == nil {
		annotations = make(map[string]string)
	}
	annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	deploy.Spec.Template.ObjectMeta.Annotations = annotations
	_, err = appsV1.Deployments(namespace).Update(ctx, deploy, metav1.UpdateOptions{})
	return err
}

// scaleDeployment scales a deployment by adding replicas
func (ad *AnomalyDetector) scaleDeployment(ctx context.Context, namespace, deployment string, additionalReplicas int32) error {
	if ad.app.clientset == nil {
		return fmt.Errorf("clientset not initialized")
	}

	appsV1 := ad.app.clientset.AppsV1()
	deploy, err := appsV1.Deployments(namespace).Get(ctx, deployment, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment: %w", err)
	}

	currentReplicas := int32(1)
	if deploy.Spec.Replicas != nil {
		currentReplicas = *deploy.Spec.Replicas
	}

	newReplicas := currentReplicas + additionalReplicas
	deploy.Spec.Replicas = &newReplicas

	_, err = appsV1.Deployments(namespace).Update(ctx, deploy, metav1.UpdateOptions{})
	return err
}

// restartPod deletes a pod to trigger recreation
func (ad *AnomalyDetector) restartPod(ctx context.Context, namespace, podName string) error {
	if ad.app.clientset == nil {
		return fmt.Errorf("clientset not initialized")
	}

	return ad.app.clientset.CoreV1().Pods(namespace).Delete(ctx, podName, metav1.DeleteOptions{})
}

// GetAnomalyStats returns statistics about detected anomalies
func (ad *AnomalyDetector) GetAnomalyStats(anomalies []Anomaly) map[string]interface{} {
	stats := map[string]interface{}{
		"total":       len(anomalies),
		"critical":    0,
		"warning":     0,
		"info":        0,
		"byType":      make(map[string]int),
		"byNamespace": make(map[string]int),
	}

	for _, a := range anomalies {
		switch a.Severity {
		case "critical":
			stats["critical"] = stats["critical"].(int) + 1
		case "warning":
			stats["warning"] = stats["warning"].(int) + 1
		case "info":
			stats["info"] = stats["info"].(int) + 1
		}

		if byType, ok := stats["byType"].(map[string]int); ok {
			byType[a.Type]++
		}

		if byNamespace, ok := stats["byNamespace"].(map[string]int); ok {
			byNamespace[a.Namespace]++
		}
	}

	return stats
}
