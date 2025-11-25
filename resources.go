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
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// renderPods renders the pods table (k9s style with all details)
func (a *App) renderPods() {
	pods, err := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	// Get pod metrics if available
	podMetrics := make(map[string]struct {
		CPU int64
		MEM int64
	})
	if a.metricsClient != nil {
		metrics, err := a.metricsClient.MetricsV1beta1().PodMetricses(a.namespace).List(a.ctx, metav1.ListOptions{})
		if err == nil {
			for _, pm := range metrics.Items {
				var totalCPU, totalMEM int64
				for _, c := range pm.Containers {
					totalCPU += c.Usage.Cpu().MilliValue()
					totalMEM += c.Usage.Memory().Value()
				}
				podMetrics[pm.Name] = struct {
					CPU int64
					MEM int64
				}{CPU: totalCPU, MEM: totalMEM}
			}
		}
	}

	// Headers (k9s style)
	headers := []string{"NAME", "READY", "STATUS", "RESTARTS", "CPU", "MEM", "IP", "NODE", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, pod := range pods.Items {
		// Calculate ready containers
		readyCount := 0
		totalCount := len(pod.Spec.Containers)
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				readyCount++
			}
		}

		// Calculate total restarts
		restarts := 0
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += int(cs.RestartCount)
		}

		// Get status icon and color
		statusIcon, statusColor := getStatusIcon(string(pod.Status.Phase), readyCount == totalCount)
		status := fmt.Sprintf("[%s]%s %s[-]", statusColor, statusIcon, pod.Status.Phase)

		// Get metrics
		cpuStr := "-"
		memStr := "-"
		if m, ok := podMetrics[pod.Name]; ok {
			cpuStr = fmt.Sprintf("%dm", m.CPU)
			memStr = fmt.Sprintf("%dMi", m.MEM/(1024*1024))
		}

		// Get pod IP
		podIP := pod.Status.PodIP
		if podIP == "" {
			podIP = "-"
		}

		// Get node name
		nodeName := pod.Spec.NodeName
		if nodeName == "" {
			nodeName = "-"
		}

		// Calculate age
		age := time.Since(pod.CreationTimestamp.Time)
		ageStr := formatDuration(age)

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", pod.Name), // Sky blue color for pod names
			fmt.Sprintf("%d/%d", readyCount, totalCount),
			status,
			strconv.Itoa(restarts),
			cpuStr,
			memStr,
			podIP,
			nodeName,
			ageStr,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, pod.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderDeployments renders the deployments table
func (a *App) renderDeployments() {
	deployments, err := a.clientset.AppsV1().Deployments(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "READY", "UP-TO-DATE", "AVAILABLE", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, deploy := range deployments.Items {
		ready := fmt.Sprintf("%d/%d", deploy.Status.ReadyReplicas, deploy.Status.Replicas)
		age := formatDuration(time.Since(deploy.CreationTimestamp.Time))

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", deploy.Name), // Bright blue for deployment names
			ready,
			strconv.Itoa(int(deploy.Status.UpdatedReplicas)),
			strconv.Itoa(int(deploy.Status.AvailableReplicas)),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, deploy.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderServices renders the services table with relationship indicators
func (a *App) renderServices() {
	services, err := a.clientset.CoreV1().Services(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "TYPE", "CLUSTER-IP", "EXTERNAL-IP", "PORTS", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, svc := range services.Items {
		// Format ports with kdash-style arrows
		var ports []string
		for _, p := range svc.Spec.Ports {
			portStr := fmt.Sprintf("%s:%d", p.Name, p.Port)
			if p.NodePort != 0 {
				portStr += fmt.Sprintf("%s%d", IconArrow, p.NodePort)
			}
			if p.Protocol != corev1.ProtocolTCP {
				portStr += fmt.Sprintf("/%s", p.Protocol)
			}
			ports = append(ports, portStr)
		}
		portsStr := strings.Join(ports, ",")

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

		age := formatDuration(time.Since(svc.CreationTimestamp.Time))

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", svc.Name), // Bright blue for service names
			string(svc.Spec.Type),
			svc.Spec.ClusterIP,
			externalIP,
			portsStr,
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, svc.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderIngresses renders the ingresses table with relationships
func (a *App) renderIngresses() {
	ingresses, err := a.clientset.NetworkingV1().Ingresses(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "CLASS", "HOSTS", "PATHS", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, ing := range ingresses.Items {
		className := "-"
		if ing.Spec.IngressClassName != nil {
			className = *ing.Spec.IngressClassName
		}

		var hosts []string
		var paths []string
		for _, rule := range ing.Spec.Rules {
			host := rule.Host
			if host == "" {
				host = "*"
			}
			hosts = append(hosts, host)

			if rule.HTTP != nil {
				for _, path := range rule.HTTP.Paths {
					pathStr := path.Path
					if pathStr == "" {
						pathStr = "/"
					}
					// Show relationship: host/path ► service:port
					backend := fmt.Sprintf("%s%s:%d", IconArrow, path.Backend.Service.Name, path.Backend.Service.Port.Number)
					paths = append(paths, pathStr+backend)
				}
			}
		}

		hostsStr := strings.Join(hosts, ",")
		pathsStr := strings.Join(paths, " ")
		age := formatDuration(time.Since(ing.CreationTimestamp.Time))

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", ing.Name), // Bright blue for ingress names
			className,
			hostsStr,
			pathsStr,
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, ing.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderConfigMaps renders the configmaps table
func (a *App) renderConfigMaps() {
	configmaps, err := a.clientset.CoreV1().ConfigMaps(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "DATA", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, cm := range configmaps.Items {
		age := formatDuration(time.Since(cm.CreationTimestamp.Time))
		row := []string{
			fmt.Sprintf("[cyan]%s[-]", cm.Name), // Bright blue for configmap names
			strconv.Itoa(len(cm.Data)),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, cm.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderSecrets renders the secrets table
func (a *App) renderSecrets() {
	secrets, err := a.clientset.CoreV1().Secrets(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "TYPE", "DATA", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, secret := range secrets.Items {
		age := formatDuration(time.Since(secret.CreationTimestamp.Time))
		row := []string{
			fmt.Sprintf("[cyan]%s[-]", secret.Name), // Bright blue for secret names
			string(secret.Type),
			strconv.Itoa(len(secret.Data)),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, secret.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderResourceMap renders the resource mapping selection table
func (a *App) renderResourceMap() {
	headers := []string{"TYPE", "NAME", "CONNECTIONS", "STATUS", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	// Collect all ingresses
	ingresses, _ := a.clientset.NetworkingV1().Ingresses(a.namespace).List(a.ctx, metav1.ListOptions{})
	for _, ing := range ingresses.Items {
		connections := 0
		for _, rule := range ing.Spec.Rules {
			if rule.HTTP != nil {
				connections += len(rule.HTTP.Paths)
			}
		}
		age := formatDuration(time.Since(ing.CreationTimestamp.Time))
		row := []string{
			fmt.Sprintf("[magenta]%s Ingress[-]", IconIngress),
			fmt.Sprintf("[cyan]%s[-]", ing.Name),
			fmt.Sprintf("%s%d services", IconArrow, connections),
			"[green]Active[-]",
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, fmt.Sprintf("ingress/%s", ing.Name))
	}

	// Collect all deployments
	deployments, _ := a.clientset.AppsV1().Deployments(a.namespace).List(a.ctx, metav1.ListOptions{})
	for _, deploy := range deployments.Items {
		// Count connected resources
		connections := 0
		// Count ConfigMaps
		for _, vol := range deploy.Spec.Template.Spec.Volumes {
			if vol.ConfigMap != nil {
				connections++
			}
			if vol.Secret != nil {
				connections++
			}
		}
		// Count env from ConfigMaps/Secrets
		for _, container := range deploy.Spec.Template.Spec.Containers {
			for _, env := range container.EnvFrom {
				if env.ConfigMapRef != nil || env.SecretRef != nil {
					connections++
				}
			}
		}

		statusIcon := IconOK
		statusColor := "green"
		statusText := "Ready"
		if deploy.Status.ReadyReplicas < deploy.Status.Replicas {
			statusIcon = IconProgressing
			statusColor = "yellow"
			statusText = "Progressing"
		}

		age := formatDuration(time.Since(deploy.CreationTimestamp.Time))
		row := []string{
			fmt.Sprintf("[magenta]%s Deployment[-]", IconDeployment),
			fmt.Sprintf("[cyan]%s[-]", deploy.Name),
			fmt.Sprintf("%s%d resources", IconArrow, connections+1), // +1 for pods
			fmt.Sprintf("[%s]%s %s[-]", statusColor, statusIcon, statusText),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, fmt.Sprintf("deployment/%s", deploy.Name))
	}

	// Collect all services
	services, _ := a.clientset.CoreV1().Services(a.namespace).List(a.ctx, metav1.ListOptions{})
	for _, svc := range services.Items {
		// Count connected pods
		podList, _ := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{
			LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{MatchLabels: svc.Spec.Selector}),
		})

		age := formatDuration(time.Since(svc.CreationTimestamp.Time))
		row := []string{
			fmt.Sprintf("[magenta]%s Service[-]", IconService),
			fmt.Sprintf("[cyan]%s[-]", svc.Name),
			fmt.Sprintf("%s%d pods", IconArrow, len(podList.Items)),
			fmt.Sprintf("[green]%s[-]", svc.Spec.Type),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, fmt.Sprintf("service/%s", svc.Name))
	}

	// Sort by type and name
	sort.Slice(rows, func(i, j int) bool {
		if rows[i][0] != rows[j][0] {
			return rows[i][0] < rows[j][0]
		}
		return rows[i][1] < rows[j][1]
	})

	a.updateTable(headers, rows, rowIDs)
}
