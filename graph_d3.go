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
	"path/filepath"
	"strings"
	"time"
)

// D3Node represents a node in D3.js format
type D3Node struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Type  string `json:"type"`
	Group int    `json:"group"`
	Icon  string `json:"icon"`
}

// D3Link represents an edge in D3.js format
type D3Link struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Value  int    `json:"value"`
}

// D3Graph represents the complete graph structure
type D3Graph struct {
	Nodes []D3Node `json:"nodes"`
	Links []D3Link `json:"links"`
}

// buildD3Graph converts ResourceNode tree to D3.js format
func (a *App) buildD3Graph(root *ResourceNode) *D3Graph {
	graph := &D3Graph{
		Nodes: []D3Node{},
		Links: []D3Link{},
	}

	nodeMap := make(map[string]bool)
	a.addD3Nodes(root, graph, nodeMap, "")

	return graph
}

// addD3Nodes recursively adds nodes and links
func (a *App) addD3Nodes(node *ResourceNode, graph *D3Graph, nodeMap map[string]bool, parentID string) {
	nodeID := fmt.Sprintf("%s-%s", node.Type, node.Name)

	if !nodeMap[nodeID] {
		group := 1
		switch node.Type {
		case "Ingress":
			group = 1
		case "Service":
			group = 2
		case "Deployment":
			group = 3
		case "ReplicaSet":
			group = 4
		case "Pod":
			group = 5
		case "ConfigMap":
			group = 6
		case "Secret":
			group = 7
		}

		graph.Nodes = append(graph.Nodes, D3Node{
			ID:    nodeID,
			Name:  node.Name,
			Type:  node.Type,
			Group: group,
			Icon:  node.Icon,
		})
		nodeMap[nodeID] = true
	}

	if parentID != "" {
		graph.Links = append(graph.Links, D3Link{
			Source: parentID,
			Target: nodeID,
			Value:  1,
		})
	}

	for _, child := range node.Children {
		a.addD3Nodes(child, graph, nodeMap, nodeID)
	}
}

// exportD3Graph exports interactive D3.js force-directed graph
func (a *App) exportD3Graph(resourceID string) error {
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

	// Build D3 graph
	graph := a.buildD3Graph(tree)
	jsonData, err := json.MarshalIndent(graph, "", "  ")
	if err != nil {
		return err
	}

	// Create output directory
	outputDir := filepath.Join(os.TempDir(), "kubegraf")
	os.MkdirAll(outputDir, 0755)

	// Generate HTML with D3.js
	htmlFile := filepath.Join(outputDir, fmt.Sprintf("%s-%s-d3.html", resourceType, resourceName))
	html := a.generateD3HTML(string(jsonData), resourceType, resourceName)
	if err := os.WriteFile(htmlFile, []byte(html), 0644); err != nil {
		return err
	}

	// Open in browser
	return a.openInBrowser(htmlFile)
}

// generateD3HTML creates an interactive D3.js visualization
func (a *App) generateD3HTML(graphJSON, resourceType, resourceName string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>KubeGraf - %s/%s Interactive Graph</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            overflow: hidden;
        }

        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            z-index: 1000;
            text-align: center;
        }

        .controls {
            position: fixed;
            bottom: 20px;
            left: 50%%;
            transform: translateX(-50%%);
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 10px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }

        .btn {
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
        }

        svg {
            width: 100%%;
            height: 100vh;
        }

        .node {
            cursor: move;
            stroke-width: 2;
        }

        .node:hover {
            stroke-width: 4;
            filter: brightness(1.2);
        }

        .link {
            stroke: #999;
            stroke-opacity: 0.6;
            stroke-width: 2;
            marker-end: url(#arrow);
        }

        .label {
            font-size: 12px;
            font-weight: bold;
            fill: white;
            text-anchor: middle;
            pointer-events: none;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }

        .legend {
            position: fixed;
            top: 100px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 10px;
            color: white;
            z-index: 1000;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 5px 0;
        }

        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 50%%;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 KubeGraf Interactive Graph</h1>
        <div>%s → %s | Drag nodes to rearrange | Generated: %s</div>
    </div>

    <div class="legend">
        <strong>Resource Types</strong>
        <div class="legend-item">
            <div class="legend-color" style="background: #e74c3c;"></div>
            <span>🚪 Ingress</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #2ecc71;"></div>
            <span>🌐 Service</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #f39c12;"></div>
            <span>🚀 Deployment</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #9b59b6;"></div>
            <span>📦 ReplicaSet</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #1abc9c;"></div>
            <span>🎯 Pod</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #34495e;"></div>
            <span>⚙️ ConfigMap</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #c0392b;"></div>
            <span>🔐 Secret</span>
        </div>
    </div>

    <div class="controls">
        <button class="btn" onclick="resetSimulation()">↺ Reset</button>
        <button class="btn" onclick="pauseSimulation()">⏸ Pause</button>
        <button class="btn" onclick="resumeSimulation()">▶ Resume</button>
        <button class="btn" onclick="zoomIn()">🔍+ Zoom In</button>
        <button class="btn" onclick="zoomOut()">🔍- Zoom Out</button>
    </div>

    <svg id="graph"></svg>

    <script>
        const data = %s;

        const width = window.innerWidth;
        const height = window.innerHeight;

        const colorScale = d3.scaleOrdinal()
            .domain([1, 2, 3, 4, 5, 6, 7])
            .range(['#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#c0392b']);

        const svg = d3.select("#graph");

        // Add arrow marker
        svg.append("defs").append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#999");

        const g = svg.append("g");

        const zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(40));

        const link = g.append("g")
            .selectAll("line")
            .data(data.links)
            .join("line")
            .attr("class", "link");

        const node = g.append("g")
            .selectAll("circle")
            .data(data.nodes)
            .join("circle")
            .attr("class", "node")
            .attr("r", 20)
            .attr("fill", d => colorScale(d.group))
            .attr("stroke", "#fff")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        const label = g.append("g")
            .selectAll("text")
            .data(data.nodes)
            .join("text")
            .attr("class", "label")
            .text(d => d.icon + " " + d.name)
            .attr("dy", 40);

        node.append("title")
            .text(d => d.type + ": " + d.name);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            label
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function resetSimulation() {
            data.nodes.forEach(d => {
                d.fx = null;
                d.fy = null;
            });
            simulation.alpha(1).restart();
        }

        function pauseSimulation() {
            simulation.stop();
        }

        function resumeSimulation() {
            simulation.restart();
        }

        let currentZoom = 1;
        function zoomIn() {
            currentZoom *= 1.2;
            svg.transition().duration(300).call(zoom.scaleTo, currentZoom);
        }

        function zoomOut() {
            currentZoom /= 1.2;
            svg.transition().duration(300).call(zoom.scaleTo, currentZoom);
        }
    </script>
</body>
</html>`, resourceType, resourceName, resourceType, resourceName, time.Now().Format("2006-01-02 15:04:05"), graphJSON)
}
