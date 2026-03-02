// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"strings"
	"testing"

	"github.com/kubegraf/kubegraf/cost/pricing"
)

// helper: create CostEstimator with known pricing
func newTestCostEstimator() *CostEstimator {
	p := pricing.DefaultPricingTable()
	return &CostEstimator{pricing: p}
}

// ─────────────────────────────────────────────────────────────────────────────
// FormatCost
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatCost_Large(t *testing.T) {
	c := newTestCostEstimator()
	got := c.FormatCost(1.23)
	if got != "$1.23" {
		t.Errorf("FormatCost(1.23) = %q, want $1.23", got)
	}
}

func TestFormatCost_Small(t *testing.T) {
	c := newTestCostEstimator()
	got := c.FormatCost(0.001)
	if !strings.HasPrefix(got, "$") {
		t.Errorf("FormatCost(0.001) = %q, should start with $", got)
	}
}

func TestFormatCost_Zero(t *testing.T) {
	c := newTestCostEstimator()
	got := c.FormatCost(0.0)
	if !strings.HasPrefix(got, "$") {
		t.Errorf("FormatCost(0) = %q, should start with $", got)
	}
}

func TestFormatCost_ExactThreshold(t *testing.T) {
	c := newTestCostEstimator()
	// 0.01 is right at the threshold
	got := c.FormatCost(0.01)
	if got != "$0.01" {
		t.Errorf("FormatCost(0.01) = %q, want $0.01", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateHourlyCost
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateHourlyCost_AllZero(t *testing.T) {
	c := newTestCostEstimator()
	cost := c.calculateHourlyCost(0, 0, 0)
	if cost != 0 {
		t.Errorf("calculateHourlyCost(0,0,0) = %f, want 0", cost)
	}
}

func TestCalculateHourlyCost_Positive(t *testing.T) {
	c := newTestCostEstimator()
	cost := c.calculateHourlyCost(1.0, 4.0, 100.0)
	if cost <= 0 {
		t.Errorf("calculateHourlyCost(1,4,100) = %f, want > 0", cost)
	}
}

func TestCalculateHourlyCost_ScalesWithCPU(t *testing.T) {
	c := newTestCostEstimator()
	cost1 := c.calculateHourlyCost(1.0, 0, 0)
	cost2 := c.calculateHourlyCost(2.0, 0, 0)
	if cost2 != cost1*2 {
		t.Errorf("cost with 2 CPUs should be 2x cost with 1 CPU: %f vs %f", cost2, cost1*2)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// formatBreakdown
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatBreakdown_AllZero_Empty(t *testing.T) {
	c := newTestCostEstimator()
	got := c.formatBreakdown(0, 0, 0)
	if got != "" {
		t.Errorf("formatBreakdown(0,0,0) = %q, want empty", got)
	}
}

func TestFormatBreakdown_CPUOnly(t *testing.T) {
	c := newTestCostEstimator()
	got := c.formatBreakdown(1.0, 0, 0)
	if !strings.Contains(got, "CPU") {
		t.Errorf("formatBreakdown with CPU = %q, should contain CPU", got)
	}
}

func TestFormatBreakdown_MemOnly(t *testing.T) {
	c := newTestCostEstimator()
	got := c.formatBreakdown(0, 4.0, 0)
	if !strings.Contains(got, "GB RAM") {
		t.Errorf("formatBreakdown with mem = %q, should contain GB RAM", got)
	}
}

func TestFormatBreakdown_AllComponents(t *testing.T) {
	c := newTestCostEstimator()
	got := c.formatBreakdown(2.0, 8.0, 100.0)
	if !strings.Contains(got, "CPU") || !strings.Contains(got, "RAM") || !strings.Contains(got, "Storage") {
		t.Errorf("formatBreakdown all = %q, expected CPU, RAM, Storage", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// parseWindow (already in continuity_test.go — skip here)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Root package pricing wrappers
// ─────────────────────────────────────────────────────────────────────────────

func TestRootGCPPricingTable_NotNil(t *testing.T) {
	p := GCPPricingTable("us-central1")
	if p == nil {
		t.Fatal("GCPPricingTable returned nil")
	}
}

func TestRootAWSPricingTable_NotNil(t *testing.T) {
	p := AWSPricingTable("us-east-1")
	if p == nil {
		t.Fatal("AWSPricingTable returned nil")
	}
}

func TestRootAzurePricingTable_NotNil(t *testing.T) {
	p := AzurePricingTable("eastus")
	if p == nil {
		t.Fatal("AzurePricingTable returned nil")
	}
}

func TestRootDefaultPricingTable_NotNil(t *testing.T) {
	p := DefaultPricingTable()
	if p == nil {
		t.Fatal("DefaultPricingTable returned nil")
	}
}
