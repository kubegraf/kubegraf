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
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
)

// handleWorkloadRoutes routes workload requests to appropriate handlers
func (ws *WebServer) handleWorkloadRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/workloads/")
	if strings.HasSuffix(path, "/related") {
		ws.handleWorkloadRelated(w, r)
	} else {
		ws.handleWorkloadDetails(w, r)
	}
}

// handleWorkloadDetails returns details for a specific workload
// Route: /api/workloads/:namespace/:kind/:name
func (ws *WebServer) handleWorkloadDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse path: /api/workloads/:namespace/:kind/:name
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/workloads/"), "/")
	if len(pathParts) != 3 {
		http.Error(w, "Invalid path format. Expected: /api/workloads/:namespace/:kind/:name", http.StatusBadRequest)
		return
	}

	namespace := pathParts[0]
	kind := strings.ToLower(pathParts[1])
	name := pathParts[2]

	var result map[string]interface{}
	var err error

	switch kind {
	case "deployment":
		result, err = ws.getDeploymentDetails(namespace, name)
	case "statefulset":
		result, err = ws.getStatefulSetDetails(namespace, name)
	case "daemonset":
		result, err = ws.getDaemonSetDetails(namespace, name)
	case "job":
		result, err = ws.getJobDetails(namespace, name)
	case "cronjob":
		result, err = ws.getCronJobDetails(namespace, name)
	case "replicaset":
		result, err = ws.getReplicaSetDetails(namespace, name)
	default:
		http.Error(w, fmt.Sprintf("Unsupported workload kind: %s", kind), http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(result)
}

// handleWorkloadRelated returns related resources for a workload
// Route: /api/workloads/:namespace/:kind/:name/related
func (ws *WebServer) handleWorkloadRelated(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse path: /api/workloads/:namespace/:kind/:name/related
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/workloads/"), "/")
	if len(pathParts) != 4 || pathParts[3] != "related" {
		http.Error(w, "Invalid path format. Expected: /api/workloads/:namespace/:kind/:name/related", http.StatusBadRequest)
		return
	}

	namespace := pathParts[0]
	kind := strings.ToLower(pathParts[1])
	name := pathParts[2]

	related, err := ws.getWorkloadRelatedResources(namespace, kind, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(related)
}

// getDeploymentDetails returns deployment details
func (ws *WebServer) getDeploymentDetails(namespace, name string) (map[string]interface{}, error) {
	dep, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	replicas := int32(1)
	if dep.Spec.Replicas != nil {
		replicas = *dep.Spec.Replicas
	}

	return map[string]interface{}{
		"kind":      "deployment",
		"name":      dep.Name,
		"namespace": dep.Namespace,
		"ready":     fmt.Sprintf("%d/%d", dep.Status.ReadyReplicas, replicas),
		"upToDate":  dep.Status.UpdatedReplicas,
		"available": dep.Status.AvailableReplicas,
		"replicas":  replicas,
		"age":       formatAge(time.Since(dep.CreationTimestamp.Time)),
		"labels":    dep.Labels,
		"selector":  dep.Spec.Selector.MatchLabels,
	}, nil
}

// getStatefulSetDetails returns statefulset details
func (ws *WebServer) getStatefulSetDetails(namespace, name string) (map[string]interface{}, error) {
	ss, err := ws.app.clientset.AppsV1().StatefulSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	replicas := int32(1)
	if ss.Spec.Replicas != nil {
		replicas = *ss.Spec.Replicas
	}

	return map[string]interface{}{
		"kind":      "statefulset",
		"name":      ss.Name,
		"namespace": ss.Namespace,
		"ready":     fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, replicas),
		"available": ss.Status.ReadyReplicas,
		"replicas":  replicas,
		"age":       formatAge(time.Since(ss.CreationTimestamp.Time)),
		"labels":    ss.Labels,
		"selector":  ss.Spec.Selector.MatchLabels,
	}, nil
}

// getDaemonSetDetails returns daemonset details
func (ws *WebServer) getDaemonSetDetails(namespace, name string) (map[string]interface{}, error) {
	ds, err := ws.app.clientset.AppsV1().DaemonSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"kind":      "daemonset",
		"name":      ds.Name,
		"namespace": ds.Namespace,
		"ready":     fmt.Sprintf("%d/%d", ds.Status.NumberReady, ds.Status.DesiredNumberScheduled),
		"available": ds.Status.NumberReady,
		"replicas":  ds.Status.DesiredNumberScheduled,
		"age":       formatAge(time.Since(ds.CreationTimestamp.Time)),
		"labels":    ds.Labels,
		"selector":  ds.Spec.Selector.MatchLabels,
	}, nil
}

// getJobDetails returns job details
func (ws *WebServer) getJobDetails(namespace, name string) (map[string]interface{}, error) {
	job, err := ws.app.clientset.BatchV1().Jobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	completions := int32(1)
	if job.Spec.Completions != nil {
		completions = *job.Spec.Completions
	}

	return map[string]interface{}{
		"kind":       "job",
		"name":       job.Name,
		"namespace":  job.Namespace,
		"ready":      fmt.Sprintf("%d/%d", job.Status.Succeeded+job.Status.Active, completions),
		"succeeded":  job.Status.Succeeded,
		"active":     job.Status.Active,
		"failed":     job.Status.Failed,
		"completions": completions,
		"age":        formatAge(time.Since(job.CreationTimestamp.Time)),
		"labels":     job.Labels,
		"selector":   job.Spec.Selector.MatchLabels,
	}, nil
}

// getCronJobDetails returns cronjob details
func (ws *WebServer) getCronJobDetails(namespace, name string) (map[string]interface{}, error) {
	cj, err := ws.app.clientset.BatchV1().CronJobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"kind":      "cronjob",
		"name":      cj.Name,
		"namespace": cj.Namespace,
		"schedule":  cj.Spec.Schedule,
		"suspended":  cj.Spec.Suspend != nil && *cj.Spec.Suspend,
		"age":       formatAge(time.Since(cj.CreationTimestamp.Time)),
		"labels":    cj.Labels,
		"selector":  cj.Spec.JobTemplate.Spec.Template.Labels,
	}, nil
}

// getReplicaSetDetails returns replicaset details
func (ws *WebServer) getReplicaSetDetails(namespace, name string) (map[string]interface{}, error) {
	rs, err := ws.app.clientset.AppsV1().ReplicaSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	replicas := int32(1)
	if rs.Spec.Replicas != nil {
		replicas = *rs.Spec.Replicas
	}

	return map[string]interface{}{
		"kind":      "replicaset",
		"name":      rs.Name,
		"namespace": rs.Namespace,
		"ready":     fmt.Sprintf("%d/%d", rs.Status.ReadyReplicas, replicas),
		"replicas":  replicas,
		"age":       formatAge(time.Since(rs.CreationTimestamp.Time)),
		"labels":    rs.Labels,
		"selector":  rs.Spec.Selector.MatchLabels,
	}, nil
}

// getWorkloadRelatedResources returns related pods, services, and ingresses for a workload
func (ws *WebServer) getWorkloadRelatedResources(namespace, kind, name string) (map[string]interface{}, error) {
	result := map[string]interface{}{
		"pods":     []map[string]interface{}{},
		"services": []map[string]interface{}{},
		"ingresses": []map[string]interface{}{},
	}

	// Get workload to extract selector
	var selector map[string]string
	var err error

	switch kind {
	case "deployment":
		dep, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		selector = dep.Spec.Selector.MatchLabels
	case "statefulset":
		ss, err := ws.app.clientset.AppsV1().StatefulSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		selector = ss.Spec.Selector.MatchLabels
	case "daemonset":
		ds, err := ws.app.clientset.AppsV1().DaemonSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		selector = ds.Spec.Selector.MatchLabels
	case "job":
		job, err := ws.app.clientset.BatchV1().Jobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		selector = job.Spec.Selector.MatchLabels
	case "cronjob":
		cj, err := ws.app.clientset.BatchV1().CronJobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		selector = cj.Spec.JobTemplate.Spec.Template.Labels
	case "replicaset":
		rs, err := ws.app.clientset.AppsV1().ReplicaSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		selector = rs.Spec.Selector.MatchLabels
	default:
		return result, nil
	}

	if len(selector) == 0 {
		return result, nil
	}

	labelSelector := labels.SelectorFromSet(selector)

	// Get pods
	pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: labelSelector.String(),
	})
	if err == nil {
		podList := []map[string]interface{}{}
		for _, pod := range pods.Items {
			podList = append(podList, map[string]interface{}{
				"name":      pod.Name,
				"namespace": pod.Namespace,
				"status":   string(pod.Status.Phase),
			})
		}
		result["pods"] = podList
	}

	// Get services that select these pods
	services, err := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		serviceList := []map[string]interface{}{}
		for _, svc := range services.Items {
			if len(svc.Spec.Selector) == 0 {
				continue
			}
			// Check if service selector matches workload selector (subset match)
			matches := true
			for k, v := range svc.Spec.Selector {
				if selector[k] != v {
					matches = false
					break
				}
			}
			if matches {
				serviceList = append(serviceList, map[string]interface{}{
					"name":      svc.Name,
					"namespace": svc.Namespace,
					"type":      string(svc.Spec.Type),
				})
			}
		}
		result["services"] = serviceList
	}

	// Get ingresses that route to these services
	ingresses, err := ws.app.clientset.NetworkingV1().Ingresses(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		ingressList := []map[string]interface{}{}
		serviceNames := make(map[string]bool)
		for _, svc := range result["services"].([]map[string]interface{}) {
			serviceNames[svc["name"].(string)] = true
		}

		for _, ing := range ingresses.Items {
			matches := false
			// Check rules
			for _, rule := range ing.Spec.Rules {
				if rule.HTTP != nil {
					for _, path := range rule.HTTP.Paths {
						if path.Backend.Service != nil && serviceNames[path.Backend.Service.Name] {
							matches = true
							break
						}
					}
				}
				if matches {
					break
				}
			}
			// Check default backend
			if !matches && ing.Spec.DefaultBackend != nil && ing.Spec.DefaultBackend.Service != nil {
				if serviceNames[ing.Spec.DefaultBackend.Service.Name] {
					matches = true
				}
			}

			if matches {
				ingressList = append(ingressList, map[string]interface{}{
					"name":      ing.Name,
					"namespace": ing.Namespace,
				})
			}
		}
		result["ingresses"] = ingressList
	}

	// For deployments, also get ReplicaSets
	if kind == "deployment" {
		rss, err := ws.app.clientset.AppsV1().ReplicaSets(namespace).List(ws.app.ctx, metav1.ListOptions{
			LabelSelector: labelSelector.String(),
		})
		if err == nil {
			rsList := []map[string]interface{}{}
			for _, rs := range rss.Items {
				// Check if ReplicaSet is owned by this Deployment
				for _, ownerRef := range rs.OwnerReferences {
					if ownerRef.Kind == "Deployment" && ownerRef.Name == name {
						replicas := int32(1)
						if rs.Spec.Replicas != nil {
							replicas = *rs.Spec.Replicas
						}
						rsList = append(rsList, map[string]interface{}{
							"name":      rs.Name,
							"namespace": rs.Namespace,
							"ready":     fmt.Sprintf("%d/%d", rs.Status.ReadyReplicas, replicas),
						})
						break
					}
				}
			}
			result["replicasets"] = rsList
		}
	}

	return result, nil
}

