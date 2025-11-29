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
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/awalterschulze/gographviz"
	"github.com/rivo/tview"
)

// buildGraphViz builds a Graphviz DOT graph from a ResourceNode tree
func (a *App) buildGraphViz(root *ResourceNode) *gographviz.Graph {
	g := gographviz.NewGraph()
	g.SetName("G")
	g.SetDir(true) // Directed graph

	// Set graph attributes for better visualization
	g.AddAttr("G", "rankdir", "TB") // Top to Bottom layout
	g.AddAttr("G", "bgcolor", "\"#1e1e1e\"") // Dark background
	g.AddAttr("G", "splines", "ortho") // Orthogonal edges
	g.AddAttr("G", "nodesep", "0.5")
	g.AddAttr("G", "ranksep", "0.8")

	// Add nodes recursively
	nodeID := 0
	a.addGraphNode(g, root, &nodeID, "")

	return g
}

// addGraphNode recursively adds nodes and edges to the graph
func (a *App) addGraphNode(g *gographviz.Graph, node *ResourceNode, nodeID *int, parentID string) string {
	currentID := fmt.Sprintf("node%d", *nodeID)
	*nodeID++

	// Determine node shape and color based on resource type
	shape := "box"
	fillcolor := "#3498db"
	fontcolor := "white"

	switch node.Type {
	case "Ingress":
		shape = "house"
		fillcolor = "#e74c3c"
	case "Service":
		shape = "ellipse"
		fillcolor = "#2ecc71"
	case "Deployment":
		shape = "box3d"
		fillcolor = "#f39c12"
	case "ReplicaSet":
		shape = "folder"
		fillcolor = "#9b59b6"
	case "Pod":
		shape = "cylinder"
		fillcolor = "#1abc9c"
	case "ConfigMap":
		shape = "note"
		fillcolor = "#34495e"
	case "Secret":
		shape = "octagon"
		fillcolor = "#c0392b"
	case "ServiceAccount":
		shape = "diamond"
		fillcolor = "#16a085"
	}

	// Build label with metadata
	label := fmt.Sprintf("%s\\n%s", node.Icon+" "+node.Type, node.Name)
	if node.Status != "" {
		label += fmt.Sprintf("\\n[%s]", node.Status)
	}
	if len(node.Metadata) > 0 {
		for k, v := range node.Metadata {
			if v != "" {
				label += fmt.Sprintf("\\n%s: %s", k, v)
			}
		}
	}

	// Add node with attributes
	attrs := map[string]string{
		"label":     fmt.Sprintf("\"%s\"", label),
		"shape":     shape,
		"style":     "\"filled,rounded\"",
		"fillcolor": fmt.Sprintf("\"%s\"", fillcolor),
		"fontcolor": fmt.Sprintf("\"%s\"", fontcolor),
		"fontname":  "\"Arial Bold\"",
		"fontsize":  "12",
		"margin":    "0.3",
	}

	g.AddNode("G", currentID, attrs)

	// Add edge from parent if exists
	if parentID != "" {
		edgeAttrs := map[string]string{
			"color":     "\"#95a5a6\"",
			"penwidth":  "2",
			"arrowsize": "1.2",
		}
		g.AddEdge(parentID, currentID, true, edgeAttrs)
	}

	// Add children
	for _, child := range node.Children {
		a.addGraphNode(g, child, nodeID, currentID)
	}

	return currentID
}

// exportGraphVizDOT exports the graph to a DOT file
func (a *App) exportGraphVizDOT(resourceID string) error {
	parts := strings.Split(resourceID, "/")
	if len(parts) != 2 {
		return fmt.Errorf("invalid resource ID")
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
		return fmt.Errorf("resource mapping not supported for %s", resourceType)
	}

	if err != nil {
		return err
	}

	// Build Graphviz graph
	g := a.buildGraphViz(tree)

	// Create output directory
	outputDir := filepath.Join(os.TempDir(), "kubegraf")
	os.MkdirAll(outputDir, 0755)

	// Write DOT file
	dotFile := filepath.Join(outputDir, fmt.Sprintf("%s-%s.dot", resourceType, resourceName))
	if err := os.WriteFile(dotFile, []byte(g.String()), 0644); err != nil {
		return fmt.Errorf("failed to write DOT file: %w", err)
	}

	// Generate SVG using Graphviz if available
	svgFile := filepath.Join(outputDir, fmt.Sprintf("%s-%s.svg", resourceType, resourceName))
	cmd := exec.Command("dot", "-Tsvg", dotFile, "-o", svgFile)
	if err := cmd.Run(); err == nil {
		// Generate HTML wrapper for interactive viewing
		htmlFile := filepath.Join(outputDir, fmt.Sprintf("%s-%s.html", resourceType, resourceName))
		html := a.generateInteractiveHTML(svgFile, resourceType, resourceName)
		if err := os.WriteFile(htmlFile, []byte(html), 0644); err == nil {
			// Open in browser
			a.openInBrowser(htmlFile)
			return nil
		}
	}

	// If Graphviz is not available, just open the DOT file
	a.showInfo(fmt.Sprintf("Graph exported to: %s\nInstall Graphviz to view visualization:\n  brew install graphviz (macOS)\n  apt install graphviz (Linux)", dotFile))
	return nil
}

// generateInteractiveHTML generates an interactive HTML page with the SVG
func (a *App) generateInteractiveHTML(svgPath, resourceType, resourceName string) string {
	svgContent, _ := os.ReadFile(svgPath)

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>KubeGraf - %s/%s Resource Map</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
        }
        .header {
            color: white;
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            padding: 30px;
            max-width: 95%%;
            overflow: auto;
        }
        .controls {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background: #667eea;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }
        .btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .graph-container {
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            background: #1e1e1e;
            padding: 20px;
            overflow: auto;
            min-height: 600px;
        }
        svg {
            max-width: 100%%;
            height: auto;
            display: block;
            margin: 0 auto;
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
            font-size: 14px;
            color: #666;
        }
        .legend {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 KubeGraf Resource Map</h1>
        <div class="subtitle">%s → %s</div>
        <div style="font-size: 0.9em; margin-top: 10px; opacity: 0.8;">
            Generated: %s
        </div>
    </div>

    <div class="container">
        <div class="controls">
            <button class="btn" onclick="zoomIn()">🔍 Zoom In</button>
            <button class="btn" onclick="zoomOut()">🔍 Zoom Out</button>
            <button class="btn" onclick="resetZoom()">↺ Reset</button>
            <button class="btn" onclick="downloadSVG()">💾 Download SVG</button>
        </div>

        <div class="graph-container" id="graph">
            %s
        </div>

        <div class="info">
            <strong>💡 Interactive Controls:</strong>
            <ul style="margin-top: 10px; margin-left: 20px;">
                <li>Use zoom buttons to adjust view</li>
                <li>Scroll to pan the graph</li>
                <li>Resource relationships shown with arrows</li>
            </ul>

            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color" style="background: #e74c3c;"></div>
                    <span>Ingress</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #2ecc71;"></div>
                    <span>Service</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #f39c12;"></div>
                    <span>Deployment</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #1abc9c;"></div>
                    <span>Pod</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #34495e;"></div>
                    <span>ConfigMap</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #c0392b;"></div>
                    <span>Secret</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        let scale = 1;
        const graph = document.getElementById('graph');
        const svg = graph.querySelector('svg');

        function zoomIn() {
            scale *= 1.2;
            svg.style.transform = 'scale(' + scale + ')';
        }

        function zoomOut() {
            scale /= 1.2;
            svg.style.transform = 'scale(' + scale + ')';
        }

        function resetZoom() {
            scale = 1;
            svg.style.transform = 'scale(1)';
        }

        function downloadSVG() {
            const svgData = svg.outerHTML;
            const blob = new Blob([svgData], {type: 'image/svg+xml'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = '%s-%s.svg';
            link.click();
        }
    </script>
</body>
</html>`, resourceType, resourceName, resourceType, resourceName, time.Now().Format("2006-01-02 15:04:05"), svgContent, resourceType, resourceName)
}

// openInBrowser opens a file in the default browser
func (a *App) openInBrowser(path string) error {
	// Try different OS-specific commands
	if exec.Command("open", path).Run() == nil { // macOS
		return nil
	}
	if exec.Command("xdg-open", path).Run() == nil { // Linux
		return nil
	}
	if exec.Command("cmd", "/c", "start", path).Run() == nil { // Windows
		return nil
	}
	return fmt.Errorf("could not open browser")
}

// exportCurrentResourceGraph exports the currently selected resource as a graph
func (a *App) exportCurrentResourceGraph() {
	if a.tabs[a.currentTab] != ResourceMap {
		a.showError("Graph export is only available on the ResourceMap tab")
		return
	}

	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceID := a.tableData.RowIDs[a.selectedRow]
	a.tableData.mx.RUnlock()

	// Show choice modal
	modal := tview.NewModal().
		SetText("Choose graph visualization type:\n\n[cyan]Graphviz[-] - Static SVG with zoom controls\n[cyan]D3.js[-] - Interactive force-directed graph with draggable nodes").
		AddButtons([]string{"Graphviz", "D3.js", "Cancel"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("graph-choice")

			if buttonLabel == "Cancel" {
				return
			}

			// Show loading message
			a.showInfo("Generating interactive graph visualization...\nThis will open in your browser.")

			// Export in background
			go func() {
				var err error
				if buttonLabel == "Graphviz" {
					err = a.exportGraphVizDOT(resourceID)
				} else if buttonLabel == "D3.js" {
					err = a.exportD3Graph(resourceID)
				}

				if err != nil {
					a.app.QueueUpdateDraw(func() {
						a.showError(fmt.Sprintf("Failed to export graph: %v", err))
					})
				}
			}()
		})

	a.pages.AddPage("graph-choice", modal, true, true)
}
