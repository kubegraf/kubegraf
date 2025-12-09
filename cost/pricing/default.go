// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package pricing

// DefaultPricingTable returns generic cloud pricing
// Used as fallback when cloud provider cannot be determined
func DefaultPricingTable() *PricingTable {
	return &PricingTable{
		Provider:                "Generic",
		Region:                  "unknown",
		CPUPerCoreHour:          0.040, // Average across major providers
		MemoryPerGBHour:         0.005, // Average across major providers
		StoragePerGBMonth:       0.10,  // Average SSD pricing
		NetworkEgressPerGB:      0.09,  // Average network egress
		SpotDiscount:            0.70,
		ControlPlaneCostPerHour: 0.00, // No control plane cost for generic
		InstancePricing:         make(map[string]float64),
		SpotPricing:             make(map[string]float64),
	}
}

// GetPricingTable returns the appropriate pricing table based on provider and region
func GetPricingTable(provider string, region string) *PricingTable {
	switch provider {
	case "aws", "AWS":
		return AWSPricingTable(region)
	case "azure", "Azure":
		return AzurePricingTable(region)
	case "gcp", "GCP":
		return GCPPricingTable(region)
	default:
		return DefaultPricingTable()
	}
}
