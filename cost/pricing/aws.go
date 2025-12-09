// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package pricing

// AWSPricingTable returns AWS pricing based on region
// Pricing is based on actual AWS EC2 on-demand pricing (as of 2024)
// Reference: https://aws.amazon.com/ec2/pricing/on-demand/
func AWSPricingTable(region string) *PricingTable {
	// Base pricing for us-east-1 (N. Virginia)
	baseCPUPerCoreHour := 0.048    // Based on m5/m6i instances ($0.096/hour for 2 vCPUs)
	baseMemoryPerGBHour := 0.006   // Based on m5.large: $0.096/8GB = $0.012/GB, but accounting for CPU overhead
	baseStoragePerGBMonth := 0.10  // gp3 SSD storage
	baseNetworkEgressPerGB := 0.09 // First 10TB free, then $0.09/GB

	// Apply region multiplier
	multiplier := getAWSRegionMultiplier(region)
	cpuPerCoreHour := baseCPUPerCoreHour * multiplier
	memoryPerGBHour := baseMemoryPerGBHour * multiplier

	// EKS control plane cost: $0.10/hour per cluster
	controlPlaneCostPerHour := 0.10

	return &PricingTable{
		Provider:                "AWS",
		Region:                  region,
		CPUPerCoreHour:          cpuPerCoreHour,
		MemoryPerGBHour:         memoryPerGBHour,
		StoragePerGBMonth:       baseStoragePerGBMonth,
		NetworkEgressPerGB:      baseNetworkEgressPerGB,
		SpotDiscount:            0.70, // ~70% discount for spot instances
		ControlPlaneCostPerHour: controlPlaneCostPerHour,
		InstancePricing: map[string]float64{
			// m5 series (us-east-1 pricing)
			"m5.large":    0.096,
			"m5.xlarge":   0.192,
			"m5.2xlarge":  0.384,
			"m5.4xlarge":  0.768,
			"m5.8xlarge":  1.536,
			"m5.12xlarge": 2.304,
			"m5.16xlarge": 3.072,
			"m5.24xlarge": 4.608,
			// m6i series (us-east-1 pricing)
			"m6i.large":    0.096,
			"m6i.xlarge":   0.192,
			"m6i.2xlarge":  0.384,
			"m6i.4xlarge":  0.768,
			"m6i.8xlarge":  1.536,
			"m6i.12xlarge": 2.304,
			"m6i.16xlarge": 3.072,
			"m6i.24xlarge": 4.608,
			// t3 series (burstable)
			"t3.micro":   0.0104,
			"t3.small":   0.0208,
			"t3.medium":  0.0416,
			"t3.large":   0.0832,
			"t3.xlarge":  0.1664,
			"t3.2xlarge": 0.3328,
			// c5 series (compute optimized)
			"c5.large":   0.085,
			"c5.xlarge":  0.17,
			"c5.2xlarge": 0.34,
			"c5.4xlarge": 0.68,
			"c5.9xlarge": 1.53,
			// c6i series
			"c6i.large":   0.085,
			"c6i.xlarge":  0.17,
			"c6i.2xlarge": 0.34,
			"c6i.4xlarge": 0.68,
			// r5 series (memory optimized)
			"r5.large":   0.126,
			"r5.xlarge":  0.252,
			"r5.2xlarge": 0.504,
			"r5.4xlarge": 1.008,
		},
		SpotPricing: map[string]float64{
			// Spot instances typically 60-90% discount, using ~70% average
			"m5.large":    0.029,
			"m5.xlarge":   0.058,
			"m5.2xlarge":  0.115,
			"m6i.large":   0.029,
			"m6i.xlarge":  0.058,
			"m6i.2xlarge": 0.115,
			"t3.medium":   0.0125,
			"t3.large":    0.025,
			"c5.large":    0.026,
			"c5.xlarge":   0.051,
			"r5.large":    0.038,
			"r5.xlarge":   0.076,
		},
	}
}

// getAWSRegionMultiplier returns pricing multiplier for AWS regions
// Based on actual AWS pricing variations across regions
func getAWSRegionMultiplier(region string) float64 {
	multipliers := map[string]float64{
		// US regions
		"us-east-1": 1.00, // Base (N. Virginia)
		"us-east-2": 1.00, // Ohio
		"us-west-1": 1.00, // N. California
		"us-west-2": 1.00, // Oregon
		// Europe
		"eu-west-1":    1.00, // Ireland
		"eu-west-2":    1.00, // London
		"eu-west-3":    1.00, // Paris
		"eu-central-1": 1.00, // Frankfurt
		"eu-north-1":   0.95, // Stockholm (slightly cheaper)
		"eu-south-1":   1.00, // Milan
		// Asia Pacific
		"ap-southeast-1": 1.00, // Singapore
		"ap-southeast-2": 1.00, // Sydney
		"ap-northeast-1": 1.00, // Tokyo
		"ap-northeast-2": 1.00, // Seoul
		"ap-south-1":     0.95, // Mumbai (slightly cheaper)
		// Middle East
		"me-south-1": 1.00, // Bahrain
		// South America
		"sa-east-1": 1.00, // São Paulo
		// Canada
		"ca-central-1": 1.00, // Canada Central
		// Africa
		"af-south-1": 1.00, // Cape Town
	}

	if multiplier, ok := multipliers[region]; ok {
		return multiplier
	}
	// Default to base pricing for unknown regions
	return 1.00
}
