// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"sort"
)

// RecommendationEngine generates recommendations based on incidents.
type RecommendationEngine struct {
	generators map[FailurePattern]RecommendationGenerator
}

// RecommendationGenerator generates recommendations for a specific pattern.
type RecommendationGenerator interface {
	Generate(incident *Incident) []Recommendation
}

// NewRecommendationEngine creates a new recommendation engine.
func NewRecommendationEngine() *RecommendationEngine {
	engine := &RecommendationEngine{
		generators: make(map[FailurePattern]RecommendationGenerator),
	}

	// Register default generators
	engine.RegisterGenerator(PatternCrashLoop, &CrashLoopRecommender{})
	engine.RegisterGenerator(PatternOOMPressure, &OOMRecommender{})
	engine.RegisterGenerator(PatternRestartStorm, &RestartStormRecommender{})
	engine.RegisterGenerator(PatternNoReadyEndpoints, &NoEndpointsRecommender{})
	engine.RegisterGenerator(PatternInternalErrors, &InternalErrorsRecommender{})
	engine.RegisterGenerator(PatternUpstreamFailure, &UpstreamFailureRecommender{})
	engine.RegisterGenerator(PatternTimeouts, &TimeoutsRecommender{})
	engine.RegisterGenerator(PatternImagePullFailure, &ImagePullRecommender{})
	engine.RegisterGenerator(PatternConfigError, &ConfigErrorRecommender{})
	engine.RegisterGenerator(PatternSecretMissing, &SecretMissingRecommender{})
	engine.RegisterGenerator(PatternDNSFailure, &DNSFailureRecommender{})
	engine.RegisterGenerator(PatternLivenessFailure, &LivenessFailureRecommender{})
	engine.RegisterGenerator(PatternReadinessFailure, &ReadinessFailureRecommender{})
	engine.RegisterGenerator(PatternUnschedulable, &UnschedulableRecommender{})
	engine.RegisterGenerator(PatternResourceExhausted, &ResourceExhaustedRecommender{})

	return engine
}

// RegisterGenerator registers a recommendation generator for a pattern.
func (e *RecommendationEngine) RegisterGenerator(pattern FailurePattern, gen RecommendationGenerator) {
	e.generators[pattern] = gen
}

// GenerateRecommendations creates recommendations for an incident.
func (e *RecommendationEngine) GenerateRecommendations(incident *Incident) []Recommendation {
	generator, exists := e.generators[incident.Pattern]
	if !exists {
		return e.generateGenericRecommendations(incident)
	}

	recommendations := generator.Generate(incident)

	// Sort by priority
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].Priority < recommendations[j].Priority
	})

	// Assign IDs if not set
	for i := range recommendations {
		if recommendations[i].ID == "" {
			recommendations[i].ID = fmt.Sprintf("rec-%s-%d", incident.ID, i+1)
		}
	}

	return recommendations
}

// generateGenericRecommendations creates generic recommendations when no specific generator exists.
func (e *RecommendationEngine) generateGenericRecommendations(incident *Incident) []Recommendation {
	return []Recommendation{
		{
			ID:          fmt.Sprintf("rec-%s-1", incident.ID),
			Title:       "Investigate Pod Logs",
			Explanation: "Check pod logs for error messages and stack traces",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl logs %s -n %s --previous", incident.Resource.Name, incident.Resource.Namespace),
				fmt.Sprintf("kubectl describe pod %s -n %s", incident.Resource.Name, incident.Resource.Namespace),
			},
			Tags: []string{"investigation", "logs"},
		},
		{
			ID:          fmt.Sprintf("rec-%s-2", incident.ID),
			Title:       "Check Recent Events",
			Explanation: "Review Kubernetes events for the affected resource",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get events -n %s --field-selector involvedObject.name=%s",
					incident.Resource.Namespace, incident.Resource.Name),
			},
			Tags: []string{"investigation", "events"},
		},
	}
}

// CrashLoopRecommender generates recommendations for CrashLoopBackOff.
type CrashLoopRecommender struct{}

func (r *CrashLoopRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	recommendations := []Recommendation{
		{
			Title:       "Check Container Logs",
			Explanation: "Examine the logs from the previous container run to identify the crash cause",
			Evidence:    incident.Diagnosis.Evidence,
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl logs %s -n %s --previous", name, ns),
				fmt.Sprintf("kubectl logs %s -n %s -c <container-name> --previous", name, ns),
			},
			Tags: []string{"investigation", "logs"},
		},
		{
			Title:       "Validate Configuration",
			Explanation: "Ensure all required environment variables and configs are properly set",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl describe pod %s -n %s", name, ns),
				"Check environment variables in the pod spec",
				"Verify ConfigMaps and Secrets exist and have correct values",
			},
			Tags: []string{"configuration"},
		},
		{
			Title:       "Restart Deployment",
			Explanation: "If recent changes caused the issue, restart the deployment to pick up corrected configuration",
			Risk:        RiskMedium,
			Priority:    3,
			ProposedFix: &ProposedFix{
				Type:           FixTypeRestart,
				Description:    "Restart all pods in the deployment",
				TargetResource: getDeploymentRef(resource),
				DryRunCmd:      fmt.Sprintf("kubectl rollout restart deployment -n %s --dry-run=client", ns),
				ApplyCmd:       fmt.Sprintf("kubectl rollout restart deployment <deployment-name> -n %s", ns),
				Safe:           true,
				RequiresConfirmation: true,
			},
			Tags: []string{"remediation", "restart"},
		},
	}

	// Add OOM-specific recommendation if exit code 137 detected
	for _, s := range incident.Symptoms {
		if s.Type == SymptomExitCodeOOM {
			recommendations = append(recommendations, Recommendation{
				Title:       "Increase Memory Limits",
				Explanation: "Container was OOM killed. Increase memory limits to prevent future kills",
				Evidence:    []string{"Exit code 137 indicates OOMKilled"},
				Risk:        RiskLow,
				Priority:    1, // High priority for OOM
				ProposedFix: generateMemoryIncreaseFix(resource),
				Tags:        []string{"resources", "memory"},
			})
			break
		}
	}

	return recommendations
}

// OOMRecommender generates recommendations for OOM issues.
type OOMRecommender struct{}

func (r *OOMRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Increase Memory Limits",
			Explanation: "Container memory limit is insufficient for the workload. Increase limits by 50% as a starting point.",
			Evidence:    incident.Diagnosis.Evidence,
			Risk:        RiskLow,
			Priority:    1,
			ProposedFix: generateMemoryIncreaseFix(resource),
			Tags:        []string{"resources", "memory"},
		},
		{
			Title:       "Analyze Memory Usage Pattern",
			Explanation: "Before increasing limits, understand current memory usage to right-size the container",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl top pod %s -n %s --containers", name, ns),
				"Check application memory profiling",
				"Look for memory leaks in the application",
			},
			Tags: []string{"investigation", "memory"},
		},
		{
			Title:       "Configure JVM Heap (if Java)",
			Explanation: "For Java applications, ensure JVM heap is properly configured for container limits",
			Risk:        RiskLow,
			Priority:    3,
			ManualSteps: []string{
				"Add -XX:+UseContainerSupport JVM flag",
				"Set -XX:MaxRAMPercentage=75.0",
				"Ensure Xmx is less than container memory limit",
			},
			Tags: []string{"configuration", "java"},
		},
	}
}

// RestartStormRecommender generates recommendations for restart storms.
type RestartStormRecommender struct{}

func (r *RestartStormRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Check Liveness Probe Configuration",
			Explanation: "Frequent restarts may be caused by overly aggressive liveness probes",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get pod %s -n %s -o yaml | grep -A 10 livenessProbe", name, ns),
				"Increase initialDelaySeconds if app needs more startup time",
				"Increase timeoutSeconds and periodSeconds",
			},
			Tags: []string{"probes", "configuration"},
		},
		{
			Title:       "Review Container Exit Codes",
			Explanation: "Understand why containers are exiting to identify the root cause",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl describe pod %s -n %s | grep -A 5 'Last State'", name, ns),
				"Check for pattern in exit codes",
			},
			Tags: []string{"investigation"},
		},
		{
			Title:       "Check External Dependencies",
			Explanation: "Intermittent failures may be caused by unreliable external dependencies",
			Risk:        RiskLow,
			Priority:    3,
			ManualSteps: []string{
				"Verify database connectivity",
				"Check message queue health",
				"Review external API availability",
			},
			Tags: []string{"investigation", "dependencies"},
		},
	}
}

// NoEndpointsRecommender generates recommendations for no ready endpoints.
type NoEndpointsRecommender struct{}

func (r *NoEndpointsRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Check Pod Status",
			Explanation: "Verify that pods exist and are in Running state with ready containers",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get pods -n %s -l <service-selector>", ns),
				fmt.Sprintf("kubectl describe endpoints %s -n %s", name, ns),
			},
			Tags: []string{"investigation"},
		},
		{
			Title:       "Fix Readiness Probe",
			Explanation: "Pods may be failing readiness probes. Review and fix probe configuration.",
			Risk:        RiskMedium,
			Priority:    2,
			ManualSteps: []string{
				"Check if readiness probe endpoint exists",
				"Verify probe timeouts are appropriate",
				"Test readiness endpoint manually with kubectl exec",
			},
			Tags: []string{"probes", "configuration"},
		},
		{
			Title:       "Scale Up Replicas",
			Explanation: "If pods are crashing, temporarily scale up to maintain availability",
			Risk:        RiskLow,
			Priority:    3,
			ProposedFix: &ProposedFix{
				Type:           FixTypeScale,
				Description:    "Increase replica count",
				TargetResource: getDeploymentRef(resource),
				DryRunCmd:      fmt.Sprintf("kubectl scale deployment --replicas=3 -n %s --dry-run=client -o yaml", ns),
				ApplyCmd:       fmt.Sprintf("kubectl scale deployment <deployment-name> --replicas=3 -n %s", ns),
				Safe:           true,
				RequiresConfirmation: true,
			},
			Tags: []string{"scaling"},
		},
	}
}

// InternalErrorsRecommender generates recommendations for internal errors.
type InternalErrorsRecommender struct{}

func (r *InternalErrorsRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Analyze Error Logs",
			Explanation: "Check application logs for stack traces and error details",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl logs %s -n %s | grep -i error", name, ns),
				fmt.Sprintf("kubectl logs %s -n %s | grep -i exception", name, ns),
			},
			Tags: []string{"investigation", "logs"},
		},
		{
			Title:       "Check Database Connectivity",
			Explanation: "5xx errors often indicate database or backend connectivity issues",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				"Verify database credentials are current",
				"Check database pod health",
				"Test connectivity from application pod",
			},
			Tags: []string{"dependencies", "database"},
		},
		{
			Title:       "Restart Pod",
			Explanation: "If the issue is transient, a pod restart may resolve it",
			Risk:        RiskLow,
			Priority:    3,
			ProposedFix: &ProposedFix{
				Type:           FixTypeRestart,
				Description:    "Restart the affected pod",
				TargetResource: resource,
				ApplyCmd:       fmt.Sprintf("kubectl delete pod %s -n %s", name, ns),
				Safe:           true,
				RequiresConfirmation: true,
			},
			Tags: []string{"remediation", "restart"},
		},
	}
}

// UpstreamFailureRecommender generates recommendations for upstream failures.
type UpstreamFailureRecommender struct{}

func (r *UpstreamFailureRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace

	return []Recommendation{
		{
			Title:       "Check Upstream Service Health",
			Explanation: "Verify the upstream service is running and healthy",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				"kubectl get pods -n <upstream-namespace>",
				"kubectl get svc -n <upstream-namespace>",
				"Check upstream service logs",
			},
			Tags: []string{"investigation", "upstream"},
		},
		{
			Title:       "Test Network Connectivity",
			Explanation: "Verify network connectivity between services",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl exec -it <pod> -n %s -- curl -v <upstream-service>", ns),
				"Check NetworkPolicy if any",
				"Verify Service and Endpoints",
			},
			Tags: []string{"network", "connectivity"},
		},
		{
			Title:       "Implement Circuit Breaker",
			Explanation: "Add circuit breaker pattern to handle upstream failures gracefully",
			Risk:        RiskMedium,
			Priority:    4,
			ManualSteps: []string{
				"Consider using Istio/Linkerd service mesh",
				"Implement retry with exponential backoff",
				"Add fallback behavior",
			},
			Tags: []string{"architecture", "resilience"},
		},
	}
}

// TimeoutsRecommender generates recommendations for timeout issues.
type TimeoutsRecommender struct{}

func (r *TimeoutsRecommender) Generate(incident *Incident) []Recommendation {
	return []Recommendation{
		{
			Title:       "Increase Timeout Values",
			Explanation: "Current timeout values may be too aggressive for the workload",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				"Review and increase HTTP client timeouts",
				"Increase ingress/loadbalancer timeouts",
				"Check database connection pool timeout settings",
			},
			Tags: []string{"configuration", "timeouts"},
		},
		{
			Title:       "Optimize Slow Operations",
			Explanation: "Identify and optimize slow operations causing timeouts",
			Risk:        RiskMedium,
			Priority:    2,
			ManualSteps: []string{
				"Add request tracing to identify slow spans",
				"Profile database queries",
				"Check for N+1 query patterns",
			},
			Tags: []string{"performance", "optimization"},
		},
		{
			Title:       "Add Request Caching",
			Explanation: "Cache slow operations to reduce response times",
			Risk:        RiskMedium,
			Priority:    3,
			ManualSteps: []string{
				"Implement Redis/Memcached caching",
				"Add HTTP cache headers",
				"Consider CDN for static assets",
			},
			Tags: []string{"performance", "caching"},
		},
	}
}

// ImagePullRecommender generates recommendations for image pull failures.
type ImagePullRecommender struct{}

func (r *ImagePullRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Verify Image Exists",
			Explanation: "Confirm the container image exists in the registry with the specified tag",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl describe pod %s -n %s | grep 'Image:'", name, ns),
				"Check registry directly for image existence",
				"Verify image tag is correct",
			},
			Tags: []string{"image", "registry"},
		},
		{
			Title:       "Check Image Pull Secret",
			Explanation: "Ensure the image pull secret is configured and valid",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get secrets -n %s | grep docker", ns),
				"Verify secret contains valid credentials",
				"Check ServiceAccount has imagePullSecrets configured",
			},
			Tags: []string{"image", "secrets"},
		},
		{
			Title:       "Check Registry Connectivity",
			Explanation: "Verify nodes can reach the container registry",
			Risk:        RiskLow,
			Priority:    3,
			ManualSteps: []string{
				"Check if registry URL is reachable from nodes",
				"Verify no firewall blocking registry access",
				"Check for registry rate limiting",
			},
			Tags: []string{"network", "registry"},
		},
	}
}

// ConfigErrorRecommender generates recommendations for configuration errors.
type ConfigErrorRecommender struct{}

func (r *ConfigErrorRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Review Pod Configuration",
			Explanation: "Check the pod specification for configuration errors",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl describe pod %s -n %s", name, ns),
				"Check Events section for specific errors",
				"Verify all referenced ConfigMaps exist",
			},
			Tags: []string{"configuration"},
		},
		{
			Title:       "Validate ConfigMaps and Secrets",
			Explanation: "Ensure all referenced ConfigMaps and Secrets exist and are properly formatted",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get configmaps -n %s", ns),
				fmt.Sprintf("kubectl get secrets -n %s", ns),
				"Compare with pod spec references",
			},
			Tags: []string{"configuration", "secrets"},
		},
	}
}

// SecretMissingRecommender generates recommendations for missing secrets.
type SecretMissingRecommender struct{}

func (r *SecretMissingRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace

	return []Recommendation{
		{
			Title:       "Create Missing Secret",
			Explanation: "Create the required secret in the namespace",
			Risk:        RiskMedium,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get secrets -n %s", ns),
				"kubectl create secret generic <secret-name> --from-literal=<key>=<value> -n " + ns,
				"Or sync from external secrets manager",
			},
			Tags: []string{"secrets", "configuration"},
		},
		{
			Title:       "Check Secret Name",
			Explanation: "Verify the secret name in pod spec matches an existing secret",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get pod %s -n %s -o yaml | grep -A 5 secretKeyRef", resource.Name, ns),
				"Correct any typos in secret name",
			},
			Tags: []string{"investigation"},
		},
	}
}

// DNSFailureRecommender generates recommendations for DNS failures.
type DNSFailureRecommender struct{}

func (r *DNSFailureRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Check CoreDNS Health",
			Explanation: "Verify CoreDNS pods are healthy and running",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				"kubectl get pods -n kube-system -l k8s-app=kube-dns",
				"kubectl logs -n kube-system -l k8s-app=kube-dns",
			},
			Tags: []string{"dns", "investigation"},
		},
		{
			Title:       "Test DNS Resolution",
			Explanation: "Test DNS resolution from the affected pod",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl exec -it %s -n %s -- nslookup kubernetes.default", name, ns),
				fmt.Sprintf("kubectl exec -it %s -n %s -- cat /etc/resolv.conf", name, ns),
			},
			Tags: []string{"dns", "network"},
		},
		{
			Title:       "Check Network Policies",
			Explanation: "Ensure NetworkPolicy is not blocking DNS traffic",
			Risk:        RiskLow,
			Priority:    3,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get networkpolicy -n %s", ns),
				"Verify egress to kube-dns is allowed",
				"Check for DNS port 53 UDP/TCP access",
			},
			Tags: []string{"dns", "network", "policy"},
		},
	}
}

// LivenessFailureRecommender generates recommendations for liveness probe failures.
type LivenessFailureRecommender struct{}

func (r *LivenessFailureRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Adjust Liveness Probe Settings",
			Explanation: "Increase probe timeouts or decrease frequency to allow application more time",
			Risk:        RiskMedium,
			Priority:    1,
			ProposedFix: &ProposedFix{
				Type:        FixTypePatch,
				Description: "Adjust liveness probe configuration",
				TargetResource: getDeploymentRef(resource),
				Changes: []FixChange{
					{
						Path:        "spec.template.spec.containers[0].livenessProbe.initialDelaySeconds",
						OldValue:    10,
						NewValue:    30,
						Description: "Increase initial delay to allow longer startup",
					},
					{
						Path:        "spec.template.spec.containers[0].livenessProbe.timeoutSeconds",
						OldValue:    1,
						NewValue:    5,
						Description: "Increase timeout for slow responses",
					},
					{
						Path:        "spec.template.spec.containers[0].livenessProbe.failureThreshold",
						OldValue:    3,
						NewValue:    5,
						Description: "Increase failure threshold before restart",
					},
				},
				Safe:                 true,
				RequiresConfirmation: true,
			},
			Tags: []string{"probes", "configuration"},
		},
		{
			Title:       "Verify Liveness Endpoint",
			Explanation: "Ensure the liveness probe endpoint is functioning correctly",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl exec -it %s -n %s -- curl localhost:<port>/<liveness-path>", name, ns),
				"Check application logs during probe failures",
				"Verify endpoint returns 200 when healthy",
			},
			Tags: []string{"probes", "investigation"},
		},
	}
}

// ReadinessFailureRecommender generates recommendations for readiness probe failures.
type ReadinessFailureRecommender struct{}

func (r *ReadinessFailureRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Check Readiness Endpoint",
			Explanation: "Verify the readiness endpoint is responding correctly",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl exec -it %s -n %s -- curl localhost:<port>/<readiness-path>", name, ns),
				"Check if dependencies are available",
				"Verify database connections",
			},
			Tags: []string{"probes", "investigation"},
		},
		{
			Title:       "Adjust Readiness Probe Settings",
			Explanation: "Increase probe tolerance for slow startup or intermittent failures",
			Risk:        RiskMedium,
			Priority:    2,
			ProposedFix: &ProposedFix{
				Type:        FixTypePatch,
				Description: "Adjust readiness probe configuration",
				TargetResource: getDeploymentRef(resource),
				Changes: []FixChange{
					{
						Path:        "spec.template.spec.containers[0].readinessProbe.initialDelaySeconds",
						OldValue:    5,
						NewValue:    15,
						Description: "Increase initial delay",
					},
					{
						Path:        "spec.template.spec.containers[0].readinessProbe.successThreshold",
						OldValue:    1,
						NewValue:    2,
						Description: "Require multiple successes before marking ready",
					},
				},
				Safe:                 true,
				RequiresConfirmation: true,
			},
			Tags: []string{"probes", "configuration"},
		},
	}
}

// UnschedulableRecommender generates recommendations for unschedulable pods.
type UnschedulableRecommender struct{}

func (r *UnschedulableRecommender) Generate(incident *Incident) []Recommendation {
	resource := incident.Resource
	ns := resource.Namespace
	name := resource.Name

	return []Recommendation{
		{
			Title:       "Check Node Resources",
			Explanation: "Verify nodes have sufficient resources to schedule the pod",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				"kubectl describe nodes | grep -A 5 'Allocated resources'",
				fmt.Sprintf("kubectl describe pod %s -n %s | grep -A 3 'Events'", name, ns),
				"kubectl top nodes",
			},
			Tags: []string{"scheduling", "resources"},
		},
		{
			Title:       "Review Node Selectors and Affinity",
			Explanation: "Check if pod node selector or affinity can be satisfied",
			Risk:        RiskLow,
			Priority:    2,
			ManualSteps: []string{
				fmt.Sprintf("kubectl get pod %s -n %s -o yaml | grep -A 10 nodeSelector", name, ns),
				fmt.Sprintf("kubectl get pod %s -n %s -o yaml | grep -A 20 affinity", name, ns),
				"kubectl get nodes --show-labels",
			},
			Tags: []string{"scheduling", "affinity"},
		},
		{
			Title:       "Check for Taints",
			Explanation: "Verify pod tolerates any node taints",
			Risk:        RiskLow,
			Priority:    3,
			ManualSteps: []string{
				"kubectl describe nodes | grep Taints",
				"kubectl get pod -o yaml | grep -A 5 tolerations",
			},
			Tags: []string{"scheduling", "taints"},
		},
	}
}

// ResourceExhaustedRecommender generates recommendations for resource exhaustion.
type ResourceExhaustedRecommender struct{}

func (r *ResourceExhaustedRecommender) Generate(incident *Incident) []Recommendation {
	ns := incident.Resource.Namespace

	return []Recommendation{
		{
			Title:       "Check ResourceQuota",
			Explanation: "Verify namespace has available quota for new resources",
			Risk:        RiskLow,
			Priority:    1,
			ManualSteps: []string{
				fmt.Sprintf("kubectl describe resourcequota -n %s", ns),
				fmt.Sprintf("kubectl describe limitrange -n %s", ns),
			},
			Tags: []string{"quota", "resources"},
		},
		{
			Title:       "Request Quota Increase",
			Explanation: "If quota is exhausted, request an increase from cluster admin",
			Risk:        RiskMedium,
			Priority:    2,
			ManualSteps: []string{
				"Contact cluster administrator",
				"Justify resource requirements",
				"Propose new quota values",
			},
			Tags: []string{"quota", "administration"},
		},
		{
			Title:       "Optimize Resource Requests",
			Explanation: "Review and reduce resource requests to fit within quota",
			Risk:        RiskMedium,
			Priority:    3,
			ManualSteps: []string{
				"Review actual resource usage with kubectl top",
				"Right-size resource requests based on usage",
				"Consider using VPA for automatic right-sizing",
			},
			Tags: []string{"resources", "optimization"},
		},
	}
}

// Helper functions

func getDeploymentRef(resource KubeResourceRef) KubeResourceRef {
	return KubeResourceRef{
		Kind:      "Deployment",
		Name:      resource.Name,
		Namespace: resource.Namespace,
	}
}

func generateMemoryIncreaseFix(resource KubeResourceRef) *ProposedFix {
	return &ProposedFix{
		Type:           FixTypePatch,
		Description:    "Increase container memory limits by 50%",
		TargetResource: getDeploymentRef(resource),
		DryRunCmd:      fmt.Sprintf("kubectl set resources deployment/<name> -n %s --limits=memory=<new-limit> --dry-run=client -o yaml", resource.Namespace),
		ApplyCmd:       fmt.Sprintf("kubectl set resources deployment/<name> -n %s --limits=memory=<new-limit>", resource.Namespace),
		Changes: []FixChange{
			{
				Path:        "spec.template.spec.containers[0].resources.limits.memory",
				Description: "Increase memory limit by 50%",
			},
			{
				Path:        "spec.template.spec.containers[0].resources.requests.memory",
				Description: "Increase memory request proportionally",
			},
		},
		Safe:                 true,
		RequiresConfirmation: true,
		RollbackInfo: &RollbackInfo{
			CanRollback: true,
			RollbackCmd: "kubectl rollout undo deployment/<name> -n " + resource.Namespace,
		},
	}
}

