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

package validation

import (
	"context"
	"fmt"
	"sync"
	"time"

	"k8s.io/client-go/kubernetes"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// APITestRunner runs comprehensive accuracy tests for all API endpoints
type APITestRunner struct {
	clientset     kubernetes.Interface
	metricsClient metricsclientset.Interface
	ctx           context.Context
}

// NewAPITestRunner creates a new API test runner
func NewAPITestRunner(clientset kubernetes.Interface, metricsClient metricsclientset.Interface, ctx context.Context) *APITestRunner {
	return &APITestRunner{
		clientset:     clientset,
		metricsClient: metricsClient,
		ctx:           ctx,
	}
}

// TestResult represents the result of a single test
type TestResult struct {
	TestName    string                 `json:"testName"`
	Resource    string                 `json:"resource"`
	Namespace   string                 `json:"namespace,omitempty"`
	Name        string                 `json:"name,omitempty"`
	Passed      bool                   `json:"passed"`
	Errors      []string               `json:"errors,omitempty"`
	Warnings    []string               `json:"warnings,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
	Duration    time.Duration          `json:"duration"`
	Timestamp   time.Time              `json:"timestamp"`
}

// AllTestsResult contains results from all tests
type AllTestsResult struct {
	TotalTests   int                  `json:"totalTests"`
	PassedTests  int                  `json:"passedTests"`
	FailedTests  int                  `json:"failedTests"`
	WarningTests int                  `json:"warningTests"`
	Results      []TestResult         `json:"results"`
	Summary      map[string]int       `json:"summary"`
	Duration     time.Duration       `json:"duration"`
	Timestamp    time.Time           `json:"timestamp"`
}

// RunAllTests runs all accuracy tests
func (r *APITestRunner) RunAllTests(namespace string) (*AllTestsResult, error) {
	startTime := time.Now()
	results := []TestResult{}
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Run all tests in parallel
	testFuncs := []struct {
		name string
		fn   func() ([]TestResult, error)
	}{
		{"pods", func() ([]TestResult, error) {
			checker := NewDataAccuracyChecker(r.clientset, r.metricsClient, r.ctx)
			return checker.ValidatePods(namespace)
		}},
		{"deployments", func() ([]TestResult, error) {
			checker := NewDataAccuracyChecker(r.clientset, r.metricsClient, r.ctx)
			return checker.ValidateDeployments(namespace)
		}},
		{"metrics", func() ([]TestResult, error) {
			checker := NewDataAccuracyChecker(r.clientset, r.metricsClient, r.ctx)
			return checker.ValidateMetrics(namespace)
		}},
		{"cost", func() ([]TestResult, error) {
			checker := NewDataAccuracyChecker(r.clientset, r.metricsClient, r.ctx)
			return checker.ValidateCost(namespace)
		}},
		{"nodes", func() ([]TestResult, error) {
			checker := NewDataAccuracyChecker(r.clientset, r.metricsClient, r.ctx)
			return checker.ValidateNodes()
		}},
		{"services", func() ([]TestResult, error) {
			checker := NewDataAccuracyChecker(r.clientset, r.metricsClient, r.ctx)
			return checker.ValidateServices(namespace)
		}},
	}

	for _, test := range testFuncs {
		wg.Add(1)
		go func(test struct {
			name string
			fn   func() ([]TestResult, error)
		}) {
			defer wg.Done()
			testResults, err := test.fn()
			if err != nil {
				mu.Lock()
				results = append(results, TestResult{
					TestName:  test.name,
					Passed:    false,
					Errors:    []string{err.Error()},
					Duration:  time.Since(startTime),
					Timestamp: time.Now(),
				})
				mu.Unlock()
				return
			}
			mu.Lock()
			results = append(results, testResults...)
			mu.Unlock()
		}(test)
	}

	wg.Wait()

	// Calculate summary
	passed := 0
	failed := 0
	warnings := 0
	summary := make(map[string]int)

	for _, result := range results {
		if result.Passed {
			passed++
		} else {
			failed++
		}
		if len(result.Warnings) > 0 {
			warnings++
		}
		summary[result.Resource]++
	}

	return &AllTestsResult{
		TotalTests:   len(results),
		PassedTests:  passed,
		FailedTests:  failed,
		WarningTests: warnings,
		Results:      results,
		Summary:      summary,
		Duration:     time.Since(startTime),
		Timestamp:    time.Now(),
	}, nil
}

// GetSummary returns a summary of accuracy test results
func (r *APITestRunner) GetSummary(namespace string) (map[string]interface{}, error) {
	results, err := r.RunAllTests(namespace)
	if err != nil {
		return nil, err
	}

	accuracy := float64(results.PassedTests) / float64(results.TotalTests) * 100
	if results.TotalTests == 0 {
		accuracy = 0
	}

	return map[string]interface{}{
		"totalTests":    results.TotalTests,
		"passedTests":   results.PassedTests,
		"failedTests":   results.FailedTests,
		"warningTests":  results.WarningTests,
		"accuracy":      fmt.Sprintf("%.2f%%", accuracy),
		"duration":      results.Duration.String(),
		"timestamp":     results.Timestamp.Format(time.RFC3339),
		"summary":       results.Summary,
	}, nil
}

