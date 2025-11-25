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

	"github.com/rivo/tview"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// setupUI creates the user interface
func (a *App) setupUI() {
	a.app = tview.NewApplication()
	a.pages = tview.NewPages()

	// Create tab bar
	a.tabBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignLeft)
	a.updateTabBar()

	// Create status bar (cluster info - top right)
	a.statusBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignRight)
	a.updateStatusBar()

	// Create main table (k9s style)
	a.table = tview.NewTable().
		SetBorders(false).
		SetSelectable(true, false).
		SetFixed(1, 0). // Fixed header row
		SetSeparator('│')
	a.table.SetBorder(true)

	// Create metrics bar (bottom left)
	a.metricsBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignLeft)

	// Create event bar (bottom right)
	a.eventBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignRight)

	// Create help bar (bottom)
	a.helpBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignLeft)
	a.helpBar.SetText(a.getHelpBar())

	// Create YAML viewer (hidden by default)
	a.yamlView = tview.NewTextView().
		SetDynamicColors(true).
		SetScrollable(true).
		SetWordWrap(true)
	a.yamlView.SetBorder(true).SetTitle(" YAML View (press Esc to close) ")

	// Create header with tabs (left) and cluster info (right)
	headerFlex := tview.NewFlex().SetDirection(tview.FlexColumn).
		AddItem(a.tabBar, 0, 1, false).
		AddItem(a.statusBar, 55, 0, false)

	// Create bottom status line (metrics left, events right)
	statusLine := tview.NewFlex().SetDirection(tview.FlexColumn).
		AddItem(a.metricsBar, 0, 1, false).
		AddItem(a.eventBar, 0, 1, false)

	// Main layout
	mainFlex := tview.NewFlex().SetDirection(tview.FlexRow).
		AddItem(headerFlex, 2, 0, false).
		AddItem(a.table, 0, 1, true).
		AddItem(statusLine, 1, 0, false).
		AddItem(a.helpBar, 1, 0, false)

	a.pages.AddPage("main", mainFlex, true, true)
	a.pages.AddPage("yaml", a.yamlView, true, false)

	// Set root and focus
	a.app.SetRoot(a.pages, true).SetFocus(a.table)

	// Set table selection handler
	a.table.SetSelectionChangedFunc(a.onSelectionChanged)
}

// updateTabBar updates the tab bar display
func (a *App) updateTabBar() {
	var tabText strings.Builder
	tabText.WriteString(" ")

	for i, tab := range a.tabs {
		if i == a.currentTab {
			tabText.WriteString(fmt.Sprintf("[black:cyan:b]« %s »[-:-:-] ", tab))
		} else {
			tabText.WriteString(fmt.Sprintf("[cyan]  %s  [-] ", tab))
		}
	}

	a.tabBar.SetText(tabText.String())
}

// updateStatusBar updates the status bar with cluster info
func (a *App) updateStatusBar() {
	// Start with basic info (non-blocking)
	status := fmt.Sprintf(
		"[cyan::b]Context:[-:-:-] [white]%s[-]\n[cyan::b]NS:[-:-:-] [white]%s[-] [gray]|[-] [cyan::b]Nodes:[-:-:-] [white]-[-] [gray]|[-] [cyan::b]CPU:[-:-:-] [white]-%%[-] [gray]|[-] [cyan::b]MEM:[-:-:-] [white]-%%[-]",
		a.cluster, a.namespace,
	)
	a.statusBar.SetText(status)

	// Update with real metrics in background
	if !a.isInitialized {
		return
	}

	go func() {
		var cpuPercent, memPercent int
		nodeCount := 0

		// Get node count
		nodes, err := a.clientset.CoreV1().Nodes().List(a.ctx, metav1.ListOptions{})
		if err == nil {
			nodeCount = len(nodes.Items)
		}

		// Try to get real metrics
		if a.metricsClient != nil {
			nodeMetrics, err := a.metricsClient.MetricsV1beta1().NodeMetricses().List(a.ctx, metav1.ListOptions{})
			if err == nil && len(nodeMetrics.Items) > 0 {
				var totalCPU, totalMem int64
				for _, nm := range nodeMetrics.Items {
					totalCPU += nm.Usage.Cpu().MilliValue()
					totalMem += nm.Usage.Memory().Value()
				}
				cpuPercent = int(float64(totalCPU) / float64(len(nodeMetrics.Items)*4000))
				memPercent = int(float64(totalMem) / float64(len(nodeMetrics.Items)*8*1024*1024*1024) * 100)
			}
		}

		status := fmt.Sprintf(
			"[cyan::b]Context:[-:-:-] [white]%s[-]\n[cyan::b]NS:[-:-:-] [white]%s[-] [gray]|[-] [cyan::b]Nodes:[-:-:-] [magenta]%d[-] [gray]|[-] [cyan::b]CPU:[-:-:-] [magenta]%d%%[-] [gray]|[-] [cyan::b]MEM:[-:-:-] [magenta]%d%%[-]",
			a.cluster, a.namespace, nodeCount, cpuPercent, memPercent,
		)
		a.app.QueueUpdateDraw(func() {
			a.statusBar.SetText(status)
		})
	}()
}

// updateTable updates the table with new data
func (a *App) updateTable(headers []string, rows [][]string, rowIDs []string) {
	a.tableData.mx.Lock()
	a.tableData.Headers = headers
	a.tableData.Rows = rows
	a.tableData.RowIDs = rowIDs
	a.tableData.mx.Unlock()

	a.app.QueueUpdateDraw(func() {
		a.table.Clear()

		// Set headers (fixed row)
		for col, header := range headers {
			cell := tview.NewTableCell(fmt.Sprintf("[#87CEEB::b]%s[-:-:-]", header)).
				SetAlign(tview.AlignLeft).
				SetSelectable(false)
			a.table.SetCell(0, col, cell)
		}

		// Set rows
		for row, rowData := range rows {
			for col, cellData := range rowData {
				cell := tview.NewTableCell(cellData).
					SetAlign(tview.AlignLeft).
					SetMaxWidth(0)
				a.table.SetCell(row+1, col, cell)
			}
		}

		// Restore selection
		if a.selectedRow < len(rows) {
			a.table.Select(a.selectedRow+1, 0)
		} else if len(rows) > 0 {
			a.table.Select(1, 0)
		}
	})
}

// onSelectionChanged handles table selection changes
func (a *App) onSelectionChanged(row, col int) {
	if row > 0 { // Skip header
		a.selectedRow = row - 1
		a.updateMetricsBar()
	}
}

// updateMetricsBar updates the metrics bar with selected resource info
func (a *App) updateMetricsBar() {
	a.tableData.mx.RLock()
	defer a.tableData.mx.RUnlock()

	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.metricsBar.SetText("")
		return
	}

	resourceName := a.tableData.RowIDs[a.selectedRow]
	text := fmt.Sprintf("[gray]Selected:[-] [white]%s[-]", resourceName)

	// Add pod-specific metrics
	if a.tabs[a.currentTab] == ResourcePod && a.selectedRow < len(a.tableData.Rows) {
		row := a.tableData.Rows[a.selectedRow]
		if len(row) > 5 {
			text += fmt.Sprintf(" [gray]CPU:[-] [cyan]%s[-] [gray]MEM:[-] [cyan]%s[-] [gray]IP:[-] [white]%s[-]", row[4], row[5], row[6])
		}
	}

	a.metricsBar.SetText(text)
}

// getHelpBar returns the help bar text
func (a *App) getHelpBar() string {
	return " [cyan::b]q[-:-:-]Quit  [cyan::b]r[-:-:-]Refresh  [cyan::b]Enter[-:-:-]YAML/Map  [cyan::b]g[-:-:-]Graph  [cyan::b]d[-:-:-]Describe  [cyan::b]s[-:-:-]Shell  [cyan::b]1-7/h/l/←→[-:-:-]Tabs  [cyan::b]?[-:-:-]Help"
}

// showHelp shows the help dialog
func (a *App) showHelp() {
	helpText := `[cyan::b]KubeGraf v2.0 - Keyboard Shortcuts[::-]

[cyan]Navigation:[-]
  [white]↑/↓[-]            Navigate rows
  [white]1-7[-]            Jump to tab (1=Pods, 2=Deployments, 7=ResourceMap)
  [white]h/l or ←/→[-]     Previous/Next tab
  [white]Enter[-]          View resource YAML / Resource Map
  [white]Esc[-]            Close modal/dialog

[cyan]Operations:[-]
  [white]q, Ctrl+C[-]      Quit application
  [white]r, Ctrl+R[-]      Refresh resources
  [white]n[-]              Change namespace
  [white]d[-]              Describe resource (kubectl describe)
  [white]s[-]              Shell into pod (exec)
  [white]g[-]              Export graph visualization (ResourceMap tab)
  [white]Ctrl+D[-]         Delete resource (with confirmation)
  [white]?[-]              Show this help

[cyan]Features:[-]
  • Real-time pod metrics (CPU/MEM)
  • Pod details: IP, restarts, uptime
  • Shell access to running pods
  • Resource relationships with ► indicators
  • Advanced graphical resource mapping (Tab 7)
  • Safe delete with confirmation dialogs
  • Full YAML viewing

[cyan]ResourceMap Tab:[-]
  • Select any Ingress/Deployment/Service
  • Press [white]Enter[-] to see ASCII tree visualization
  • Press [white]g[-] to export interactive graph (opens in browser)
  • Shows: Ingress►Service►Pod, Deployment►ReplicaSet►Pod
  • Displays ConfigMaps, Secrets, ServiceAccounts
  • Graph uses Graphviz DOT format with SVG export
  • Interactive HTML with zoom, pan, download

Press [cyan]q[-] or [cyan]Esc[-] to close this help.`

	modal := tview.NewModal().
		SetText(helpText).
		AddButtons([]string{"Close"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("help")
		})

	a.pages.AddPage("help", modal, true, true)
}

// showError shows an error modal
func (a *App) showError(msg string) {
	modal := tview.NewModal().
		SetText(fmt.Sprintf("[red::b]Error:[::-]\n\n%s", msg)).
		AddButtons([]string{"OK"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("error")
		})
	a.pages.AddPage("error", modal, true, true)
}

// showInfo shows an info modal
func (a *App) showInfo(msg string) {
	modal := tview.NewModal().
		SetText(fmt.Sprintf("[cyan::b]Success:[::-]\n\n%s", msg)).
		AddButtons([]string{"OK"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("info")
		})
	a.pages.AddPage("info", modal, true, true)
}
