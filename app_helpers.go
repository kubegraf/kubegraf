// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"time"

	"github.com/kubegraf/kubegraf/internal/history"
	"k8s.io/client-go/kubernetes"
)

// getClientset returns the current Kubernetes clientset.
func (app *App) getClientset() *kubernetes.Clientset {
	return app.clientset
}

// HistoryQueryResult wraps the internal history result
type HistoryQueryResult struct {
	ChangeEvents []history.ChangeEvent
}

// HistoryServiceWrapper provides history querying functionality.
type HistoryServiceWrapper struct {
	app *App
}

// getHistoryService returns a history service wrapper.
func (app *App) getHistoryService() *HistoryServiceWrapper {
	if app.clientset == nil {
		return nil
	}
	return &HistoryServiceWrapper{app: app}
}

// QueryHistory queries historical changes within the given time window.
func (h *HistoryServiceWrapper) QueryHistory(ctx context.Context, since, until time.Time) (*HistoryQueryResult, error) {
	if h.app.clientset == nil {
		return &HistoryQueryResult{ChangeEvents: []history.ChangeEvent{}}, nil
	}

	// Create a real history data source
	dataSource := history.NewKubernetesDataSource(h.app.clientset)
	service := history.NewHistoryQueryService(dataSource)

	window := history.TimeWindow{
		Since: since,
		Until: until,
	}

	result, err := service.QueryHistory(ctx, window)
	if err != nil {
		return nil, err
	}

	return &HistoryQueryResult{
		ChangeEvents: result.ChangeEvents,
	}, nil
}

