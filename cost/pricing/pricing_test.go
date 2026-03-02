// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package pricing

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// DefaultPricingTable
// ─────────────────────────────────────────────────────────────────────────────

func TestDefaultPricingTable_Provider(t *testing.T) {
	p := DefaultPricingTable()
	if p.Provider != "Generic" {
		t.Errorf("Provider = %q, want Generic", p.Provider)
	}
}

func TestDefaultPricingTable_NonZeroPrices(t *testing.T) {
	p := DefaultPricingTable()
	if p.CPUPerCoreHour <= 0 {
		t.Error("CPUPerCoreHour should be positive")
	}
	if p.MemoryPerGBHour <= 0 {
		t.Error("MemoryPerGBHour should be positive")
	}
	if p.StoragePerGBMonth <= 0 {
		t.Error("StoragePerGBMonth should be positive")
	}
}

func TestDefaultPricingTable_NotNilMaps(t *testing.T) {
	p := DefaultPricingTable()
	if p.InstancePricing == nil {
		t.Error("InstancePricing should not be nil")
	}
	if p.SpotPricing == nil {
		t.Error("SpotPricing should not be nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GCPPricingTable
// ─────────────────────────────────────────────────────────────────────────────

func TestGCPPricingTable_Provider(t *testing.T) {
	p := GCPPricingTable("us-central1")
	if p.Provider != "GCP" {
		t.Errorf("Provider = %q, want GCP", p.Provider)
	}
}

func TestGCPPricingTable_Region(t *testing.T) {
	region := "us-east1"
	p := GCPPricingTable(region)
	if p.Region != region {
		t.Errorf("Region = %q, want %q", p.Region, region)
	}
}

func TestGCPPricingTable_NonZeroPrices(t *testing.T) {
	p := GCPPricingTable("us-central1")
	if p.CPUPerCoreHour <= 0 {
		t.Error("CPUPerCoreHour should be positive")
	}
	if p.MemoryPerGBHour <= 0 {
		t.Error("MemoryPerGBHour should be positive")
	}
}

func TestGCPPricingTable_HasInstancePricing(t *testing.T) {
	p := GCPPricingTable("us-central1")
	if len(p.InstancePricing) == 0 {
		t.Error("GCP pricing table should have instance pricing data")
	}
	if _, ok := p.InstancePricing["e2-standard-2"]; !ok {
		t.Error("expected e2-standard-2 in instance pricing")
	}
}

func TestGCPPricingTable_SpotDiscount(t *testing.T) {
	p := GCPPricingTable("us-central1")
	if p.SpotDiscount <= 0 || p.SpotDiscount > 1 {
		t.Errorf("SpotDiscount = %f, want a value between 0 and 1", p.SpotDiscount)
	}
}

func TestGCPPricingTable_UnknownRegion(t *testing.T) {
	p := GCPPricingTable("unknown-region-xyz")
	// Should return a valid table with default multiplier
	if p.CPUPerCoreHour <= 0 {
		t.Error("unknown region should still return a positive CPUPerCoreHour")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AWSPricingTable
// ─────────────────────────────────────────────────────────────────────────────

func TestAWSPricingTable_Provider(t *testing.T) {
	p := AWSPricingTable("us-east-1")
	if p.Provider != "AWS" {
		t.Errorf("Provider = %q, want AWS", p.Provider)
	}
}

func TestAWSPricingTable_Region(t *testing.T) {
	region := "eu-west-1"
	p := AWSPricingTable(region)
	if p.Region != region {
		t.Errorf("Region = %q, want %q", p.Region, region)
	}
}

func TestAWSPricingTable_NonZeroPrices(t *testing.T) {
	p := AWSPricingTable("us-east-1")
	if p.CPUPerCoreHour <= 0 {
		t.Error("CPUPerCoreHour should be positive")
	}
}

func TestAWSPricingTable_ControlPlaneCost(t *testing.T) {
	p := AWSPricingTable("us-east-1")
	// EKS charges $0.10/hour for control plane
	if p.ControlPlaneCostPerHour <= 0 {
		t.Error("AWS EKS should have a non-zero control plane cost")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AzurePricingTable
// ─────────────────────────────────────────────────────────────────────────────

func TestAzurePricingTable_Provider(t *testing.T) {
	p := AzurePricingTable("eastus")
	if p.Provider != "Azure" {
		t.Errorf("Provider = %q, want Azure", p.Provider)
	}
}

func TestAzurePricingTable_NonZeroPrices(t *testing.T) {
	p := AzurePricingTable("eastus")
	if p.CPUPerCoreHour <= 0 {
		t.Error("CPUPerCoreHour should be positive")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetPricingTable
// ─────────────────────────────────────────────────────────────────────────────

func TestGetPricingTable_GCP(t *testing.T) {
	p := GetPricingTable("gcp", "us-central1")
	if p.Provider != "GCP" {
		t.Errorf("GetPricingTable(gcp) = %q, want GCP", p.Provider)
	}
}

func TestGetPricingTable_GCPUpperCase(t *testing.T) {
	p := GetPricingTable("GCP", "us-central1")
	if p.Provider != "GCP" {
		t.Errorf("GetPricingTable(GCP) = %q, want GCP", p.Provider)
	}
}

func TestGetPricingTable_AWS(t *testing.T) {
	p := GetPricingTable("aws", "us-east-1")
	if p.Provider != "AWS" {
		t.Errorf("GetPricingTable(aws) = %q, want AWS", p.Provider)
	}
}

func TestGetPricingTable_Azure(t *testing.T) {
	p := GetPricingTable("azure", "eastus")
	if p.Provider != "Azure" {
		t.Errorf("GetPricingTable(azure) = %q, want Azure", p.Provider)
	}
}

func TestGetPricingTable_AzureCapitalized(t *testing.T) {
	p := GetPricingTable("Azure", "eastus")
	if p.Provider != "Azure" {
		t.Errorf("GetPricingTable(Azure) = %q, want Azure", p.Provider)
	}
}

func TestGetPricingTable_Unknown(t *testing.T) {
	p := GetPricingTable("unknown", "us-east-1")
	if p.Provider != "Generic" {
		t.Errorf("GetPricingTable(unknown) = %q, want Generic", p.Provider)
	}
}
