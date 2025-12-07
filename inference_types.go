// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

// InferenceServiceRequest represents a request to create an inference service
type InferenceServiceRequest struct {
	Name          string            `json:"name"`
	Namespace     string            `json:"namespace"`
	ModelFile     string            `json:"modelFile"`     // Base64 encoded model file
	ModelFileName string            `json:"modelFileName"` // Original filename (.pt, .onnx, .pickle, .h5)
	Runtime       string            `json:"runtime"`       // fastapi, mlserver, bentoml, kserve
	CPU           string            `json:"cpu,omitempty"`
	Memory        string            `json:"memory,omitempty"`
	GPU           string            `json:"gpu,omitempty"`
	Replicas      int32             `json:"replicas,omitempty"`
	HPA           *HPASpec          `json:"hpa,omitempty"`
	Ingress       *IngressSpec      `json:"ingress,omitempty"`
	Storage       *StorageSpec      `json:"storage,omitempty"`
	EnvVars       map[string]string `json:"envVars,omitempty"`
}

// HPASpec defines Horizontal Pod Autoscaler configuration
type HPASpec struct {
	Enabled      bool  `json:"enabled"`
	MinReplicas  int32 `json:"minReplicas"`
	MaxReplicas  int32 `json:"maxReplicas"`
	TargetCPU    int32 `json:"targetCPU"`    // Target CPU percentage
}

// IngressSpec defines ingress/gateway configuration
type IngressSpec struct {
	Enabled  bool   `json:"enabled"`
	Host     string `json:"host,omitempty"`
	Path     string `json:"path,omitempty"`
	TLS      bool   `json:"tls,omitempty"`
}

// StorageSpec defines model storage configuration
type StorageSpec struct {
	Type     string `json:"type"`     // pvc, minio, s3
	PVCName  string `json:"pvcName,omitempty"`
	MinIO    *MinIOConfig `json:"minio,omitempty"`
	S3       *S3Config    `json:"s3,omitempty"`
	MountPath string `json:"mountPath,omitempty"`
}

// MinIOConfig defines MinIO storage configuration
type MinIOConfig struct {
	Endpoint string `json:"endpoint"`
	Bucket   string `json:"bucket"`
	AccessKey string `json:"accessKey,omitempty"`
	SecretKey string `json:"secretKey,omitempty"`
}

// S3Config defines S3 storage configuration
type S3Config struct {
	Endpoint string `json:"endpoint"`
	Bucket   string `json:"bucket"`
	Region   string `json:"region,omitempty"`
	AccessKey string `json:"accessKey,omitempty"`
	SecretKey string `json:"secretKey,omitempty"`
}

// InferenceService represents an inference service
type InferenceService struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Status      string            `json:"status"`      // Running, Pending, Failed
	Runtime     string            `json:"runtime"`
	ModelFile   string            `json:"modelFile"`
	Endpoint    string            `json:"endpoint,omitempty"`
	Replicas    int32             `json:"replicas"`
	ReadyReplicas int32           `json:"readyReplicas"`
	CreatedAt   string            `json:"createdAt"`
	Resources   map[string]string `json:"resources"`
}

// InferenceTestRequest represents a test request to an inference service
type InferenceTestRequest struct {
	Name      string                 `json:"name"`
	Namespace string                 `json:"namespace"`
	Input     map[string]interface{} `json:"input"`
}

// InferenceTestResponse represents the response from an inference service
type InferenceTestResponse struct {
	Success   bool                   `json:"success"`
	Output    map[string]interface{} `json:"output,omitempty"`
	Error     string                 `json:"error,omitempty"`
	Latency   string                 `json:"latency,omitempty"`
}

