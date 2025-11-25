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

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

// handleKeyPress handles keyboard input (k9s style)
func (a *App) handleKeyPress(event *tcell.EventKey) *tcell.EventKey {
	key := event.Key()

	// Check if YAML view is open
	if a.pages.HasPage("yaml") {
		name, _ := a.pages.GetFrontPage()
		if name == "yaml" {
			if key == tcell.KeyEscape {
				a.pages.HidePage("yaml")
				a.app.SetFocus(a.table)
				return nil
			}
			return event
		}
	}

	// Pass through up/down for table navigation (k9s pattern)
	if key == tcell.KeyUp || key == tcell.KeyDown {
		return event
	}

	switch key {
	case tcell.KeyTab:
		go func() { a.switchTab(1) }()
		return nil
	case tcell.KeyBacktab:
		go func() { a.switchTab(-1) }()
		return nil
	case tcell.KeyRight:
		go func() { a.switchTab(1) }()
		return nil
	case tcell.KeyLeft:
		go func() { a.switchTab(-1) }()
		return nil
	case tcell.KeyEnter:
		a.viewYAML()
		return nil
	case tcell.KeyCtrlD:
		a.deleteResource()
		return nil
	case tcell.KeyRune:
		// Handle character keys (k9s style - convert rune to key)
		r := event.Rune()
		switch r {
		case 'q', 'Q':
			a.Shutdown()
			return nil
		case 'r', 'R':
			a.refreshCurrentTab()
			return nil
		case 'n', 'N':
			a.changeNamespace()
			return nil
		case 'd', 'D':
			a.describeResource()
			return nil
		case 'h', 'H':
			go func() { a.switchTab(-1) }()
			return nil
		case 'l', 'L':
			go func() { a.switchTab(1) }()
			return nil
		case '1':
			go func() {
				a.currentTab = 0
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '2':
			go func() {
				if len(a.tabs) > 1 {
					a.currentTab = 1
					a.updateTabBar()
					a.refreshCurrentTab()
				}
			}()
			return nil
		case '3':
			go func() {
				a.currentTab = 2
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '4':
			go func() {
				a.currentTab = 3
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '5':
			go func() {
				a.currentTab = 4
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '6':
			go func() {
				a.currentTab = 5
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '7':
			go func() {
				a.currentTab = 6
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case 's', 'S':
			a.shellIntoPod()
			return nil
		case 'g', 'G':
			a.exportCurrentResourceGraph()
			return nil
		case '?':
			a.showHelp()
			return nil
		}
	case tcell.KeyCtrlC:
		a.Shutdown()
		return nil
	case tcell.KeyCtrlR:
		a.refreshCurrentTab()
		return nil
	}
	return event
}

// switchTab switches to a different tab
func (a *App) switchTab(direction int) {
	a.currentTab += direction
	if a.currentTab < 0 {
		a.currentTab = len(a.tabs) - 1
	} else if a.currentTab >= len(a.tabs) {
		a.currentTab = 0
	}
	a.updateTabBar()
	a.refreshCurrentTab()
}

// refreshCurrentTab refreshes the current tab
func (a *App) refreshCurrentTab() {
	switch a.tabs[a.currentTab] {
	case ResourcePod:
		a.renderPods()
	case ResourceDeployment:
		a.renderDeployments()
	case ResourceService:
		a.renderServices()
	case ResourceIngress:
		a.renderIngresses()
	case ResourceConfigMap:
		a.renderConfigMaps()
	case ResourceSecret:
		a.renderSecrets()
	case ResourceMap:
		a.renderResourceMap()
	}
	a.table.SetTitle(fmt.Sprintf(" %s ", a.tabs[a.currentTab]))
}

// changeNamespace prompts for namespace change
func (a *App) changeNamespace() {
	inputField := tview.NewInputField().
		SetLabel("Enter namespace: ").
		SetText(a.namespace).
		SetFieldWidth(30)

	inputField.SetDoneFunc(func(key tcell.Key) {
		if key == tcell.KeyEnter {
			a.namespace = inputField.GetText()
			a.pages.HidePage("input")
			a.updateStatusBar()
			a.refreshCurrentTab()
		} else if key == tcell.KeyEscape {
			a.pages.HidePage("input")
		}
	})

	a.pages.AddPage("input", inputField, true, true)
	a.app.SetFocus(inputField)
}
