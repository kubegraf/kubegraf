// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/kubegraf/kubegraf/internal/cli"
	"github.com/spf13/cobra"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var (
	logsNamespace string
	logsContext   string
	logsFollow    bool
	logsContainer string
	logsSince     string
	logsTail      int64
)

var logsCmd = &cobra.Command{
	Use:   "logs <pod>",
	Short: "Stream logs from a pod",
	Long: `Stream logs from a Kubernetes pod.

Examples:
  # Get logs from a pod
  kubegraf logs nginx-7c6f9f8c9-4xk2l

  # Follow logs from a pod
  kubegraf logs nginx-7c6f9f8c9-4xk2l --follow

  # Get logs from a specific container
  kubegraf logs nginx-7c6f9f8c9-4xk2l --container nginx

  # Get last 100 lines
  kubegraf logs nginx-7c6f9f8c9-4xk2l --tail 100

  # Get logs from the last 10 minutes
  kubegraf logs nginx-7c6f9f8c9-4xk2l --since 10m

  # Use a different namespace
  kubegraf logs nginx-7c6f9f8c9-4xk2l --ns production

  # Use a different context
  kubegraf logs nginx-7c6f9f8c9-4xk2l --context prod-cluster`,
	Args: cobra.ExactArgs(1),
	RunE: runLogs,
}

func init() {
	logsCmd.Flags().StringVarP(&logsNamespace, "namespace", "n", "", "Kubernetes namespace")
	logsCmd.Flags().StringVarP(&logsContext, "context", "c", "", "Kubernetes context")
	logsCmd.Flags().BoolVarP(&logsFollow, "follow", "f", false, "Follow log output")
	logsCmd.Flags().StringVar(&logsContainer, "container", "", "Container name (if pod has multiple containers)")
	logsCmd.Flags().StringVar(&logsSince, "since", "", "Show logs since duration (e.g., 10m, 1h)")
	logsCmd.Flags().Int64Var(&logsTail, "tail", 0, "Number of lines to show from the end (0 = all)")
}

func runLogs(cmd *cobra.Command, args []string) error {
	podName := args[0]

	// Load kubeconfig
	kubeConfig, err := cli.LoadKubeConfig(logsContext, logsNamespace)
	if err != nil {
		return fmt.Errorf("load kubeconfig: %w", err)
	}

	kubeConfig.PrintContextInfo()
	fmt.Println()

	ctx := context.Background()
	clientset := kubeConfig.GetClientset()
	namespace := kubeConfig.GetNamespace()

	// Get pod to check containers
	pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("get pod: %w", err)
	}

	// Determine container
	containerName := logsContainer
	if containerName == "" {
		if len(pod.Spec.Containers) == 0 {
			return fmt.Errorf("pod has no containers")
		}
		containerName = pod.Spec.Containers[0].Name
		if len(pod.Spec.Containers) > 1 {
			fmt.Printf("Note: Pod has %d containers. Using container '%s'. Use --container to specify a different one.\n", len(pod.Spec.Containers), containerName)
			fmt.Print("Available containers: ")
			for i, c := range pod.Spec.Containers {
				if i > 0 {
					fmt.Print(", ")
				}
				fmt.Print(c.Name)
			}
			fmt.Println("\n")
		}
	} else {
		// Validate that the specified container exists
		found := false
		for _, c := range pod.Spec.Containers {
			if c.Name == containerName {
				found = true
				break
			}
		}
		if !found {
			fmt.Fprintf(os.Stderr, "Error: Container '%s' not found in pod '%s'\n", containerName, podName)
			fmt.Print("Available containers: ")
			for i, c := range pod.Spec.Containers {
				if i > 0 {
					fmt.Print(", ")
				}
				fmt.Print(c.Name)
			}
			fmt.Println()
			return fmt.Errorf("container '%s' not found", containerName)
		}
	}

	// Build log options
	logOptions := &corev1.PodLogOptions{
		Container: containerName,
		Follow:    logsFollow,
	}

	if logsTail > 0 {
		logOptions.TailLines = &logsTail
	}

	if logsSince != "" {
		duration, err := time.ParseDuration(logsSince)
		if err != nil {
			return fmt.Errorf("invalid duration %q: %w", logsSince, err)
		}
		seconds := int64(duration.Seconds())
		logOptions.SinceSeconds = &seconds
	}

	// Get logs
	req := clientset.CoreV1().Pods(namespace).GetLogs(podName, logOptions)
	stream, err := req.Stream(ctx)
	if err != nil {
		return fmt.Errorf("stream logs: %w", err)
	}
	defer stream.Close()

	// Copy logs to stdout
	_, err = io.Copy(os.Stdout, stream)
	if err != nil {
		return fmt.Errorf("copy logs: %w", err)
	}

	return nil
}
