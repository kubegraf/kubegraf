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
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/kubegraf/kubegraf/internal/core"
	corev1 "k8s.io/api/core/v1"
)

var (
	headerStyle = lipgloss.NewStyle().
			Background(lipgloss.Color("#7C3AED")).
			Foreground(lipgloss.Color("#FFFFFF")).
			Bold(true).
			Padding(0, 1).
			Width(100)

	selectedStyle = lipgloss.NewStyle().
			Background(lipgloss.Color("#6366F1")).
			Foreground(lipgloss.Color("#FFFFFF"))

	footerStyle = lipgloss.NewStyle().
			Background(lipgloss.Color("#1E293B")).
			Foreground(lipgloss.Color("#94A3B8")).
			Padding(0, 1).
			Width(100)
)

type model struct {
	clientMgr *core.ClientManager
	informers *core.InformerStore
	ctx       context.Context

	namespace string
	context   string
	pods      []*corev1.Pod
	cursor    int
	err       error

	width  int
	height int
}

func initialModel() (model, error) {
	ctx := context.Background()

	clientMgr, err := core.NewClientManager()
	if err != nil {
		return model{}, fmt.Errorf("create client manager: %w", err)
	}

	informers := core.NewInformerStore(clientMgr.GetClientset())
	informers.Start()

	// Give informers time to sync cache (informers need time to populate)
	time.Sleep(2 * time.Second)

	m := model{
		clientMgr: clientMgr,
		informers: informers,
		ctx:       ctx,
		namespace: "all", // Start with all namespaces to show all pods
		context:   clientMgr.GetCurrentContext(),
		width:     100,
		height:    30,
	}

	// Load initial pods
	m.refreshPods()

	return m, nil
}

func (m *model) refreshPods() {
	pods, err := m.informers.GetPods(m.namespace)
	if err != nil {
		m.err = err
		return
	}
	m.pods = pods
	m.err = nil
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			m.informers.Stop()
			return m, tea.Quit

		case "up", "k":
			if m.cursor > 0 {
				m.cursor--
			}

		case "down", "j":
			if m.cursor < len(m.pods)-1 {
				m.cursor++
			}

		case "r":
			m.refreshPods()

		case "n":
			// Get available namespaces from cluster
			namespaces, err := m.clientMgr.GetNamespaces(m.ctx)
			if err != nil {
				m.err = fmt.Errorf("failed to get namespaces: %w", err)
				return m, nil
			}

			// Add "all" option
			allNamespaces := append([]string{"all"}, namespaces...)

			// Find current namespace index
			currentIdx := 0
			for i, ns := range allNamespaces {
				if ns == m.namespace {
					currentIdx = i
					break
				}
			}

			// Cycle to next namespace
			m.namespace = allNamespaces[(currentIdx+1)%len(allNamespaces)]
			m.cursor = 0
			m.refreshPods()
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	}

	return m, nil
}

func (m model) View() string {
	var b strings.Builder

	// Header
	header := fmt.Sprintf("Context: %s | Namespace: %s | Connected ●", m.context, m.namespace)
	b.WriteString(headerStyle.Render(header))
	b.WriteString("\n\n")

	// Error display
	if m.err != nil {
		b.WriteString(fmt.Sprintf("Error: %v\n\n", m.err))
	}

	// Pod table header
	if m.namespace == "all" || m.namespace == "" {
		b.WriteString("NAMESPACE           NAME                                    READY  STATUS       RESTARTS  AGE\n")
	} else {
		b.WriteString("NAME                                    READY     STATUS       RESTARTS   AGE\n")
	}
	b.WriteString(strings.Repeat("─", m.width))
	b.WriteString("\n")

	// Pod list
	if len(m.pods) == 0 {
		b.WriteString("No pods found")
		if m.namespace != "all" && m.namespace != "" {
			b.WriteString(" in namespace ")
			b.WriteString(m.namespace)
		}
		b.WriteString("\n\nTip: Press 'n' to switch namespaces or 'r' to refresh\n")
	} else {
		for i, pod := range m.pods {
			// Calculate ready containers
			ready := 0
			for _, cs := range pod.Status.ContainerStatuses {
				if cs.Ready {
					ready++
				}
			}
			total := len(pod.Spec.Containers)

			// Calculate restarts
			restarts := int32(0)
			for _, cs := range pod.Status.ContainerStatuses {
				restarts += cs.RestartCount
			}

			// Format age
			age := "Unknown"
			if pod.Status.StartTime != nil {
				duration := time.Since(pod.Status.StartTime.Time)
				age = formatDuration(duration)
			} else if pod.CreationTimestamp.Time.Year() > 1 {
				duration := time.Since(pod.CreationTimestamp.Time)
				age = formatDuration(duration)
			}

			var line string
			if m.namespace == "all" || m.namespace == "" {
				// Show namespace column
				line = fmt.Sprintf("%-19s %-39s %d/%d    %-12s %d         %s",
					truncate(pod.Namespace, 19),
					truncate(pod.Name, 39),
					ready,
					total,
					pod.Status.Phase,
					restarts,
					age,
				)
			} else {
				// Hide namespace column
				line = fmt.Sprintf("%-40s %d/%d       %-12s %d          %s",
					truncate(pod.Name, 40),
					ready,
					total,
					pod.Status.Phase,
					restarts,
					age,
				)
			}

			if i == m.cursor {
				b.WriteString(selectedStyle.Render(line))
			} else {
				b.WriteString(line)
			}
			b.WriteString("\n")

			if i >= m.height-10 { // Limit display
				break
			}
		}

		// Show count
		if len(m.pods) > m.height-10 {
			b.WriteString(fmt.Sprintf("\n... and %d more pods (scroll to view)\n", len(m.pods)-(m.height-10)))
		}
	}

	// Fill remaining space
	for i := len(m.pods); i < m.height-8; i++ {
		b.WriteString("\n")
	}

	// Footer
	footer := "q:quit  ↑↓/jk:navigate  r:refresh  n:namespace  ?:help"
	b.WriteString("\n")
	b.WriteString(footerStyle.Render(footer))

	return b.String()
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	} else if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	} else if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	return fmt.Sprintf("%dd", int(d.Hours()/24))
}

func main() {
	m, err := initialModel()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error initializing TUI: %v\n", err)
		os.Exit(1)
	}

	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error running TUI: %v\n", err)
		os.Exit(1)
	}
}
