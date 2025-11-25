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
	"os"
	"os/exec"
	"strings"
	"syscall"

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
	"gopkg.in/yaml.v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// viewYAML shows the YAML for the selected resource
func (a *App) viewYAML() {
	// If on ResourceMap tab, show the graphical relationship map instead
	if a.tabs[a.currentTab] == ResourceMap {
		a.viewResourceMap()
		return
	}

	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceName := a.tableData.RowIDs[a.selectedRow]
	resourceType := a.tabs[a.currentTab]
	a.tableData.mx.RUnlock()

	// Get resource YAML
	yaml, err := a.getResourceYAML(resourceType, resourceName)
	if err != nil {
		a.showError(fmt.Sprintf("Failed to get YAML: %v", err))
		return
	}

	// Show YAML view
	a.yamlView.SetText(yaml)
	a.yamlView.SetTitle(fmt.Sprintf(" YAML: %s/%s (press Esc to close) ", resourceType, resourceName))
	a.yamlView.ScrollToBeginning()
	a.pages.ShowPage("yaml")
	a.app.SetFocus(a.yamlView)
}

// getResourceYAML retrieves the YAML for a resource
func (a *App) getResourceYAML(resourceType, name string) (string, error) {
	var obj runtime.Object
	var err error

	switch resourceType {
	case ResourcePod:
		obj, err = a.clientset.CoreV1().Pods(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceDeployment:
		obj, err = a.clientset.AppsV1().Deployments(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceService:
		obj, err = a.clientset.CoreV1().Services(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceIngress:
		obj, err = a.clientset.NetworkingV1().Ingresses(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceConfigMap:
		obj, err = a.clientset.CoreV1().ConfigMaps(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceSecret:
		obj, err = a.clientset.CoreV1().Secrets(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	default:
		return "", fmt.Errorf("unsupported resource type: %s", resourceType)
	}

	if err != nil {
		return "", err
	}

	// Convert to YAML
	jsonBytes, err := json.Marshal(obj)
	if err != nil {
		return "", fmt.Errorf("failed to marshal to JSON: %w", err)
	}

	var jsonObj interface{}
	if err := json.Unmarshal(jsonBytes, &jsonObj); err != nil {
		return "", fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	yamlBytes, err := yaml.Marshal(jsonObj)
	if err != nil {
		return "", fmt.Errorf("failed to marshal to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

// describeResource shows kubectl describe output
func (a *App) describeResource() {
	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceName := a.tableData.RowIDs[a.selectedRow]
	resourceType := strings.ToLower(a.tabs[a.currentTab])
	a.tableData.mx.RUnlock()

	// Stop TUI
	a.app.Stop()

	// Clear screen
	fmt.Print("\033[H\033[2J")
	fmt.Printf("\n[Describing %s/%s - Press 'q' to quit]\n\n", resourceType, resourceName)

	// Run kubectl describe through less
	cmd := exec.Command("kubectl", "describe", resourceType, resourceName, "-n", a.namespace)
	lessCmd := exec.Command("less", "-R")
	lessCmd.Stdin, _ = cmd.StdoutPipe()
	lessCmd.Stdout = os.Stdout
	lessCmd.Stderr = os.Stderr
	lessCmd.Stdin = os.Stdin

	if err := lessCmd.Start(); err == nil {
		cmd.Run()
		lessCmd.Wait()
	}

	// Restart application
	fmt.Print("\033[H\033[2J")
	fmt.Println("Restarting KubeGraf...")

	binary, _ := os.Executable()
	syscall.Exec(binary, os.Args, os.Environ())
}

// shellIntoPod opens a shell in the selected pod
func (a *App) shellIntoPod() {
	// Only works on Pods tab
	if a.tabs[a.currentTab] != ResourcePod {
		a.showError("Shell access is only available on the Pods tab")
		return
	}

	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	podName := a.tableData.RowIDs[a.selectedRow]
	a.tableData.mx.RUnlock()

	// Get pod details
	pod, err := a.clientset.CoreV1().Pods(a.namespace).Get(a.ctx, podName, metav1.GetOptions{})
	if err != nil {
		a.showError(fmt.Sprintf("Failed to get pod: %v", err))
		return
	}

	// Check if pod is running
	if pod.Status.Phase != corev1.PodRunning {
		a.showError(fmt.Sprintf("Pod %s is not running (status: %s)", podName, pod.Status.Phase))
		return
	}

	// Get containers
	containers := make([]string, 0)
	for _, container := range pod.Spec.Containers {
		containers = append(containers, container.Name)
	}

	if len(containers) == 0 {
		a.showError("No containers found in pod")
		return
	}

	// If only one container, exec directly
	if len(containers) == 1 {
		a.execIntoContainer(podName, containers[0])
		return
	}

	// Multiple containers - show selection dialog
	// Create a copy to avoid closure issues
	containersCopy := make([]string, len(containers))
	copy(containersCopy, containers)

	list := tview.NewList()
	list.SetTitle(fmt.Sprintf(" Select Container for %s (↑/↓ then Enter or 's') ", podName))
	list.SetBorder(true)

	// Add containers to list with proper closure handling
	for i := 0; i < len(containersCopy); i++ {
		idx := i                     // Capture index for closure
		cName := containersCopy[idx] // Capture name for closure
		list.AddItem(
			fmt.Sprintf("[cyan]%s[-]", cName),
			fmt.Sprintf("Container %d/%d", idx+1, len(containersCopy)),
			0,
			func() {
				a.pages.HidePage("container-select")
				a.execIntoContainer(podName, cName)
			},
		)
	}

	// Handle keyboard input
	list.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		switch event.Key() {
		case tcell.KeyEscape:
			a.pages.HidePage("container-select")
			a.app.SetFocus(a.table)
			return nil
		case tcell.KeyEnter:
			// Let the default handler trigger the selected callback
			return event
		case tcell.KeyRune:
			if event.Rune() == 's' || event.Rune() == 'S' {
				currentItem := list.GetCurrentItem()
				if currentItem >= 0 && currentItem < len(containersCopy) {
					a.pages.HidePage("container-select")
					a.execIntoContainer(podName, containersCopy[currentItem])
					return nil
				}
			}
		}
		return event
	})

	a.pages.AddPage("container-select", list, true, true)
	a.app.SetFocus(list)
}

// execIntoContainer opens a shell in the specified container
func (a *App) execIntoContainer(podName, containerName string) {
	// Stop the TUI
	a.app.Stop()

	// Clear screen
	fmt.Print("\033[H\033[2J")
	fmt.Printf("\n[Opening shell in %s/%s]\n", podName, containerName)
	fmt.Printf("Type 'exit' to return to KubeGraf\n\n")

	// Try bash first, then sh
	shells := []string{"/bin/bash", "/bin/sh"}
	var lastErr error

	for i, shell := range shells {
		cmd := exec.Command("kubectl", "exec", "-it", podName, "-n", a.namespace, "-c", containerName, "--", shell)
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			lastErr = err
			if i < len(shells)-1 {
				fmt.Printf("Failed with %s, trying %s...\n", shell, shells[i+1])
			}
			continue
		}

		lastErr = nil
		break
	}

	if lastErr != nil {
		fmt.Printf("\n\nError opening shell: %v\n", lastErr)
		fmt.Println("\nPress Enter to continue...")
		fmt.Scanln()
	}

	// Clear screen and restart
	fmt.Print("\033[H\033[2J")
	fmt.Println("Restarting KubeGraf...")

	binary, _ := os.Executable()
	syscall.Exec(binary, os.Args, os.Environ())
}

// deleteResource deletes the selected resource with confirmation
func (a *App) deleteResource() {
	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceName := a.tableData.RowIDs[a.selectedRow]
	resourceType := a.tabs[a.currentTab]
	a.tableData.mx.RUnlock()

	// Create confirmation dialog
	modal := tview.NewModal().
		SetText(fmt.Sprintf("Delete %s '%s'?\n\nThis action cannot be undone!", resourceType, resourceName)).
		AddButtons([]string{"Cancel", "Delete"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("delete-confirm")
			if buttonLabel == "Delete" {
				a.performDelete(resourceType, resourceName)
			}
		})

	a.pages.AddPage("delete-confirm", modal, true, true)
}

// performDelete actually deletes the resource
func (a *App) performDelete(resourceType, name string) {
	var err error

	switch resourceType {
	case ResourcePod:
		err = a.clientset.CoreV1().Pods(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceDeployment:
		err = a.clientset.AppsV1().Deployments(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceService:
		err = a.clientset.CoreV1().Services(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceIngress:
		err = a.clientset.NetworkingV1().Ingresses(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceConfigMap:
		err = a.clientset.CoreV1().ConfigMaps(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceSecret:
		err = a.clientset.CoreV1().Secrets(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	}

	if err != nil {
		a.showError(fmt.Sprintf("Delete failed: %v", err))
	} else {
		a.showInfo(fmt.Sprintf("Deleted %s '%s'", resourceType, name))
		a.refreshCurrentTab()
	}
}
