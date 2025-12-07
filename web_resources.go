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

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

// handlePods returns pod list
func (ws *WebServer) handlePods(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}
	
	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	// Only default to app.namespace if namespace param is not provided at all
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Batch fetch all pod metrics at once (much faster than individual calls)
	metricsMap := make(map[string]struct {
		cpu    string
		memory string
	})
	if ws.app.metricsClient != nil {
		if metricsList, err := ws.app.metricsClient.MetricsV1beta1().PodMetricses(namespace).List(ws.app.ctx, metav1.ListOptions{}); err == nil {
			for _, pm := range metricsList.Items {
				var totalCPU, totalMemory int64
				for _, cm := range pm.Containers {
					totalCPU += cm.Usage.Cpu().MilliValue()
					totalMemory += cm.Usage.Memory().Value()
				}
				key := pm.Namespace + "/" + pm.Name
				metricsMap[key] = struct {
					cpu    string
					memory string
				}{
					cpu:    fmt.Sprintf("%dm", totalCPU),
					memory: fmt.Sprintf("%.0fMi", float64(totalMemory)/(1024*1024)),
				}
			}
		}
	}

	podList := []map[string]interface{}{}
	for _, pod := range pods.Items {
		// Calculate ready count from container statuses
		ready := 0
		total := len(pod.Spec.Containers)
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				ready++
			}
		}

		// Calculate total restarts
		restarts := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += cs.RestartCount
		}

		// Determine actual status
		status := string(pod.Status.Phase)
		if pod.DeletionTimestamp != nil {
			status = "Terminating"
		} else if pod.Status.Phase == "Pending" {
			// Check container statuses for more detail
			for _, cs := range pod.Status.ContainerStatuses {
				if cs.State.Waiting != nil {
					status = cs.State.Waiting.Reason
					break
				}
			}
		} else if pod.Status.Phase == "Running" {
			// Check if all containers are actually ready
			allReady := true
			for _, cs := range pod.Status.ContainerStatuses {
				if !cs.Ready {
					allReady = false
					if cs.State.Waiting != nil {
						status = cs.State.Waiting.Reason
					}
					break
				}
			}
			if allReady && ready == total {
				status = "Running"
			}
		}

		// Get metrics from pre-fetched map
		cpu := "-"
		memory := "-"
		if m, ok := metricsMap[pod.Namespace+"/"+pod.Name]; ok {
			cpu = m.cpu
			memory = m.memory
		}

		// Extract container names
		containerNames := make([]string, 0, len(pod.Spec.Containers))
		for _, c := range pod.Spec.Containers {
			containerNames = append(containerNames, c.Name)
		}

		podList = append(podList, map[string]interface{}{
			"name":       pod.Name,
			"status":     status,
			"ready":      fmt.Sprintf("%d/%d", ready, total),
			"restarts":   restarts,
			"age":        formatAge(time.Since(pod.CreationTimestamp.Time)),
			"createdAt":  pod.CreationTimestamp.Time.Format(time.RFC3339),
			"ip":         pod.Status.PodIP,
			"node":       pod.Spec.NodeName,
			"namespace":  pod.Namespace,
			"cpu":        cpu,
			"memory":     memory,
			"containers": containerNames,
		})
	}

	json.NewEncoder(w).Encode(podList)
}

// handlePodMetrics returns only CPU/memory metrics for pods (lightweight, for live updates)
func (ws *WebServer) handlePodMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if ws.app.clientset == nil {
		// Return empty metrics map if client not initialized
		json.NewEncoder(w).Encode(map[string]map[string]string{})
		return
	}
	
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	metricsMap := make(map[string]map[string]string)
	if ws.app.metricsClient != nil {
		if metricsList, err := ws.app.metricsClient.MetricsV1beta1().PodMetricses(namespace).List(ws.app.ctx, metav1.ListOptions{}); err == nil {
			for _, pm := range metricsList.Items {
				var totalCPU, totalMemory int64
				for _, cm := range pm.Containers {
					totalCPU += cm.Usage.Cpu().MilliValue()
					totalMemory += cm.Usage.Memory().Value()
				}
				key := pm.Namespace + "/" + pm.Name
				metricsMap[key] = map[string]string{
					"cpu":    fmt.Sprintf("%dm", totalCPU),
					"memory": fmt.Sprintf("%.0fMi", float64(totalMemory)/(1024*1024)),
				}
			}
		}
	}

	json.NewEncoder(w).Encode(metricsMap)
}

// handleDeployments returns deployment list
func (ws *WebServer) handleDeployments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}
	
	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	// Only default to app.namespace if namespace param is not provided at all
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	allDeployments := []map[string]interface{}{}
	var continueToken string
	for {
		opts := metav1.ListOptions{}
		if continueToken != "" {
			opts.Continue = continueToken
		}

		deployments, err := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, opts)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		for _, dep := range deployments.Items {
			replicas := int32(1)
			if dep.Spec.Replicas != nil {
				replicas = *dep.Spec.Replicas
			}
			allDeployments = append(allDeployments, map[string]interface{}{
				"name":      dep.Name,
				"ready":     fmt.Sprintf("%d/%d", dep.Status.ReadyReplicas, replicas),
				"upToDate":  dep.Status.UpdatedReplicas,
				"available": dep.Status.AvailableReplicas,
				"replicas":  replicas,
				"age":       formatAge(time.Since(dep.CreationTimestamp.Time)),
				"namespace": dep.Namespace,
			})
		}

		if deployments.Continue == "" {
			break
		}
		continueToken = deployments.Continue
	}

	json.NewEncoder(w).Encode(allDeployments)
}

// handleStatefulSets returns statefulset list
func (ws *WebServer) handleStatefulSets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" {
		namespace = "" // Set to empty string for all namespaces
	}

	allStatefulSets := []appsv1.StatefulSet{}
	var continueToken string
	for {
		opts := metav1.ListOptions{}
		if continueToken != "" {
			opts.Continue = continueToken
		}

		statefulsets, err := ws.app.clientset.AppsV1().StatefulSets(namespace).List(ws.app.ctx, opts)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		allStatefulSets = append(allStatefulSets, statefulsets.Items...)

		if statefulsets.Continue == "" {
			break
		}
		continueToken = statefulsets.Continue
	}

	ssList := []map[string]interface{}{}
	for _, ss := range allStatefulSets {
		replicas := int32(1)
		if ss.Spec.Replicas != nil {
			replicas = *ss.Spec.Replicas
		}
		ssList = append(ssList, map[string]interface{}{
			"name":      ss.Name,
			"ready":     fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, replicas),
			"available": ss.Status.ReadyReplicas,
			"age":       formatAge(time.Since(ss.CreationTimestamp.Time)),
			"namespace": ss.Namespace,
		})
	}

	json.NewEncoder(w).Encode(ssList)
}

// handleDaemonSets returns daemonset list
func (ws *WebServer) handleDaemonSets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" {
		namespace = "" // Set to empty string for all namespaces
	}

	allDaemonSets := []appsv1.DaemonSet{}
	var continueToken string
	for {
		opts := metav1.ListOptions{}
		if continueToken != "" {
			opts.Continue = continueToken
		}

		daemonsets, err := ws.app.clientset.AppsV1().DaemonSets(namespace).List(ws.app.ctx, opts)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		allDaemonSets = append(allDaemonSets, daemonsets.Items...)

		if daemonsets.Continue == "" {
			break
		}
		continueToken = daemonsets.Continue
	}

	dsList := []map[string]interface{}{}
	for _, ds := range allDaemonSets {
		dsList = append(dsList, map[string]interface{}{
			"name":      ds.Name,
			"desired":   ds.Status.DesiredNumberScheduled,
			"current":   ds.Status.CurrentNumberScheduled,
			"ready":     fmt.Sprintf("%d/%d", ds.Status.NumberReady, ds.Status.DesiredNumberScheduled),
			"available": ds.Status.NumberAvailable,
			"age":       formatAge(time.Since(ds.CreationTimestamp.Time)),
			"namespace": ds.Namespace,
		})
	}

	json.NewEncoder(w).Encode(dsList)
}

// handleServices returns service list
func (ws *WebServer) handleServices(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" {
		namespace = "" // Set to empty string for all namespaces
	}

	allServices := []corev1.Service{}
	var continueToken string
	for {
		opts := metav1.ListOptions{}
		if continueToken != "" {
			opts.Continue = continueToken
		}

		services, err := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, opts)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		allServices = append(allServices, services.Items...)

		if services.Continue == "" {
			break
		}
		continueToken = services.Continue
	}

	svcList := []map[string]interface{}{}
	for _, svc := range allServices {
		// Format ports string (e.g., "80:8080/TCP,443:8443/TCP")
		var ports []string
		for _, p := range svc.Spec.Ports {
			portStr := fmt.Sprintf("%d:%d", p.Port, p.TargetPort.IntVal)
			if p.NodePort != 0 {
				portStr = fmt.Sprintf("%d:%d", p.NodePort, p.Port)
			}
			if p.Protocol != corev1.ProtocolTCP {
				portStr += fmt.Sprintf("/%s", p.Protocol)
			}
			ports = append(ports, portStr)
		}
		portsStr := strings.Join(ports, ",")
		if portsStr == "" {
			portsStr = "-"
		}

		// Get external IPs
		var externalIPs []string
		for _, ing := range svc.Status.LoadBalancer.Ingress {
			if ing.IP != "" {
				externalIPs = append(externalIPs, ing.IP)
			} else if ing.Hostname != "" {
				externalIPs = append(externalIPs, ing.Hostname)
			}
		}
		externalIP := strings.Join(externalIPs, ",")
		if externalIP == "" {
			externalIP = "-"
		}

		svcList = append(svcList, map[string]interface{}{
			"name":       svc.Name,
			"type":       string(svc.Spec.Type),
			"clusterIP":  svc.Spec.ClusterIP,
			"externalIP": externalIP,
			"ports":      portsStr,
			"age":        formatAge(time.Since(svc.CreationTimestamp.Time)),
			"namespace":  svc.Namespace,
		})
	}

	json.NewEncoder(w).Encode(svcList)
}

// handleNodes returns node list
func (ws *WebServer) handleNodes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	nodes, err := ws.app.clientset.CoreV1().Nodes().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	nodeList := []map[string]interface{}{}
	for _, node := range nodes.Items {
		// Determine node status
		status := "Unknown"
		for _, condition := range node.Status.Conditions {
			if condition.Type == v1.NodeReady {
				if condition.Status == v1.ConditionTrue {
					status = "Ready"
				} else {
					status = "NotReady"
				}
				break
			}
		}

		// Get node roles
		roles := "worker"
		for label := range node.Labels {
			if strings.Contains(label, "node-role.kubernetes.io/control-plane") || strings.Contains(label, "node-role.kubernetes.io/master") {
				roles = "control-plane"
				break
			}
		}

		// Get CPU and Memory capacity
		cpu := node.Status.Capacity.Cpu().String()

		// Convert memory to a readable format
		memoryBytes := node.Status.Capacity.Memory().Value()
		memoryGi := float64(memoryBytes) / (1024 * 1024 * 1024)
		memory := fmt.Sprintf("%.1fGi", memoryGi)

		// Get metrics for this node if available
		cpuUsage := "-"
		memoryUsage := "-"
		if ws.app.metricsClient != nil {
			if metrics, err := ws.app.metricsClient.MetricsV1beta1().NodeMetricses().Get(ws.app.ctx, node.Name, metav1.GetOptions{}); err == nil {
				cpuMillis := metrics.Usage.Cpu().MilliValue()
				memUsed := metrics.Usage.Memory().Value()
				memUsedMi := float64(memUsed) / (1024 * 1024)
				cpuUsage = fmt.Sprintf("%dm", cpuMillis)
				memoryUsage = fmt.Sprintf("%.0fMi", memUsedMi)
			}
		}

		nodeList = append(nodeList, map[string]interface{}{
			"name":        node.Name,
			"status":      status,
			"roles":       roles,
			"version":     node.Status.NodeInfo.KubeletVersion,
			"cpu":         cpu,
			"cpuUsage":    cpuUsage,
			"memory":      memory,
			"memoryUsage": memoryUsage,
			"age":         formatAge(time.Since(node.CreationTimestamp.Time)),
		})
	}

	json.NewEncoder(w).Encode(nodeList)
}

// handleIngresses returns ingress list
func (ws *WebServer) handleIngresses(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" || namespace == "_all" {
		namespace = "" // Set to empty string for all namespaces
	}
	ingresses, err := ws.app.clientset.NetworkingV1().Ingresses(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ingList := []map[string]interface{}{}
	for _, ing := range ingresses.Items {
		hosts := []string{}
		for _, rule := range ing.Spec.Rules {
			hosts = append(hosts, rule.Host)
		}

		// Get ingress class
		ingressClass := ""
		if ing.Spec.IngressClassName != nil {
			ingressClass = *ing.Spec.IngressClassName
		}

		// Get load balancer address
		address := ""
		if len(ing.Status.LoadBalancer.Ingress) > 0 {
			if ing.Status.LoadBalancer.Ingress[0].IP != "" {
				address = ing.Status.LoadBalancer.Ingress[0].IP
			} else if ing.Status.LoadBalancer.Ingress[0].Hostname != "" {
				address = ing.Status.LoadBalancer.Ingress[0].Hostname
			}
		}

		// Get ports
		ports := "80"
		if len(ing.Spec.TLS) > 0 {
			ports = "80, 443"
		}

		ingList = append(ingList, map[string]interface{}{
			"name":      ing.Name,
			"hosts":     hosts,
			"age":       formatAge(time.Since(ing.CreationTimestamp.Time)),
			"namespace": ing.Namespace,
			"class":     ingressClass,
			"address":   address,
			"ports":     ports,
		})
	}

	json.NewEncoder(w).Encode(ingList)
}

// handleConfigMaps returns configmap list
func (ws *WebServer) handleConfigMaps(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" || namespace == "_all" {
		namespace = "" // Set to empty string for all namespaces
	}
	configmaps, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmList := []map[string]interface{}{}
	for _, cm := range configmaps.Items {
		cmList = append(cmList, map[string]interface{}{
			"name":      cm.Name,
			"data":      len(cm.Data),
			"age":       formatAge(time.Since(cm.CreationTimestamp.Time)),
			"namespace": cm.Namespace,
		})
	}

	json.NewEncoder(w).Encode(cmList)
}

// handleSecrets returns secrets list
func (ws *WebServer) handleSecrets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" || namespace == "_all" {
		namespace = "" // Set to empty string for all namespaces
	}
	secrets, err := ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	secretList := []map[string]interface{}{}
	for _, secret := range secrets.Items {
		secretList = append(secretList, map[string]interface{}{
			"name":      secret.Name,
			"type":      string(secret.Type),
			"data":      len(secret.Data),
			"age":       formatAge(time.Since(secret.CreationTimestamp.Time)),
			"namespace": secret.Namespace,
		})
	}

	json.NewEncoder(w).Encode(secretList)
}

// handleCronJobs returns cronjob list
func (ws *WebServer) handleCronJobs(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	cronjobs, err := ws.app.clientset.BatchV1().CronJobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cjList := []map[string]interface{}{}
	for _, cj := range cronjobs.Items {
		// Get last schedule time
		lastSchedule := "Never"
		if cj.Status.LastScheduleTime != nil {
			lastSchedule = formatAge(time.Since(cj.Status.LastScheduleTime.Time)) + " ago"
		}

		// Get active jobs count
		activeJobs := len(cj.Status.Active)

		cjList = append(cjList, map[string]interface{}{
			"name":         cj.Name,
			"schedule":     cj.Spec.Schedule,
			"suspend":      cj.Spec.Suspend != nil && *cj.Spec.Suspend,
			"active":       activeJobs,
			"lastSchedule": lastSchedule,
			"age":          formatAge(time.Since(cj.CreationTimestamp.Time)),
			"namespace":    cj.Namespace,
		})
	}

	json.NewEncoder(w).Encode(cjList)
}

// handleJobs returns job list
func (ws *WebServer) handleJobs(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	jobs, err := ws.app.clientset.BatchV1().Jobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jobList := []map[string]interface{}{}
	for _, job := range jobs.Items {
		// Determine status
		status := "Running"
		if job.Status.Succeeded > 0 {
			status = "Complete"
		} else if job.Status.Failed > 0 {
			status = "Failed"
		}

		// Get completions
		completions := "?"
		if job.Spec.Completions != nil {
			completions = fmt.Sprintf("%d", *job.Spec.Completions)
		}

		// Get duration
		duration := "-"
		if job.Status.CompletionTime != nil {
			duration = formatAge(job.Status.CompletionTime.Time.Sub(job.Status.StartTime.Time))
		} else if job.Status.StartTime != nil {
			duration = formatAge(time.Since(job.Status.StartTime.Time))
		}

		jobList = append(jobList, map[string]interface{}{
			"name":        job.Name,
			"status":      status,
			"completions": fmt.Sprintf("%d/%s", job.Status.Succeeded, completions),
			"duration":    duration,
			"age":         formatAge(time.Since(job.CreationTimestamp.Time)),
			"namespace":   job.Namespace,
		})
	}

	json.NewEncoder(w).Encode(jobList)
}

// handleCertificates returns certificate list (cert-manager CRD)
func (ws *WebServer) handleCertificates(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" || namespace == "_all" {
		namespace = "" // Set to empty string for all namespaces
	}
	queryNs := namespace

	// Create dynamic client for CRD access
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	certGVR := schema.GroupVersionResource{
		Group:    "cert-manager.io",
		Version:  "v1",
		Resource: "certificates",
	}

	certList, err := dynamicClient.Resource(certGVR).Namespace(queryNs).List(ws.app.ctx, metav1.ListOptions{})

	if err != nil {
		// cert-manager may not be installed
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	certs := []map[string]interface{}{}
	for _, cert := range certList.Items {
		metadata := cert.Object["metadata"].(map[string]interface{})
		spec := cert.Object["spec"].(map[string]interface{})

		name := metadata["name"].(string)
		ns := metadata["namespace"].(string)

		// Get creation time for age
		creationTimeStr, _ := metadata["creationTimestamp"].(string)
		var age string
		if creationTime, err := time.Parse(time.RFC3339, creationTimeStr); err == nil {
			age = formatAge(time.Since(creationTime))
		}

		// Get secret name
		secretName, _ := spec["secretName"].(string)

		// Get issuer ref
		var issuer string
		if issuerRef, ok := spec["issuerRef"].(map[string]interface{}); ok {
			issuerName, _ := issuerRef["name"].(string)
			issuerKind, _ := issuerRef["kind"].(string)
			if issuerKind == "" {
				issuerKind = "Issuer"
			}
			issuer = fmt.Sprintf("%s/%s", issuerKind, issuerName)
		}

		// Get DNS names
		var dnsNames []string
		if dns, ok := spec["dnsNames"].([]interface{}); ok {
			for _, d := range dns {
				if s, ok := d.(string); ok {
					dnsNames = append(dnsNames, s)
				}
			}
		}

		// Get status
		status := "Unknown"
		var notBefore, notAfter, renewalTime string
		if statusObj, ok := cert.Object["status"].(map[string]interface{}); ok {
			if conditions, ok := statusObj["conditions"].([]interface{}); ok {
				for _, cond := range conditions {
					if c, ok := cond.(map[string]interface{}); ok {
						if c["type"] == "Ready" {
							if c["status"] == "True" {
								status = "Ready"
							} else if c["status"] == "False" {
								status = "Failed"
							} else {
								status = "Pending"
							}
							break
						}
					}
				}
			}
			if nb, ok := statusObj["notBefore"].(string); ok {
				notBefore = nb
			}
			if na, ok := statusObj["notAfter"].(string); ok {
				notAfter = na
			}
			if rt, ok := statusObj["renewalTime"].(string); ok {
				renewalTime = rt
			}
		}

		certs = append(certs, map[string]interface{}{
			"name":        name,
			"namespace":   ns,
			"secretName":  secretName,
			"issuer":      issuer,
			"status":      status,
			"notBefore":   notBefore,
			"notAfter":    notAfter,
			"renewalTime": renewalTime,
			"dnsNames":    dnsNames,
			"age":         age,
		})
	}

	json.NewEncoder(w).Encode(certs)
}
