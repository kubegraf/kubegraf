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
)

// CanvasNode represents a node in the canvas graph
type CanvasNode struct {
	ID       string
	Name     string
	Type     string
	X        int
	Y        int
	Width    int
	Height   int
	Color    tcell.Color
	Icon     string
	Children []string
}

// CanvasGraph represents the graph state for canvas rendering
type CanvasGraph struct {
	Nodes      map[string]*CanvasNode
	OffsetX    int
	OffsetY    int
	ZoomLevel  int
	RootID     string
	view       *tview.Box
	app        *App
	resourceID string
}

// NewCanvasGraph creates a new canvas graph
func NewCanvasGraph(app *App, resourceID string) *CanvasGraph {
	return &CanvasGraph{
		Nodes:      make(map[string]*CanvasNode),
		OffsetX:    0,
		OffsetY:    2,
		ZoomLevel:  1,
		app:        app,
		resourceID: resourceID,
	}
}

// buildCanvasGraph builds the canvas graph from ResourceNode tree
func (cg *CanvasGraph) buildFromResourceNode(root *ResourceNode) {
	// Calculate layout positions
	cg.layoutTree(root, 5, 2, 0)
}

// layoutTree performs hierarchical layout
func (cg *CanvasGraph) layoutTree(node *ResourceNode, x, y, depth int) string {
	nodeID := fmt.Sprintf("%s-%s", node.Type, node.Name)

	// Determine color based on resource type
	color := cg.getColorForType(node.Type)

	// Calculate node dimensions
	width := len(node.Name) + 6
	if width < 20 {
		width = 20
	}
	height := 4

	// Create canvas node
	cn := &CanvasNode{
		ID:       nodeID,
		Name:     node.Name,
		Type:     node.Type,
		X:        x,
		Y:        y,
		Width:    width,
		Height:   height,
		Color:    color,
		Icon:     node.Icon,
		Children: []string{},
	}

	cg.Nodes[nodeID] = cn

	if depth == 0 {
		cg.RootID = nodeID
	}

	// Layout children
	childY := y
	for _, child := range node.Children {
		childID := cg.layoutTree(child, x+width+4, childY, depth+1)
		cn.Children = append(cn.Children, childID)
		childY += 6
	}

	return nodeID
}

// getColorForType returns the color for a resource type
func (cg *CanvasGraph) getColorForType(resourceType string) tcell.Color {
	switch resourceType {
	case "Ingress":
		return tcell.ColorRed
	case "Service":
		return tcell.ColorGreen
	case "Deployment":
		return tcell.ColorOrange
	case "ReplicaSet":
		return tcell.ColorPurple
	case "Pod":
		return tcell.ColorTeal
	case "ConfigMap":
		return tcell.ColorGray
	case "Secret":
		return tcell.ColorDarkRed
	default:
		return tcell.ColorWhite
	}
}

// showCanvasGraph displays the canvas graph in terminal
func (a *App) showCanvasGraph(resourceID string) {
	parts := strings.Split(resourceID, "/")
	if len(parts) != 2 {
		a.showError("Invalid resource ID")
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
		a.showError(fmt.Sprintf("Failed to build tree: %v", err))
		return
	}

	// Create canvas graph
	cg := NewCanvasGraph(a, resourceID)
	cg.buildFromResourceNode(tree)

	// Create canvas view
	canvasView := tview.NewBox().
		SetBorder(true).
		SetTitle(fmt.Sprintf(" Terminal Canvas Graph: %s/%s (arrows: pan, +/-: zoom, Esc: close) ", resourceType, resourceName))

	cg.view = canvasView

	// Set draw function
	canvasView.SetDrawFunc(func(screen tcell.Screen, x, y, width, height int) (int, int, int, int) {
		// Draw graph
		cg.draw(screen, x+1, y+1, width-2, height-2)
		return x, y, width, height
	})

	// Set input capture for pan/zoom
	canvasView.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		switch event.Key() {
		case tcell.KeyEscape:
			a.pages.HidePage("canvas")
			a.app.SetFocus(a.table)
			return nil
		case tcell.KeyUp:
			cg.OffsetY += 2
			a.app.Draw()
			return nil
		case tcell.KeyDown:
			cg.OffsetY -= 2
			a.app.Draw()
			return nil
		case tcell.KeyLeft:
			cg.OffsetX += 2
			a.app.Draw()
			return nil
		case tcell.KeyRight:
			cg.OffsetX -= 2
			a.app.Draw()
			return nil
		case tcell.KeyRune:
			switch event.Rune() {
			case '+', '=':
				if cg.ZoomLevel < 3 {
					cg.ZoomLevel++
				}
				a.app.Draw()
				return nil
			case '-', '_':
				if cg.ZoomLevel > 0 {
					cg.ZoomLevel--
				}
				a.app.Draw()
				return nil
			case 'r', 'R':
				cg.OffsetX = 0
				cg.OffsetY = 2
				cg.ZoomLevel = 1
				a.app.Draw()
				return nil
			}
		}
		return event
	})

	// Remove old canvas page if it exists
	if a.pages.HasPage("canvas") {
		a.pages.RemovePage("canvas")
	}

	a.pages.AddPage("canvas", canvasView, true, true)
	a.pages.ShowPage("canvas")
	a.app.SetFocus(canvasView)
}

// draw renders the graph on the screen
func (cg *CanvasGraph) draw(screen tcell.Screen, x, y, width, height int) {
	// Draw legend first
	cg.drawLegend(screen, x, y, width)

	// Draw help text
	helpText := "Controls: ↑↓←→ Pan | +/- Zoom | R Reset | Esc Close"
	cg.drawText(screen, x+width-len(helpText)-2, y+height-1, helpText, tcell.ColorYellow, tcell.ColorBlack)

	// Draw all connections first (so they appear behind nodes)
	for _, node := range cg.Nodes {
		for _, childID := range node.Children {
			if child, ok := cg.Nodes[childID]; ok {
				cg.drawConnection(screen, x, y, node, child)
			}
		}
	}

	// Draw all nodes
	for _, node := range cg.Nodes {
		cg.drawNode(screen, x, y, node)
	}

	// Draw zoom indicator
	zoomText := fmt.Sprintf("Zoom: %d%%", (cg.ZoomLevel+1)*100)
	cg.drawText(screen, x+2, y+height-1, zoomText, tcell.ColorAqua, tcell.ColorBlack)
}

// drawNode draws a node box
func (cg *CanvasGraph) drawNode(screen tcell.Screen, baseX, baseY int, node *CanvasNode) {
	// Apply offset and zoom
	scale := float64(cg.ZoomLevel + 1)
	nx := baseX + cg.OffsetX + int(float64(node.X)*scale)
	ny := baseY + cg.OffsetY + int(float64(node.Y)*scale)
	nw := int(float64(node.Width) * scale)
	nh := int(float64(node.Height) * scale)

	// Draw box border
	cg.drawBox(screen, nx, ny, nw, nh, node.Color)

	// Draw icon and name
	label := fmt.Sprintf("%s %s", node.Icon, node.Name)
	if len(label) > nw-2 {
		label = label[:nw-2]
	}
	labelX := nx + (nw-len(label))/2
	labelY := ny + nh/2
	cg.drawText(screen, labelX, labelY, label, tcell.ColorWhite, tcell.ColorBlack)

	// Draw type below
	if nh > 3 {
		typeLabel := node.Type
		if len(typeLabel) > nw-2 {
			typeLabel = typeLabel[:nw-2]
		}
		typeX := nx + (nw-len(typeLabel))/2
		cg.drawText(screen, typeX, labelY+1, typeLabel, tcell.ColorGray, tcell.ColorBlack)
	}
}

// drawBox draws a box with borders
func (cg *CanvasGraph) drawBox(screen tcell.Screen, x, y, width, height int, color tcell.Color) {
	style := tcell.StyleDefault.Foreground(color).Bold(true)

	// Top border
	screen.SetContent(x, y, '┌', nil, style)
	for i := 1; i < width-1; i++ {
		screen.SetContent(x+i, y, '─', nil, style)
	}
	screen.SetContent(x+width-1, y, '┐', nil, style)

	// Side borders
	for i := 1; i < height-1; i++ {
		screen.SetContent(x, y+i, '│', nil, style)
		screen.SetContent(x+width-1, y+i, '│', nil, style)
	}

	// Bottom border
	screen.SetContent(x, y+height-1, '└', nil, style)
	for i := 1; i < width-1; i++ {
		screen.SetContent(x+i, y+height-1, '─', nil, style)
	}
	screen.SetContent(x+width-1, y+height-1, '┘', nil, style)
}

// drawConnection draws a line between two nodes
func (cg *CanvasGraph) drawConnection(screen tcell.Screen, baseX, baseY int, from, to *CanvasNode) {
	scale := float64(cg.ZoomLevel + 1)

	// Calculate connection points (right middle of from, left middle of to)
	x1 := baseX + cg.OffsetX + int(float64(from.X+from.Width)*scale)
	y1 := baseY + cg.OffsetY + int(float64(from.Y+from.Height/2)*scale)
	x2 := baseX + cg.OffsetX + int(float64(to.X)*scale)
	y2 := baseY + cg.OffsetY + int(float64(to.Y+to.Height/2)*scale)

	style := tcell.StyleDefault.Foreground(tcell.ColorDarkCyan)

	// Draw horizontal line from node
	for x := x1; x < x2-2; x++ {
		screen.SetContent(x, y1, '─', nil, style)
	}

	// Draw arrow
	screen.SetContent(x2-2, y2, '─', nil, style)
	screen.SetContent(x2-1, y2, '►', nil, style)

	// Draw vertical connector if needed
	if y1 != y2 {
		midX := (x1 + x2) / 2
		if y1 < y2 {
			for y := y1; y <= y2; y++ {
				if y == y1 {
					screen.SetContent(midX, y, '┐', nil, style)
				} else if y == y2 {
					screen.SetContent(midX, y, '└', nil, style)
				} else {
					screen.SetContent(midX, y, '│', nil, style)
				}
			}
		} else {
			for y := y2; y <= y1; y++ {
				if y == y2 {
					screen.SetContent(midX, y, '┌', nil, style)
				} else if y == y1 {
					screen.SetContent(midX, y, '┘', nil, style)
				} else {
					screen.SetContent(midX, y, '│', nil, style)
				}
			}
		}
	}
}

// drawText draws text on screen
func (cg *CanvasGraph) drawText(screen tcell.Screen, x, y int, text string, fg, bg tcell.Color) {
	style := tcell.StyleDefault.Foreground(fg).Background(bg)
	for i, ch := range text {
		screen.SetContent(x+i, y, ch, nil, style)
	}
}

// showCanvasGraphView shows the canvas graph for the selected resource
func (a *App) showCanvasGraphView() {
	if a.tabs[a.currentTab] != ResourceMap {
		a.showError("Canvas graph is only available on the ResourceMap tab")
		return
	}

	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		a.showError("Please select a resource first (Ingress, Deployment, or Service)")
		return
	}
	resourceID := a.tableData.RowIDs[a.selectedRow]
	a.tableData.mx.RUnlock()

	a.showCanvasGraph(resourceID)
}

// drawLegend draws the legend
func (cg *CanvasGraph) drawLegend(screen tcell.Screen, x, y, width int) {
	legend := []struct {
		color tcell.Color
		label string
	}{
		{tcell.ColorRed, "Ingress"},
		{tcell.ColorGreen, "Service"},
		{tcell.ColorOrange, "Deployment"},
		{tcell.ColorPurple, "ReplicaSet"},
		{tcell.ColorTeal, "Pod"},
		{tcell.ColorGray, "ConfigMap"},
		{tcell.ColorDarkRed, "Secret"},
	}

	legendX := x + width - 45
	legendY := y + 1

	cg.drawText(screen, legendX, legendY, "Legend:", tcell.ColorYellow, tcell.ColorBlack)
	legendY++

	for _, item := range legend {
		style := tcell.StyleDefault.Foreground(item.color).Bold(true)
		screen.SetContent(legendX, legendY, '■', nil, style)
		cg.drawText(screen, legendX+2, legendY, item.label, tcell.ColorWhite, tcell.ColorBlack)
		legendY++
	}
}
