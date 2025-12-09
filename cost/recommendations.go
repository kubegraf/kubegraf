// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CostRecommendation represents a cost optimization recommendation
type CostRecommendation struct {
	Type        string  `json:"type"`        // "spot_instances", "right_sizing", "idle_resources", etc.
	Title       string  `json:"title"`       // Short title
	Description string  `json:"description"` // Detailed description
	Impact      string  `json:"impact"`      // "high", "medium", "low"
	Savings     float64 `json:"savings"`     // Estimated monthly savings in USD
	Action      string  `json:"action"`      // Recommended action
	Priority    int     `json:"priority"`    // 1-10, higher is more important
}

// GetCostRecommendations analyzes the cluster and returns cost optimization recommendations
func (c *CostEstimator) GetCostRecommendations(ctx context.Context) ([]CostRecommendation, error) {
	var recommendations []CostRecommendation

	// Get cluster cost data
	clusterCost, err := c.EstimateClusterCost(ctx)
	if err != nil {
		return recommendations, err
	}

	// Get nodes to analyze spot instance usage
	nodes, err := c.app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return recommendations, err
	}

	// Analyze spot instance usage
	spotRecommendation := c.analyzeSpotInstanceUsage(nodes.Items, clusterCost)
	if spotRecommendation != nil {
		recommendations = append(recommendations, *spotRecommendation)
	}

	// Analyze idle resources
	idleRecommendation := c.analyzeIdleResources(ctx, clusterCost)
	if idleRecommendation != nil {
		recommendations = append(recommendations, *idleRecommendation)
	}

	return recommendations, nil
}

// analyzeSpotInstanceUsage checks if spot instances are being used and recommends them if not
func (c *CostEstimator) analyzeSpotInstanceUsage(nodes []corev1.Node, clusterCost *ClusterCost) *CostRecommendation {
	if c.pricing == nil || clusterCost == nil {
		return nil
	}

	totalNodes := len(nodes)
	if totalNodes == 0 {
		return nil
	}

	// Count spot and on-demand nodes
	spotNodes := 0
	onDemandNodes := 0
	var totalNodeCost float64
	var spotNodeCost float64

	for _, node := range nodes {
		isSpot := c.isNodeSpotInstance(&node)
		cpu := node.Status.Capacity.Cpu()
		mem := node.Status.Capacity.Memory()
		cpuCores := float64(cpu.MilliValue()) / 1000
		memGB := float64(mem.Value()) / (1024 * 1024 * 1024)

		nodeHourlyCost := c.calculateHourlyCost(cpuCores, memGB, 0)
		totalNodeCost += nodeHourlyCost

		if isSpot {
			spotNodes++
			// Calculate spot cost (apply discount)
			spotNodeCost += nodeHourlyCost * (1 - c.pricing.SpotDiscount)
		} else {
			onDemandNodes++
		}
	}

	// Calculate current spot percentage
	spotPercentage := float64(spotNodes) / float64(totalNodes) * 100

	// Recommend if spot usage is less than 30%
	if spotPercentage < 30 && totalNodes >= 2 {
		// Calculate potential savings by converting 30-50% of on-demand nodes to spot
		recommendedSpotPercentage := 40.0 // Use 40% as middle ground
		nodesToConvert := int(float64(onDemandNodes) * recommendedSpotPercentage / 100)
		if nodesToConvert < 1 {
			nodesToConvert = 1
		}

		// Calculate average node cost
		avgNodeCost := totalNodeCost / float64(totalNodes)

		// Calculate savings per converted node
		savingsPerNodePerHour := avgNodeCost * c.pricing.SpotDiscount
		totalSavingsPerHour := savingsPerNodePerHour * float64(nodesToConvert)
		monthlySavings := totalSavingsPerHour * 730

		// Determine impact based on savings
		impact := "medium"
		if monthlySavings > 500 {
			impact = "high"
		} else if monthlySavings < 100 {
			impact = "low"
		}

		return &CostRecommendation{
			Type:        "spot_instances",
			Title:       "Use Spot Instances to Reduce Costs",
			Description: fmt.Sprintf("Currently using %.0f%% spot instances. Convert %d on-demand nodes (%.0f%% of cluster) to spot instances to save approximately $%.2f/month. Spot instances offer up to %.0f%% discount but can be interrupted.", spotPercentage, nodesToConvert, recommendedSpotPercentage, monthlySavings, c.pricing.SpotDiscount*100),
			Impact:      impact,
			Savings:     monthlySavings,
			Action:      fmt.Sprintf("Convert %d on-demand nodes to spot instances. Recommended spot instance percentage: 30-50%% for production workloads.", nodesToConvert),
			Priority:    8, // High priority
		}
	}

	// If already using spot but could use more
	if spotPercentage >= 30 && spotPercentage < 50 && totalNodes >= 3 {
		recommendedSpotPercentage := 50.0
		nodesToConvert := int(float64(onDemandNodes) * (recommendedSpotPercentage - spotPercentage) / 100)
		if nodesToConvert >= 1 {
			avgNodeCost := totalNodeCost / float64(totalNodes)
			savingsPerNodePerHour := avgNodeCost * c.pricing.SpotDiscount
			totalSavingsPerHour := savingsPerNodePerHour * float64(nodesToConvert)
			monthlySavings := totalSavingsPerHour * 730

			impact := "medium"
			if monthlySavings > 300 {
				impact = "high"
			} else if monthlySavings < 50 {
				impact = "low"
			}

			return &CostRecommendation{
				Type:        "spot_instances",
				Title:       "Increase Spot Instance Usage",
				Description: fmt.Sprintf("Currently using %.0f%% spot instances. Increase to %.0f%% by converting %d more nodes to spot instances for additional savings of $%.2f/month.", spotPercentage, recommendedSpotPercentage, nodesToConvert, monthlySavings),
				Impact:      impact,
				Savings:     monthlySavings,
				Action:      fmt.Sprintf("Convert %d additional on-demand nodes to spot instances to reach %.0f%% spot usage.", nodesToConvert, recommendedSpotPercentage),
				Priority:    6, // Medium-high priority
			}
		}
	}

	return nil
}

// analyzeIdleResources checks for idle resources and recommends right-sizing
func (c *CostEstimator) analyzeIdleResources(ctx context.Context, clusterCost *ClusterCost) *CostRecommendation {
	if clusterCost == nil {
		return nil
	}

	// Get idle resources
	idleResources, err := c.FindIdleResources(ctx)
	if err != nil {
		return nil
	}

	if len(idleResources) == 0 {
		return nil
	}

	// Calculate total wasted cost
	totalWastedCost := 0.0
	for _, resource := range idleResources {
		totalWastedCost += resource.WastedCost
	}

	monthlyWastedCost := totalWastedCost * 730

	if monthlyWastedCost > 10 { // Only recommend if significant waste
		impact := "medium"
		if monthlyWastedCost > 200 {
			impact = "high"
		} else if monthlyWastedCost < 50 {
			impact = "low"
		}

		return &CostRecommendation{
			Type:        "idle_resources",
			Title:       "Right-Size Underutilized Resources",
			Description: fmt.Sprintf("Found %d resources with low utilization. Right-sizing these resources could save approximately $%.2f/month.", len(idleResources), monthlyWastedCost),
			Impact:      impact,
			Savings:     monthlyWastedCost,
			Action:      fmt.Sprintf("Review and adjust resource requests/limits for %d underutilized resources.", len(idleResources)),
			Priority:    7, // High priority
		}
	}

	return nil
}
