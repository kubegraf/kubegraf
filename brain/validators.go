// Copyright 2025 KubeGraf Contributors
// Brain validation utilities

package brain

import (
	"errors"

	"k8s.io/client-go/kubernetes"
)

// ValidateClientset checks if the clientset is available and not nil
func ValidateClientset(clientset kubernetes.Interface) error {
	if clientset == nil {
		return errors.New("kubernetes client is not available: cluster not connected")
	}
	return nil
}

// SafeGetClientset safely gets the clientset from the app, returning error if not available
func SafeGetClientset(app interface {
	GetClientset() interface{}
	IsConnected() bool
}) (kubernetes.Interface, error) {
	if !app.IsConnected() {
		return nil, errors.New("cluster is not connected")
	}

	clientset, ok := app.GetClientset().(kubernetes.Interface)
	if !ok || clientset == nil {
		return nil, errors.New("kubernetes client is not available")
	}

	return clientset, nil
}
