// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"

	"github.com/kubegraf/kubegraf/cli/internal"
	"github.com/spf13/cobra"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

var (
	pfNamespace string
	pfContext   string
	pfLocal     int
)

var pfCmd = &cobra.Command{
	Use:   "pf <pod|svc> <name> <remote-port> [flags]",
	Short: "Port forward to a pod or service",
	Long: `Port forward to a Kubernetes pod or service.

For services, automatically selects a ready pod backing the service.

Examples:
  # Forward local port 8080 to pod port 80
  kubegraf pf pod nginx-7c6f9f8c9-4xk2l 80 --local 8080

  # Forward to a service (auto-selects a ready pod)
  kubegraf pf svc nginx-service 80 --local 8080

  # Auto-assign local port (same as remote)
  kubegraf pf pod nginx-7c6f9f8c9-4xk2l 80

  # Use a different namespace
  kubegraf pf pod nginx-7c6f9f8c9-4xk2l 80 --ns production

  # Use a different context
  kubegraf pf svc nginx-service 80 --context prod-cluster --local 8080`,
	Args: cobra.ExactArgs(3),
	RunE: runPortForward,
}

func init() {
	pfCmd.Flags().StringVarP(&pfNamespace, "namespace", "n", "", "Kubernetes namespace")
	pfCmd.Flags().StringVarP(&pfContext, "context", "c", "", "Kubernetes context")
	pfCmd.Flags().IntVarP(&pfLocal, "local", "l", 0, "Local port (defaults to remote port)")
}

func runPortForward(cmd *cobra.Command, args []string) error {
	targetType := args[0] // "pod" or "svc"
	targetName := args[1]
	remotePort, err := strconv.Atoi(args[2])
	if err != nil {
		return fmt.Errorf("invalid remote port %q: %w", args[2], err)
	}

	localPort := pfLocal
	if localPort == 0 {
		localPort = remotePort
	}

	// Load kubeconfig
	kubeConfig, err := cli.LoadKubeConfig(pfContext, pfNamespace)
	if err != nil {
		return fmt.Errorf("load kubeconfig: %w", err)
	}

	kubeConfig.PrintContextInfo()
	fmt.Println()

	ctx := context.Background()
	clientset := kubeConfig.GetClientset()
	restConfig := kubeConfig.GetRESTConfig()
	namespace := kubeConfig.GetNamespace()

	var podName string

	switch strings.ToLower(targetType) {
	case "pod", "po":
		podName = targetName

	case "svc", "service":
		// Resolve service to pod
		svc, err := clientset.CoreV1().Services(namespace).Get(ctx, targetName, metav1.GetOptions{})
		if err != nil {
			return fmt.Errorf("get service: %w", err)
		}

		if len(svc.Spec.Selector) == 0 {
			return fmt.Errorf("service %s has no selector", targetName)
		}

		// Find endpoints
		endpoints, err := clientset.CoreV1().Endpoints(namespace).Get(ctx, targetName, metav1.GetOptions{})
		if err != nil {
			return fmt.Errorf("get endpoints: %w", err)
		}

		if len(endpoints.Subsets) == 0 || len(endpoints.Subsets[0].Addresses) == 0 {
			return fmt.Errorf("service %s has no ready endpoints", targetName)
		}

		// Pick first ready pod
		podRef := endpoints.Subsets[0].Addresses[0].TargetRef
		if podRef == nil || podRef.Kind != "Pod" {
			return fmt.Errorf("service endpoint is not a pod")
		}

		podName = podRef.Name
		fmt.Printf("Resolved service %s -> pod %s\n", targetName, podName)

	default:
		return fmt.Errorf("invalid target type %q: must be 'pod' or 'svc'", targetType)
	}

	// Verify pod exists
	pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("get pod: %w", err)
	}

	if pod.Status.Phase != "Running" {
		return fmt.Errorf("pod %s is not running (status: %s)", podName, pod.Status.Phase)
	}

	// Build port forward request
	req := clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Namespace(namespace).
		Name(podName).
		SubResource("portforward")

	// Setup SPDY connection
	transport, upgrader, err := spdy.RoundTripperFor(restConfig)
	if err != nil {
		return fmt.Errorf("create round tripper: %w", err)
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, "POST", req.URL())

	// Setup stop channel
	stopChan := make(chan struct{}, 1)
	readyChan := make(chan struct{})

	// Handle Ctrl+C
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt)
	go func() {
		<-signals
		fmt.Println("\nShutting down port forward...")
		close(stopChan)
	}()

	// Create port forwarder
	ports := []string{fmt.Sprintf("%d:%d", localPort, remotePort)}
	fw, err := portforward.New(dialer, ports, stopChan, readyChan, os.Stdout, os.Stderr)
	if err != nil {
		return fmt.Errorf("create port forwarder: %w", err)
	}

	// Start forwarding in goroutine
	go func() {
		if err := fw.ForwardPorts(); err != nil {
			fmt.Fprintf(os.Stderr, "Port forward error: %v\n", err)
		}
	}()

	// Wait for ready
	<-readyChan

	fmt.Printf("\nForwarding 127.0.0.1:%d -> %s:%d (pod %s)\n", localPort, targetName, remotePort, podName)
	fmt.Println("Press Ctrl+C to stop")

	// Wait for stop signal
	<-stopChan

	return nil
}
