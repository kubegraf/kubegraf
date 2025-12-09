// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package pricing

// PricingTable contains hourly pricing for different resource types
type PricingTable struct {
	// Cloud provider name
	Provider string
	// Region
	Region string
	// CPU cost per core per hour
	CPUPerCoreHour float64
	// Memory cost per GB per hour
	MemoryPerGBHour float64
	// Storage cost per GB per month
	StoragePerGBMonth float64
	// Network egress cost per GB
	NetworkEgressPerGB float64
	// Spot/Preemptible discount factor (0.7 = 70% discount)
	SpotDiscount float64
	// Instance type pricing (optional, for more accurate estimates)
	InstancePricing map[string]float64
	// Spot instance pricing
	SpotPricing map[string]float64
	// Control plane cost per hour (for managed Kubernetes)
	ControlPlaneCostPerHour float64
}

// RegionMultiplier represents pricing multipliers for different regions
type RegionMultiplier struct {
	Region     string
	Multiplier float64 // Multiplier relative to base region (usually us-east-1 or us-central1)
}
