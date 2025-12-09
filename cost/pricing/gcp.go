// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package pricing

// GCPPricingTable returns GCP pricing based on region
// Pricing is based on actual GCP Compute Engine pricing (as of 2024)
// Reference: https://cloud.google.com/compute/vm-instance-pricing
func GCPPricingTable(region string) *PricingTable {
	// Base pricing for us-central1 (Iowa)
	// E2-standard-2: 2 vCPUs, 8GB RAM = $0.06701/hour = $0.0335/vCPU/hour
	baseCPUPerCoreHour := 0.0335   // E2 series (most common for GKE)
	baseMemoryPerGBHour := 0.0042  // E2-standard-2: $0.06701/8GB = $0.0084/GB, adjusted for overhead
	baseStoragePerGBMonth := 0.088 // pd-balanced SSD
	baseNetworkEgressPerGB := 0.12 // Internet egress (varies by region)

	// Apply region multiplier
	multiplier := getGCPRegionMultiplier(region)
	cpuPerCoreHour := baseCPUPerCoreHour * multiplier
	memoryPerGBHour := baseMemoryPerGBHour * multiplier

	// GKE control plane: Free for standard clusters, $0.10/hour for Autopilot
	// We'll use $0.00 as default (standard GKE is free)
	controlPlaneCostPerHour := 0.00

	return &PricingTable{
		Provider:                "GCP",
		Region:                  region,
		CPUPerCoreHour:          cpuPerCoreHour,
		MemoryPerGBHour:         memoryPerGBHour,
		StoragePerGBMonth:       baseStoragePerGBMonth,
		NetworkEgressPerGB:      baseNetworkEgressPerGB,
		SpotDiscount:            0.70, // ~70% discount for preemptible instances
		ControlPlaneCostPerHour: controlPlaneCostPerHour,
		InstancePricing: map[string]float64{
			// E2 series (us-central1 pricing)
			"e2-micro":       0.00838,
			"e2-small":       0.01675,
			"e2-medium":      0.03351,
			"e2-standard-2":  0.06701,
			"e2-standard-4":  0.13403,
			"e2-standard-8":  0.26805,
			"e2-standard-16": 0.53611,
			"e2-standard-32": 1.07222,
			// E2 highmem
			"e2-highmem-2":  0.09044,
			"e2-highmem-4":  0.18088,
			"e2-highmem-8":  0.36176,
			"e2-highmem-16": 0.72352,
			// E2 highcpu
			"e2-highcpu-2":  0.04953,
			"e2-highcpu-4":  0.09907,
			"e2-highcpu-8":  0.19814,
			"e2-highcpu-16": 0.39628,
			// T2D series (AMD EPYC)
			"t2d-standard-1":  0.04234,
			"t2d-standard-2":  0.08467,
			"t2d-standard-4":  0.16935,
			"t2d-standard-8":  0.33869,
			"t2d-standard-16": 0.67739,
			// N2 series (Intel)
			"n2-standard-2":  0.09712,
			"n2-standard-4":  0.19425,
			"n2-standard-8":  0.38849,
			"n2-standard-16": 0.77698,
			"n2-standard-32": 1.55396,
			"n2-highmem-2":   0.13112,
			"n2-highmem-4":   0.26225,
			"n2-highcpu-2":   0.07182,
			"n2-highcpu-4":   0.14364,
			// N1 series (legacy)
			"n1-standard-1": 0.04749,
			"n1-standard-2": 0.09499,
			"n1-standard-4": 0.18997,
			"n1-standard-8": 0.37994,
		},
		SpotPricing: map[string]float64{
			// Preemptible instances typically 60-80% discount
			"e2-standard-2":  0.02010, // ~70% off
			"e2-standard-4":  0.04021,
			"e2-standard-8":  0.08042,
			"t2d-standard-1": 0.01270, // ~70% off
			"t2d-standard-2": 0.02540,
			"t2d-standard-4": 0.05081,
			"n2-standard-2":  0.02914, // ~70% off
			"n2-standard-4":  0.05827,
		},
	}
}

// getGCPRegionMultiplier returns pricing multiplier for GCP regions
func getGCPRegionMultiplier(region string) float64 {
	multipliers := map[string]float64{
		// US regions
		"us-central1": 1.00, // Base (Iowa)
		"us-east1":    1.00, // South Carolina
		"us-east4":    1.00, // N. Virginia
		"us-west1":    1.00, // Oregon
		"us-west2":    1.00, // Los Angeles
		"us-west3":    1.00, // Salt Lake City
		"us-west4":    1.00, // Las Vegas
		// Europe
		"europe-west1":  1.00, // Belgium
		"europe-west2":  1.00, // London
		"europe-west3":  1.00, // Frankfurt
		"europe-west4":  1.00, // Netherlands
		"europe-west6":  1.00, // Zurich
		"europe-north1": 0.95, // Finland (slightly cheaper)
		// Asia Pacific
		"asia-east1":           1.00, // Taiwan
		"asia-northeast1":      1.00, // Tokyo
		"asia-northeast2":      1.00, // Osaka
		"asia-northeast3":      1.00, // Seoul
		"asia-south1":          0.95, // Mumbai (slightly cheaper)
		"asia-southeast1":      1.00, // Singapore
		"asia-southeast2":      1.00, // Jakarta
		"australia-southeast1": 1.00, // Sydney
		"australia-southeast2": 1.00, // Melbourne
		// South America
		"southamerica-east1": 1.00, // São Paulo
		// Middle East
		"me-west1": 1.00, // Tel Aviv
		// Canada
		"northamerica-northeast1": 1.00, // Montreal
	}

	if multiplier, ok := multipliers[region]; ok {
		return multiplier
	}
	// Default to base pricing for unknown regions
	return 1.00
}
