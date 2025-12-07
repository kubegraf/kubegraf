// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	"context"
	"fmt"
	"io"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// GetMLJobLogs gets logs from an ML training job
func (ws *WebServer) GetMLJobLogs(ctx context.Context, name, namespace string, follow bool) (io.ReadCloser, error) {
	// Get the job to find its pods
	job, err := ws.app.clientset.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %v", err)
	}

	// Find pods belonging to this job
	labelSelector := fmt.Sprintf("job-name=%s", job.Name)
	pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %v", err)
	}

	if len(pods.Items) == 0 {
		return nil, fmt.Errorf("no pods found for job %s", name)
	}

	// Get logs from the first pod (or all pods)
	// For simplicity, we'll get logs from the first pod
	pod := pods.Items[0]
	
	// Get container name (usually "training" based on our spec)
	containerName := "training"
	if len(pod.Spec.Containers) > 0 {
		containerName = pod.Spec.Containers[0].Name
	}

	// Get logs
	req := ws.app.clientset.CoreV1().Pods(namespace).GetLogs(pod.Name, &corev1.PodLogOptions{
		Container: containerName,
		Follow:    follow,
		TailLines: func() *int64 { n := int64(1000); return &n }(),
	})

	logStream, err := req.Stream(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to stream logs: %v", err)
	}

	return logStream, nil
}

// StreamMLJobLogs streams logs from an ML training job via WebSocket
// This is a helper function that can be used by WebSocket handlers
func StreamMLJobLogs(ctx context.Context, clientset kubernetes.Interface, name, namespace string, writer io.Writer) error {
	// Get the job
	job, err := clientset.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get job: %v", err)
	}

	// Find pods
	labelSelector := fmt.Sprintf("job-name=%s", job.Name)
	pods, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return fmt.Errorf("failed to list pods: %v", err)
	}

	if len(pods.Items) == 0 {
		return fmt.Errorf("no pods found for job %s", name)
	}

	// Stream logs from all pods
	for _, pod := range pods.Items {
		containerName := "training"
		if len(pod.Spec.Containers) > 0 {
			containerName = pod.Spec.Containers[0].Name
		}

		req := clientset.CoreV1().Pods(namespace).GetLogs(pod.Name, &corev1.PodLogOptions{
			Container: containerName,
			Follow:    true,
		})

		logStream, err := req.Stream(ctx)
		if err != nil {
			continue // Skip pods that can't stream logs
		}
		defer logStream.Close()

		// Copy logs to writer
		io.Copy(writer, logStream)
	}

	return nil
}

