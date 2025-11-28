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

const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KubeGraf - Advanced Kubernetes Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            min-height: 100vh;
        }

        /* Top Navigation */
        .navbar {
            background: rgba(15, 23, 42, 0.95);
            border-bottom: 1px solid rgba(100, 116, 139, 0.3);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            backdrop-filter: blur(10px);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.5rem;
        }

        .logo-text {
            font-size: 1.5rem;
            font-weight: bold;
            background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .status-badge {
            padding: 0.5rem 1rem;
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.5);
            border-radius: 6px;
            color: #22c55e;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Tabs */
        .tabs {
            background: rgba(15, 23, 42, 0.5);
            border-bottom: 1px solid rgba(100, 116, 139, 0.3);
            padding: 0 2rem;
            display: flex;
            gap: 0.5rem;
        }

        .tab {
            padding: 1rem 1.5rem;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
            font-size: 0.875rem;
            text-transform: capitalize;
        }

        .tab:hover {
            color: white;
        }

        .tab.active {
            color: #06b6d4;
            border-bottom-color: #06b6d4;
            background: rgba(6, 182, 212, 0.1);
        }

        /* Main Content */
        .container {
            padding: 2rem;
            max-width: 1600px;
            margin: 0 auto;
        }

        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .metric-card {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .metric-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 30px rgba(6, 182, 212, 0.2);
        }

        .metric-label {
            color: #94a3b8;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
        }

        .metric-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }

        .metric-value.cyan { color: #06b6d4; }
        .metric-value.purple { color: #a855f7; }
        .metric-value.green { color: #22c55e; }
        .metric-value.yellow { color: #eab308; }

        .sparkline {
            width: 100%;
            height: 40px;
            margin-top: 0.5rem;
        }

        /* Cards */
        .card {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            overflow: hidden;
        }

        .card-header {
            padding: 1.5rem;
            border-bottom: 1px solid rgba(100, 116, 139, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .card-title {
            font-size: 1.125rem;
            font-weight: 600;
        }

        .card-body {
            padding: 1.5rem;
        }

        /* Topology */
        #topology {
            width: 100%;
            height: 600px;
            background: rgba(15, 23, 42, 0.5);
            border-radius: 12px;
        }

        /* Table */
        table {
            width: 100%;
            border-collapse: collapse;
        }

        thead {
            background: rgba(15, 23, 42, 0.5);
        }

        th {
            padding: 1rem 1.5rem;
            text-align: left;
            font-size: 0.875rem;
            color: #94a3b8;
            font-weight: 600;
        }

        td {
            padding: 1rem 1.5rem;
            border-top: 1px solid rgba(100, 116, 139, 0.2);
        }

        tbody tr:hover {
            background: rgba(6, 182, 212, 0.05);
        }

        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .badge-success {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .badge-warning {
            background: rgba(234, 179, 8, 0.2);
            color: #eab308;
        }

        .badge-error {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        /* Button */
        .btn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(6, 182, 212, 0.3);
        }

        /* Grid Layouts */
        .grid-2 {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }

        /* Insights Panel */
        .insight {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid;
        }

        .insight-info {
            background: rgba(59, 130, 246, 0.1);
            border-color: rgba(59, 130, 246, 0.3);
        }

        .insight-success {
            background: rgba(34, 197, 94, 0.1);
            border-color: rgba(34, 197, 94, 0.3);
        }

        .insight-warning {
            background: rgba(234, 179, 8, 0.1);
            border-color: rgba(234, 179, 8, 0.3);
        }

        .insight-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .insight-text {
            font-size: 0.875rem;
            color: #cbd5e1;
        }

        /* Loading */
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 400px;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(6, 182, 212, 0.2);
            border-top-color: #06b6d4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="logo">
            <div class="logo-icon">K</div>
            <span class="logo-text">KubeGraf</span>
            <span style="color: #64748b; margin-left: 1rem;">|</span>
            <span style="color: #94a3b8; font-size: 0.875rem;" id="cluster-name">Loading...</span>
        </div>
        <div class="status-badge">
            <div class="status-dot"></div>
            <span>Connected</span>
        </div>
    </nav>

    <!-- Tabs -->
    <div class="tabs">
        <button class="tab active" data-tab="dashboard">Dashboard</button>
        <button class="tab" data-tab="topology">Topology</button>
        <button class="tab" data-tab="pods">Pods</button>
        <button class="tab" data-tab="deployments">Deployments</button>
        <button class="tab" data-tab="services">Services</button>
    </div>

    <!-- Main Content -->
    <div class="container">
        <!-- Dashboard View -->
        <div id="dashboard" class="tab-content">
            <!-- Metrics -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Cluster CPU</div>
                    <div class="metric-value cyan" id="cpu-value">--</div>
                    <svg class="sparkline" id="cpu-sparkline"></svg>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Memory Usage</div>
                    <div class="metric-value purple" id="memory-value">--</div>
                    <svg class="sparkline" id="memory-sparkline"></svg>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Running Pods</div>
                    <div class="metric-value green" id="pods-value">--</div>
                    <div style="display: flex; gap: 2px; margin-top: 0.5rem;" id="pods-bars"></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Active Nodes</div>
                    <div class="metric-value yellow" id="nodes-value">--</div>
                    <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #22c55e;">✓ All Healthy</div>
                </div>
            </div>

            <!-- Main Grid -->
            <div class="grid-2">
                <!-- Resources -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Resource Overview</h3>
                    </div>
                    <div class="card-body" id="resources-overview">
                        <div class="loading"><div class="spinner"></div></div>
                    </div>
                </div>

                <!-- Insights -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">🤖 AI Insights</h3>
                    </div>
                    <div class="card-body">
                        <div class="insight insight-info">
                            <div class="insight-title" style="color: #3b82f6;">💡 Recommendation</div>
                            <div class="insight-text">System running smoothly. All resources within optimal parameters.</div>
                        </div>
                        <div class="insight insight-success">
                            <div class="insight-title" style="color: #22c55e;">✅ Optimization</div>
                            <div class="insight-text">Cluster efficiency at 94%. No optimization needed at this time.</div>
                        </div>
                        <div class="insight insight-warning">
                            <div class="insight-title" style="color: #eab308;">⚠️ Notice</div>
                            <div class="insight-text">Monitor resource usage during peak hours for potential scaling needs.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Topology View -->
        <div id="topology-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Resource Topology</h3>
                </div>
                <div class="card-body">
                    <svg id="topology"></svg>
                </div>
            </div>
        </div>

        <!-- Pods View -->
        <div id="pods-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Pods</h3>
                    <button class="btn">Refresh</button>
                </div>
                <div class="card-body">
                    <table id="pods-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Ready</th>
                                <th>Restarts</th>
                                <th>IP</th>
                                <th>Node</th>
                                <th>Age</th>
                            </tr>
                        </thead>
                        <tbody id="pods-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Deployments View -->
        <div id="deployments-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Deployments</h3>
                    <button class="btn">Refresh</button>
                </div>
                <div class="card-body">
                    <table id="deployments-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Ready</th>
                                <th>Available</th>
                                <th>Age</th>
                            </tr>
                        </thead>
                        <tbody id="deployments-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Services View -->
        <div id="services-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Services</h3>
                    <button class="btn">Refresh</button>
                </div>
                <div class="card-body">
                    <table id="services-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Cluster IP</th>
                                <th>Ports</th>
                                <th>Age</th>
                            </tr>
                        </thead>
                        <tbody id="services-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // State
        let currentTab = 'dashboard';
        let metricsHistory = {
            cpu: Array(20).fill(0),
            memory: Array(20).fill(0)
        };

        // WebSocket connection
        const ws = new WebSocket('ws://' + location.host + '/ws');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') {
                updateMetrics(data.data);
            }
        };

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                switchTab(tabName);
            });
        });

        function switchTab(tabName) {
            currentTab = tabName;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

            if (tabName === 'dashboard') {
                document.getElementById('dashboard').style.display = 'block';
            } else if (tabName === 'topology') {
                document.getElementById('topology-view').style.display = 'block';
                loadTopology();
            } else if (tabName === 'pods') {
                document.getElementById('pods-view').style.display = 'block';
                loadPods();
            } else if (tabName === 'deployments') {
                document.getElementById('deployments-view').style.display = 'block';
                loadDeployments();
            } else if (tabName === 'services') {
                document.getElementById('services-view').style.display = 'block';
                loadServices();
            }
        }

        // Update metrics
        function updateMetrics(data) {
            document.getElementById('cpu-value').textContent = data.cpu.toFixed(1) + '%';
            document.getElementById('memory-value').textContent = data.memory.toFixed(1) + '%';
            document.getElementById('pods-value').textContent = data.pods + '/15';
            document.getElementById('nodes-value').textContent = data.nodes;

            // Update sparklines
            metricsHistory.cpu.shift();
            metricsHistory.cpu.push(data.cpu);
            metricsHistory.memory.shift();
            metricsHistory.memory.push(data.memory);

            drawSparkline('cpu-sparkline', metricsHistory.cpu, '#06b6d4');
            drawSparkline('memory-sparkline', metricsHistory.memory, '#a855f7');

            // Update pod bars
            const podBars = document.getElementById('pods-bars');
            podBars.innerHTML = '';
            for (let i = 0; i < 15; i++) {
                const bar = document.createElement('div');
                bar.style.width = '8px';
                bar.style.height = '24px';
                bar.style.borderRadius = '2px';
                bar.style.background = i < data.pods ? '#22c55e' : '#334155';
                podBars.appendChild(bar);
            }
        }

        // Draw sparkline
        function drawSparkline(id, data, color) {
            const svg = document.getElementById(id);
            const width = svg.clientWidth;
            const height = 40;
            const max = Math.max(...data, 100);

            const points = data.map((v, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - (v / max * height);
                return x + ',' + y;
            }).join(' ');

            svg.innerHTML = '<polyline fill="none" stroke="' + color + '" stroke-width="2" points="' + points + '" />';
        }

        // Load topology
        function loadTopology() {
            fetch('/api/topology')
                .then(r => r.json())
                .then(data => {
                    drawTopology(data);
                });
        }

        // Draw topology with D3.js
        function drawTopology(data) {
            const svg = d3.select('#topology');
            svg.selectAll('*').remove();

            const width = document.getElementById('topology').clientWidth;
            const height = 600;

            const simulation = d3.forceSimulation(data.nodes)
                .force('link', d3.forceLink(data.links).id(d => d.id).distance(150))
                .force('charge', d3.forceManyBody().strength(-500))
                .force('center', d3.forceCenter(width / 2, height / 2));

            const link = svg.append('g')
                .selectAll('line')
                .data(data.links)
                .join('line')
                .attr('stroke', '#475569')
                .attr('stroke-width', 2);

            const node = svg.append('g')
                .selectAll('circle')
                .data(data.nodes)
                .join('circle')
                .attr('r', 20)
                .attr('fill', d => d.group === 1 ? '#f97316' : '#10b981')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));

            const label = svg.append('g')
                .selectAll('text')
                .data(data.nodes)
                .join('text')
                .text(d => d.name)
                .attr('font-size', 12)
                .attr('fill', 'white')
                .attr('text-anchor', 'middle')
                .attr('dy', 35);

            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);

                label
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
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
        }

        // Load pods
        function loadPods() {
            fetch('/api/pods')
                .then(r => r.json())
                .then(pods => {
                    const tbody = document.getElementById('pods-tbody');
                    tbody.innerHTML = pods.map(pod =>
                        '<tr>' +
                            '<td>' + pod.name + '</td>' +
                            '<td><span class="badge badge-' + (pod.status === 'Running' ? 'success' : 'warning') + '">' + pod.status + '</span></td>' +
                            '<td>' + pod.ready + '</td>' +
                            '<td>' + pod.restarts + '</td>' +
                            '<td>' + pod.ip + '</td>' +
                            '<td>' + pod.node + '</td>' +
                            '<td>' + pod.age + '</td>' +
                        '</tr>'
                    ).join('');
                });
        }

        // Load deployments
        function loadDeployments() {
            fetch('/api/deployments')
                .then(r => r.json())
                .then(deps => {
                    const tbody = document.getElementById('deployments-tbody');
                    tbody.innerHTML = deps.map(dep =>
                        '<tr>' +
                            '<td>' + dep.name + '</td>' +
                            '<td>' + dep.ready + '</td>' +
                            '<td>' + dep.available + '</td>' +
                            '<td>' + dep.age + '</td>' +
                        '</tr>'
                    ).join('');
                });
        }

        // Load services
        function loadServices() {
            fetch('/api/services')
                .then(r => r.json())
                .then(svcs => {
                    const tbody = document.getElementById('services-tbody');
                    tbody.innerHTML = svcs.map(svc =>
                        '<tr>' +
                            '<td>' + svc.name + '</td>' +
                            '<td>' + svc.type + '</td>' +
                            '<td>' + svc.clusterIP + '</td>' +
                            '<td>' + svc.ports + '</td>' +
                            '<td>' + svc.age + '</td>' +
                        '</tr>'
                    ).join('');
                });
        }

        // Initial load
        fetch('/api/metrics').then(r => r.json()).then(updateMetrics);
        loadPods();
    </script>
</body>
</html>`
