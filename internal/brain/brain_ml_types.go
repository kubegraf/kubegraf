// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package brain

// MLTimelineEvent represents an ML-related event in the timeline
type MLTimelineEvent struct {
	ID          string    `json:"id"`
	Timestamp   string    `json:"timestamp"`
	Type        string    `json:"type"` // training_failure, gpu_spike, model_deployment, drift_detected
	Severity    string    `json:"severity"` // info, warning, critical
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Resource    MLResource `json:"resource,omitempty"`
	Metrics     map[string]interface{} `json:"metrics,omitempty"`
}

// MLResource represents a resource involved in an ML event
type MLResource struct {
	Kind      string `json:"kind"` // TrainingJob, InferenceService, GPU, Model
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// MLPrediction represents a prediction about future ML events
type MLPrediction struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"` // gpu_saturation, latency_increase, artifact_growth
	Severity    string    `json:"severity"` // info, warning, critical
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Timeframe   string    `json:"timeframe"` // "in 2 hours", "within 24 hours", etc.
	Confidence  float64   `json:"confidence"` // 0.0 to 1.0
	Resource    MLResource `json:"resource,omitempty"`
	CurrentValue interface{} `json:"currentValue,omitempty"`
	PredictedValue interface{} `json:"predictedValue,omitempty"`
	Trend         string    `json:"trend"` // increasing, decreasing, stable
}

// MLSummary represents a natural language summary of ML activities
type MLSummary struct {
	Summary      string   `json:"summary"`
	KeyInsights  []string `json:"keyInsights"`
	Recommendations []string `json:"recommendations"`
	GeneratedAt  string   `json:"generatedAt"`
	TimeRange    string   `json:"timeRange"` // "last 24 hours", "last week", etc.
}

// MLTimelineResponse represents the response for ML timeline endpoint
type MLTimelineResponse struct {
	Events    []MLTimelineEvent `json:"events"`
	TimeRange string            `json:"timeRange"`
	Total     int               `json:"total"`
}

// MLPredictionsResponse represents the response for ML predictions endpoint
type MLPredictionsResponse struct {
	Predictions []MLPrediction `json:"predictions"`
	GeneratedAt string         `json:"generatedAt"`
	Total       int            `json:"total"`
}


