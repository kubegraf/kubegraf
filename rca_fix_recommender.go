// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
)

// FixRecommender provides fix suggestions for incidents
type FixRecommender struct {
	app *App
}

// NewFixRecommender creates a new fix recommender
func NewFixRecommender(app *App) *FixRecommender {
	return &FixRecommender{
		app: app,
	}
}

// RecommendFixes generates fix suggestions based on the RCA
func (fr *FixRecommender) RecommendFixes(rca *RootCauseAnalysis) []FixSuggestion {
	if rca.CorrelationResult == nil {
		return []FixSuggestion{}
	}

	pattern := rca.CorrelationResult.CorrelationPattern

	switch pattern {
	case PatternNodePreemption:
		return fr.recommendNodePreemptionFixes(rca)
	case PatternGracefulShutdownFail:
		return fr.recommendGracefulShutdownFixes(rca)
	case PatternOOMKill:
		return fr.recommendOOMKillFixes(rca)
	case PatternDBConnectionFailure:
		return fr.recommendDBConnectionFixes(rca)
	case PatternDNSFailure:
		return fr.recommendDNSFailureFixes(rca)
	case PatternSchedulingFailure:
		return fr.recommendSchedulingFailureFixes(rca)
	case PatternImagePullFailure:
		return fr.recommendImagePullFixes(rca)
	case PatternCrashLoop:
		return fr.recommendCrashLoopFixes(rca)
	default:
		return fr.recommendGenericFixes(rca)
	}
}

// recommendNodePreemptionFixes recommends fixes for node preemption
func (fr *FixRecommender) recommendNodePreemptionFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	// Check if this was a spot/preemptible node
	isSpot := false
	if rca.CorrelationResult != nil && rca.CorrelationResult.PrimaryTrigger != nil {
		if metadata, ok := rca.CorrelationResult.PrimaryTrigger.Metadata["taintKey"].(string); ok {
			if containsString(metadata, "preempt") || containsString(metadata, "spot") {
				isSpot = true
			}
		}
	}

	if isSpot {
		fixes = append(fixes, FixSuggestion{
			ID:       "node-preempt-pdb",
			Title:    "Add PodDisruptionBudget",
			Priority: "high",
			Category: "deployment",
			Description: "Create a PodDisruptionBudget to ensure minimum availability during disruptions. " +
				"This won't prevent spot terminations but will help maintain service availability.",
			Reasoning: "PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions, " +
				"reducing the impact of node preemptions.",
			Actions: []string{
				"Create a PodDisruptionBudget for your workload",
				"Set minAvailable to at least 1 (or higher based on your needs)",
				"Apply the PDB to your namespace",
			},
			Risk: "low",
		})

		fixes = append(fixes, FixSuggestion{
			ID:       "node-preempt-nonspot",
			Title:    "Move critical workloads off spot/preemptible nodes",
			Priority: "medium",
			Category: "deployment",
			Description: "For critical workloads that cannot tolerate interruptions, use node selectors or affinity rules " +
				"to schedule pods on non-preemptible nodes.",
			Reasoning: "Spot/preemptible nodes can be terminated with minimal notice. Critical workloads should run on " +
				"standard nodes for reliability.",
			Actions: []string{
				"Identify critical workloads that need high availability",
				"Add nodeSelector or nodeAffinity to avoid spot nodes",
				"Example: Add 'cloud.google.com/gke-preemptible: \"false\"' to nodeSelector",
			},
			Risk: "low",
		})

		fixes = append(fixes, FixSuggestion{
			ID:       "node-preempt-replicas",
			Title:    "Increase replica count",
			Priority: "medium",
			Category: "deployment",
			Description: "Run multiple replicas to ensure service availability when individual pods are terminated.",
			Reasoning: "Multiple replicas provide redundancy, so service continues even when some pods are terminated.",
			Actions: []string{
				"Increase replicas in your Deployment/StatefulSet spec",
				"Recommended minimum: 3 replicas for high availability",
				"Ensure replicas are spread across multiple nodes",
			},
			Risk: "low",
		})
	}

	fixes = append(fixes, FixSuggestion{
		ID:       "node-preempt-monitoring",
		Title:    "Set up spot termination monitoring",
		Priority: "low",
		Category: "monitoring",
		Description: "Monitor spot instance termination notices to be proactive about handling preemptions.",
		Reasoning: "Cloud providers send termination notices before preempting spot instances. " +
			"Monitoring these allows for graceful handling.",
		Actions: []string{
			"Deploy node-termination-handler or similar tool",
			"Configure alerts for node termination events",
			"Consider draining nodes gracefully before termination",
		},
		Risk: "low",
	})

	return fixes
}

// recommendGracefulShutdownFixes recommends fixes for graceful shutdown failures
func (fr *FixRecommender) recommendGracefulShutdownFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	currentGracePeriod := int64(30)
	if rca.CorrelationResult != nil && rca.CorrelationResult.PrimaryTrigger != nil {
		if meta, ok := rca.CorrelationResult.PrimaryTrigger.Metadata["terminationGracePeriod"].(int64); ok {
			currentGracePeriod = meta
		}
	}

	recommendedGracePeriod := currentGracePeriod * 2
	if recommendedGracePeriod > 300 {
		recommendedGracePeriod = 300 // Cap at 5 minutes
	}

	fixes = append(fixes, FixSuggestion{
		ID:       "graceful-shutdown-grace-period",
		Title:    "Increase terminationGracePeriodSeconds",
		Priority: "high",
		Category: "configuration",
		Description: fmt.Sprintf(
			"Increase the termination grace period from %d to %d seconds to allow the application more time to shut down gracefully.",
			currentGracePeriod, recommendedGracePeriod,
		),
		Reasoning: "The current grace period is insufficient for the application to complete its shutdown sequence. " +
			"Increasing it prevents force-kills and ensures clean shutdowns.",
		Actions: []string{
			fmt.Sprintf("Update pod spec: terminationGracePeriodSeconds: %d", recommendedGracePeriod),
			"Test the change in a non-production environment first",
			"Monitor shutdown times to ensure the new value is sufficient",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "graceful-shutdown-sigterm",
		Title:    "Ensure application handles SIGTERM correctly",
		Priority: "high",
		Category: "application",
		Description: "Verify that the application properly handles SIGTERM signals and initiates graceful shutdown.",
		Reasoning: "Applications must trap SIGTERM and perform cleanup operations like closing connections, " +
			"flushing buffers, and completing in-flight requests.",
		Actions: []string{
			"Review application code for SIGTERM signal handling",
			"Implement graceful shutdown logic if missing",
			"Common patterns: close HTTP server, drain worker queues, close DB connections",
			"Test shutdown behavior locally with 'kill -SIGTERM <pid>'",
		},
		Risk: "medium",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "graceful-shutdown-prestop",
		Title:    "Add or optimize preStop hook",
		Priority: "medium",
		Category: "configuration",
		Description: "Use a preStop hook to perform cleanup operations before SIGTERM is sent.",
		Reasoning: "preStop hooks run before the container receives SIGTERM, allowing for preparation time " +
			"(e.g., deregistering from load balancers, completing requests).",
		Actions: []string{
			"Add preStop hook to container lifecycle",
			"Example: sleep for a few seconds to allow load balancer to deregister",
			"Ensure preStop hook duration + shutdown time < terminationGracePeriod",
		},
		Risk: "low",
	})

	return fixes
}

// recommendOOMKillFixes recommends fixes for OOM kill scenarios
func (fr *FixRecommender) recommendOOMKillFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	fixes = append(fixes, FixSuggestion{
		ID:       "oom-increase-memory",
		Title:    "Increase memory limits",
		Priority: "high",
		Category: "resource",
		Description: "Increase the container's memory limit to accommodate the application's memory requirements.",
		Reasoning: "The container is exceeding its memory limit and being killed by the OOM killer. " +
			"Increasing the limit prevents OOM kills if the usage is legitimate.",
		Actions: []string{
			"Analyze actual memory usage patterns from metrics",
			"Increase memory limit by 50-100% above peak usage",
			"Example: Change 'memory: 512Mi' to 'memory: 1Gi'",
			"Also increase memory requests to match or be slightly lower",
			"Monitor after deployment to ensure the new limit is sufficient",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "oom-investigate-leak",
		Title:    "Investigate potential memory leak",
		Priority: "high",
		Category: "application",
		Description: "Analyze the application for memory leaks that could be causing unbounded memory growth.",
		Reasoning: "If memory usage grows continuously until OOM, the application likely has a memory leak. " +
			"Fixing the leak is more sustainable than increasing limits.",
		Actions: []string{
			"Profile memory usage over time in a test environment",
			"Look for continuously growing memory patterns",
			"Common causes: unclosed connections, unbounded caches, circular references",
			"Use profiling tools specific to your language (e.g., pprof for Go, memory profiler for Python)",
		},
		Risk: "medium",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "oom-optimize-memory",
		Title:    "Optimize memory usage",
		Priority: "medium",
		Category: "application",
		Description: "Review and optimize the application's memory usage patterns.",
		Reasoning: "Even without leaks, applications can be optimized to use memory more efficiently.",
		Actions: []string{
			"Implement pagination for large data sets",
			"Add size limits to in-memory caches",
			"Stream large files instead of loading entirely into memory",
			"Review data structures for memory efficiency",
		},
		Risk: "medium",
	})

	return fixes
}

// recommendDBConnectionFixes recommends fixes for database connection failures
func (fr *FixRecommender) recommendDBConnectionFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	fixes = append(fixes, FixSuggestion{
		ID:       "db-connection-retry",
		Title:    "Implement retry logic with exponential backoff",
		Priority: "high",
		Category: "application",
		Description: "Add retry logic to database connection attempts to handle temporary unavailability.",
		Reasoning: "Databases may be temporarily unavailable during startup, failover, or maintenance. " +
			"Retry logic makes the application more resilient to transient failures.",
		Actions: []string{
			"Implement exponential backoff retry strategy",
			"Start with short delays (e.g., 1s) and increase (2s, 4s, 8s, etc.)",
			"Set a maximum retry duration (e.g., 60 seconds)",
			"Log each retry attempt for debugging",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "db-connection-config",
		Title:    "Verify database connection configuration",
		Priority: "high",
		Category: "configuration",
		Description: "Check that database connection strings, credentials, and service names are correct.",
		Reasoning: "Incorrect configuration is a common cause of connection failures.",
		Actions: []string{
			"Verify database hostname/service name is correct",
			"Check that credentials (username/password) are valid",
			"Ensure ConfigMaps and Secrets are properly mounted",
			"Verify database is running and accessible",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "db-connection-network-policy",
		Title:    "Check network policies",
		Priority: "medium",
		Category: "configuration",
		Description: "Verify that network policies allow traffic from the application to the database.",
		Reasoning: "Network policies may be blocking database connections.",
		Actions: []string{
			"List network policies affecting your namespace",
			"Ensure egress rules allow traffic to database port",
			"Check that database namespace allows ingress from your namespace",
			"Test connectivity with a debug pod: kubectl run test --image=busybox -it -- sh",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "db-connection-readiness",
		Title:    "Add readiness probe to wait for database",
		Priority: "medium",
		Category: "configuration",
		Description: "Configure readiness probe to mark pod as ready only after database connection succeeds.",
		Reasoning: "This prevents the pod from receiving traffic before it can handle requests.",
		Actions: []string{
			"Add readiness probe that checks database connectivity",
			"Set appropriate failureThreshold and periodSeconds",
			"Example: Use an HTTP endpoint that tests DB connection",
		},
		Risk: "low",
	})

	return fixes
}

// recommendDNSFailureFixes recommends fixes for DNS failures
func (fr *FixRecommender) recommendDNSFailureFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	fixes = append(fixes, FixSuggestion{
		ID:       "dns-verify-service",
		Title:    "Verify service names are correct",
		Priority: "high",
		Category: "configuration",
		Description: "Check that the application is using correct Kubernetes service names for DNS resolution.",
		Reasoning: "Incorrect service names are a common cause of DNS failures.",
		Actions: []string{
			"Verify service names match Kubernetes Service resources",
			"Use FQDN format: <service>.<namespace>.svc.cluster.local",
			"For same namespace: just <service> is sufficient",
			"Check for typos in service names",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "dns-coredns-health",
		Title:    "Check CoreDNS health",
		Priority: "high",
		Category: "configuration",
		Description: "Verify that CoreDNS pods are running and healthy.",
		Reasoning: "CoreDNS handles all DNS resolution in Kubernetes. If it's unhealthy, DNS will fail.",
		Actions: []string{
			"Check CoreDNS pods: kubectl get pods -n kube-system -l k8s-app=kube-dns",
			"View CoreDNS logs: kubectl logs -n kube-system -l k8s-app=kube-dns",
			"Restart CoreDNS if necessary: kubectl rollout restart deployment/coredns -n kube-system",
		},
		Risk: "medium",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "dns-network-policy",
		Title:    "Ensure network policies allow DNS traffic",
		Priority: "medium",
		Category: "configuration",
		Description: "Verify that network policies allow egress to CoreDNS (UDP/TCP port 53).",
		Reasoning: "Network policies may be blocking DNS queries to CoreDNS.",
		Actions: []string{
			"Check network policies in your namespace",
			"Ensure egress to kube-system namespace on port 53 is allowed",
			"Add DNS egress rule if missing",
		},
		Risk: "low",
	})

	return fixes
}

// recommendSchedulingFailureFixes recommends fixes for scheduling failures
func (fr *FixRecommender) recommendSchedulingFailureFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	fixes = append(fixes, FixSuggestion{
		ID:       "scheduling-increase-resources",
		Title:    "Add more nodes or increase node capacity",
		Priority: "high",
		Category: "resource",
		Description: "Increase cluster capacity to accommodate the workload's resource requirements.",
		Reasoning: "The cluster doesn't have sufficient resources to schedule the pod.",
		Actions: []string{
			"Enable cluster autoscaling if not already enabled",
			"Manually add nodes to the cluster",
			"Consider using larger node instance types",
			"Review resource requests to ensure they're not unnecessarily high",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "scheduling-adjust-requests",
		Title:    "Reduce resource requests",
		Priority: "medium",
		Category: "resource",
		Description: "Lower CPU/memory requests if they're higher than actual usage.",
		Reasoning: "Over-provisioned requests can prevent scheduling even when actual usage would fit.",
		Actions: []string{
			"Analyze actual resource usage from metrics",
			"Reduce requests to match actual usage patterns",
			"Keep limits higher than requests for bursting",
			"Example: Change 'cpu: 2' to 'cpu: 500m' if actual usage is lower",
		},
		Risk: "medium",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "scheduling-affinity",
		Title:    "Review affinity and anti-affinity rules",
		Priority: "medium",
		Category: "configuration",
		Description: "Check if affinity rules are too restrictive and preventing scheduling.",
		Reasoning: "Overly strict affinity rules can make pods unschedulable.",
		Actions: []string{
			"Review nodeAffinity rules in pod spec",
			"Consider using preferredDuringSchedulingIgnoredDuringExecution instead of required",
			"Check if podAntiAffinity is too restrictive",
			"Ensure sufficient nodes match affinity selectors",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "scheduling-tolerations",
		Title:    "Add tolerations for node taints",
		Priority: "medium",
		Category: "configuration",
		Description: "Add tolerations to allow scheduling on tainted nodes.",
		Reasoning: "Nodes may have taints that prevent scheduling without matching tolerations.",
		Actions: []string{
			"Check node taints: kubectl describe nodes | grep Taints",
			"Add matching tolerations to pod spec",
			"Example: tolerate NoSchedule taint for specific node types",
		},
		Risk: "low",
	})

	return fixes
}

// recommendImagePullFixes recommends fixes for image pull failures
func (fr *FixRecommender) recommendImagePullFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	fixes = append(fixes, FixSuggestion{
		ID:       "imagepull-verify-name",
		Title:    "Verify image name and tag",
		Priority: "high",
		Category: "configuration",
		Description: "Check that the container image name and tag are correct.",
		Reasoning: "Typos or incorrect tags are common causes of image pull failures.",
		Actions: []string{
			"Verify image name spelling",
			"Check that the tag exists in the registry",
			"Avoid using 'latest' tag in production",
			"Test pulling the image locally: docker pull <image>",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "imagepull-credentials",
		Title:    "Configure image pull secrets",
		Priority: "high",
		Category: "configuration",
		Description: "Add image pull secrets for private container registries.",
		Reasoning: "Private registries require authentication credentials.",
		Actions: []string{
			"Create image pull secret: kubectl create secret docker-registry",
			"Add imagePullSecrets to pod spec",
			"Verify credentials are correct",
			"Check secret exists in the same namespace as the pod",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "imagepull-network",
		Title:    "Check network connectivity to registry",
		Priority: "medium",
		Category: "configuration",
		Description: "Verify that nodes can reach the container registry.",
		Reasoning: "Network issues or firewall rules may block registry access.",
		Actions: []string{
			"Test connectivity from a node to the registry",
			"Check firewall rules and security groups",
			"Verify network policies allow egress to registry",
			"Consider using a pull-through cache for reliability",
		},
		Risk: "low",
	})

	return fixes
}

// recommendCrashLoopFixes recommends fixes for crash loop scenarios
func (fr *FixRecommender) recommendCrashLoopFixes(rca *RootCauseAnalysis) []FixSuggestion {
	fixes := []FixSuggestion{}

	fixes = append(fixes, FixSuggestion{
		ID:       "crashloop-logs",
		Title:    "Analyze container logs for root cause",
		Priority: "high",
		Category: "application",
		Description: "Examine container logs to identify the specific error causing the crash.",
		Reasoning: "Crash loops are symptoms - the logs contain the actual root cause.",
		Actions: []string{
			"View logs: kubectl logs <pod> -c <container>",
			"Check previous container logs: kubectl logs <pod> -c <container> --previous",
			"Look for error messages, stack traces, or exceptions",
			"Common issues: missing config, dependency failures, unhandled exceptions",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "crashloop-config",
		Title:    "Verify configuration and secrets",
		Priority: "high",
		Category: "configuration",
		Description: "Ensure all required ConfigMaps and Secrets are properly mounted and contain correct values.",
		Reasoning: "Missing or incorrect configuration is a common cause of startup failures.",
		Actions: []string{
			"List ConfigMaps: kubectl get configmaps",
			"List Secrets: kubectl get secrets",
			"Verify volumeMounts in pod spec match ConfigMap/Secret names",
			"Check that environment variables reference correct keys",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "crashloop-startup-probe",
		Title:    "Add or adjust startup probe",
		Priority: "medium",
		Category: "configuration",
		Description: "Configure startup probe to give the application more time to initialize.",
		Reasoning: "Liveness probe may be killing the container before it finishes starting.",
		Actions: []string{
			"Add startup probe with generous failureThreshold",
			"Example: failureThreshold: 30, periodSeconds: 10 = 5 minutes",
			"Keep liveness probe strict after startup succeeds",
		},
		Risk: "low",
	})

	fixes = append(fixes, FixSuggestion{
		ID:       "crashloop-dependencies",
		Title:    "Check dependency availability",
		Priority: "medium",
		Category: "application",
		Description: "Verify that all external dependencies (databases, APIs, etc.) are accessible.",
		Reasoning: "Applications may crash if required dependencies are unavailable at startup.",
		Actions: []string{
			"Test connectivity to dependencies",
			"Implement retry logic for transient failures",
			"Add health checks for dependencies",
			"Consider init containers to wait for dependencies",
		},
		Risk: "low",
	})

	return fixes
}

// recommendGenericFixes recommends generic fixes when pattern is unknown
func (fr *FixRecommender) recommendGenericFixes(rca *RootCauseAnalysis) []FixSuggestion {
	return []FixSuggestion{
		{
			ID:       "generic-logs",
			Title:    "Examine logs and events",
			Priority: "high",
			Category: "investigation",
			Description: "Review container logs and Kubernetes events for detailed error messages.",
			Reasoning: "Logs and events contain detailed information about what went wrong.",
			Actions: []string{
				"Check pod events: kubectl describe pod <pod>",
				"View container logs: kubectl logs <pod>",
				"Look for ERROR, WARN, or FATAL level messages",
			},
			Risk: "low",
		},
		{
			ID:       "generic-metrics",
			Title:    "Analyze resource metrics",
			Priority: "medium",
			Category: "investigation",
			Description: "Check CPU, memory, and other resource metrics around the time of the incident.",
			Reasoning: "Resource constraints may be the root cause.",
			Actions: []string{
				"View metrics in monitoring dashboard",
				"Check for resource limits being exceeded",
				"Look for correlation between resource usage and incidents",
			},
			Risk: "low",
		},
	}
}

// Note: containsString and findSubstring functions are defined in event_correlation.go
