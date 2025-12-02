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

	autoscalingv2 "k8s.io/api/autoscaling/v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MLRecommendation represents an ML-powered recommendation
type MLRecommendation struct {
	ID               string    `json:"id"`
	Timestamp        time.Time `json:"timestamp"`
	Type             string    `json:"type"`     // "scaling", "resource_optimization", "cost_saving", "performance"
	Severity         string    `json:"severity"` // "high", "medium", "low"
	Namespace        string    `json:"namespace"`
	Resource         string    `json:"resource"` // "Deployment/name" or "Pod/name"
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	CurrentValue     string    `json:"currentValue"`
	RecommendedValue string    `json:"recommendedValue"`
	Confidence       float64   `json:"confidence"`                 // 0-1, ML model confidence
	Impact           string    `json:"impact"`                     // "high", "medium", "low"
	Effort           string    `json:"effort"`                     // "low", "medium", "high"
	EstimatedSavings string    `json:"estimatedSavings,omitempty"` // For cost-saving recommendations
	AutoApply        bool      `json:"autoApply"`                  // Whether recommendation can be auto-applied
}

// MLRecommender provides ML-powered recommendations
type MLRecommender struct {
	app            *App
	metricsHistory []MetricSample
	mu             sync.RWMutex
}

// NewMLRecommender creates a new ML recommender
func NewMLRecommender(app *App) *MLRecommender {
	return &MLRecommender{
		app: app,
	}
}

// PredictResourceNeeds predicts future resource needs using time series forecasting
func (mlr *MLRecommender) PredictResourceNeeds(ctx context.Context, namespace, deployment string, hoursAhead int) (cpuPrediction, memoryPrediction float64, err error) {
	// Collect historical metrics for this deployment
	mlr.mu.RLock()
	history := make([]MetricSample, len(mlr.metricsHistory))
	copy(history, mlr.metricsHistory)
	mlr.mu.RUnlock()

	// Filter by namespace and deployment
	var relevantSamples []MetricSample
	for _, sample := range history {
		if sample.Namespace == namespace && sample.Deployment == deployment {
			relevantSamples = append(relevantSamples, sample)
		}
	}

	if len(relevantSamples) < 10 {
		return 0, 0, fmt.Errorf("insufficient historical data")
	}

	// Simple linear regression for prediction
	// In production, use ARIMA, LSTM, or Prophet
	cpuValues := make([]float64, len(relevantSamples))
	memValues := make([]float64, len(relevantSamples))
	for i, s := range relevantSamples {
		cpuValues[i] = s.CPUUsage
		memValues[i] = s.MemoryUsage
	}

	// Calculate trend (simple moving average with trend)
	cpuTrend := mlr.calculateTrend(cpuValues)
	memTrend := mlr.calculateTrend(memValues)

	// Predict future values
	lastCPU := cpuValues[len(cpuValues)-1]
	lastMem := memValues[len(memValues)-1]

	// Extrapolate based on trend
	cpuPrediction = lastCPU + (cpuTrend * float64(hoursAhead))
	memPred := lastMem + (memTrend * float64(hoursAhead))

	// Ensure non-negative
	if cpuPrediction < 0 {
		cpuPrediction = 0
	}
	if memPred < 0 {
		memPred = 0
	}

	return cpuPrediction, memPred, nil
}

// calculateTrend calculates the average change per time unit
func (mlr *MLRecommender) calculateTrend(values []float64) float64 {
	if len(values) < 2 {
		return 0
	}

	sum := 0.0
	for i := 1; i < len(values); i++ {
		sum += values[i] - values[i-1]
	}

	return sum / float64(len(values)-1)
}

// GenerateRecommendations generates ML-powered recommendations
func (mlr *MLRecommender) GenerateRecommendations(ctx context.Context) ([]MLRecommendation, error) {
	// Check if cluster is connected
	if mlr.app.clientset == nil || !mlr.app.connected {
		return []MLRecommendation{}, nil // Return empty list, not an error
	}

	// Add timeout to prevent hanging
	ctxWithTimeout, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var recommendations []MLRecommendation

	// 1. Resource optimization recommendations
	resourceRecs, err := mlr.analyzeResourceOptimization(ctxWithTimeout)
	if err == nil {
		recommendations = append(recommendations, resourceRecs...)
	} else if err != context.DeadlineExceeded {
		// Log non-timeout errors but continue
		fmt.Printf("Warning: Resource optimization analysis failed: %v\n", err)
	}

	// Check if context was canceled
	select {
	case <-ctxWithTimeout.Done():
		return recommendations, nil // Return what we have so far
	default:
	}

	// 2. Predictive scaling recommendations
	scalingRecs, err := mlr.analyzePredictiveScaling(ctxWithTimeout)
	if err == nil {
		recommendations = append(recommendations, scalingRecs...)
	} else if err != context.DeadlineExceeded {
		fmt.Printf("Warning: Predictive scaling analysis failed: %v\n", err)
	}

	// Check if context was canceled
	select {
	case <-ctxWithTimeout.Done():
		return recommendations, nil
	default:
	}

	// 3. Cost optimization recommendations
	costRecs, err := mlr.analyzeCostOptimization(ctxWithTimeout)
	if err == nil {
		recommendations = append(recommendations, costRecs...)
	} else if err != context.DeadlineExceeded {
		fmt.Printf("Warning: Cost optimization analysis failed: %v\n", err)
	}

	return recommendations, nil
}

// analyzeResourceOptimization analyzes resource requests/limits and recommends optimizations
func (mlr *MLRecommender) analyzeResourceOptimization(ctx context.Context) ([]MLRecommendation, error) {
	var recommendations []MLRecommendation

	// Check if cluster is connected
	if mlr.app.clientset == nil {
		return recommendations, nil
	}

	deployments, err := mlr.app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{Limit: 100}) // Limit to prevent hanging on large clusters
	if err != nil {
		return nil, err
	}

	mlr.mu.RLock()
	history := make([]MetricSample, len(mlr.metricsHistory))
	copy(history, mlr.metricsHistory)
	mlr.mu.RUnlock()

	for _, deployment := range deployments.Items {
		for _, container := range deployment.Spec.Template.Spec.Containers {
			// Get historical usage for this container
			var containerSamples []MetricSample
			for _, sample := range history {
				if sample.Namespace == deployment.Namespace && sample.Deployment == deployment.Name {
					containerSamples = append(containerSamples, sample)
				}
			}

			if len(containerSamples) < 20 {
				continue // Need more data
			}

			// Calculate percentiles
			cpuUsage := make([]float64, len(containerSamples))
			memUsage := make([]float64, len(containerSamples))
			for i, s := range containerSamples {
				cpuUsage[i] = s.CPUUsage
				memUsage[i] = s.MemoryUsage
			}

			p95CPU := mlr.percentile(cpuUsage, 0.95)
			p95Mem := mlr.percentile(memUsage, 0.95)
			p99CPU := mlr.percentile(cpuUsage, 0.99)
			p99Mem := mlr.percentile(memUsage, 0.99)

			// Get current requests
			cpuRequest := float64(container.Resources.Requests.Cpu().MilliValue())
			memRequest := float64(container.Resources.Requests.Memory().Value())

			// Recommend if request is too high (waste) or too low (risk)
			if cpuRequest > 0 {
				recommendedCPU := math.Max(p95CPU*1.2, p99CPU*1.1) // 20% buffer over P95, or 10% over P99
				if cpuRequest > recommendedCPU*1.5 {
					// Over-provisioned by >50%
					recommendations = append(recommendations, MLRecommendation{
						ID:               fmt.Sprintf("cpu-opt-%s-%s", deployment.Namespace, deployment.Name),
						Timestamp:        time.Now(),
						Type:             "resource_optimization",
						Severity:         "medium",
						Namespace:        deployment.Namespace,
						Resource:         fmt.Sprintf("Deployment/%s", deployment.Name),
						Title:            "CPU Request Optimization",
						Description:      fmt.Sprintf("Container %s has CPU request set to %dm but typically uses only %dm (P95).", container.Name, int(cpuRequest), int(p95CPU)),
						CurrentValue:     fmt.Sprintf("%dm CPU", int(cpuRequest)),
						RecommendedValue: fmt.Sprintf("%dm CPU", int(recommendedCPU)),
						Confidence:       0.85,
						Impact:           "medium",
						Effort:           "low",
						AutoApply:        false,
					})
				} else if cpuRequest < p95CPU*0.8 {
					// Under-provisioned
					recommendations = append(recommendations, MLRecommendation{
						ID:               fmt.Sprintf("cpu-risk-%s-%s", deployment.Namespace, deployment.Name),
						Timestamp:        time.Now(),
						Type:             "resource_optimization",
						Severity:         "high",
						Namespace:        deployment.Namespace,
						Resource:         fmt.Sprintf("Deployment/%s", deployment.Name),
						Title:            "CPU Request Too Low",
						Description:      fmt.Sprintf("Container %s may experience throttling. Current request: %dm, P95 usage: %dm.", container.Name, int(cpuRequest), int(p95CPU)),
						CurrentValue:     fmt.Sprintf("%dm CPU", int(cpuRequest)),
						RecommendedValue: fmt.Sprintf("%dm CPU", int(p95CPU*1.2)),
						Confidence:       0.90,
						Impact:           "high",
						Effort:           "low",
						AutoApply:        false,
					})
				}
			}

			// Similar for memory
			if memRequest > 0 {
				recommendedMem := math.Max(p95Mem*1.2, p99Mem*1.1)
				if memRequest > recommendedMem*1.5 {
					recommendations = append(recommendations, MLRecommendation{
						ID:               fmt.Sprintf("mem-opt-%s-%s", deployment.Namespace, deployment.Name),
						Timestamp:        time.Now(),
						Type:             "resource_optimization",
						Severity:         "medium",
						Namespace:        deployment.Namespace,
						Resource:         fmt.Sprintf("Deployment/%s", deployment.Name),
						Title:            "Memory Request Optimization",
						Description:      fmt.Sprintf("Container %s has memory request set to %s but typically uses only %s (P95).", container.Name, formatBytes(memRequest), formatBytes(p95Mem)),
						CurrentValue:     formatBytes(memRequest),
						RecommendedValue: formatBytes(recommendedMem),
						Confidence:       0.85,
						Impact:           "medium",
						Effort:           "low",
						AutoApply:        false,
					})
				}
			}
		}
	}

	return recommendations, nil
}

// analyzePredictiveScaling analyzes HPA and recommends predictive scaling
func (mlr *MLRecommender) analyzePredictiveScaling(ctx context.Context) ([]MLRecommendation, error) {
	var recommendations []MLRecommendation

	// Check if cluster is connected
	if mlr.app.clientset == nil {
		return recommendations, nil
	}

	// Get all HPAs
	hpas, err := mlr.app.clientset.AutoscalingV2().HorizontalPodAutoscalers("").List(ctx, metav1.ListOptions{Limit: 100})
	if err != nil {
		return nil, err
	}

	for _, hpa := range hpas.Items {
		if hpa.Status.CurrentReplicas == 0 {
			continue
		}

		// Predict future load
		cpuPred, _, err := mlr.PredictResourceNeeds(ctx, hpa.Namespace, hpa.Spec.ScaleTargetRef.Name, 1) // 1 hour ahead
		if err != nil {
			continue
		}

		// Check if HPA will need to scale soon
		// Get current CPU utilization from metrics
		currentCPU := 0.0
		if len(hpa.Status.CurrentMetrics) > 0 {
			for _, metric := range hpa.Status.CurrentMetrics {
				if metric.Type == autoscalingv2.ResourceMetricSourceType && metric.Resource != nil && metric.Resource.Name == "cpu" {
					if metric.Resource.Current.AverageUtilization != nil {
						currentCPU = float64(*metric.Resource.Current.AverageUtilization)
					}
				}
			}
		}
		if currentCPU > 0 && cpuPred > currentCPU*1.3 {
			// Predicted 30% increase in next hour
			recommendations = append(recommendations, MLRecommendation{
				ID:               fmt.Sprintf("scale-predict-%s-%s", hpa.Namespace, hpa.Name),
				Timestamp:        time.Now(),
				Type:             "scaling",
				Severity:         "medium",
				Namespace:        hpa.Namespace,
				Resource:         fmt.Sprintf("HPA/%s", hpa.Name),
				Title:            "Predictive Scaling Recommended",
				Description:      fmt.Sprintf("ML model predicts 30%% increase in CPU usage in the next hour. Consider pre-scaling to avoid latency spikes."),
				CurrentValue:     fmt.Sprintf("%d replicas", hpa.Status.CurrentReplicas),
				RecommendedValue: fmt.Sprintf("%d replicas", hpa.Status.CurrentReplicas+1),
				Confidence:       0.75,
				Impact:           "medium",
				Effort:           "low",
				AutoApply:        true,
			})
		}
	}

	return recommendations, nil
}

// analyzeCostOptimization finds cost-saving opportunities
func (mlr *MLRecommender) analyzeCostOptimization(ctx context.Context) ([]MLRecommendation, error) {
	var recommendations []MLRecommendation

	// Find idle resources (low utilization over time)
	mlr.mu.RLock()
	history := make([]MetricSample, len(mlr.metricsHistory))
	copy(history, mlr.metricsHistory)
	mlr.mu.RUnlock()

	// Group by deployment
	deploymentUsage := make(map[string][]MetricSample)
	for _, sample := range history {
		key := fmt.Sprintf("%s/%s", sample.Namespace, sample.Deployment)
		deploymentUsage[key] = append(deploymentUsage[key], sample)
	}

	for key, samples := range deploymentUsage {
		if len(samples) < 50 {
			continue
		}

		// Calculate average utilization
		avgCPU := 0.0
		avgMem := 0.0
		for _, s := range samples {
			if s.CPURequest > 0 {
				avgCPU += (s.CPUUsage / s.CPURequest) * 100
			}
			if s.MemoryRequest > 0 {
				avgMem += (s.MemoryUsage / s.MemoryRequest) * 100
			}
		}
		avgCPU /= float64(len(samples))
		avgMem /= float64(len(samples))

		// If consistently low utilization, recommend downscaling
		if avgCPU < 20 && avgMem < 20 {
			recommendations = append(recommendations, MLRecommendation{
				ID:               fmt.Sprintf("cost-%s", key),
				Timestamp:        time.Now(),
				Type:             "cost_saving",
				Severity:         "low",
				Namespace:        samples[0].Namespace,
				Resource:         fmt.Sprintf("Deployment/%s", samples[0].Deployment),
				Title:            "Low Resource Utilization",
				Description:      fmt.Sprintf("Deployment shows consistently low utilization (CPU: %.1f%%, Memory: %.1f%%). Consider reducing replicas or resource requests to save costs.", avgCPU, avgMem),
				CurrentValue:     fmt.Sprintf("CPU: %.1f%%, Memory: %.1f%%", avgCPU, avgMem),
				RecommendedValue: "Reduce replicas or resource requests",
				Confidence:       0.80,
				Impact:           "low",
				Effort:           "medium",
				EstimatedSavings: "~20-30% cost reduction",
				AutoApply:        false,
			})
		}
	}

	return recommendations, nil
}

// percentile calculates the percentile of a slice
func (mlr *MLRecommender) percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}

	// Simple percentile calculation (for production, use proper sorting)
	sorted := make([]float64, len(values))
	copy(sorted, values)

	// Bubble sort (simple, for production use sort.Float64s)
	for i := 0; i < len(sorted)-1; i++ {
		for j := 0; j < len(sorted)-i-1; j++ {
			if sorted[j] > sorted[j+1] {
				sorted[j], sorted[j+1] = sorted[j+1], sorted[j]
			}
		}
	}

	index := int(float64(len(sorted)) * p)
	if index >= len(sorted) {
		index = len(sorted) - 1
	}

	return sorted[index]
}

// formatBytes formats bytes to human-readable format
func formatBytes(bytes float64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%.0f B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", bytes/float64(div), "KMGTPE"[exp])
}
