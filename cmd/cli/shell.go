// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"context"
	"fmt"
	"os"

	"github.com/kubegraf/kubegraf/internal/cli"
	"github.com/spf13/cobra"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/kubectl/pkg/util/term"
)

var (
	shellNamespace string
	shellContext   string
	shellContainer string
	shellCommand   string
)

var shellCmd = &cobra.Command{
	Use:   "shell <pod>",
	Short: "Execute an interactive shell in a pod",
	Long: `Execute an interactive shell in a Kubernetes pod.

Examples:
  # Open a shell in a pod
  kubegraf shell nginx-7c6f9f8c9-4xk2l

  # Open a shell in a specific container
  kubegraf shell nginx-7c6f9f8c9-4xk2l --container nginx

  # Use a custom shell command
  kubegraf shell nginx-7c6f9f8c9-4xk2l --command "/bin/bash"

  # Use a different namespace
  kubegraf shell nginx-7c6f9f8c9-4xk2l --ns production

  # Use a different context
  kubegraf shell nginx-7c6f9f8c9-4xk2l --context prod-cluster`,
	Args: cobra.ExactArgs(1),
	RunE: runShell,
}

func init() {
	shellCmd.Flags().StringVarP(&shellNamespace, "namespace", "n", "", "Kubernetes namespace")
	shellCmd.Flags().StringVarP(&shellContext, "context", "c", "", "Kubernetes context")
	shellCmd.Flags().StringVar(&shellContainer, "container", "", "Container name (if pod has multiple containers)")
	shellCmd.Flags().StringVar(&shellCommand, "command", "/bin/sh", "Shell command to execute")
}

func runShell(cmd *cobra.Command, args []string) error {
	podName := args[0]

	// Load kubeconfig
	kubeConfig, err := cli.LoadKubeConfig(shellContext, shellNamespace)
	if err != nil {
		return fmt.Errorf("load kubeconfig: %w", err)
	}

	kubeConfig.PrintContextInfo()
	fmt.Println()

	ctx := context.Background()
	clientset := kubeConfig.GetClientset()
	restConfig := kubeConfig.GetRESTConfig()
	namespace := kubeConfig.GetNamespace()

	// Get pod to check containers
	pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("get pod: %w", err)
	}

	// Determine container
	containerName := shellContainer
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

	// Try the specified command first, fallback to /bin/bash if /bin/sh fails
	commands := []string{shellCommand}
	if shellCommand == "/bin/sh" {
		commands = append(commands, "/bin/bash")
	}

	var lastErr error
	for _, shellCmd := range commands {
		fmt.Printf("Opening shell with command: %s\n\n", shellCmd)

		req := clientset.CoreV1().RESTClient().
			Post().
			Resource("pods").
			Name(podName).
			Namespace(namespace).
			SubResource("exec").
			VersionedParams(&corev1.PodExecOptions{
				Container: containerName,
				Command:   []string{shellCmd},
				Stdin:     true,
				Stdout:    true,
				Stderr:    true,
				TTY:       true,
			}, scheme.ParameterCodec)

		exec, err := remotecommand.NewSPDYExecutor(restConfig, "POST", req.URL())
		if err != nil {
			return fmt.Errorf("create executor: %w", err)
		}

		// Setup terminal
		t := term.TTY{
			In:  os.Stdin,
			Out: os.Stdout,
			Raw: true,
		}

		if !t.IsTerminalIn() {
			return fmt.Errorf("stdin is not a terminal")
		}

		err = t.Safe(func() error {
			return exec.StreamWithContext(ctx, remotecommand.StreamOptions{
				Stdin:  os.Stdin,
				Stdout: os.Stdout,
				Stderr: os.Stderr,
				Tty:    true,
			})
		})

		if err != nil {
			lastErr = err
			// Try next command if available
			if len(commands) > 1 && shellCmd != commands[len(commands)-1] {
				fmt.Printf("Failed with %s, trying next command...\n", shellCmd)
				continue
			}
		} else {
			// Success
			return nil
		}
	}

	return fmt.Errorf("exec failed: %w", lastErr)
}
