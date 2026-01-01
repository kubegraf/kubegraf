// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/cli/internal"
	"github.com/spf13/cobra"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

var (
	restartNamespace string
	restartContext   string
)

var restartCmd = &cobra.Command{
	Use:   "restart <deploy|sts|ds> <name>",
	Short: "Restart a deployment, statefulset, or daemonset",
	Long: `Restart a Kubernetes workload by patching its restart annotation.

This triggers a rolling restart of the pods.

Examples:
  # Restart a deployment
  kubegraf restart deploy nginx

  # Restart a statefulset
  kubegraf restart sts redis

  # Restart a daemonset
  kubegraf restart ds node-exporter

  # Use a different namespace
  kubegraf restart deploy nginx --ns production

  # Use a different context
  kubegraf restart deploy nginx --context prod-cluster`,
	Args: cobra.ExactArgs(2),
	RunE: runRestart,
}

func init() {
	restartCmd.Flags().StringVarP(&restartNamespace, "namespace", "n", "", "Kubernetes namespace")
	restartCmd.Flags().StringVarP(&restartContext, "context", "c", "", "Kubernetes context")
}

func runRestart(cmd *cobra.Command, args []string) error {
	resourceType := args[0]
	resourceName := args[1]

	// Load kubeconfig
	kubeConfig, err := cli.LoadKubeConfig(restartContext, restartNamespace)
	if err != nil {
		return fmt.Errorf("load kubeconfig: %w", err)
	}

	kubeConfig.PrintContextInfo()
	fmt.Println()

	ctx := context.Background()
	clientset := kubeConfig.GetClientset()
	namespace := kubeConfig.GetNamespace()

	// Build patch with restart annotation
	restartAnnotation := fmt.Sprintf(`{"spec":{"template":{"metadata":{"annotations":{"kubegraf.io/restartedAt":"%s"}}}}}`, time.Now().Format(time.RFC3339))
	patchBytes := []byte(restartAnnotation)

	// Determine resource type and restart
	switch strings.ToLower(resourceType) {
	case "deploy", "deployment", "deployments":
		_, err = clientset.AppsV1().Deployments(namespace).Patch(
			ctx,
			resourceName,
			types.StrategicMergePatchType,
			patchBytes,
			metav1.PatchOptions{},
		)
		if err != nil {
			return fmt.Errorf("patch deployment: %w", err)
		}
		fmt.Printf("✓ Deployment %s restarted successfully\n", resourceName)

	case "sts", "statefulset", "statefulsets":
		_, err = clientset.AppsV1().StatefulSets(namespace).Patch(
			ctx,
			resourceName,
			types.StrategicMergePatchType,
			patchBytes,
			metav1.PatchOptions{},
		)
		if err != nil {
			return fmt.Errorf("patch statefulset: %w", err)
		}
		fmt.Printf("✓ StatefulSet %s restarted successfully\n", resourceName)

	case "ds", "daemonset", "daemonsets":
		_, err = clientset.AppsV1().DaemonSets(namespace).Patch(
			ctx,
			resourceName,
			types.StrategicMergePatchType,
			patchBytes,
			metav1.PatchOptions{},
		)
		if err != nil {
			return fmt.Errorf("patch daemonset: %w", err)
		}
		fmt.Printf("✓ DaemonSet %s restarted successfully\n", resourceName)

	default:
		return fmt.Errorf("unsupported resource type %q: must be deploy, sts, or ds", resourceType)
	}

	fmt.Println("\nNote: The restart is rolling and may take a few moments to complete.")
	return nil
}
