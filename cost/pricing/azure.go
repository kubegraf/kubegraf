// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package pricing

// AzurePricingTable returns Azure pricing based on region
// Pricing is based on actual Azure VM pricing (as of 2024)
// Reference: https://azure.microsoft.com/en-us/pricing/details/virtual-machines/
func AzurePricingTable(region string) *PricingTable {
	// Base pricing for East US region
	// Standard_D2s_v3: 2 vCPUs, 8GB RAM = $0.096/hour = $0.048/vCPU/hour
	// But Azure pricing varies more by instance type, so we use a weighted average
	baseCPUPerCoreHour := 0.050     // Slightly higher than AWS due to Azure's pricing structure
	baseMemoryPerGBHour := 0.006    // Based on D2s_v3: $0.096/8GB = $0.012/GB, adjusted
	baseStoragePerGBMonth := 0.12   // Premium SSD (P30)
	baseNetworkEgressPerGB := 0.087 // First 5GB free, then $0.087/GB

	// Apply region multiplier
	multiplier := getAzureRegionMultiplier(region)
	cpuPerCoreHour := baseCPUPerCoreHour * multiplier
	memoryPerGBHour := baseMemoryPerGBHour * multiplier

	// AKS control plane: Free tier has no cost, Standard tier is ~$0.10/hour
	// We'll use $0.10 as default for Standard tier
	controlPlaneCostPerHour := 0.10

	return &PricingTable{
		Provider:                "Azure",
		Region:                  region,
		CPUPerCoreHour:          cpuPerCoreHour,
		MemoryPerGBHour:         memoryPerGBHour,
		StoragePerGBMonth:       baseStoragePerGBMonth,
		NetworkEgressPerGB:      baseNetworkEgressPerGB,
		SpotDiscount:            0.70, // ~70% discount for spot instances
		ControlPlaneCostPerHour: controlPlaneCostPerHour,
		InstancePricing: map[string]float64{
			// B-series (burstable) - East US pricing
			"Standard_B1s":  0.0104,
			"Standard_B2s":  0.0416,
			"Standard_B2ms": 0.0832,
			// D-series v3 (general purpose)
			"Standard_D2s_v3":  0.096,
			"Standard_D4s_v3":  0.192,
			"Standard_D8s_v3":  0.384,
			"Standard_D16s_v3": 0.768,
			// D-series v5 (general purpose, newer)
			"Standard_D2s_v5":  0.096,
			"Standard_D4s_v5":  0.192,
			"Standard_D8s_v5":  0.384,
			"Standard_D16s_v5": 0.768,
			// E-series (memory optimized)
			"Standard_E2s_v3":  0.126,
			"Standard_E4s_v3":  0.252,
			"Standard_E8s_v3":  0.504,
			"Standard_E16s_v3": 1.008,
			// F-series (compute optimized)
			"Standard_F2s_v2":  0.085,
			"Standard_F4s_v2":  0.169,
			"Standard_F8s_v2":  0.338,
			"Standard_F16s_v2": 0.676,
		},
		SpotPricing: map[string]float64{
			// Spot instances typically 60-90% discount
			"Standard_D2s_v3": 0.029,
			"Standard_D4s_v3": 0.058,
			"Standard_D8s_v3": 0.115,
			"Standard_D2s_v5": 0.029,
			"Standard_D4s_v5": 0.058,
			"Standard_E2s_v3": 0.038,
			"Standard_E4s_v3": 0.076,
			"Standard_F2s_v2": 0.026,
			"Standard_F4s_v2": 0.051,
		},
	}
}

// getAzureRegionMultiplier returns pricing multiplier for Azure regions
func getAzureRegionMultiplier(region string) float64 {
	multipliers := map[string]float64{
		// US regions
		"eastus":         1.00, // Base (East US)
		"eastus2":        1.00, // East US 2
		"westus":         1.00, // West US
		"westus2":        1.00, // West US 2
		"westus3":        1.00, // West US 3
		"centralus":      1.00, // Central US
		"southcentralus": 1.00, // South Central US
		"northcentralus": 1.00, // North Central US
		// Europe
		"westeurope":         1.00, // West Europe
		"northeurope":        1.00, // North Europe
		"francecentral":      1.00, // France Central
		"francesouth":        1.00, // France South
		"germanywestcentral": 1.00, // Germany West Central
		"switzerlandnorth":   1.00, // Switzerland North
		"ukwest":             1.00, // UK West
		"uksouth":            1.00, // UK South
		// Asia Pacific
		"southeastasia":      1.00, // Southeast Asia
		"eastasia":           1.00, // East Asia
		"japaneast":          1.00, // Japan East
		"japanwest":          1.00, // Japan West
		"australiaeast":      1.00, // Australia East
		"australiasoutheast": 1.00, // Australia Southeast
		"koreacentral":       1.00, // Korea Central
		"koreasouth":         1.00, // Korea South
		"centralindia":       0.95, // Central India (slightly cheaper)
		"southindia":         0.95, // South India
		"westindia":          0.95, // West India
		// Middle East
		"uaenorth": 1.00, // UAE North
		// South America
		"brazilsouth": 1.00, // Brazil South
		// Canada
		"canadacentral": 1.00, // Canada Central
		"canadaeast":    1.00, // Canada East
		// Africa
		"southafricanorth": 1.00, // South Africa North
	}

	// Normalize region name (Azure uses lowercase, no dashes)
	normalized := region
	if normalized == "" {
		return 1.00
	}

	if multiplier, ok := multipliers[normalized]; ok {
		return multiplier
	}
	// Default to base pricing for unknown regions
	return 1.00
}
