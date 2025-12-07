// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package fuzzy

import (
	"sort"
	"strings"
	"unicode"

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// FuzzyMatch represents a fuzzy match result
type FuzzyMatch struct {
	Text       string
	Score      int
	MatchStart int
	MatchEnd   int
	Indices    []int
	Data       interface{}
}

// FuzzyFinder provides fzf-like fuzzy finding functionality
type FuzzyFinder struct {
	app         *App
	items       []string
	itemData    []interface{}
	filtered    []FuzzyMatch
	query       string
	selected    int
	modal       *tview.Flex
	inputField  *tview.InputField
	resultsList *tview.List
	onSelect    func(item string, data interface{})
	onCancel    func()
}

// NewFuzzyFinder creates a new fuzzy finder
func NewFuzzyFinder(app *App) *FuzzyFinder {
	ff := &FuzzyFinder{
		app:      app,
		items:    []string{},
		itemData: []interface{}{},
		filtered: []FuzzyMatch{},
		selected: 0,
	}

	// Create input field
	ff.inputField = tview.NewInputField().
		SetLabel("> ").
		SetFieldWidth(0).
		SetFieldBackgroundColor(tcell.ColorDefault)
	ff.inputField.SetChangedFunc(func(text string) {
		ff.query = text
		ff.updateResults()
	})

	// Create results list
	ff.resultsList = tview.NewList().
		ShowSecondaryText(false).
		SetHighlightFullLine(true).
		SetSelectedBackgroundColor(tcell.ColorDarkCyan)

	// Create modal layout
	ff.modal = tview.NewFlex().SetDirection(tview.FlexRow).
		AddItem(ff.inputField, 1, 0, true).
		AddItem(ff.resultsList, 0, 1, false)
	ff.modal.SetBorder(true).SetTitle(" Fuzzy Finder (Ctrl+P) ")

	// Set up key handlers
	ff.inputField.SetInputCapture(ff.handleInput)

	return ff
}

// SetItems sets the items to search through
func (ff *FuzzyFinder) SetItems(items []string, data []interface{}) {
	ff.items = items
	if data != nil {
		ff.itemData = data
	} else {
		ff.itemData = make([]interface{}, len(items))
		for i := range items {
			ff.itemData[i] = items[i]
		}
	}
	ff.updateResults()
}

// SetOnSelect sets the callback when an item is selected
func (ff *FuzzyFinder) SetOnSelect(fn func(item string, data interface{})) {
	ff.onSelect = fn
}

// SetOnCancel sets the callback when the finder is canceled
func (ff *FuzzyFinder) SetOnCancel(fn func()) {
	ff.onCancel = fn
}

// Show displays the fuzzy finder
func (ff *FuzzyFinder) Show(title string) {
	ff.modal.SetTitle(" " + title + " (↑/↓ to navigate, Enter to select, Esc to cancel) ")
	ff.query = ""
	ff.inputField.SetText("")
	ff.selected = 0
	ff.updateResults()

	// Add as overlay
	ff.app.pages.AddPage("fuzzy", ff.modal, true, true)
	ff.app.app.SetFocus(ff.inputField)
}

// Hide hides the fuzzy finder
func (ff *FuzzyFinder) Hide() {
	ff.app.pages.RemovePage("fuzzy")
	ff.app.app.SetFocus(ff.app.table)
}

// handleInput handles keyboard input
func (ff *FuzzyFinder) handleInput(event *tcell.EventKey) *tcell.EventKey {
	switch event.Key() {
	case tcell.KeyEscape:
		ff.Hide()
		if ff.onCancel != nil {
			ff.onCancel()
		}
		return nil
	case tcell.KeyEnter:
		if ff.selected < len(ff.filtered) {
			match := ff.filtered[ff.selected]
			ff.Hide()
			if ff.onSelect != nil {
				ff.onSelect(match.Text, match.Data)
			}
		}
		return nil
	case tcell.KeyUp, tcell.KeyCtrlP:
		if ff.selected > 0 {
			ff.selected--
			ff.resultsList.SetCurrentItem(ff.selected)
		}
		return nil
	case tcell.KeyDown, tcell.KeyCtrlN:
		if ff.selected < len(ff.filtered)-1 {
			ff.selected++
			ff.resultsList.SetCurrentItem(ff.selected)
		}
		return nil
	case tcell.KeyTab:
		// Tab cycles through results
		if ff.selected < len(ff.filtered)-1 {
			ff.selected++
		} else {
			ff.selected = 0
		}
		ff.resultsList.SetCurrentItem(ff.selected)
		return nil
	}
	return event
}

// updateResults updates the filtered results based on query
func (ff *FuzzyFinder) updateResults() {
	ff.filtered = ff.fuzzySearch(ff.query, ff.items, ff.itemData)
	ff.resultsList.Clear()

	maxResults := 20 // Limit displayed results
	for i, match := range ff.filtered {
		if i >= maxResults {
			break
		}
		displayText := ff.highlightMatch(match)
		ff.resultsList.AddItem(displayText, "", 0, nil)
	}

	// Reset selection if out of bounds
	if ff.selected >= len(ff.filtered) {
		ff.selected = 0
	}
	if len(ff.filtered) > 0 {
		ff.resultsList.SetCurrentItem(ff.selected)
	}
}

// fuzzySearch performs fuzzy matching on the items
func (ff *FuzzyFinder) fuzzySearch(query string, items []string, data []interface{}) []FuzzyMatch {
	if query == "" {
		// Return all items with default scoring
		matches := make([]FuzzyMatch, len(items))
		for i, item := range items {
			var d interface{}
			if i < len(data) {
				d = data[i]
			}
			matches[i] = FuzzyMatch{
				Text:    item,
				Score:   0,
				Indices: nil,
				Data:    d,
			}
		}
		return matches
	}

	var matches []FuzzyMatch
	queryLower := strings.ToLower(query)

	for i, item := range items {
		score, indices := ff.calculateScore(queryLower, strings.ToLower(item))
		if score >= 0 {
			var d interface{}
			if i < len(data) {
				d = data[i]
			}
			matches = append(matches, FuzzyMatch{
				Text:    item,
				Score:   score,
				Indices: indices,
				Data:    d,
			})
		}
	}

	// Sort by score (higher is better)
	sort.Slice(matches, func(i, j int) bool {
		return matches[i].Score > matches[j].Score
	})

	return matches
}

// calculateScore calculates the fuzzy match score
func (ff *FuzzyFinder) calculateScore(query, text string) (int, []int) {
	if len(query) == 0 {
		return 0, nil
	}

	// Quick check: all query characters must exist
	for _, qc := range query {
		if !strings.ContainsRune(text, qc) {
			return -1, nil
		}
	}

	var indices []int
	score := 0
	queryIdx := 0
	lastMatchIdx := -1
	consecutiveBonus := 0

	for textIdx, tc := range text {
		if queryIdx < len(query) && tc == rune(query[queryIdx]) {
			indices = append(indices, textIdx)

			// Base match score
			matchScore := 10

			// Bonus for consecutive matches
			if lastMatchIdx == textIdx-1 {
				consecutiveBonus++
				matchScore += consecutiveBonus * 5
			} else {
				consecutiveBonus = 0
			}

			// Bonus for start of word
			if textIdx == 0 {
				matchScore += 15
			} else if textIdx > 0 {
				prevChar := rune(text[textIdx-1])
				if unicode.IsSpace(prevChar) || prevChar == '/' || prevChar == '-' || prevChar == '_' {
					matchScore += 10
				}
				// CamelCase boundary
				if unicode.IsUpper(tc) && unicode.IsLower(prevChar) {
					matchScore += 8
				}
			}

			// Penalty for distance from last match
			if lastMatchIdx >= 0 && textIdx-lastMatchIdx > 1 {
				matchScore -= (textIdx - lastMatchIdx - 1) * 2
			}

			score += matchScore
			lastMatchIdx = textIdx
			queryIdx++
		}
	}

	// Check if all query characters were matched
	if queryIdx < len(query) {
		return -1, nil
	}

	// Bonus for exact match
	if text == query {
		score += 100
	}

	// Bonus for prefix match
	if strings.HasPrefix(text, query) {
		score += 50
	}

	return score, indices
}

// highlightMatch returns text with matched characters highlighted
func (ff *FuzzyFinder) highlightMatch(match FuzzyMatch) string {
	if len(match.Indices) == 0 {
		return match.Text
	}

	var result strings.Builder
	indexSet := make(map[int]bool)
	for _, idx := range match.Indices {
		indexSet[idx] = true
	}

	for i, c := range match.Text {
		if indexSet[i] {
			result.WriteString("[yellow::b]")
			result.WriteRune(c)
			result.WriteString("[-:-:-]")
		} else {
			result.WriteRune(c)
		}
	}

	return result.String()
}

// CommandPaletteItem represents a command in the command palette
type CommandPaletteItem struct {
	Name        string
	Description string
	Shortcut    string
	Action      func()
}

// CommandPalette provides a command palette (like VS Code Ctrl+Shift+P)
type CommandPalette struct {
	finder   *FuzzyFinder
	commands []CommandPaletteItem
}

// NewCommandPalette creates a new command palette
func NewCommandPalette(app *App) *CommandPalette {
	cp := &CommandPalette{
		finder: NewFuzzyFinder(app),
	}

	// Register default commands
	cp.commands = []CommandPaletteItem{
		{Name: "View: Pods", Description: "Switch to Pods view", Shortcut: "1", Action: func() { app.setTab(0) }},
		{Name: "View: Deployments", Description: "Switch to Deployments view", Shortcut: "2", Action: func() { app.setTab(1) }},
		{Name: "View: Services", Description: "Switch to Services view", Shortcut: "3", Action: func() { app.setTab(4) }},
		{Name: "View: StatefulSets", Description: "Switch to StatefulSets view", Shortcut: "4", Action: func() { app.setTab(2) }},
		{Name: "View: DaemonSets", Description: "Switch to DaemonSets view", Shortcut: "5", Action: func() { app.setTab(3) }},
		{Name: "View: Ingresses", Description: "Switch to Ingresses view", Shortcut: "6", Action: func() { app.setTab(5) }},
		{Name: "View: ConfigMaps", Description: "Switch to ConfigMaps view", Shortcut: "7", Action: func() { app.setTab(6) }},
		{Name: "View: Secrets", Description: "Switch to Secrets view", Shortcut: "8", Action: func() { app.setTab(7) }},
		{Name: "View: CronJobs", Description: "Switch to CronJobs view", Shortcut: "9", Action: func() { app.setTab(8) }},
		{Name: "View: Jobs", Description: "Switch to Jobs view", Shortcut: "0", Action: func() { app.setTab(9) }},
		{Name: "View: Nodes", Description: "Switch to Nodes view", Shortcut: "", Action: func() { app.setTab(10) }},
		{Name: "View: Resource Map", Description: "Show visual resource map", Shortcut: "", Action: func() { app.setTab(11) }},
		{Name: "Namespace: Select", Description: "Change current namespace", Shortcut: "n", Action: func() { app.changeNamespace() }},
		{Name: "Resource: View YAML", Description: "Show YAML for selected resource", Shortcut: "Enter", Action: func() { app.viewYAML() }},
		{Name: "Resource: Describe", Description: "Describe selected resource", Shortcut: "d", Action: func() { app.describeResource() }},
		{Name: "Resource: Delete", Description: "Delete selected resource", Shortcut: "Ctrl+D", Action: func() { app.deleteResource() }},
		{Name: "Resource: Shell", Description: "Open shell in pod", Shortcut: "s", Action: func() { app.shellIntoPod() }},
		{Name: "Graph: Canvas View", Description: "Show interactive canvas graph", Shortcut: "i", Action: func() { app.showCanvasGraphView() }},
		{Name: "Graph: Export", Description: "Export graph visualization", Shortcut: "g", Action: func() { app.exportCurrentResourceGraph() }},
		{Name: "Refresh", Description: "Refresh current view", Shortcut: "r", Action: func() { app.refreshCurrentTab() }},
		{Name: "Help", Description: "Show help", Shortcut: "?", Action: func() { app.showHelp() }},
		{Name: "Quit", Description: "Exit application", Shortcut: "q", Action: func() { app.app.Stop() }},
	}

	return cp
}

// Show displays the command palette
func (cp *CommandPalette) Show() {
	items := make([]string, len(cp.commands))
	data := make([]interface{}, len(cp.commands))
	for i, cmd := range cp.commands {
		items[i] = cmd.Name
		if cmd.Shortcut != "" {
			items[i] += " [gray](" + cmd.Shortcut + ")[-]"
		}
		data[i] = cmd
	}

	cp.finder.SetItems(items, data)
	cp.finder.SetOnSelect(func(item string, d interface{}) {
		if cmd, ok := d.(CommandPaletteItem); ok && cmd.Action != nil {
			cmd.Action()
		}
	})
	cp.finder.Show("Command Palette")
}

// ResourceFinder provides fuzzy finding for resources
type ResourceFinder struct {
	finder *FuzzyFinder
	app    *App
}

// NewResourceFinder creates a new resource finder
func NewResourceFinder(app *App) *ResourceFinder {
	return &ResourceFinder{
		finder: NewFuzzyFinder(app),
		app:    app,
	}
}

// ShowPodFinder shows a fuzzy finder for pods across all namespaces
func (rf *ResourceFinder) ShowPodFinder() {
	go func() {
		// Fetch all pods
		pods, err := rf.app.clientset.CoreV1().Pods("").List(rf.app.ctx, metav1.ListOptions{})
		if err != nil {
			return
		}

		items := make([]string, len(pods.Items))
		data := make([]interface{}, len(pods.Items))
		for i, pod := range pods.Items {
			items[i] = pod.Namespace + "/" + pod.Name
			data[i] = pod
		}

		rf.app.app.QueueUpdateDraw(func() {
			rf.finder.SetItems(items, data)
			rf.finder.SetOnSelect(func(item string, d interface{}) {
				parts := strings.SplitN(item, "/", 2)
				if len(parts) == 2 {
					rf.app.namespace = parts[0]
					rf.app.setTab(0) // Switch to pods view
					// TODO: Select the specific pod
				}
			})
			rf.finder.Show("Find Pod")
		})
	}()
}

// ShowResourceFinder shows a fuzzy finder for all resource types
func (rf *ResourceFinder) ShowResourceFinder() {
	resourceTypes := []string{
		"pods", "deployments", "statefulsets", "daemonsets",
		"services", "ingresses", "configmaps", "secrets",
		"cronjobs", "jobs", "nodes", "resourcemap",
	}

	rf.finder.SetItems(resourceTypes, nil)
	rf.finder.SetOnSelect(func(item string, d interface{}) {
		viewMap := map[string]int{
			"pods":         0,
			"deployments":  1,
			"statefulsets": 2,
			"daemonsets":   3,
			"services":     4,
			"ingresses":    5,
			"configmaps":   6,
			"secrets":      7,
			"cronjobs":     8,
			"jobs":         9,
			"nodes":        10,
			"resourcemap":  11,
		}
		if viewIdx, ok := viewMap[item]; ok {
			rf.app.setTab(viewIdx)
		}
	})
	rf.finder.Show("Find Resource Type")
}
