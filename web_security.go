// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type SecurityFinding struct {
	Severity    string `json:"severity"`    // critical, high, medium, low
	Category    string `json:"category"`    // security-context, network-policy, ingress-ports, etc.
	Resource    string `json:"resource"`    // resource type (Pod, Deployment, Ingress, etc.)
	Name        string `json:"name"`        // resource name
	Namespace   string `json:"namespace"`   // namespace
	Title       string `json:"title"`       // short description
	Description string `json:"description"` // detailed description
	Remediation string `json:"remediation"` // how to fix
}

// handleSecurityAnalysis performs security best practices analysis
func (ws *WebServer) handleSecurityAnalysis(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Not connected to cluster",
		})
		return
	}

	findings := []SecurityFinding{}
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Use empty string for all namespaces
	listNamespace := namespace
	if namespace == "_all" {
		listNamespace = ""
	}

	// 1. Check Pods for missing SecurityContext
	pods, err := ws.app.clientset.CoreV1().Pods(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, pod := range pods.Items {
			// Skip completed/failed pods
			if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
				continue
			}

			hasSecurityContext := false
			runAsNonRoot := false
			readOnlyRootFS := false
			privileged := false
			allowPrivilegeEscalation := true // default is true

			// Check pod-level security context
			if pod.Spec.SecurityContext != nil {
				hasSecurityContext = true
				if pod.Spec.SecurityContext.RunAsNonRoot != nil && *pod.Spec.SecurityContext.RunAsNonRoot {
					runAsNonRoot = true
				}
			}

			// Check container-level security contexts
			for _, container := range pod.Spec.Containers {
				if container.SecurityContext != nil {
					hasSecurityContext = true
					if container.SecurityContext.RunAsNonRoot != nil && *container.SecurityContext.RunAsNonRoot {
						runAsNonRoot = true
					}
					if container.SecurityContext.ReadOnlyRootFilesystem != nil && *container.SecurityContext.ReadOnlyRootFilesystem {
						readOnlyRootFS = true
					}
					if container.SecurityContext.Privileged != nil && *container.SecurityContext.Privileged {
						privileged = true
					}
					if container.SecurityContext.AllowPrivilegeEscalation != nil && !*container.SecurityContext.AllowPrivilegeEscalation {
						allowPrivilegeEscalation = false
					}
				}
			}

			// Finding: No SecurityContext at all
			if !hasSecurityContext {
				findings = append(findings, SecurityFinding{
					Severity:    "critical",
					Category:    "security-context",
					Resource:    "Pod",
					Name:        pod.Name,
					Namespace:   pod.Namespace,
					Title:       "Missing SecurityContext",
					Description: "Pod has no SecurityContext defined. This is a critical security risk as containers run with default privileges.",
					Remediation: "Add a SecurityContext to the pod or container spec with runAsNonRoot: true, readOnlyRootFilesystem: true, and allowPrivilegeEscalation: false",
				})
			} else {
				// Check individual security settings
				if !runAsNonRoot {
					findings = append(findings, SecurityFinding{
						Severity:    "high",
						Category:    "security-context",
						Resource:    "Pod",
						Name:        pod.Name,
						Namespace:   pod.Namespace,
						Title:       "Container may run as root",
						Description: "Pod does not enforce runAsNonRoot. Containers could run as root user, increasing attack surface.",
						Remediation: "Set securityContext.runAsNonRoot: true in the pod or container spec",
					})
				}

				if privileged {
					findings = append(findings, SecurityFinding{
						Severity:    "critical",
						Category:    "security-context",
						Resource:    "Pod",
						Name:        pod.Name,
						Namespace:   pod.Namespace,
						Title:       "Privileged container detected",
						Description: "Container is running in privileged mode. This grants full access to the host system.",
						Remediation: "Remove privileged: true from the container securityContext unless absolutely necessary",
					})
				}

				if allowPrivilegeEscalation {
					findings = append(findings, SecurityFinding{
						Severity:    "medium",
						Category:    "security-context",
						Resource:    "Pod",
						Name:        pod.Name,
						Namespace:   pod.Namespace,
						Title:       "Privilege escalation allowed",
						Description: "Container allows privilege escalation. Processes could gain more privileges than their parent.",
						Remediation: "Set securityContext.allowPrivilegeEscalation: false",
					})
				}

				if !readOnlyRootFS {
					findings = append(findings, SecurityFinding{
						Severity:    "low",
						Category:    "security-context",
						Resource:    "Pod",
						Name:        pod.Name,
						Namespace:   pod.Namespace,
						Title:       "Root filesystem is writable",
						Description: "Container filesystem is writable. Attackers could modify files if container is compromised.",
						Remediation: "Set securityContext.readOnlyRootFilesystem: true and use emptyDir volumes for writable paths",
					})
				}
			}
		}
	}

	// 2. Check for missing NetworkPolicies
	// Get all namespaces that have pods
	namespacesWithPods := make(map[string]bool)
	if pods != nil {
		for _, pod := range pods.Items {
			namespacesWithPods[pod.Namespace] = true
		}
	}

	// Check which namespaces have NetworkPolicies
	networkPolicies, err := ws.app.clientset.NetworkingV1().NetworkPolicies(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
	namespacesWithNetPol := make(map[string]bool)
	if err == nil {
		for _, np := range networkPolicies.Items {
			namespacesWithNetPol[np.Namespace] = true
		}
	}

	// Report namespaces without NetworkPolicies
	for ns := range namespacesWithPods {
		if !namespacesWithNetPol[ns] {
			// Skip system namespaces
			if ns == "kube-system" || ns == "kube-public" || ns == "kube-node-lease" {
				continue
			}
			findings = append(findings, SecurityFinding{
				Severity:    "high",
				Category:    "network-policy",
				Resource:    "Namespace",
				Name:        ns,
				Namespace:   ns,
				Title:       "No NetworkPolicy defined",
				Description: "Namespace has no NetworkPolicy. All pods can communicate with any other pod in the cluster by default.",
				Remediation: "Create NetworkPolicies to restrict ingress and egress traffic. Start with a default-deny policy.",
			})
		}
	}

	// 3. Check Ingresses for insecure ports
	ingresses, err := ws.app.clientset.NetworkingV1().Ingresses(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		insecurePorts := map[int32]string{
			80:   "HTTP (unencrypted)",
			8080: "Common HTTP alternative (unencrypted)",
			8000: "Common development port",
			3000: "Common development port",
		}

		for _, ing := range ingresses.Items {
			// Check if TLS is configured
			hasTLS := len(ing.Spec.TLS) > 0

			for _, rule := range ing.Spec.Rules {
				if rule.HTTP != nil {
					for _, path := range rule.HTTP.Paths {
						port := path.Backend.Service.Port.Number
						if portDesc, isInsecure := insecurePorts[port]; isInsecure {
							severity := "medium"
							if port == 80 || port == 8080 {
								severity = "high"
							}
							findings = append(findings, SecurityFinding{
								Severity:    severity,
								Category:    "ingress-ports",
								Resource:    "Ingress",
								Name:        ing.Name,
								Namespace:   ing.Namespace,
								Title:       fmt.Sprintf("Using port %d (%s)", port, portDesc),
								Description: fmt.Sprintf("Ingress routes traffic to port %d. Using default or well-known ports can be a security risk.", port),
								Remediation: "Consider using non-standard ports and ensure TLS termination is configured",
							})
						}
					}
				}
			}

			// Check for missing TLS
			if !hasTLS {
				findings = append(findings, SecurityFinding{
					Severity:    "high",
					Category:    "ingress-tls",
					Resource:    "Ingress",
					Name:        ing.Name,
					Namespace:   ing.Namespace,
					Title:       "No TLS configured",
					Description: "Ingress does not have TLS configured. Traffic may be transmitted unencrypted.",
					Remediation: "Configure TLS in the Ingress spec with a valid certificate",
				})
			}
		}
	}

	// 4. Check Services for NodePort exposure
	services, err := ws.app.clientset.CoreV1().Services(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, svc := range services.Items {
			if svc.Spec.Type == corev1.ServiceTypeNodePort {
				findings = append(findings, SecurityFinding{
					Severity:    "medium",
					Category:    "service-exposure",
					Resource:    "Service",
					Name:        svc.Name,
					Namespace:   svc.Namespace,
					Title:       "NodePort service exposed",
					Description: "Service is exposed via NodePort, making it accessible on all cluster nodes.",
					Remediation: "Consider using LoadBalancer or Ingress with proper access controls instead of NodePort",
				})
			}

			if svc.Spec.Type == corev1.ServiceTypeLoadBalancer {
				// Check if external traffic policy is set to Local
				if svc.Spec.ExternalTrafficPolicy != corev1.ServiceExternalTrafficPolicyTypeLocal {
					findings = append(findings, SecurityFinding{
						Severity:    "low",
						Category:    "service-exposure",
						Resource:    "Service",
						Name:        svc.Name,
						Namespace:   svc.Namespace,
						Title:       "External traffic policy not optimized",
						Description: "LoadBalancer service uses Cluster external traffic policy. Client source IP is not preserved.",
						Remediation: "Set externalTrafficPolicy: Local to preserve client source IP for security logging",
					})
				}
			}
		}
	}

	// Calculate summary statistics
	summary := map[string]int{
		"critical": 0,
		"high":     0,
		"medium":   0,
		"low":      0,
		"total":    len(findings),
	}

	for _, f := range findings {
		summary[f.Severity]++
	}

	// Calculate security score (0-100)
	// Weight: critical=40, high=25, medium=10, low=5
	totalWeight := summary["critical"]*40 + summary["high"]*25 + summary["medium"]*10 + summary["low"]*5
	maxScore := 100
	score := maxScore - totalWeight
	if score < 0 {
		score = 0
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"findings": findings,
		"summary":  summary,
		"score":    score,
	})
}

// HelmRelease represents a Helm release
