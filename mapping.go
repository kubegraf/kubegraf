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
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// viewResourceMap shows the graphical relationship map for the selected resource
func (a *App) viewResourceMap() {
	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceID := a.tableData.RowIDs[a.selectedRow]
	a.tableData.mx.RUnlock()

	// Parse resource ID
	parts := strings.Split(resourceID, "/")
	if len(parts) != 2 {
		return
	}
	resourceType := parts[0]
	resourceName := parts[1]

	// Build relationship tree
	var tree *ResourceNode
	var err error

	switch resourceType {
	case "ingress":
		tree, err = a.buildIngressTree(resourceName)
	case "deployment":
		tree, err = a.buildDeploymentTree(resourceName)
	case "service":
		tree, err = a.buildServiceTree(resourceName)
	default:
		a.showError(fmt.Sprintf("Resource mapping not supported for %s", resourceType))
		return
	}

	if err != nil {
		a.showError(fmt.Sprintf("Failed to build relationship map: %v", err))
		return
	}

	// Render tree as text
	treeText := a.renderTree(tree, "", true, true)

	// Show in modal
	textView := tview.NewTextView().
		SetDynamicColors(true).
		SetScrollable(true).
		SetWordWrap(false).
		SetText(treeText)

	textView.SetBorder(true).
		SetTitle(fmt.Sprintf(" Resource Map: %s/%s (press Esc to close) ", resourceType, resourceName))

	textView.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		if event.Key() == tcell.KeyEscape {
			a.pages.HidePage("resource-map")
			a.app.SetFocus(a.table)
			return nil
		}
		return event
	})

	a.pages.AddPage("resource-map", textView, true, true)
	a.app.SetFocus(textView)
}

// buildIngressTree builds a relationship tree for an Ingress
func (a *App) buildIngressTree(name string) (*ResourceNode, error) {
	ingress, err := a.clientset.NetworkingV1().Ingresses(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	root := &ResourceNode{
		Type:     "Ingress",
		Name:     name,
		Status:   "Active",
		Icon:     IconIngress,
		Color:    "cyan",
		Children: []*ResourceNode{},
		Metadata: map[string]string{
			"class": func() string {
				if ingress.Spec.IngressClassName != nil {
					return *ingress.Spec.IngressClassName
				}
				return "default"
			}(),
		},
	}

	// Process rules to find services
	serviceMap := make(map[string]*ResourceNode)

	for _, rule := range ingress.Spec.Rules {
		if rule.HTTP != nil {
			for _, path := range rule.HTTP.Paths {
				serviceName := path.Backend.Service.Name

				// Check if we already have this service
				if _, exists := serviceMap[serviceName]; !exists {
					// Create service node
					serviceNode, err := a.buildServiceTree(serviceName)
					if err == nil {
						// Add path metadata
						if serviceNode.Metadata == nil {
							serviceNode.Metadata = make(map[string]string)
						}
						serviceNode.Metadata["path"] = path.Path
						serviceNode.Metadata["host"] = rule.Host
						serviceMap[serviceName] = serviceNode
						root.Children = append(root.Children, serviceNode)
					}
				}
			}
		}
	}

	return root, nil
}

// buildDeploymentTree builds a relationship tree for a Deployment
func (a *App) buildDeploymentTree(name string) (*ResourceNode, error) {
	deployment, err := a.clientset.AppsV1().Deployments(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	status := "Ready"
	if deployment.Status.ReadyReplicas < deployment.Status.Replicas {
		status = "Progressing"
	}

	root := &ResourceNode{
		Type:     "Deployment",
		Name:     name,
		Status:   status,
		Icon:     IconDeployment,
		Color:    "cyan",
		Children: []*ResourceNode{},
		Metadata: map[string]string{
			"replicas": fmt.Sprintf("%d/%d", deployment.Status.ReadyReplicas, deployment.Status.Replicas),
		},
	}

	// Add ReplicaSet node
	replicaSets, err := a.clientset.AppsV1().ReplicaSets(a.namespace).List(a.ctx, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(deployment.Spec.Selector),
	})

	if err == nil && len(replicaSets.Items) > 0 {
		// Find the active ReplicaSet
		for _, rs := range replicaSets.Items {
			if rs.Status.Replicas > 0 {
				rsNode := &ResourceNode{
					Type:     "ReplicaSet",
					Name:     rs.Name,
					Status:   fmt.Sprintf("%d replicas", rs.Status.Replicas),
					Icon:     "📦",
					Color:    "magenta",
					Children: []*ResourceNode{},
				}

				// Add Pods under ReplicaSet
				pods, err := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{
					LabelSelector: metav1.FormatLabelSelector(deployment.Spec.Selector),
				})

				if err == nil {
					for _, pod := range pods.Items {
						statusIcon, statusColor := getStatusIcon(string(pod.Status.Phase), pod.Status.Phase == corev1.PodRunning)
						podNode := &ResourceNode{
							Type:   "Pod",
							Name:   pod.Name,
							Status: string(pod.Status.Phase),
							Icon:   statusIcon,
							Color:  statusColor,
							Metadata: map[string]string{
								"ip":   pod.Status.PodIP,
								"node": pod.Spec.NodeName,
							},
						}
						rsNode.Children = append(rsNode.Children, podNode)
					}
				}

				root.Children = append(root.Children, rsNode)
				break
			}
		}
	}

	// Add ConfigMaps
	configMaps := make(map[string]bool)
	for _, vol := range deployment.Spec.Template.Spec.Volumes {
		if vol.ConfigMap != nil {
			configMaps[vol.ConfigMap.Name] = true
		}
	}
	for _, container := range deployment.Spec.Template.Spec.Containers {
		for _, env := range container.EnvFrom {
			if env.ConfigMapRef != nil {
				configMaps[env.ConfigMapRef.Name] = true
			}
		}
	}
	for cm := range configMaps {
		cmNode := &ResourceNode{
			Type:   "ConfigMap",
			Name:   cm,
			Status: "Mounted",
			Icon:   IconConfigMap,
			Color:  "yellow",
		}
		root.Children = append(root.Children, cmNode)
	}

	// Add Secrets
	secrets := make(map[string]bool)
	for _, vol := range deployment.Spec.Template.Spec.Volumes {
		if vol.Secret != nil {
			secrets[vol.Secret.SecretName] = true
		}
	}
	for _, container := range deployment.Spec.Template.Spec.Containers {
		for _, env := range container.EnvFrom {
			if env.SecretRef != nil {
				secrets[env.SecretRef.Name] = true
			}
		}
	}
	for secret := range secrets {
		secretNode := &ResourceNode{
			Type:   "Secret",
			Name:   secret,
			Status: "Mounted",
			Icon:   IconSecret,
			Color:  "red",
		}
		root.Children = append(root.Children, secretNode)
	}

	// Add ServiceAccount
	if deployment.Spec.Template.Spec.ServiceAccountName != "" {
		saNode := &ResourceNode{
			Type:   "ServiceAccount",
			Name:   deployment.Spec.Template.Spec.ServiceAccountName,
			Status: "Active",
			Icon:   "🔑",
			Color:  "blue",
		}
		root.Children = append(root.Children, saNode)
	}

	return root, nil
}

// buildServiceTree builds a relationship tree for a Service
func (a *App) buildServiceTree(name string) (*ResourceNode, error) {
	service, err := a.clientset.CoreV1().Services(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	root := &ResourceNode{
		Type:     "Service",
		Name:     name,
		Status:   string(service.Spec.Type),
		Icon:     IconService,
		Color:    "cyan",
		Children: []*ResourceNode{},
		Metadata: map[string]string{
			"clusterIP": service.Spec.ClusterIP,
			"ports":     fmt.Sprintf("%d", len(service.Spec.Ports)),
		},
	}

	// Find pods matching the service selector
	if len(service.Spec.Selector) > 0 {
		pods, err := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{
			LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{MatchLabels: service.Spec.Selector}),
		})

		if err == nil {
			for _, pod := range pods.Items {
				statusIcon, statusColor := getStatusIcon(string(pod.Status.Phase), pod.Status.Phase == corev1.PodRunning)
				podNode := &ResourceNode{
					Type:   "Pod",
					Name:   pod.Name,
					Status: string(pod.Status.Phase),
					Icon:   statusIcon,
					Color:  statusColor,
					Metadata: map[string]string{
						"ip":   pod.Status.PodIP,
						"node": pod.Spec.NodeName,
					},
				}
				root.Children = append(root.Children, podNode)
			}
		}
	}

	return root, nil
}

// renderTree renders a ResourceNode tree as beautiful ASCII art
func (a *App) renderTree(node *ResourceNode, prefix string, isLast bool, isRoot bool) string {
	var result strings.Builder

	// Box drawing characters for beautiful tree structure
	const (
		vertical   = "│"
		branch     = "├"
		lastBranch = "└"
		horizontal = "─"
		arrow      = "►"
	)

	if isRoot {
		// Root node with special formatting
		result.WriteString(fmt.Sprintf("\n[%s::b]%s %s %s[-:-:-]\n", node.Color, node.Icon, node.Type, node.Name))
		if len(node.Metadata) > 0 {
			result.WriteString("[gray]")
			for k, v := range node.Metadata {
				result.WriteString(fmt.Sprintf("  %s: %s  ", k, v))
			}
			result.WriteString("[-]\n")
		}
		result.WriteString(fmt.Sprintf("[gray]Status: [-][%s]%s[-]\n\n", node.Color, node.Status))
	} else {
		// Regular node
		connector := branch + horizontal + arrow
		if isLast {
			connector = lastBranch + horizontal + arrow
		}

		result.WriteString(fmt.Sprintf("%s[gray]%s[-] [%s]%s %s[-] [white]%s[-]",
			prefix, connector, node.Color, node.Icon, node.Type, node.Name))

		if len(node.Metadata) > 0 {
			result.WriteString(" [gray]")
			first := true
			for k, v := range node.Metadata {
				if !first {
					result.WriteString(", ")
				}
				result.WriteString(fmt.Sprintf("%s=%s", k, v))
				first = false
			}
			result.WriteString("[-]")
		}
		result.WriteString(fmt.Sprintf(" [%s](%s)[-]\n", node.Color, node.Status))
	}

	// Render children
	for i, child := range node.Children {
		childIsLast := i == len(node.Children)-1
		var childPrefix string

		if isRoot {
			childPrefix = ""
		} else {
			if isLast {
				childPrefix = prefix + "  "
			} else {
				childPrefix = prefix + vertical + " "
			}
		}

		result.WriteString(a.renderTree(child, childPrefix, childIsLast, false))
	}

	return result.String()
}
