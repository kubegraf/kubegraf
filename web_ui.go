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
            display: flex;
            flex-direction: column;
        }

        .main-wrapper {
            flex: 1;
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

        /* Main Category Tabs */
        .main-tabs {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
            border-bottom: 2px solid #1a1a2e;
            padding: 0 2rem;
            background: rgba(15, 23, 42, 0.5);
        }

        .main-tab {
            padding: 10px 20px;
            background: #16213e;
            color: #fff;
            border: none;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s;
        }

        .main-tab:hover {
            background: #1f4068;
        }

        .main-tab.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        /* Sub-Tabs for categories */
        .sub-tabs {
            display: flex;
            gap: 5px;
            margin-bottom: 15px;
            padding: 8px 2rem;
            background: #0f3460;
        }

        .sub-tabs button {
            padding: 8px 15px;
            background: #16213e;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }

        .sub-tabs button:hover {
            background: #1f4068;
        }

        .sub-tabs button.active {
            background: #00d4ff;
            color: #000;
        }

        /* Legacy tab styles for compatibility */
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

        .tab-group {
            margin-bottom: 10px;
        }

        .tab-header {
            font-weight: bold;
            color: #00d4ff;
            margin-bottom: 5px;
            font-size: 14px;
            padding: 0.5rem 0;
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
    <div class="main-wrapper">
    <!-- Navigation -->
    <nav class="navbar">
        <div class="logo">
            <div class="logo-icon">K</div>
            <span class="logo-text">KubeGraf</span>
            <span style="padding: 0.2rem 0.5rem; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 4px; color: #22c55e; font-size: 0.7rem; font-weight: 600; margin-left: 0.5rem;">v2.0.0</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <!-- Cluster Name Badge -->
            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.8rem; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px;">
                <span style="font-size: 1rem;">☸️</span>
                <span style="color: #60a5fa; font-size: 0.875rem; font-weight: 600;" id="cluster-name">Loading...</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="color: #94a3b8; font-size: 0.875rem;">Namespace:</span>
                <select id="namespace-selector" onchange="changeNamespace(this.value)" style="padding: 0.5rem 1rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 6px; color: white; cursor: pointer; font-size: 0.875rem;">
                    <option value="default">default</option>
                </select>
            </div>
            <div class="status-badge" id="connection-status">
                <div class="status-dot" id="connection-dot"></div>
                <span id="connection-text">Checking...</span>
            </div>
        </div>
    </nav>

    <!-- Connection Error Banner -->
    <div id="connection-error-banner" style="display: none; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 1rem 2rem; color: white; text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap;">
            <span style="font-size: 1.5rem;">⚠️</span>
            <div>
                <strong style="font-size: 1rem;">Not Connected to Kubernetes Cluster</strong>
                <p id="connection-error-message" style="margin: 0.25rem 0 0 0; font-size: 0.875rem; opacity: 0.9;"></p>
            </div>
        </div>
    </div>

    <!-- Main Category Tabs -->
    <div class="main-tabs">
        <button id="tab-dashboard" class="main-tab active" onclick="switchMainTab('dashboard')">Dashboard</button>
        <button id="tab-workloads" class="main-tab" onclick="switchMainTab('workloads')">Workloads</button>
        <button id="tab-network" class="main-tab" onclick="switchMainTab('network')">Network</button>
        <button id="tab-config" class="main-tab" onclick="switchMainTab('config')">Config</button>
        <button id="tab-cluster" class="main-tab" onclick="switchMainTab('cluster')">Cluster</button>
        <button id="tab-resourcemap" class="main-tab" onclick="switchMainTab('resourcemap')">Resource Map</button>
    </div>

    <!-- Sub-Tabs for each category -->
    <div id="workloads-subtabs" class="sub-tabs" style="display: none;">
        <button id="subtab-pods" onclick="switchTab('pods')">Pods</button>
        <button id="subtab-deployments" onclick="switchTab('deployments')">Deployments</button>
        <button id="subtab-statefulsets" onclick="switchTab('statefulsets')">StatefulSets</button>
        <button id="subtab-daemonsets" onclick="switchTab('daemonsets')">DaemonSets</button>
        <button id="subtab-cronjobs" onclick="switchTab('cronjobs')">CronJobs</button>
        <button id="subtab-jobs" onclick="switchTab('jobs')">Jobs</button>
    </div>

    <div id="network-subtabs" class="sub-tabs" style="display: none;">
        <button id="subtab-services" onclick="switchTab('services')">Services</button>
        <button id="subtab-ingresses" onclick="switchTab('ingresses')">Ingresses</button>
    </div>

    <div id="config-subtabs" class="sub-tabs" style="display: none;">
        <button id="subtab-configmaps" onclick="switchTab('configmaps')">ConfigMaps</button>
        <button id="subtab-secrets" onclick="switchTab('secrets')">Secrets</button>
    </div>

    <div id="cluster-subtabs" class="sub-tabs" style="display: none;">
        <button id="subtab-nodes" onclick="switchTab('nodes')">Nodes</button>
    </div>

    <!-- Main Content -->
    <div class="container">
        <!-- Dashboard View -->
        <div id="dashboard" class="tab-content">
            <!-- Metrics -->
            <div class="metrics-grid">
                <div class="metric-card" style="cursor: default;">
                    <div class="metric-label">Cluster CPU</div>
                    <div class="metric-value cyan" id="cpu-value">--</div>
                    <svg class="sparkline" id="cpu-sparkline"></svg>
                </div>
                <div class="metric-card" style="cursor: default;">
                    <div class="metric-label">Memory Usage</div>
                    <div class="metric-value purple" id="memory-value">--</div>
                    <svg class="sparkline" id="memory-sparkline"></svg>
                </div>
                <div class="metric-card" onclick="switchMainTab('workloads'); switchTab('pods');" style="cursor: pointer;">
                    <div class="metric-label">Running Pods</div>
                    <div class="metric-value green" id="pods-value">--</div>
                    <div style="display: flex; gap: 2px; margin-top: 0.5rem;" id="pods-bars"></div>
                </div>
                <div class="metric-card" onclick="switchMainTab('cluster'); switchTab('nodes');" style="cursor: pointer;">
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
                    <button class="btn" onclick="loadPods()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="pods-status-filter" onchange="filterPods()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Status</option>
                            <option value="Running">Running</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                            <option value="Succeeded">Succeeded</option>
                            <option value="Terminating">Terminating</option>
                        </select>
                        <select id="pods-age-filter" onchange="filterPods()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="pods-sort" onchange="sortPods()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="status">Sort by Status</option>
                        </select>
                        <button onclick="clearFiltersPods()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="pods-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Ready</th>
                                <th>Restarts</th>
                                <th>CPU</th>
                                <th>Memory</th>
                                <th>IP</th>
                                <th>Node</th>
                                <th>Age</th>
                                <th>Actions</th>
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
                    <button class="btn" onclick="loadDeployments()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="deployments-age-filter" onchange="filterDeployments()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="deployments-sort" onchange="sortDeployments()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="ready">Sort by Ready</option>
                        </select>
                        <button onclick="clearFiltersDeployments()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="deployments-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Ready</th>
                                <th>Available</th>
                                <th>Age</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="deployments-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- StatefulSets View -->
        <div id="statefulsets-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">StatefulSets</h3>
                    <button class="btn" onclick="loadStatefulSets()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="statefulsets-age-filter" onchange="filterStatefulSets()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="statefulsets-sort" onchange="sortStatefulSets()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="ready">Sort by Ready</option>
                        </select>
                        <button onclick="clearFiltersStatefulSets()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="statefulsets-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Ready</th>
                                <th>Service</th>
                                <th>Age</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="statefulsets-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- DaemonSets View -->
        <div id="daemonsets-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">DaemonSets</h3>
                    <button class="btn" onclick="loadDaemonSets()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="daemonsets-age-filter" onchange="filterDaemonSets()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="daemonsets-sort" onchange="sortDaemonSets()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="ready">Sort by Ready</option>
                        </select>
                        <button onclick="clearFiltersDaemonSets()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="daemonsets-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Desired</th>
                                <th>Current</th>
                                <th>Ready</th>
                                <th>Age</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="daemonsets-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Services View -->
        <div id="services-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Services</h3>
                    <button class="btn" onclick="loadServices()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="services-type-filter" onchange="filterServices()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Types</option>
                            <option value="ClusterIP">ClusterIP</option>
                            <option value="NodePort">NodePort</option>
                            <option value="LoadBalancer">LoadBalancer</option>
                        </select>
                        <select id="services-age-filter" onchange="filterServices()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="services-sort" onchange="sortServices()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="type">Sort by Type</option>
                        </select>
                        <button onclick="clearFiltersServices()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="services-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Cluster IP</th>
                                <th>Ports</th>
                                <th>Age</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="services-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Ingresses View -->
        <div id="ingresses-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">🚪 Ingresses</h3>
                    <button class="btn" onclick="loadIngresses()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="ingresses-age-filter" onchange="filterIngresses()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="ingresses-sort" onchange="sortIngresses()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                        </select>
                        <button onclick="clearFiltersIngresses()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="ingresses-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Hosts</th>
                                <th>Age</th>
                            </tr>
                        </thead>
                        <tbody id="ingresses-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- CronJobs View -->
        <div id="cronjobs-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">CronJobs</h3>
                    <button class="btn" onclick="loadCronJobs()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="cronjobs-age-filter" onchange="filterCronJobs()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="cronjobs-sort" onchange="sortCronJobs()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="schedule">Sort by Schedule</option>
                        </select>
                        <button onclick="clearFiltersCronJobs()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="cronjobs-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Schedule</th>
                                <th>Suspend</th>
                                <th>Active</th>
                                <th>Last Schedule</th>
                                <th>Age</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="cronjobs-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Jobs View -->
        <div id="jobs-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Jobs</h3>
                    <button class="btn" onclick="loadJobs()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="jobs-status-filter" onchange="filterJobs()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Status</option>
                            <option value="Complete">Complete</option>
                            <option value="Failed">Failed</option>
                            <option value="Running">Running</option>
                        </select>
                        <select id="jobs-age-filter" onchange="filterJobs()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="jobs-sort" onchange="sortJobs()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="status">Sort by Status</option>
                        </select>
                        <button onclick="clearFiltersJobs()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="jobs-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Completions</th>
                                <th>Duration</th>
                                <th>Age</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="jobs-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Nodes View -->
        <div id="nodes-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Nodes</h3>
                    <button class="btn" onclick="loadNodes()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="nodes-status-filter" onchange="filterNodes()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Status</option>
                            <option value="Ready">Ready</option>
                            <option value="NotReady">NotReady</option>
                        </select>
                        <select id="nodes-role-filter" onchange="filterNodes()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Roles</option>
                            <option value="control-plane">Control Plane</option>
                            <option value="worker">Worker</option>
                        </select>
                        <select id="nodes-sort" onchange="sortNodes()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="status">Sort by Status</option>
                            <option value="role">Sort by Role</option>
                        </select>
                        <button onclick="clearFiltersNodes()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="nodes-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Roles</th>
                                <th>Version</th>
                                <th>CPU</th>
                                <th>Memory</th>
                                <th>Age</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="nodes-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ConfigMaps View -->
        <div id="configmaps-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">⚙️ ConfigMaps</h3>
                    <button class="btn" onclick="loadConfigMaps()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    <div class="filter-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <select id="configmaps-age-filter" onchange="filterConfigMaps()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="">All Ages</option>
                            <option value="1h">&lt; 1 hour</option>
                            <option value="1d">&lt; 1 day</option>
                            <option value="7d">&lt; 7 days</option>
                            <option value="30d">&lt; 30 days</option>
                        </select>
                        <select id="configmaps-sort" onchange="sortConfigMaps()" style="padding: 0.5rem; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                        </select>
                        <button onclick="clearFiltersConfigMaps()" style="padding: 0.5rem 1rem; background: rgba(71, 85, 105, 0.8); border: 1px solid rgba(100, 116, 139, 0.5); border-radius: 4px; color: white; cursor: pointer;">Clear Filters</button>
                    </div>
                    <table id="configmaps-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Data Keys</th>
                                <th>Age</th>
                            </tr>
                        </thead>
                        <tbody id="configmaps-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ResourceMap View (Enhanced) -->
        <div id="resourcemap-view" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
                    <h3 class="card-title">🗺️ Resource Relationship Map</h3>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <!-- View Type Selector -->
                        <div style="display: flex; gap: 4px; background: rgba(30, 41, 59, 0.8); padding: 4px; border-radius: 8px;">
                            <button id="view-force" onclick="switchResourceMapView('force')" class="view-btn active" style="padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; transition: all 0.3s;">
                                🔮 Force
                            </button>
                            <button id="view-tree" onclick="switchResourceMapView('tree')" class="view-btn" style="padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; background: #475569; color: white; transition: all 0.3s;">
                                🌳 Tree
                            </button>
                            <button id="view-cluster" onclick="switchResourceMapView('cluster')" class="view-btn" style="padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; background: #475569; color: white; transition: all 0.3s;">
                                📦 Cluster
                            </button>
                            <button id="view-hierarchical" onclick="switchResourceMapView('hierarchical')" class="view-btn" style="padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; background: #475569; color: white; transition: all 0.3s;">
                                📊 Hierarchy
                            </button>
                        </div>
                        <button class="btn" onclick="loadResourceMap()" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; padding: 0.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.3); transition: all 0.3s ease; cursor: pointer;" title="Refresh">
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                                <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="resourcemap-help" style="padding: 1rem; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; margin-bottom: 1rem;">
                        <strong>🎯 Force Graph:</strong> Drag nodes to rearrange • Scroll to zoom • Click and drag background to pan
                    </div>
                    <svg id="resourcemap-svg" style="width: 100%; height: 700px; background: rgba(15, 23, 42, 0.5); border-radius: 12px;"></svg>
                    <!-- Legend -->
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; padding: 1rem; background: rgba(30, 41, 59, 0.5); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 16px; height: 16px; background: #3b82f6; border-radius: 50%;"></span><span style="font-size: 12px; color: #94a3b8;">Ingress</span></div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 16px; height: 16px; background: #8b5cf6; border-radius: 50%;"></span><span style="font-size: 12px; color: #94a3b8;">Service</span></div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 16px; height: 16px; background: #06b6d4; border-radius: 50%;"></span><span style="font-size: 12px; color: #94a3b8;">Deployment</span></div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 16px; height: 16px; background: #22c55e; border-radius: 50%;"></span><span style="font-size: 12px; color: #94a3b8;">Pod</span></div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 16px; height: 16px; background: #f59e0b; border-radius: 50%;"></span><span style="font-size: 12px; color: #94a3b8;">ConfigMap</span></div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 16px; height: 16px; background: #ef4444; border-radius: 50%;"></span><span style="font-size: 12px; color: #94a3b8;">Secret</span></div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 16px; height: 16px; background: #64748b; border-radius: 50%;"></span><span style="font-size: 12px; color: #94a3b8;">ReplicaSet</span></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirmation Modal -->
    <div id="confirm-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 500px; width: 90%;">
            <h3 style="margin-bottom: 1rem; color: #ef4444;" id="confirm-title">Confirm Action</h3>
            <p style="margin-bottom: 2rem; color: #cbd5e1;" id="confirm-message">Are you sure?</p>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button onclick="closeConfirmModal()" style="padding: 0.75rem 1.5rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer;">Cancel</button>
                <button id="confirm-btn" style="padding: 0.75rem 1.5rem; background: #ef4444; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">Confirm</button>
            </div>
        </div>
    </div>

    <!-- Pod Details Modal -->
    <div id="pod-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closePodDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="pod-details-content"></div>
        </div>
    </div>

    <!-- Deployment Details Modal -->
    <div id="deployment-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeDeploymentDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="deployment-details-content"></div>
        </div>
    </div>

    <!-- Service Details Modal -->
    <div id="service-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeServiceDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="service-details-content"></div>
        </div>
    </div>

    <!-- Ingress Details Modal -->
    <div id="ingress-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeIngressDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="ingress-details-content"></div>
        </div>
    </div>

    <!-- ConfigMap Details Modal -->
    <div id="configmap-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeConfigMapDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="configmap-details-content"></div>
        </div>
    </div>

    <!-- StatefulSet Details Modal -->
    <div id="statefulset-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeStatefulSetDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="statefulset-details-content"></div>
        </div>
    </div>

    <!-- DaemonSet Details Modal -->
    <div id="daemonset-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeDaemonSetDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="daemonset-details-content"></div>
        </div>
    </div>

    <!-- CronJob Details Modal -->
    <div id="cronjob-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeCronJobDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="cronjob-details-content"></div>
        </div>
    </div>

    <!-- Job Details Modal -->
    <div id="job-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeJobDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="job-details-content"></div>
        </div>
    </div>

    <!-- Node Details Modal -->
    <div id="node-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; padding: 2rem; overflow-y: auto;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #475569; max-width: 1200px; margin: 0 auto; position: relative;">
            <button onclick="closeNodeDetails()" style="position: absolute; top: 1rem; right: 1rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            <div id="node-details-content"></div>
        </div>
    </div>

    <!-- Terminal Modal -->
    <div id="terminal-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10000; padding: 2rem;">
        <div style="background: #0f172a; border-radius: 12px; border: 1px solid #475569; max-width: 1400px; margin: 0 auto; height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 1rem; border-bottom: 1px solid #475569; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #06b6d4; font-size: 1.125rem;" id="terminal-title">Terminal</h3>
                <button onclick="closeTerminal()" style="background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; padding: 0.5rem 1rem; font-size: 1.25rem;">&times;</button>
            </div>
            <div id="terminal-output" style="flex: 1; padding: 1rem; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 14px; color: #e2e8f0; background: #000000;">
                <div style="color: #22c55e;">Connecting to container...</div>
            </div>
            <div style="padding: 1rem; border-top: 1px solid #475569; display: flex; gap: 0.5rem;">
                <input type="text" id="terminal-input" placeholder="Type command and press Enter..." style="flex: 1; padding: 0.75rem; background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: white; font-family: 'Courier New', monospace;" />
                <button onclick="sendCommand()" style="padding: 0.75rem 1.5rem; background: #06b6d4; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">Send</button>
            </div>
        </div>
    </div>
    </div>

    <!-- Port Forward Modal -->
    <div id="portforward-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 2rem; border-radius: 16px; border: 1px solid rgba(100, 116, 139, 0.3); max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 1.5rem 0; color: #06b6d4; display: flex; align-items: center; gap: 0.5rem;">Port Forward</h3>
            <p style="color: #94a3b8; margin-bottom: 1.5rem;" id="pf-resource-info">Forward ports to access the resource locally</p>
            <input type="hidden" id="pf-type" value="">
            <input type="hidden" id="pf-name" value="">
            <input type="hidden" id="pf-namespace" value="">
            <div style="margin-bottom: 1rem;">
                <label style="color: #cbd5e1; font-size: 0.875rem; display: block; margin-bottom: 0.5rem;">Remote Port (Container/Service)</label>
                <input type="number" id="pf-remote-port" placeholder="e.g., 8080" style="width: 100%; padding: 0.75rem; background: rgba(15, 23, 42, 0.8); border: 1px solid #475569; border-radius: 8px; color: white; font-size: 1rem;">
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="color: #cbd5e1; font-size: 0.875rem; display: block; margin-bottom: 0.5rem;">Local Port (Optional - auto-assigned if empty)</label>
                <input type="number" id="pf-local-port" placeholder="e.g., 8080" style="width: 100%; padding: 0.75rem; background: rgba(15, 23, 42, 0.8); border: 1px solid #475569; border-radius: 8px; color: white; font-size: 1rem;">
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button onclick="closePortForwardModal()" style="padding: 0.75rem 1.5rem; background: #475569; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">Cancel</button>
                <button onclick="startPortForward()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">Start Forward</button>
            </div>
        </div>
    </div>

    <!-- Active Port Forwards Panel -->
    <div id="portforwards-panel" style="display: none; position: fixed; bottom: 1rem; right: 1rem; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #475569; border-radius: 12px; padding: 1rem; z-index: 9998; min-width: 320px; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid #334155; padding-bottom: 0.75rem;">
            <h4 style="margin: 0; color: #06b6d4; font-size: 0.875rem;">Active Port Forwards</h4>
            <button onclick="togglePortForwardsPanel()" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 1rem;">&times;</button>
        </div>
        <div id="portforwards-list" style="max-height: 300px; overflow-y: auto;"></div>
    </div>

    <!-- Port Forwards Toggle Button -->
    <button id="portforwards-toggle" onclick="togglePortForwardsPanel()" style="display: none; position: fixed; bottom: 1rem; right: 1rem; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border: none; border-radius: 50%; width: 48px; height: 48px; color: white; cursor: pointer; z-index: 9997; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4); font-size: 1.25rem;" title="Active Port Forwards">
        <span id="pf-count-badge" style="position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 0.75rem; display: flex; align-items: center; justify-content: center;">0</span>
        PF
    </button>

    <script>
        // State
        let currentMainTab = 'dashboard';
        let currentSubTab = '';
        let currentTab = 'dashboard';
        let currentNamespace = 'default';
        let metricsHistory = {
            cpu: Array(20).fill(0),
            memory: Array(20).fill(0)
        };

        // Global data storage for filtering and sorting
        let podsData = [];
        let deploymentsData = [];
        let statefulSetsData = [];
        let daemonSetsData = [];
        let servicesData = [];
        let ingressesData = [];
        let configMapsData = [];
        let cronJobsData = [];
        let jobsData = [];
        let nodesData = [];

        // WebSocket connection
        const ws = new WebSocket('ws://' + location.host + '/ws');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') {
                updateMetrics(data.data);
            }
        };

        // Main tab switching
        function switchMainTab(mainTab) {
            currentMainTab = mainTab;

            // Hide all sub-tabs
            document.querySelectorAll('.sub-tabs').forEach(st => st.style.display = 'none');

            // Remove active class from all main tabs
            document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));

            // Add active class to selected main tab
            document.getElementById('tab-' + mainTab).classList.add('active');

            // Remove active class from all sub-tabs
            document.querySelectorAll('.sub-tabs button').forEach(b => b.classList.remove('active'));

            if (mainTab === 'dashboard') {
                // Show dashboard, hide all resource views
                document.getElementById('dashboard').style.display = 'block';
                document.querySelectorAll('.tab-content').forEach(v => {
                    if (v.id !== 'dashboard') {
                        v.style.display = 'none';
                    }
                });
                currentTab = 'dashboard';
                loadMetrics();
            } else if (mainTab === 'resourcemap') {
                // Show resource map
                switchTab('resourcemap');
            } else if (mainTab === 'workloads') {
                document.getElementById('workloads-subtabs').style.display = 'flex';
                switchTab('pods'); // Default to pods
            } else if (mainTab === 'network') {
                document.getElementById('network-subtabs').style.display = 'flex';
                switchTab('services'); // Default to services
            } else if (mainTab === 'config') {
                document.getElementById('config-subtabs').style.display = 'flex';
                switchTab('configmaps'); // Default to configmaps
            } else if (mainTab === 'cluster') {
                document.getElementById('cluster-subtabs').style.display = 'flex';
                switchTab('nodes'); // Default to nodes
            }
        }

        // Resource tab switching
        function switchTab(tabName) {
            currentTab = tabName;
            currentSubTab = tabName;

            // Remove active class from all sub-tab buttons
            document.querySelectorAll('.sub-tabs button').forEach(b => b.classList.remove('active'));

            // Add active class to current sub-tab button
            const subtabButton = document.getElementById('subtab-' + tabName);
            if (subtabButton) {
                subtabButton.classList.add('active');
            }

            // Hide all content views
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

            if (tabName === 'dashboard') {
                document.getElementById('dashboard').style.display = 'block';
            } else if (tabName === 'topology') {
                document.getElementById('topology-view').style.display = 'block';
                loadTopology();
            } else if (tabName === 'resourcemap') {
                document.getElementById('resourcemap-view').style.display = 'block';
                loadResourceMap();
            } else if (tabName === 'pods') {
                document.getElementById('pods-view').style.display = 'block';
                loadPods();
            } else if (tabName === 'deployments') {
                document.getElementById('deployments-view').style.display = 'block';
                loadDeployments();
            } else if (tabName === 'statefulsets') {
                document.getElementById('statefulsets-view').style.display = 'block';
                loadStatefulSets();
            } else if (tabName === 'daemonsets') {
                document.getElementById('daemonsets-view').style.display = 'block';
                loadDaemonSets();
            } else if (tabName === 'services') {
                document.getElementById('services-view').style.display = 'block';
                loadServices();
            } else if (tabName === 'ingresses') {
                document.getElementById('ingresses-view').style.display = 'block';
                loadIngresses();
            } else if (tabName === 'cronjobs') {
                document.getElementById('cronjobs-view').style.display = 'block';
                loadCronJobs();
            } else if (tabName === 'jobs') {
                document.getElementById('jobs-view').style.display = 'block';
                loadJobs();
            } else if (tabName === 'nodes') {
                document.getElementById('nodes-view').style.display = 'block';
                loadNodes();
            } else if (tabName === 'configmaps') {
                document.getElementById('configmaps-view').style.display = 'block';
                loadConfigMaps();
            } else if (tabName === 'secrets') {
                // Secrets view placeholder - to be implemented
                console.log('Secrets view not yet implemented');
            }
        }

        // Update metrics
        function updateMetrics(data) {
            document.getElementById('cpu-value').textContent = data.cpu.toFixed(1) + '%';
            document.getElementById('memory-value').textContent = data.memory.toFixed(1) + '%';
            document.getElementById('pods-value').textContent = data.pods + '/15';
            document.getElementById('nodes-value').textContent = data.nodes;

            // Update cluster name in navbar
            if (data.clusterName) {
                document.getElementById('cluster-name').textContent = data.clusterName;
            }

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
            fetch('/api/pods?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(pods => {
                    podsData = pods;
                    displayPods(pods);
                });
        }

        // Load deployments
        function loadDeployments() {
            fetch('/api/deployments?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(deps => {
                    deploymentsData = deps;
                    displayDeployments(deps);
                });
        }

        // Load services
        function loadServices() {
            fetch('/api/services?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(svcs => {
                    servicesData = svcs;
                    displayServices(svcs);
                });
        }

        // Load statefulsets
        function loadStatefulSets() {
            fetch('/api/statefulsets?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(ssets => {
                    statefulSetsData = ssets;
                    displayStatefulSets(ssets);
                });
        }

        // Load daemonsets
        function loadDaemonSets() {
            fetch('/api/daemonsets?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(dsets => {
                    daemonSetsData = dsets;
                    displayDaemonSets(dsets);
                });
        }

        // Load cronjobs
        function loadCronJobs() {
            fetch('/api/cronjobs?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(cjs => {
                    cronJobsData = cjs;
                    displayCronJobs(cjs);
                });
        }

        // Load jobs
        function loadJobs() {
            fetch('/api/jobs?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(jobs => {
                    jobsData = jobs;
                    displayJobs(jobs);
                });
        }

        // Load nodes
        function loadNodes() {
            fetch('/api/nodes')
                .then(r => r.json())
                .then(nodes => {
                    nodesData = nodes;
                    displayNodes(nodes);
                });
        }

        // Load resource overview
        function loadResourceOverview() {
            Promise.all([
                fetch('/api/pods').then(r => r.json()),
                fetch('/api/deployments').then(r => r.json()),
                fetch('/api/services').then(r => r.json())
            ]).then(([pods, deployments, services]) => {
                const overview = document.getElementById('resources-overview');

                const runningPods = pods.filter(p => p.status === 'Running').length;
                const pendingPods = pods.filter(p => p.status === 'Pending').length;
                const failedPods = pods.filter(p => p.status === 'Failed').length;

                const readyDeployments = deployments.filter(d => {
                    const parts = d.ready.split('/');
                    return parts[0] === parts[1];
                }).length;

                overview.innerHTML = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">' +
                    '<div onclick="switchMainTab(\'workloads\'); switchTab(\'pods\');" style="padding: 1.5rem; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
                        '<div style="font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem;">Total Pods</div>' +
                        '<div style="font-size: 2rem; font-weight: bold; color: #06b6d4; margin-bottom: 0.5rem;">' + pods.length + '</div>' +
                        '<div style="display: flex; gap: 1rem; font-size: 0.875rem;">' +
                            '<span style="color: #22c55e;">● ' + runningPods + ' Running</span>' +
                            (pendingPods > 0 ? '<span style="color: #eab308;">● ' + pendingPods + ' Pending</span>' : '') +
                            (failedPods > 0 ? '<span style="color: #ef4444;">● ' + failedPods + ' Failed</span>' : '') +
                        '</div>' +
                    '</div>' +

                    '<div onclick="switchMainTab(\'workloads\'); switchTab(\'deployments\');" style="padding: 1.5rem; background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 8px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
                        '<div style="font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem;">Deployments</div>' +
                        '<div style="font-size: 2rem; font-weight: bold; color: #f97316; margin-bottom: 0.5rem;">' + deployments.length + '</div>' +
                        '<div style="font-size: 0.875rem; color: #22c55e;">✓ ' + readyDeployments + ' Ready</div>' +
                    '</div>' +

                    '<div onclick="switchMainTab(\'network\'); switchTab(\'services\');" style="padding: 1.5rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
                        '<div style="font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem;">Services</div>' +
                        '<div style="font-size: 2rem; font-weight: bold; color: #22c55e; margin-bottom: 0.5rem;">' + services.length + '</div>' +
                        '<div style="font-size: 0.875rem; color: #94a3b8;">' +
                            services.filter(s => s.type === 'LoadBalancer').length + ' LoadBalancer, ' +
                            services.filter(s => s.type === 'ClusterIP').length + ' ClusterIP' +
                        '</div>' +
                    '</div>' +

                    '<div style="padding: 1.5rem; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px;">' +
                        '<div style="font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem;">Cluster Health</div>' +
                        '<div style="font-size: 2rem; font-weight: bold; color: #a855f7; margin-bottom: 0.5rem;">95%</div>' +
                        '<div style="font-size: 0.875rem; color: #22c55e;">✓ All systems operational</div>' +
                    '</div>' +
                '</div>';
            }).catch(err => {
                document.getElementById('resources-overview').innerHTML =
                    '<div style="padding: 2rem; text-align: center; color: #ef4444;">' +
                    'Failed to load resource overview: ' + err.message +
                    '</div>';
            });
        }

        // Load ingresses
        function loadIngresses() {
            fetch('/api/ingresses?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(ingresses => {
                    ingressesData = ingresses;
                    displayIngresses(ingresses);
                });
        }

        // Load configmaps
        function loadConfigMaps() {
            fetch('/api/configmaps?namespace=' + currentNamespace)
                .then(r => r.json())
                .then(cms => {
                    configMapsData = cms;
                    displayConfigMaps(cms);
                });
        }

        // Load resource map
        function loadResourceMap() {
            fetch('/api/resourcemap')
                .then(r => r.json())
                .then(data => {
                    drawResourceMap(data);
                });
        }

        // Draw resource map with D3.js
        function drawResourceMap(data) {
            const svg = d3.select('#resourcemap-svg');
            svg.selectAll('*').remove();

            const width = document.getElementById('resourcemap-svg').clientWidth;
            const height = 700;

            // Create simulation
            const simulation = d3.forceSimulation(data.nodes)
                .force('link', d3.forceLink(data.links).id(d => d.id).distance(200))
                .force('charge', d3.forceManyBody().strength(-800))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(50));

            // Add zoom behavior
            const g = svg.append('g');
            svg.call(d3.zoom()
                .scaleExtent([0.5, 3])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                })
            );

            // Create links
            const link = g.append('g')
                .selectAll('line')
                .data(data.links)
                .join('line')
                .attr('stroke', '#475569')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#arrowhead)');

            // Add arrow marker
            svg.append('defs').append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 35)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .append('path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#475569');

            // Create node groups
            const node = g.append('g')
                .selectAll('g')
                .data(data.nodes)
                .join('g')
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));

            // Add circles to nodes
            node.append('circle')
                .attr('r', 25)
                .attr('fill', d => d.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3);

            // Add icons (emoji) to nodes
            node.append('text')
                .text(d => d.icon)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-size', '20px');

            // Add labels below nodes
            node.append('text')
                .text(d => d.name)
                .attr('text-anchor', 'middle')
                .attr('dy', 45)
                .attr('font-size', 12)
                .attr('fill', 'white')
                .attr('font-weight', 'bold');

            // Add status text
            node.append('text')
                .text(d => d.status || '')
                .attr('text-anchor', 'middle')
                .attr('dy', 60)
                .attr('font-size', 10)
                .attr('fill', '#94a3b8');

            // Simulation tick
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
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

        // Current view state
        let currentResourceMapView = 'force';
        let cachedResourceMapData = null;

        // Switch between different resource map views
        function switchResourceMapView(viewType) {
            currentResourceMapView = viewType;

            // Update button styles
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.style.background = '#475569';
            });
            document.getElementById('view-' + viewType).style.background = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)';

            // Update help text
            const helpTexts = {
                'force': '<strong>🔮 Force Graph:</strong> Drag nodes to rearrange • Scroll to zoom • Click and drag background to pan',
                'tree': '<strong>🌳 Tree View:</strong> Hierarchical tree structure showing resource relationships • Scroll to zoom • Drag to pan',
                'cluster': '<strong>📦 Cluster View:</strong> Resources grouped by type in separate clusters • Drag nodes to rearrange',
                'hierarchical': '<strong>📊 Hierarchy View:</strong> Top-down hierarchical layout showing dependency flow • Scroll to zoom'
            };
            document.getElementById('resourcemap-help').innerHTML = helpTexts[viewType];

            // Redraw with cached data or fetch new
            if (cachedResourceMapData) {
                drawResourceMapView(cachedResourceMapData, viewType);
            } else {
                loadResourceMap();
            }
        }

        // Modified load function to cache data
        function loadResourceMapWithView() {
            fetch('/api/resourcemap')
                .then(r => r.json())
                .then(data => {
                    cachedResourceMapData = JSON.parse(JSON.stringify(data)); // Deep copy
                    drawResourceMapView(data, currentResourceMapView);
                });
        }

        // Draw resource map based on view type
        function drawResourceMapView(data, viewType) {
            // Deep copy to avoid mutation
            const dataCopy = JSON.parse(JSON.stringify(data));

            switch(viewType) {
                case 'force':
                    drawResourceMapForce(dataCopy);
                    break;
                case 'tree':
                    drawResourceMapTree(dataCopy);
                    break;
                case 'cluster':
                    drawResourceMapCluster(dataCopy);
                    break;
                case 'hierarchical':
                    drawResourceMapHierarchical(dataCopy);
                    break;
                default:
                    drawResourceMapForce(dataCopy);
            }
        }

        // Force-directed graph (original)
        function drawResourceMapForce(data) {
            const svg = d3.select('#resourcemap-svg');
            svg.selectAll('*').remove();

            const width = document.getElementById('resourcemap-svg').clientWidth;
            const height = 700;

            const simulation = d3.forceSimulation(data.nodes)
                .force('link', d3.forceLink(data.links).id(d => d.id).distance(200))
                .force('charge', d3.forceManyBody().strength(-800))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(50));

            const g = svg.append('g');
            svg.call(d3.zoom()
                .scaleExtent([0.3, 3])
                .on('zoom', (event) => g.attr('transform', event.transform))
            );

            // Add arrow marker
            svg.append('defs').append('marker')
                .attr('id', 'arrowhead-force')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 35)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .append('path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#475569');

            const link = g.append('g')
                .selectAll('line')
                .data(data.links)
                .join('line')
                .attr('stroke', '#475569')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#arrowhead-force)');

            const node = g.append('g')
                .selectAll('g')
                .data(data.nodes)
                .join('g')
                .call(d3.drag()
                    .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                    .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
                    .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

            node.append('circle').attr('r', 25).attr('fill', d => d.color).attr('stroke', '#fff').attr('stroke-width', 3);
            node.append('text').text(d => d.icon).attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', '20px');
            node.append('text').text(d => d.name).attr('text-anchor', 'middle').attr('dy', 45).attr('font-size', 12).attr('fill', 'white').attr('font-weight', 'bold');
            node.append('text').text(d => d.status || '').attr('text-anchor', 'middle').attr('dy', 60).attr('font-size', 10).attr('fill', '#94a3b8');

            simulation.on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
            });
        }

        // Tree View - Hierarchical tree layout
        function drawResourceMapTree(data) {
            const svg = d3.select('#resourcemap-svg');
            svg.selectAll('*').remove();

            const width = document.getElementById('resourcemap-svg').clientWidth;
            const height = 700;
            const margin = { top: 40, right: 120, bottom: 40, left: 120 };

            const g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            svg.call(d3.zoom()
                .scaleExtent([0.3, 3])
                .on('zoom', (event) => g.attr('transform', event.transform))
            );

            // Convert flat data to hierarchy
            const root = buildHierarchy(data);

            const treeLayout = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
            const treeData = treeLayout(root);

            // Draw links
            g.selectAll('.link')
                .data(treeData.links())
                .join('path')
                .attr('class', 'link')
                .attr('fill', 'none')
                .attr('stroke', '#475569')
                .attr('stroke-width', 2)
                .attr('d', d3.linkHorizontal()
                    .x(d => d.y)
                    .y(d => d.x));

            // Draw nodes
            const node = g.selectAll('.node')
                .data(treeData.descendants())
                .join('g')
                .attr('class', 'node')
                .attr('transform', d => 'translate(' + d.y + ',' + d.x + ')');

            node.append('circle')
                .attr('r', 20)
                .attr('fill', d => d.data.color || '#64748b')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);

            node.append('text')
                .text(d => d.data.icon || '📦')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-size', '16px');

            node.append('text')
                .text(d => d.data.name)
                .attr('text-anchor', 'middle')
                .attr('dy', 35)
                .attr('font-size', 10)
                .attr('fill', 'white')
                .attr('font-weight', 'bold');
        }

        // Cluster View - Grouped by type
        function drawResourceMapCluster(data) {
            const svg = d3.select('#resourcemap-svg');
            svg.selectAll('*').remove();

            const width = document.getElementById('resourcemap-svg').clientWidth;
            const height = 700;

            const g = svg.append('g');
            svg.call(d3.zoom()
                .scaleExtent([0.3, 3])
                .on('zoom', (event) => g.attr('transform', event.transform))
            );

            // Group nodes by type
            const types = [...new Set(data.nodes.map(n => n.type))];
            const typeGroups = {};
            types.forEach((type, i) => {
                typeGroups[type] = {
                    x: (i % 3) * (width / 3) + width / 6,
                    y: Math.floor(i / 3) * (height / 2) + height / 4
                };
            });

            // Position nodes in clusters
            data.nodes.forEach(node => {
                const group = typeGroups[node.type];
                node.x = group.x + (Math.random() - 0.5) * 150;
                node.y = group.y + (Math.random() - 0.5) * 150;
            });

            // Draw cluster backgrounds
            types.forEach((type, i) => {
                const group = typeGroups[type];
                g.append('rect')
                    .attr('x', group.x - 100)
                    .attr('y', group.y - 100)
                    .attr('width', 200)
                    .attr('height', 200)
                    .attr('rx', 15)
                    .attr('fill', 'rgba(71, 85, 105, 0.2)')
                    .attr('stroke', 'rgba(100, 116, 139, 0.5)')
                    .attr('stroke-width', 2);

                g.append('text')
                    .attr('x', group.x)
                    .attr('y', group.y - 110)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#94a3b8')
                    .attr('font-size', 14)
                    .attr('font-weight', 'bold')
                    .text(type + 's');
            });

            // Create simulation with cluster forces
            const simulation = d3.forceSimulation(data.nodes)
                .force('link', d3.forceLink(data.links).id(d => d.id).distance(80).strength(0.1))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('x', d3.forceX(d => typeGroups[d.type].x).strength(0.3))
                .force('y', d3.forceY(d => typeGroups[d.type].y).strength(0.3))
                .force('collision', d3.forceCollide().radius(30));

            // Add arrow marker
            svg.append('defs').append('marker')
                .attr('id', 'arrowhead-cluster')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .append('path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#475569');

            const link = g.append('g')
                .selectAll('line')
                .data(data.links)
                .join('line')
                .attr('stroke', '#475569')
                .attr('stroke-width', 1.5)
                .attr('stroke-opacity', 0.6)
                .attr('marker-end', 'url(#arrowhead-cluster)');

            const node = g.append('g')
                .selectAll('g')
                .data(data.nodes)
                .join('g')
                .call(d3.drag()
                    .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                    .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
                    .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

            node.append('circle').attr('r', 20).attr('fill', d => d.color).attr('stroke', '#fff').attr('stroke-width', 2);
            node.append('text').text(d => d.icon).attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', '16px');
            node.append('text').text(d => d.name).attr('text-anchor', 'middle').attr('dy', 35).attr('font-size', 9).attr('fill', 'white').attr('font-weight', 'bold');

            simulation.on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
            });
        }

        // Hierarchical View - Top-down layout
        function drawResourceMapHierarchical(data) {
            const svg = d3.select('#resourcemap-svg');
            svg.selectAll('*').remove();

            const width = document.getElementById('resourcemap-svg').clientWidth;
            const height = 700;
            const margin = { top: 60, right: 40, bottom: 60, left: 40 };

            const g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            svg.call(d3.zoom()
                .scaleExtent([0.3, 3])
                .on('zoom', (event) => g.attr('transform', event.transform))
            );

            // Convert flat data to hierarchy
            const root = buildHierarchy(data);

            const treeLayout = d3.tree()
                .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
                .nodeSize([80, 120]);

            const treeData = treeLayout(root);

            // Center the tree
            let x0 = Infinity, x1 = -Infinity;
            treeData.each(d => { if (d.x > x1) x1 = d.x; if (d.x < x0) x0 = d.x; });
            const dx = x1 - x0;

            g.attr('transform', 'translate(' + ((width - dx) / 2 - x0) + ',' + margin.top + ')');

            // Draw curved links
            g.selectAll('.link')
                .data(treeData.links())
                .join('path')
                .attr('class', 'link')
                .attr('fill', 'none')
                .attr('stroke', 'url(#link-gradient)')
                .attr('stroke-width', 2.5)
                .attr('d', d => {
                    return 'M' + d.source.x + ',' + d.source.y +
                           'C' + d.source.x + ',' + (d.source.y + d.target.y) / 2 +
                           ' ' + d.target.x + ',' + (d.source.y + d.target.y) / 2 +
                           ' ' + d.target.x + ',' + d.target.y;
                });

            // Add gradient for links
            const defs = svg.append('defs');
            const gradient = defs.append('linearGradient')
                .attr('id', 'link-gradient')
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', '0%').attr('y1', '0%')
                .attr('x2', '0%').attr('y2', '100%');
            gradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4');
            gradient.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6');

            // Draw nodes
            const node = g.selectAll('.node')
                .data(treeData.descendants())
                .join('g')
                .attr('class', 'node')
                .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');

            // Node background with glow
            node.append('circle')
                .attr('r', 28)
                .attr('fill', d => d.data.color || '#64748b')
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .style('filter', 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))');

            node.append('text')
                .text(d => d.data.icon || '📦')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-size', '20px');

            node.append('text')
                .text(d => d.data.name)
                .attr('text-anchor', 'middle')
                .attr('dy', 48)
                .attr('font-size', 11)
                .attr('fill', 'white')
                .attr('font-weight', 'bold');

            node.append('text')
                .text(d => d.data.type || '')
                .attr('text-anchor', 'middle')
                .attr('dy', 62)
                .attr('font-size', 9)
                .attr('fill', '#94a3b8');
        }

        // Helper: Build hierarchy from flat data
        function buildHierarchy(data) {
            // Create a map of nodes
            const nodeMap = {};
            data.nodes.forEach(n => {
                nodeMap[n.id] = { ...n, children: [] };
            });

            // Find root nodes (nodes with no incoming links)
            const hasParent = new Set(data.links.map(l => l.target));
            const roots = data.nodes.filter(n => !hasParent.has(n.id));

            // Build parent-child relationships
            data.links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                if (nodeMap[sourceId] && nodeMap[targetId]) {
                    nodeMap[sourceId].children.push(nodeMap[targetId]);
                }
            });

            // Create virtual root if multiple roots
            let rootNode;
            if (roots.length === 0) {
                rootNode = { name: 'Cluster', icon: '☸️', color: '#3b82f6', children: Object.values(nodeMap).slice(0, 5) };
            } else if (roots.length === 1) {
                rootNode = nodeMap[roots[0].id];
            } else {
                rootNode = { name: 'Cluster', icon: '☸️', color: '#3b82f6', children: roots.map(r => nodeMap[r.id]) };
            }

            return d3.hierarchy(rootNode);
        }

        // Override loadResourceMap to use new system
        const originalLoadResourceMap = loadResourceMap;
        loadResourceMap = function() {
            fetch('/api/resourcemap')
                .then(r => r.json())
                .then(data => {
                    cachedResourceMapData = JSON.parse(JSON.stringify(data));
                    drawResourceMapView(data, currentResourceMapView);
                });
        };

        // Confirmation modal functions
        function showConfirmModal(title, message, onConfirm) {
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            document.getElementById('confirm-modal').style.display = 'flex';

            document.getElementById('confirm-btn').onclick = function() {
                closeConfirmModal();
                onConfirm();
            };
        }

        function closeConfirmModal() {
            document.getElementById('confirm-modal').style.display = 'none';
        }

        // Action handlers
        function restartPod(name, namespace) {
            const ns = namespace || currentNamespace;
            showConfirmModal(
                'Restart Pod',
                'Are you sure you want to restart pod "' + name + '"? This will delete and recreate the pod.',
                function() {
                    fetch('/api/pod/restart?name=' + encodeURIComponent(name) + '&namespace=' + encodeURIComponent(ns), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('Pod "' + name + '" restarted successfully');
                            loadPods();
                        } else {
                            alert('Failed to restart pod: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function deletePod(name, namespace) {
            const ns = namespace || currentNamespace;
            showConfirmModal(
                'Delete Pod',
                'Are you sure you want to delete pod "' + name + '"? This action cannot be undone.',
                function() {
                    fetch('/api/pod/delete?name=' + encodeURIComponent(name) + '&namespace=' + encodeURIComponent(ns), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('Pod "' + name + '" deleted successfully');
                            loadPods();
                        } else {
                            alert('Failed to delete pod: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function restartDeployment(name) {
            showConfirmModal(
                'Restart Deployment',
                'Are you sure you want to restart deployment "' + name + '"? This will scale down and back up.',
                function() {
                    fetch('/api/deployment/restart?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('Deployment "' + name + '" restarted successfully');
                            loadDeployments();
                        } else {
                            alert('Failed to restart deployment: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function deleteDeployment(name) {
            showConfirmModal(
                'Delete Deployment',
                'Are you sure you want to delete deployment "' + name + '"? This will delete all associated pods.',
                function() {
                    fetch('/api/deployment/delete?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('Deployment "' + name + '" deleted successfully');
                            loadDeployments();
                        } else {
                            alert('Failed to delete deployment: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function deleteService(name, namespace) {
            showConfirmModal(
                'Delete Service',
                'Are you sure you want to delete service "' + name + '"?',
                function() {
                    fetch('/api/service/delete?name=' + encodeURIComponent(name) + '&namespace=' + encodeURIComponent(namespace || currentNamespace), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('Service "' + name + '" deleted successfully');
                            loadServices();
                        } else {
                            alert('Failed to delete service: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function restartStatefulSet(name) {
            showConfirmModal(
                'Restart StatefulSet',
                'Are you sure you want to restart statefulset "' + name + '"? This will scale down and back up.',
                function() {
                    fetch('/api/statefulset/restart?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('StatefulSet "' + name + '" restarted successfully');
                            loadStatefulSets();
                        } else {
                            alert('Failed to restart statefulset: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function deleteStatefulSet(name) {
            showConfirmModal(
                'Delete StatefulSet',
                'Are you sure you want to delete statefulset "' + name + '"? This will delete all associated pods.',
                function() {
                    fetch('/api/statefulset/delete?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('StatefulSet "' + name + '" deleted successfully');
                            loadStatefulSets();
                        } else {
                            alert('Failed to delete statefulset: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function restartDaemonSet(name) {
            showConfirmModal(
                'Restart DaemonSet',
                'Are you sure you want to restart daemonset "' + name + '"? This will recreate all pods.',
                function() {
                    fetch('/api/daemonset/restart?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('DaemonSet "' + name + '" restarted successfully');
                            loadDaemonSets();
                        } else {
                            alert('Failed to restart daemonset: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function deleteDaemonSet(name) {
            showConfirmModal(
                'Delete DaemonSet',
                'Are you sure you want to delete daemonset "' + name + '"? This will delete all associated pods.',
                function() {
                    fetch('/api/daemonset/delete?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('DaemonSet "' + name + '" deleted successfully');
                            loadDaemonSets();
                        } else {
                            alert('Failed to delete daemonset: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function deleteCronJob(name) {
            showConfirmModal(
                'Delete CronJob',
                'Are you sure you want to delete cronjob "' + name + '"?',
                function() {
                    fetch('/api/cronjob/delete?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('CronJob "' + name + '" deleted successfully');
                            loadCronJobs();
                        } else {
                            alert('Failed to delete cronjob: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        function deleteJob(name) {
            showConfirmModal(
                'Delete Job',
                'Are you sure you want to delete job "' + name + '"?',
                function() {
                    fetch('/api/job/delete?name=' + encodeURIComponent(name), {
                        method: 'POST'
                    })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            alert('Job "' + name + '" deleted successfully');
                            loadJobs();
                        } else {
                            alert('Failed to delete job: ' + result.error);
                        }
                    })
                    .catch(err => alert('Error: ' + err.message));
                }
            );
        }

        // Copy to clipboard function
        function copyToClipboard(text, label) {
            navigator.clipboard.writeText(text).then(() => {
                const toast = document.createElement('div');
                toast.textContent = label + ' copied!';
                toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #22c55e; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10001; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: 600;';
                document.body.appendChild(toast);
                setTimeout(() => document.body.removeChild(toast), 2000);
            });
        }

        // Pod details functions
        let currentPodName = '';
        let currentPodNamespace = '';
        let currentPodView = 'details'; // details, yaml, describe

        function showPodDetails(name, namespace) {
            currentPodName = name;
            currentPodNamespace = namespace || currentNamespace;
            currentPodView = 'details';
            loadPodDetailsTab('details');
            document.getElementById('pod-details-modal').style.display = 'block';
        }

        function loadPodDetailsTab(tab) {
            currentPodView = tab;

            // Update tab buttons
            document.querySelectorAll('.pod-detail-tab').forEach(btn => {
                btn.style.background = btn.dataset.tab === tab ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'rgba(71, 85, 105, 0.5)';
            });

            if (tab === 'details') {
                loadPodDetailsContent();
            } else if (tab === 'yaml') {
                loadPodYAML();
            } else if (tab === 'describe') {
                loadPodDescribe();
            }
        }

        function loadPodDetailsContent() {
            fetch('/api/pod/details?name=' + encodeURIComponent(currentPodName) + '&namespace=' + encodeURIComponent(currentPodNamespace))
                .then(r => r.json())
                .then(data => {
                    if (!data.success) {
                        alert('Error: ' + data.error);
                        return;
                    }

                    let html = '<div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #475569; padding-bottom: 1rem;">';
                    html += '<button class="pod-detail-tab" data-tab="details" onclick="loadPodDetailsTab(\'details\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);">Details</button>';
                    html += '<button class="pod-detail-tab" data-tab="yaml" onclick="loadPodDetailsTab(\'yaml\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: rgba(71, 85, 105, 0.5);">YAML</button>';
                    html += '<button class="pod-detail-tab" data-tab="describe" onclick="loadPodDetailsTab(\'describe\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: rgba(71, 85, 105, 0.5);">Describe</button>';
                    html += '</div>';

                    html += '<h2 style="margin-bottom: 1.5rem; color: #06b6d4; display: flex; align-items: center; gap: 0.75rem;">' +
                            'Pod: ' + data.name +
                            '<button onclick="copyToClipboard(\'' + data.name + '\', \'Pod name\')" style="padding: 0.5rem; background: rgba(6, 182, 212, 0.2); border: 1px solid #06b6d4; border-radius: 6px; color: #06b6d4; cursor: pointer; display: flex; align-items: center; font-size: 0.875rem;" title="Copy pod name">' +
                            '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>' +
                            '</button>' +
                            '</h2>';

                    // Overview section
                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">';
                    html += '<div style="background: rgba(6, 182, 212, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Status</div>' +
                            '<div style="color: #06b6d4; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.status + '</div></div>';
                    html += '<div style="background: rgba(34, 197, 94, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">IP Address</div>' +
                            '<div style="color: #22c55e; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.5rem;">' +
                            (data.ip || '-') +
                            (data.ip ? '<button onclick="copyToClipboard(\'' + data.ip + '\', \'IP address\')" style="padding: 0.25rem 0.5rem; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 4px; color: #22c55e; cursor: pointer; display: flex; align-items: center; font-size: 0.75rem;" title="Copy IP"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg></button>' : '') +
                            '</div></div>';
                    html += '<div style="background: rgba(249, 115, 22, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(249, 115, 22, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Node</div>' +
                            '<div style="color: #f97316; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.node + '</div></div>';
                    html += '<div style="background: rgba(168, 85, 247, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Age</div>' +
                            '<div style="color: #a855f7; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.age + '</div></div>';

                    // Add CPU/Memory metrics if available
                    if (data.metrics) {
                        html += '<div style="background: rgba(236, 72, 153, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(236, 72, 153, 0.3);">' +
                                '<div style="color: #94a3b8; font-size: 0.875rem;">CPU Usage</div>' +
                                '<div style="color: #ec4899; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.metrics.totalCPU + '</div>' +
                                '<div style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.25rem;">Real-time</div></div>';
                        html += '<div style="background: rgba(245, 158, 11, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.3);">' +
                                '<div style="color: #94a3b8; font-size: 0.875rem;">Memory Usage</div>' +
                                '<div style="color: #f59e0b; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.metrics.totalMemory + '</div>' +
                                '<div style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.25rem;">Real-time</div></div>';
                    }

                    html += '</div>';

                    // Containers section
                    html += '<h3 style="margin: 2rem 0 1rem 0; color: #cbd5e1; border-bottom: 1px solid #475569; padding-bottom: 0.5rem;">Containers</h3>';
                    html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">';
                    html += '<thead><tr style="background: rgba(71, 85, 105, 0.3);"><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Name</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Image</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">State</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Ready</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Restarts</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Actions</th></tr></thead><tbody>';
                    data.containers.forEach(c => {
                        html += '<tr style="border-bottom: 1px solid #334155;">' +
                                '<td style="padding: 0.75rem; color: #e2e8f0; font-weight: 600;">' + c.name + '</td>' +
                                '<td style="padding: 0.75rem;"><div style="color: #06b6d4; font-size: 0.875rem; font-family: monospace; background: rgba(6, 182, 212, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block;">' + c.image + '</div></td>' +
                                '<td style="padding: 0.75rem;"><span style="color: ' + (c.state === 'Running' ? '#22c55e' : '#eab308') + ';">' + (c.state || 'Unknown') + '</span></td>' +
                                '<td style="padding: 0.75rem;"><span style="color: ' + (c.ready ? '#22c55e' : '#ef4444') + ';">' + (c.ready ? 'Yes' : 'No') + '</span></td>' +
                                '<td style="padding: 0.75rem; color: #e2e8f0;">' + (c.restartCount || 0) + '</td>' +
                                '<td style="padding: 0.75rem;">' +
                                    '<button onclick="openTerminal(\'' + data.name + '\', \'' + c.name + '\')" style="padding: 0.5rem 1rem; background: #22c55e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 600;" ' + (c.state !== 'Running' ? 'disabled style="background: #64748b; cursor: not-allowed;"' : '') + '>Shell</button>' +
                                '</td>' +
                                '</tr>';
                    });
                    html += '</tbody></table></div>';

                    // Port Forward section
                    html += '<div style="margin-top: 1.5rem; padding: 1rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px;">';
                    html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
                    html += '<div><span style="color: #22c55e; font-weight: 600;">Port Forward</span><p style="color: #94a3b8; font-size: 0.875rem; margin: 0.25rem 0 0 0;">Forward a port from this pod to your local machine</p></div>';
                    html += '<button onclick="openPortForwardModal(\'pod\', \'' + data.name + '\', \'' + data.namespace + '\')" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">Forward Port</button>';
                    html += '</div></div>';

                    // Volumes section
                    if (data.volumes && data.volumes.length > 0) {
                        html += '<h3 style="margin: 2rem 0 1rem 0; color: #cbd5e1; border-bottom: 1px solid #475569; padding-bottom: 0.5rem;">Volumes</h3>';
                        html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">';
                        html += '<thead><tr style="background: rgba(71, 85, 105, 0.3);"><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Name</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Type</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Source</th></tr></thead><tbody>';
                        data.volumes.forEach(v => {
                            html += '<tr style="border-bottom: 1px solid #334155;">' +
                                    '<td style="padding: 0.75rem; color: #e2e8f0;">' + v.name + '</td>' +
                                    '<td style="padding: 0.75rem; color: #06b6d4;">' + v.type + '</td>' +
                                    '<td style="padding: 0.75rem; color: #94a3b8;">' + (v.source || '-') + '</td>' +
                                    '</tr>';
                        });
                        html += '</tbody></table></div>';
                    }

                    // Conditions section
                    if (data.conditions && data.conditions.length > 0) {
                        html += '<h3 style="margin: 2rem 0 1rem 0; color: #cbd5e1; border-bottom: 1px solid #475569; padding-bottom: 0.5rem;">Conditions</h3>';
                        html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">';
                        html += '<thead><tr style="background: rgba(71, 85, 105, 0.3);"><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Type</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Status</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Reason</th></tr></thead><tbody>';
                        data.conditions.forEach(c => {
                            html += '<tr style="border-bottom: 1px solid #334155;">' +
                                    '<td style="padding: 0.75rem; color: #e2e8f0;">' + c.type + '</td>' +
                                    '<td style="padding: 0.75rem;"><span style="color: ' + (c.status === 'True' ? '#22c55e' : '#ef4444') + ';">' + c.status + '</span></td>' +
                                    '<td style="padding: 0.75rem; color: #94a3b8;">' + (c.reason || '-') + '</td>' +
                                    '</tr>';
                        });
                        html += '</tbody></table></div>';
                    }

                    // Events section
                    if (data.events && data.events.length > 0) {
                        html += '<h3 style="margin: 2rem 0 1rem 0; color: #cbd5e1; border-bottom: 1px solid #475569; padding-bottom: 0.5rem;">Recent Events</h3>';
                        html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">';
                        html += '<thead><tr style="background: rgba(71, 85, 105, 0.3);"><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Type</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Reason</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Message</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Count</th><th style="padding: 0.75rem; text-align: left; color: #cbd5e1;">Age</th></tr></thead><tbody>';
                        data.events.slice(0, 10).forEach(e => {
                            html += '<tr style="border-bottom: 1px solid #334155;">' +
                                    '<td style="padding: 0.75rem;"><span style="color: ' + (e.type === 'Normal' ? '#22c55e' : '#eab308') + ';">' + e.type + '</span></td>' +
                                    '<td style="padding: 0.75rem; color: #06b6d4;">' + e.reason + '</td>' +
                                    '<td style="padding: 0.75rem; color: #94a3b8; font-size: 0.875rem;">' + e.message + '</td>' +
                                    '<td style="padding: 0.75rem; color: #e2e8f0;">' + e.count + '</td>' +
                                    '<td style="padding: 0.75rem; color: #94a3b8; font-size: 0.875rem;">' + e.age + '</td>' +
                                    '</tr>';
                        });
                        html += '</tbody></table></div>';
                    }

                    // Labels section
                    if (data.labels && Object.keys(data.labels).length > 0) {
                        html += '<h3 style="margin: 2rem 0 1rem 0; color: #cbd5e1; border-bottom: 1px solid #475569; padding-bottom: 0.5rem;">Labels</h3>';
                        html += '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';
                        Object.entries(data.labels).forEach(([key, value]) => {
                            html += '<span style="background: rgba(71, 85, 105, 0.5); padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem; color: #cbd5e1;">' +
                                    '<span style="color: #06b6d4;">' + key + '</span>=<span style="color: #a855f7;">' + value + '</span>' +
                                    '</span>';
                        });
                        html += '</div>';
                    }

                    document.getElementById('pod-details-content').innerHTML = html;
                })
                .catch(err => alert('Error loading pod details: ' + err.message));
        }

        function loadPodYAML() {
            fetch('/api/pod/yaml?name=' + encodeURIComponent(currentPodName) + '&namespace=' + encodeURIComponent(currentPodNamespace))
                .then(r => r.json())
                .then(data => {
                    if (!data.success) {
                        alert('Error: ' + data.error);
                        return;
                    }

                    let html = '<div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #475569; padding-bottom: 1rem;">';
                    html += '<button class="pod-detail-tab" data-tab="details" onclick="loadPodDetailsTab(\'details\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: rgba(71, 85, 105, 0.5);">Details</button>';
                    html += '<button class="pod-detail-tab" data-tab="yaml" onclick="loadPodDetailsTab(\'yaml\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);">YAML</button>';
                    html += '<button class="pod-detail-tab" data-tab="describe" onclick="loadPodDetailsTab(\'describe\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: rgba(71, 85, 105, 0.5);">Describe</button>';
                    html += '</div>';

                    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">';
                    html += '<h2 style="color: #06b6d4;">YAML Definition</h2>';
                    html += '<button onclick="copyToClipboard(document.getElementById(\'yaml-content\').textContent, \'YAML\')" style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">' +
                            '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>' +
                            'Copy YAML' +
                            '</button>';
                    html += '</div>';

                    html += '<pre id="yaml-content" style="background: #0f172a; padding: 1.5rem; border-radius: 8px; border: 1px solid #475569; overflow-x: auto; color: #e2e8f0; font-family: \'Courier New\', monospace; font-size: 0.875rem; line-height: 1.5;">' + data.yaml + '</pre>';

                    document.getElementById('pod-details-content').innerHTML = html;
                })
                .catch(err => alert('Error loading YAML: ' + err.message));
        }

        function loadPodDescribe() {
            fetch('/api/pod/describe?name=' + encodeURIComponent(currentPodName) + '&namespace=' + encodeURIComponent(currentPodNamespace))
                .then(r => r.json())
                .then(data => {
                    if (!data.success) {
                        alert('Error: ' + data.error);
                        return;
                    }

                    let html = '<div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #475569; padding-bottom: 1rem;">';
                    html += '<button class="pod-detail-tab" data-tab="details" onclick="loadPodDetailsTab(\'details\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: rgba(71, 85, 105, 0.5);">Details</button>';
                    html += '<button class="pod-detail-tab" data-tab="yaml" onclick="loadPodDetailsTab(\'yaml\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: rgba(71, 85, 105, 0.5);">YAML</button>';
                    html += '<button class="pod-detail-tab" data-tab="describe" onclick="loadPodDetailsTab(\'describe\')" style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);">Describe</button>';
                    html += '</div>';

                    html += '<h2 style="margin-bottom: 1.5rem; color: #06b6d4;">Describe Pod</h2>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; border: 1px solid #475569; overflow-x: auto; color: #e2e8f0; font-family: \'Courier New\', monospace; font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap;">' + data.describe + '</pre>';

                    document.getElementById('pod-details-content').innerHTML = html;
                })
                .catch(err => alert('Error loading describe: ' + err.message));
        }

        function closePodDetails() {
            document.getElementById('pod-details-modal').style.display = 'none';
        }

        // Deployment Details Functions
        let currentDeploymentName = '';
        let currentDeploymentView = 'details';

        function showDeploymentDetails(name) {
            currentDeploymentName = name;
            currentDeploymentView = 'details';
            loadDeploymentDetailsTab('details');
            document.getElementById('deployment-details-modal').style.display = 'block';
        }

        function closeDeploymentDetails() {
            document.getElementById('deployment-details-modal').style.display = 'none';
        }

        function loadDeploymentDetailsTab(tab) {
            currentDeploymentView = tab;
            if (tab === 'details') {
                loadDeploymentDetailsContent();
            } else if (tab === 'yaml') {
                loadDeploymentYAML();
            } else if (tab === 'describe') {
                loadDeploymentDescribe();
            }
        }

        function loadDeploymentDetailsContent() {
            fetch('/api/deployment/details?name=' + currentDeploymentName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadDeploymentDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentDeploymentView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadDeploymentDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentDeploymentView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadDeploymentDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentDeploymentView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';

                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">' +
                            data.name +
                            '<button onclick="copyToClipboard(\'' + data.name + '\', \'Deployment name\')" style="padding: 0.25rem 0.75rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 0.875rem;">Copy</button>' +
                            '</h2>';

                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">';
                    html += '<div style="background: rgba(6, 182, 212, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Ready</div>' +
                            '<div style="color: #06b6d4; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.ready + '</div></div>';
                    html += '<div style="background: rgba(34, 197, 94, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Available</div>' +
                            '<div style="color: #22c55e; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.available + '</div></div>';
                    html += '<div style="background: rgba(168, 85, 247, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Strategy</div>' +
                            '<div style="color: #a855f7; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + (data.strategy || 'RollingUpdate') + '</div></div>';
                    html += '<div style="background: rgba(251, 146, 60, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 146, 60, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Age</div>' +
                            '<div style="color: #fb923c; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.age + '</div></div>';
                    html += '</div>';

                    if (data.selector) {
                        html += '<div style="background: #0f172a; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #475569;">' +
                                '<div style="color: #06b6d4; font-weight: 600; margin-bottom: 0.5rem;">Selector</div>' +
                                '<div style="color: #e2e8f0; font-family: monospace;">' + data.selector + '</div></div>';
                    }

                    document.getElementById('deployment-details-content').innerHTML = html;
                });
        }

        function loadDeploymentYAML() {
            fetch('/api/deployment/yaml?name=' + currentDeploymentName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadDeploymentDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadDeploymentDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadDeploymentDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#deployment-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('deployment-details-content').innerHTML = html;
                });
        }

        function loadDeploymentDescribe() {
            fetch('/api/deployment/describe?name=' + currentDeploymentName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadDeploymentDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadDeploymentDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadDeploymentDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('deployment-details-content').innerHTML = html;
                });
        }

        // Service Details Functions
        let currentServiceName = '';
        let currentServiceNamespace = '';
        let currentServiceView = 'details';

        function showServiceDetails(name, namespace) {
            currentServiceName = name;
            currentServiceNamespace = namespace || currentNamespace;
            currentServiceView = 'details';
            loadServiceDetailsTab('details');
            document.getElementById('service-details-modal').style.display = 'block';
        }

        function closeServiceDetails() {
            document.getElementById('service-details-modal').style.display = 'none';
        }

        function loadServiceDetailsTab(tab) {
            currentServiceView = tab;
            if (tab === 'details') {
                loadServiceDetailsContent();
            } else if (tab === 'yaml') {
                loadServiceYAML();
            } else if (tab === 'describe') {
                loadServiceDescribe();
            }
        }

        function loadServiceDetailsContent() {
            fetch('/api/service/details?name=' + encodeURIComponent(currentServiceName) + '&namespace=' + encodeURIComponent(currentServiceNamespace))
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadServiceDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentServiceView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadServiceDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentServiceView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadServiceDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentServiceView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';

                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">' +
                            data.name +
                            '<button onclick="copyToClipboard(\'' + data.name + '\', \'Service name\')" style="padding: 0.25rem 0.75rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 0.875rem;">Copy</button>' +
                            '</h2>';

                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">';
                    html += '<div style="background: rgba(6, 182, 212, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Type</div>' +
                            '<div style="color: #06b6d4; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.type + '</div></div>';
                    html += '<div style="background: rgba(34, 197, 94, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Cluster IP</div>' +
                            '<div style="color: #22c55e; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.clusterIP + '</div></div>';
                    html += '<div style="background: rgba(251, 146, 60, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 146, 60, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Ports</div>' +
                            '<div style="color: #fb923c; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.ports + '</div></div>';
                    html += '<div style="background: rgba(168, 85, 247, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Age</div>' +
                            '<div style="color: #a855f7; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.age + '</div></div>';
                    html += '</div>';

                    if (data.selector) {
                        html += '<div style="background: #0f172a; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #475569;">' +
                                '<div style="color: #06b6d4; font-weight: 600; margin-bottom: 0.5rem;">Selector</div>' +
                                '<div style="color: #e2e8f0; font-family: monospace;">' + data.selector + '</div></div>';
                    }

                    // Port Forward section
                    html += '<div style="margin-top: 1.5rem; padding: 1rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px;">';
                    html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
                    html += '<div><span style="color: #22c55e; font-weight: 600;">Port Forward</span><p style="color: #94a3b8; font-size: 0.875rem; margin: 0.25rem 0 0 0;">Forward this service to your local machine</p></div>';
                    html += '<button onclick="openPortForwardModal(\'service\', \'' + data.name + '\', currentServiceNamespace)" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">Forward Port</button>';
                    html += '</div></div>';

                    document.getElementById('service-details-content').innerHTML = html;
                });
        }

        function loadServiceYAML() {
            fetch('/api/service/yaml?name=' + encodeURIComponent(currentServiceName) + '&namespace=' + encodeURIComponent(currentServiceNamespace))
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadServiceDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadServiceDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadServiceDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#service-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('service-details-content').innerHTML = html;
                });
        }

        function loadServiceDescribe() {
            fetch('/api/service/describe?name=' + encodeURIComponent(currentServiceName) + '&namespace=' + encodeURIComponent(currentServiceNamespace))
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadServiceDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadServiceDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadServiceDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('service-details-content').innerHTML = html;
                });
        }

        // Ingress Details Functions
        let currentIngressName = '';
        let currentIngressView = 'details';

        function showIngressDetails(name) {
            currentIngressName = name;
            currentIngressView = 'details';
            loadIngressDetailsTab('details');
            document.getElementById('ingress-details-modal').style.display = 'block';
        }

        function closeIngressDetails() {
            document.getElementById('ingress-details-modal').style.display = 'none';
        }

        function loadIngressDetailsTab(tab) {
            currentIngressView = tab;
            if (tab === 'details') {
                loadIngressDetailsContent();
            } else if (tab === 'yaml') {
                loadIngressYAML();
            } else if (tab === 'describe') {
                loadIngressDescribe();
            }
        }

        function loadIngressDetailsContent() {
            fetch('/api/ingress/details?name=' + currentIngressName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadIngressDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentIngressView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadIngressDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentIngressView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadIngressDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentIngressView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';

                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">' +
                            data.name +
                            '<button onclick="copyToClipboard(\'' + data.name + '\', \'Ingress name\')" style="padding: 0.25rem 0.75rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 0.875rem;">Copy</button>' +
                            '</h2>';

                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">';
                    html += '<div style="background: rgba(6, 182, 212, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Hosts</div>' +
                            '<div style="color: #06b6d4; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + (data.hosts || '-') + '</div></div>';
                    html += '<div style="background: rgba(34, 197, 94, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Class</div>' +
                            '<div style="color: #22c55e; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + (data.class || '-') + '</div></div>';
                    html += '<div style="background: rgba(168, 85, 247, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Age</div>' +
                            '<div style="color: #a855f7; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.age + '</div></div>';
                    html += '</div>';

                    document.getElementById('ingress-details-content').innerHTML = html;
                });
        }

        function loadIngressYAML() {
            fetch('/api/ingress/yaml?name=' + currentIngressName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadIngressDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadIngressDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadIngressDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#ingress-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('ingress-details-content').innerHTML = html;
                });
        }

        function loadIngressDescribe() {
            fetch('/api/ingress/describe?name=' + currentIngressName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadIngressDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadIngressDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadIngressDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('ingress-details-content').innerHTML = html;
                });
        }

        // ConfigMap Details Functions
        let currentConfigMapName = '';
        let currentConfigMapView = 'details';

        function showConfigMapDetails(name) {
            currentConfigMapName = name;
            currentConfigMapView = 'details';
            loadConfigMapDetailsTab('details');
            document.getElementById('configmap-details-modal').style.display = 'block';
        }

        function closeConfigMapDetails() {
            document.getElementById('configmap-details-modal').style.display = 'none';
        }

        function loadConfigMapDetailsTab(tab) {
            currentConfigMapView = tab;
            if (tab === 'details') {
                loadConfigMapDetailsContent();
            } else if (tab === 'yaml') {
                loadConfigMapYAML();
            } else if (tab === 'describe') {
                loadConfigMapDescribe();
            }
        }

        function loadConfigMapDetailsContent() {
            fetch('/api/configmap/details?name=' + currentConfigMapName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadConfigMapDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentConfigMapView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadConfigMapDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentConfigMapView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadConfigMapDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentConfigMapView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';

                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">' +
                            data.name +
                            '<button onclick="copyToClipboard(\'' + data.name + '\', \'ConfigMap name\')" style="padding: 0.25rem 0.75rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 0.875rem;">Copy</button>' +
                            '</h2>';

                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">';
                    html += '<div style="background: rgba(6, 182, 212, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Data Keys</div>' +
                            '<div style="color: #06b6d4; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + (data.keys || '-') + '</div></div>';
                    html += '<div style="background: rgba(168, 85, 247, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Age</div>' +
                            '<div style="color: #a855f7; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.age + '</div></div>';
                    html += '</div>';

                    document.getElementById('configmap-details-content').innerHTML = html;
                });
        }

        function loadConfigMapYAML() {
            fetch('/api/configmap/yaml?name=' + currentConfigMapName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadConfigMapDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadConfigMapDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadConfigMapDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#configmap-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('configmap-details-content').innerHTML = html;
                });
        }

        function loadConfigMapDescribe() {
            fetch('/api/configmap/describe?name=' + currentConfigMapName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadConfigMapDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadConfigMapDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadConfigMapDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div></div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('configmap-details-content').innerHTML = html;
                });
        }

        // StatefulSet details functions
        let currentStatefulSetName = '';
        let currentStatefulSetView = 'details';

        function showStatefulSetDetails(name) {
            currentStatefulSetName = name;
            currentStatefulSetView = 'details';
            loadStatefulSetDetailsTab('details');
            document.getElementById('statefulset-details-modal').style.display = 'block';
        }

        function closeStatefulSetDetails() {
            document.getElementById('statefulset-details-modal').style.display = 'none';
        }

        function loadStatefulSetDetailsTab(tab) {
            currentStatefulSetView = tab;
            if (tab === 'details') {
                loadStatefulSetDetailsContent();
            } else if (tab === 'yaml') {
                loadStatefulSetYAML();
            } else if (tab === 'describe') {
                loadStatefulSetDescribe();
            }
        }

        function loadStatefulSetDetailsContent() {
            fetch('/api/statefulset/details?name=' + currentStatefulSetName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadStatefulSetDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentStatefulSetView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadStatefulSetDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentStatefulSetView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadStatefulSetDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentStatefulSetView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem;">' + data.name + '</h2>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + JSON.stringify(data, null, 2) + '</pre>';
                    document.getElementById('statefulset-details-content').innerHTML = html;
                });
        }

        function loadStatefulSetYAML() {
            fetch('/api/statefulset/yaml?name=' + currentStatefulSetName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadStatefulSetDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadStatefulSetDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadStatefulSetDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#statefulset-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('statefulset-details-content').innerHTML = html;
                });
        }

        function loadStatefulSetDescribe() {
            fetch('/api/statefulset/describe?name=' + currentStatefulSetName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadStatefulSetDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadStatefulSetDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadStatefulSetDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('statefulset-details-content').innerHTML = html;
                });
        }

        // DaemonSet details functions
        let currentDaemonSetName = '';
        let currentDaemonSetView = 'details';

        function showDaemonSetDetails(name) {
            currentDaemonSetName = name;
            currentDaemonSetView = 'details';
            loadDaemonSetDetailsTab('details');
            document.getElementById('daemonset-details-modal').style.display = 'block';
        }

        function closeDaemonSetDetails() {
            document.getElementById('daemonset-details-modal').style.display = 'none';
        }

        function loadDaemonSetDetailsTab(tab) {
            currentDaemonSetView = tab;
            if (tab === 'details') {
                loadDaemonSetDetailsContent();
            } else if (tab === 'yaml') {
                loadDaemonSetYAML();
            } else if (tab === 'describe') {
                loadDaemonSetDescribe();
            }
        }

        function loadDaemonSetDetailsContent() {
            fetch('/api/daemonset/details?name=' + currentDaemonSetName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadDaemonSetDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentDaemonSetView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadDaemonSetDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentDaemonSetView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadDaemonSetDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentDaemonSetView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem;">' + data.name + '</h2>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + JSON.stringify(data, null, 2) + '</pre>';
                    document.getElementById('daemonset-details-content').innerHTML = html;
                });
        }

        function loadDaemonSetYAML() {
            fetch('/api/daemonset/yaml?name=' + currentDaemonSetName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadDaemonSetDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadDaemonSetDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadDaemonSetDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#daemonset-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('daemonset-details-content').innerHTML = html;
                });
        }

        function loadDaemonSetDescribe() {
            fetch('/api/daemonset/describe?name=' + currentDaemonSetName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadDaemonSetDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadDaemonSetDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadDaemonSetDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('daemonset-details-content').innerHTML = html;
                });
        }

        // CronJob details functions
        let currentCronJobName = '';
        let currentCronJobView = 'details';

        function showCronJobDetails(name) {
            currentCronJobName = name;
            currentCronJobView = 'details';
            loadCronJobDetailsTab('details');
            document.getElementById('cronjob-details-modal').style.display = 'block';
        }

        function closeCronJobDetails() {
            document.getElementById('cronjob-details-modal').style.display = 'none';
        }

        function loadCronJobDetailsTab(tab) {
            currentCronJobView = tab;
            if (tab === 'details') {
                loadCronJobDetailsContent();
            } else if (tab === 'yaml') {
                loadCronJobYAML();
            } else if (tab === 'describe') {
                loadCronJobDescribe();
            }
        }

        function loadCronJobDetailsContent() {
            fetch('/api/cronjob/details?name=' + currentCronJobName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadCronJobDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentCronJobView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadCronJobDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentCronJobView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadCronJobDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentCronJobView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem;">' + data.name + '</h2>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + JSON.stringify(data, null, 2) + '</pre>';
                    document.getElementById('cronjob-details-content').innerHTML = html;
                });
        }

        function loadCronJobYAML() {
            fetch('/api/cronjob/yaml?name=' + currentCronJobName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadCronJobDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadCronJobDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadCronJobDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#cronjob-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('cronjob-details-content').innerHTML = html;
                });
        }

        function loadCronJobDescribe() {
            fetch('/api/cronjob/describe?name=' + currentCronJobName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadCronJobDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadCronJobDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadCronJobDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('cronjob-details-content').innerHTML = html;
                });
        }

        // Job details functions
        let currentJobName = '';
        let currentJobView = 'details';

        function showJobDetails(name) {
            currentJobName = name;
            currentJobView = 'details';
            loadJobDetailsTab('details');
            document.getElementById('job-details-modal').style.display = 'block';
        }

        function closeJobDetails() {
            document.getElementById('job-details-modal').style.display = 'none';
        }

        function loadJobDetailsTab(tab) {
            currentJobView = tab;
            if (tab === 'details') {
                loadJobDetailsContent();
            } else if (tab === 'yaml') {
                loadJobYAML();
            } else if (tab === 'describe') {
                loadJobDescribe();
            }
        }

        function loadJobDetailsContent() {
            fetch('/api/job/details?name=' + currentJobName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadJobDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: ' + (currentJobView === 'details' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadJobDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: ' + (currentJobView === 'yaml' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadJobDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: ' + (currentJobView === 'describe' ? '#06b6d4' : '#475569') + '; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<h2 style="color: #06b6d4; margin-bottom: 1.5rem;">' + data.name + '</h2>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + JSON.stringify(data, null, 2) + '</pre>';
                    document.getElementById('job-details-content').innerHTML = html;
                });
        }

        function loadJobYAML() {
            fetch('/api/job/yaml?name=' + currentJobName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">' +
                               '<div style="display: flex; gap: 0.75rem;">' +
                               '<button onclick="loadJobDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadJobDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadJobDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>' +
                               '<button onclick="copyToClipboard(document.querySelector(\'#job-details-content pre\').innerText, \'YAML\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('job-details-content').innerHTML = html;
                });
        }

        function loadJobDescribe() {
            fetch('/api/job/describe?name=' + currentJobName)
                .then(r => r.json())
                .then(data => {
                    let html = '<div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">' +
                               '<button onclick="loadJobDetailsTab(\'details\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Details</button>' +
                               '<button onclick="loadJobDetailsTab(\'yaml\')" style="padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">YAML</button>' +
                               '<button onclick="loadJobDetailsTab(\'describe\')" style="padding: 0.5rem 1rem; background: #06b6d4; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Describe</button>' +
                               '</div>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('job-details-content').innerHTML = html;
                });
        }

        // Terminal functions
        let terminalWs = null;
        let currentPod = '';
        let currentContainer = '';

        function openTerminal(podName, containerName) {
            currentPod = podName;
            currentContainer = containerName;

            document.getElementById('terminal-title').textContent = 'Terminal: ' + podName + ' / ' + containerName;
            document.getElementById('terminal-output').innerHTML = '<div style="color: #22c55e;">● Connecting to ' + podName + '/' + containerName + '...</div>';
            document.getElementById('terminal-modal').style.display = 'block';
            document.getElementById('terminal-input').value = '';
            document.getElementById('terminal-input').focus();

            // Set up Enter key to send command
            document.getElementById('terminal-input').onkeypress = function(e) {
                if (e.key === 'Enter') {
                    sendCommand();
                }
            };

            // Add welcome message
            setTimeout(() => {
                addTerminalOutput('● Connected! Type commands below.', '#22c55e');
                addTerminalOutput('$ ', '#06b6d4', false);
            }, 500);
        }

        function closeTerminal() {
            if (terminalWs) {
                terminalWs.close();
                terminalWs = null;
            }
            document.getElementById('terminal-modal').style.display = 'none';
        }

        function sendCommand() {
            const input = document.getElementById('terminal-input');
            const command = input.value.trim();

            if (!command) return;

            // Display the command
            addTerminalOutput(command, '#e2e8f0');
            input.value = '';

            // Send command to backend
            fetch('/api/pod/exec', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    pod: currentPod,
                    container: currentContainer,
                    command: command
                })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    addTerminalOutput(data.output || '(no output)', '#94a3b8');
                } else {
                    addTerminalOutput('Error: ' + (data.error || 'Command failed'), '#ef4444');
                }
                addTerminalOutput('$ ', '#06b6d4', false);
            })
            .catch(err => {
                addTerminalOutput('Error: ' + err.message, '#ef4444');
                addTerminalOutput('$ ', '#06b6d4', false);
            });
        }

        function addTerminalOutput(text, color, newline = true) {
            const output = document.getElementById('terminal-output');
            const line = document.createElement('div');
            line.style.color = color || '#e2e8f0';
            line.style.whiteSpace = 'pre-wrap';
            line.style.wordBreak = 'break-all';
            if (!newline) {
                line.style.display = 'inline';
            }
            line.textContent = text;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        }

        // Port Forward functions
        let activePortForwards = [];

        function openPortForwardModal(type, name, namespace, defaultPort) {
            document.getElementById('pf-type').value = type;
            document.getElementById('pf-name').value = name;
            document.getElementById('pf-namespace').value = namespace || currentNamespace;
            document.getElementById('pf-resource-info').textContent = 'Forward ports for ' + type + ': ' + name;
            document.getElementById('pf-remote-port').value = defaultPort || '';
            document.getElementById('pf-local-port').value = '';
            document.getElementById('portforward-modal').style.display = 'flex';
        }

        function closePortForwardModal() {
            document.getElementById('portforward-modal').style.display = 'none';
        }

        function startPortForward() {
            const type = document.getElementById('pf-type').value;
            const name = document.getElementById('pf-name').value;
            const namespace = document.getElementById('pf-namespace').value;
            const remotePort = document.getElementById('pf-remote-port').value;
            const localPort = document.getElementById('pf-local-port').value;

            if (!remotePort) {
                alert('Remote port is required');
                return;
            }

            let url = '/api/portforward/start?type=' + encodeURIComponent(type) +
                '&name=' + encodeURIComponent(name) +
                '&namespace=' + encodeURIComponent(namespace) +
                '&remotePort=' + encodeURIComponent(remotePort);
            if (localPort) {
                url += '&localPort=' + encodeURIComponent(localPort);
            }

            fetch(url)
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        closePortForwardModal();
                        refreshPortForwards();
                        alert('Port forward started!\\nLocal: localhost:' + data.localPort + ' -> Remote: ' + remotePort + '\\nURL: ' + data.url);
                    } else {
                        alert('Error: ' + (data.error || 'Failed to start port forward'));
                    }
                })
                .catch(err => alert('Error: ' + err.message));
        }

        function stopPortForward(sessionId) {
            fetch('/api/portforward/stop?id=' + encodeURIComponent(sessionId))
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        refreshPortForwards();
                    } else {
                        alert('Error: ' + (data.error || 'Failed to stop port forward'));
                    }
                })
                .catch(err => alert('Error: ' + err.message));
        }

        function refreshPortForwards() {
            fetch('/api/portforward/list')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        activePortForwards = data.sessions || [];
                        updatePortForwardsUI();
                    }
                })
                .catch(err => console.error('Error fetching port forwards:', err));
        }

        function updatePortForwardsUI() {
            const count = activePortForwards.length;
            const toggleBtn = document.getElementById('portforwards-toggle');
            const badge = document.getElementById('pf-count-badge');
            const list = document.getElementById('portforwards-list');

            if (count > 0) {
                toggleBtn.style.display = 'block';
                badge.textContent = count;

                let html = '';
                activePortForwards.forEach(pf => {
                    html += '<div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">' +
                        '<span style="color: #22c55e; font-weight: 600; font-size: 0.875rem;">' + pf.type + '/' + pf.name + '</span>' +
                        '<button onclick="stopPortForward(\'' + pf.id + '\')" style="background: #ef4444; border: none; border-radius: 4px; color: white; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.75rem;">Stop</button>' +
                        '</div>' +
                        '<div style="color: #94a3b8; font-size: 0.75rem;">localhost:' + pf.localPort + ' -> :' + pf.remotePort + '</div>' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">' +
                        '<span style="color: #64748b; font-size: 0.7rem;">Running: ' + pf.duration + '</span>' +
                        '<a href="' + pf.url + '" target="_blank" style="color: #06b6d4; font-size: 0.75rem; text-decoration: none;">Open</a>' +
                        '</div>' +
                        '</div>';
                });
                list.innerHTML = html;
            } else {
                toggleBtn.style.display = 'none';
                document.getElementById('portforwards-panel').style.display = 'none';
            }
        }

        function togglePortForwardsPanel() {
            const panel = document.getElementById('portforwards-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        // Refresh port forwards on load
        setInterval(refreshPortForwards, 10000);
        setTimeout(refreshPortForwards, 1000);

        // Node details functions
        let currentNodeName = '';

        function showNodeDetails(name) {
            currentNodeName = name;
            loadNodeDetailsContent();
            document.getElementById('node-details-modal').style.display = 'block';
        }

        function closeNodeDetails() {
            document.getElementById('node-details-modal').style.display = 'none';
        }

        function loadNodeDetailsContent() {
            fetch('/api/node/details?name=' + currentNodeName)
                .then(r => r.json())
                .then(data => {
                    let html = '<h2 style="color: #06b6d4; margin-bottom: 1.5rem;">' + data.name + '</h2>';
                    html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem;">';
                    html += '<div style="background: rgba(6, 182, 212, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Status</div>' +
                            '<div style="color: ' + (data.status === 'Ready' ? '#22c55e' : '#ef4444') + '; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.status + '</div></div>';
                    html += '<div style="background: rgba(249, 115, 22, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(249, 115, 22, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Roles</div>' +
                            '<div style="color: #f97316; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.roles + '</div></div>';
                    html += '<div style="background: rgba(168, 85, 247, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Version</div>' +
                            '<div style="color: #a855f7; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.version + '</div></div>';
                    html += '<div style="background: rgba(34, 197, 94, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">CPU</div>' +
                            '<div style="color: #22c55e; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.cpu + '</div></div>';
                    html += '<div style="background: rgba(59, 130, 246, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">Memory</div>' +
                            '<div style="color: #3b82f6; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + data.memory + '</div></div>';
                    html += '<div style="background: rgba(234, 179, 8, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(234, 179, 8, 0.3);">' +
                            '<div style="color: #94a3b8; font-size: 0.875rem;">OS Image</div>' +
                            '<div style="color: #eab308; font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">' + (data.osImage || '-') + '</div></div>';
                    html += '</div>';
                    html += '<div style="margin-top: 1.5rem;"><h3 style="color: #06b6d4; margin-bottom: 1rem;">System Info</h3>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + JSON.stringify(data, null, 2) + '</pre></div>';
                    document.getElementById('node-details-content').innerHTML = html;
                });
        }

        function showNodeYAML(name) {
            currentNodeName = name;
            fetch('/api/node/yaml?name=' + name)
                .then(r => r.json())
                .then(data => {
                    document.getElementById('node-details-modal').style.display = 'block';
                    let html = '<h2 style="color: #06b6d4; margin-bottom: 1.5rem;">Node YAML: ' + name + '</h2>';
                    html += '<button onclick="copyToClipboard(document.querySelector(\'#node-details-content pre\').innerText, \'YAML\')" style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #475569; border: none; border-radius: 6px; color: white; cursor: pointer;">Copy YAML</button>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.yaml + '</pre>';
                    document.getElementById('node-details-content').innerHTML = html;
                });
        }

        function showNodeDescribe(name) {
            currentNodeName = name;
            fetch('/api/node/describe?name=' + name)
                .then(r => r.json())
                .then(data => {
                    document.getElementById('node-details-modal').style.display = 'block';
                    let html = '<h2 style="color: #06b6d4; margin-bottom: 1.5rem;">Node Describe: ' + name + '</h2>';
                    html += '<pre style="background: #0f172a; padding: 1.5rem; border-radius: 8px; color: #e2e8f0; overflow-x: auto; border: 1px solid #475569; line-height: 1.5;">' + data.describe + '</pre>';
                    document.getElementById('node-details-content').innerHTML = html;
                });
        }

        // Load namespaces
        function loadNamespaces() {
            return fetch('/api/namespaces')
                .then(r => r.json())
                .then(data => {
                    const selector = document.getElementById('namespace-selector');
                    // Add "All Namespaces" option first
                    let options = '<option value="">All Namespaces</option>';
                    options += data.namespaces.map(ns =>
                        '<option value="' + ns + '"' + (ns === 'default' ? ' selected' : '') + '>' + ns + '</option>'
                    ).join('');
                    selector.innerHTML = options;
                    // Set currentNamespace to match selector
                    currentNamespace = selector.value;
                });
        }

        // Change namespace
        function changeNamespace(namespace) {
            currentNamespace = namespace;
            console.log('Namespace changed to:', namespace);
            // Refresh current tab
            if (currentTab === 'pods') {
                loadPods();
            } else if (currentTab === 'deployments') {
                loadDeployments();
            } else if (currentTab === 'services') {
                loadServices();
            } else if (currentTab === 'statefulsets') {
                loadStatefulSets();
            } else if (currentTab === 'daemonsets') {
                loadDaemonSets();
            } else if (currentTab === 'cronjobs') {
                loadCronJobs();
            } else if (currentTab === 'jobs') {
                loadJobs();
            } else if (currentTab === 'nodes') {
                loadNodes();
            } else if (currentTab === 'configmaps') {
                loadConfigMaps();
            } else if (currentTab === 'ingresses') {
                loadIngresses();
            } else if (currentTab === 'dashboard') {
                loadResourceOverview();
            }
        }

        // Helper function to parse age string to milliseconds
        function parseAge(ageStr) {
            const parts = ageStr.match(/(\d+)([a-z]+)/ig);
            if (!parts) return 0;
            let ms = 0;
            parts.forEach(part => {
                const match = part.match(/(\d+)([a-z]+)/i);
                if (match) {
                    const value = parseInt(match[1]);
                    const unit = match[2];
                    if (unit.startsWith('s')) ms += value * 1000;
                    else if (unit.startsWith('m')) ms += value * 60 * 1000;
                    else if (unit.startsWith('h')) ms += value * 60 * 60 * 1000;
                    else if (unit.startsWith('d')) ms += value * 24 * 60 * 60 * 1000;
                }
            });
            return ms;
        }

        // Pods filter and sort functions
        function filterPods() {
            const statusFilter = document.getElementById('pods-status-filter').value;
            const ageFilter = document.getElementById('pods-age-filter').value;

            let filtered = podsData;

            if (statusFilter) {
                filtered = filtered.filter(p => p.status === statusFilter);
            }

            if (ageFilter) {
                const now = Date.now();
                const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter];
                filtered = filtered.filter(p => parseAge(p.age) < ageMs);
            }

            displayPods(filtered);
        }

        function sortPods() {
            const sortBy = document.getElementById('pods-sort').value;
            const sorted = [...podsData];

            if (sortBy === 'name') {
                sorted.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy === 'age') {
                sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age));
            } else if (sortBy === 'status') {
                sorted.sort((a, b) => a.status.localeCompare(b.status));
            }

            displayPods(sorted);
        }

        function clearFiltersPods() {
            document.getElementById('pods-status-filter').value = '';
            document.getElementById('pods-age-filter').value = '';
            document.getElementById('pods-sort').value = 'name';
            displayPods(podsData);
        }

        function displayPods(pods) {
            const tbody = document.getElementById('pods-tbody');
            tbody.innerHTML = pods.map(pod =>
                '<tr onclick="showPodDetails(\'' + pod.name + '\', \'' + pod.namespace + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'">' +
                    '<td>' + pod.name + '</td>' +
                    '<td><span class="badge badge-' + (pod.status === 'Running' ? 'success' : 'warning') + '">' + pod.status + '</span></td>' +
                    '<td>' + pod.ready + '</td>' +
                    '<td>' + pod.restarts + '</td>' +
                    '<td><span style="color: #ec4899; font-weight: 600;">' + (pod.cpu || '-') + '</span></td>' +
                    '<td><span style="color: #f59e0b; font-weight: 600;">' + (pod.memory || '-') + '</span></td>' +
                    '<td>' + pod.ip + '</td>' +
                    '<td>' + pod.node + '</td>' +
                    '<td>' + pod.age + '</td>' +
                    '<td onclick="event.stopPropagation()">' +
                        '<button onclick="restartPod(\'' + pod.name + '\', \'' + pod.namespace + '\')" style="padding: 0.25rem 0.75rem; margin-right: 0.5rem; background: #f97316; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Restart</button>' +
                        '<button onclick="deletePod(\'' + pod.name + '\', \'' + pod.namespace + '\')" style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Delete</button>' +
                    '</td>' +
                '</tr>'
            ).join('');
        }

        // Deployments filter and sort functions
        function filterDeployments() {
            const ageFilter = document.getElementById('deployments-age-filter').value;
            let filtered = deploymentsData;

            if (ageFilter) {
                const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter];
                filtered = filtered.filter(d => parseAge(d.age) < ageMs);
            }

            displayDeployments(filtered);
        }

        function sortDeployments() {
            const sortBy = document.getElementById('deployments-sort').value;
            const sorted = [...deploymentsData];

            if (sortBy === 'name') {
                sorted.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy === 'age') {
                sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age));
            }

            displayDeployments(sorted);
        }

        function clearFiltersDeployments() {
            document.getElementById('deployments-age-filter').value = '';
            document.getElementById('deployments-sort').value = 'name';
            displayDeployments(deploymentsData);
        }

        function displayDeployments(deps) {
            const tbody = document.getElementById('deployments-tbody');
            tbody.innerHTML = deps.map(dep =>
                '<tr onclick="showDeploymentDetails(\'' + dep.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'">' +
                    '<td>' + dep.name + '</td>' +
                    '<td>' + dep.ready + '</td>' +
                    '<td>' + dep.available + '</td>' +
                    '<td>' + dep.age + '</td>' +
                    '<td onclick="event.stopPropagation()">' +
                        '<button onclick="restartDeployment(\'' + dep.name + '\')" style="padding: 0.25rem 0.75rem; margin-right: 0.5rem; background: #f97316; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Restart</button>' +
                        '<button onclick="deleteDeployment(\'' + dep.name + '\')" style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Delete</button>' +
                    '</td>' +
                '</tr>'
            ).join('');
        }

        // Similar filter/sort/display functions for other resources (abbreviated for space)
        function filterStatefulSets() { const ageFilter = document.getElementById('statefulsets-age-filter').value; let filtered = statefulSetsData; if (ageFilter) { const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter]; filtered = filtered.filter(s => parseAge(s.age) < ageMs); } displayStatefulSets(filtered); }
        function sortStatefulSets() { const sortBy = document.getElementById('statefulsets-sort').value; const sorted = [...statefulSetsData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'age') sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age)); displayStatefulSets(sorted); }
        function clearFiltersStatefulSets() { document.getElementById('statefulsets-age-filter').value = ''; document.getElementById('statefulsets-sort').value = 'name'; displayStatefulSets(statefulSetsData); }
        function displayStatefulSets(ssets) { const tbody = document.getElementById('statefulsets-tbody'); tbody.innerHTML = ssets.map(ss => '<tr onclick="showStatefulSetDetails(\'' + ss.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + ss.name + '</td><td>' + ss.ready + '</td><td>' + (ss.service || '-') + '</td><td>' + ss.age + '</td><td onclick="event.stopPropagation()"><button onclick="restartStatefulSet(\'' + ss.name + '\')" style="padding: 0.25rem 0.75rem; margin-right: 0.5rem; background: #f97316; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Restart</button><button onclick="deleteStatefulSet(\'' + ss.name + '\')" style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Delete</button></td></tr>').join(''); }

        function filterDaemonSets() { const ageFilter = document.getElementById('daemonsets-age-filter').value; let filtered = daemonSetsData; if (ageFilter) { const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter]; filtered = filtered.filter(d => parseAge(d.age) < ageMs); } displayDaemonSets(filtered); }
        function sortDaemonSets() { const sortBy = document.getElementById('daemonsets-sort').value; const sorted = [...daemonSetsData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'age') sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age)); displayDaemonSets(sorted); }
        function clearFiltersDaemonSets() { document.getElementById('daemonsets-age-filter').value = ''; document.getElementById('daemonsets-sort').value = 'name'; displayDaemonSets(daemonSetsData); }
        function displayDaemonSets(dsets) { const tbody = document.getElementById('daemonsets-tbody'); tbody.innerHTML = dsets.map(ds => '<tr onclick="showDaemonSetDetails(\'' + ds.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + ds.name + '</td><td>' + ds.desired + '</td><td>' + ds.current + '</td><td>' + ds.ready + '</td><td>' + ds.age + '</td><td onclick="event.stopPropagation()"><button onclick="restartDaemonSet(\'' + ds.name + '\')" style="padding: 0.25rem 0.75rem; margin-right: 0.5rem; background: #f97316; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Restart</button><button onclick="deleteDaemonSet(\'' + ds.name + '\')" style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Delete</button></td></tr>').join(''); }

        function filterServices() { const typeFilter = document.getElementById('services-type-filter').value; const ageFilter = document.getElementById('services-age-filter').value; let filtered = servicesData; if (typeFilter) filtered = filtered.filter(s => s.type === typeFilter); if (ageFilter) { const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter]; filtered = filtered.filter(s => parseAge(s.age) < ageMs); } displayServices(filtered); }
        function sortServices() { const sortBy = document.getElementById('services-sort').value; const sorted = [...servicesData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'age') sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age)); else if (sortBy === 'type') sorted.sort((a, b) => a.type.localeCompare(b.type)); displayServices(sorted); }
        function clearFiltersServices() { document.getElementById('services-type-filter').value = ''; document.getElementById('services-age-filter').value = ''; document.getElementById('services-sort').value = 'name'; displayServices(servicesData); }
        function displayServices(svcs) { const tbody = document.getElementById('services-tbody'); tbody.innerHTML = svcs.map(svc => '<tr onclick="showServiceDetails(\'' + svc.name + '\', \'' + svc.namespace + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + svc.name + '</td><td>' + svc.type + '</td><td>' + svc.clusterIP + '</td><td>' + svc.ports + '</td><td>' + svc.age + '</td><td onclick="event.stopPropagation()"><button onclick="deleteService(\'' + svc.name + '\', \'' + svc.namespace + '\')" style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Delete</button></td></tr>').join(''); }

        function filterIngresses() { const ageFilter = document.getElementById('ingresses-age-filter').value; let filtered = ingressesData; if (ageFilter) { const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter]; filtered = filtered.filter(i => parseAge(i.age) < ageMs); } displayIngresses(filtered); }
        function sortIngresses() { const sortBy = document.getElementById('ingresses-sort').value; const sorted = [...ingressesData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'age') sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age)); displayIngresses(sorted); }
        function clearFiltersIngresses() { document.getElementById('ingresses-age-filter').value = ''; document.getElementById('ingresses-sort').value = 'name'; displayIngresses(ingressesData); }
        function displayIngresses(ingresses) { const tbody = document.getElementById('ingresses-tbody'); if (ingresses.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #94a3b8;">No ingresses found</td></tr>'; return; } tbody.innerHTML = ingresses.map(ing => '<tr onclick="showIngressDetails(\'' + ing.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + ing.name + '</td><td>' + (ing.hosts || '-') + '</td><td>' + ing.age + '</td></tr>').join(''); }

        function filterConfigMaps() { const ageFilter = document.getElementById('configmaps-age-filter').value; let filtered = configMapsData; if (ageFilter) { const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter]; filtered = filtered.filter(c => parseAge(c.age) < ageMs); } displayConfigMaps(filtered); }
        function sortConfigMaps() { const sortBy = document.getElementById('configmaps-sort').value; const sorted = [...configMapsData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'age') sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age)); displayConfigMaps(sorted); }
        function clearFiltersConfigMaps() { document.getElementById('configmaps-age-filter').value = ''; document.getElementById('configmaps-sort').value = 'name'; displayConfigMaps(configMapsData); }
        function displayConfigMaps(cms) { const tbody = document.getElementById('configmaps-tbody'); if (cms.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #94a3b8;">No configmaps found</td></tr>'; return; } tbody.innerHTML = cms.map(cm => '<tr onclick="showConfigMapDetails(\'' + cm.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + cm.name + '</td><td>' + (cm.keys || '-') + '</td><td>' + cm.age + '</td></tr>').join(''); }

        function filterCronJobs() { const ageFilter = document.getElementById('cronjobs-age-filter').value; let filtered = cronJobsData; if (ageFilter) { const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter]; filtered = filtered.filter(c => parseAge(c.age) < ageMs); } displayCronJobs(filtered); }
        function sortCronJobs() { const sortBy = document.getElementById('cronjobs-sort').value; const sorted = [...cronJobsData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'age') sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age)); displayCronJobs(sorted); }
        function clearFiltersCronJobs() { document.getElementById('cronjobs-age-filter').value = ''; document.getElementById('cronjobs-sort').value = 'name'; displayCronJobs(cronJobsData); }
        function displayCronJobs(cjs) { const tbody = document.getElementById('cronjobs-tbody'); tbody.innerHTML = cjs.map(cj => '<tr onclick="showCronJobDetails(\'' + cj.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + cj.name + '</td><td>' + cj.schedule + '</td><td>' + (cj.suspend ? 'Yes' : 'No') + '</td><td>' + cj.active + '</td><td>' + (cj.lastSchedule || '-') + '</td><td>' + cj.age + '</td><td onclick="event.stopPropagation()"><button onclick="deleteCronJob(\'' + cj.name + '\')" style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Delete</button></td></tr>').join(''); }

        function filterJobs() { const statusFilter = document.getElementById('jobs-status-filter').value; const ageFilter = document.getElementById('jobs-age-filter').value; let filtered = jobsData; if (statusFilter) filtered = filtered.filter(j => j.status === statusFilter); if (ageFilter) { const ageMs = { '1h': 3600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[ageFilter]; filtered = filtered.filter(j => parseAge(j.age) < ageMs); } displayJobs(filtered); }
        function sortJobs() { const sortBy = document.getElementById('jobs-sort').value; const sorted = [...jobsData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'age') sorted.sort((a, b) => parseAge(b.age) - parseAge(a.age)); else if (sortBy === 'status') sorted.sort((a, b) => a.status.localeCompare(b.status)); displayJobs(sorted); }
        function clearFiltersJobs() { document.getElementById('jobs-status-filter').value = ''; document.getElementById('jobs-age-filter').value = ''; document.getElementById('jobs-sort').value = 'name'; displayJobs(jobsData); }
        function displayJobs(jobs) { const tbody = document.getElementById('jobs-tbody'); tbody.innerHTML = jobs.map(job => '<tr onclick="showJobDetails(\'' + job.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + job.name + '</td><td><span class="badge badge-' + (job.status === 'Complete' ? 'success' : job.status === 'Failed' ? 'error' : 'warning') + '">' + job.status + '</span></td><td>' + job.completions + '</td><td>' + (job.duration || '-') + '</td><td>' + job.age + '</td><td onclick="event.stopPropagation()"><button onclick="deleteJob(\'' + job.name + '\')" style="padding: 0.25rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Delete</button></td></tr>').join(''); }

        function filterNodes() { const statusFilter = document.getElementById('nodes-status-filter').value; const roleFilter = document.getElementById('nodes-role-filter').value; let filtered = nodesData; if (statusFilter) filtered = filtered.filter(n => n.status === statusFilter); if (roleFilter) filtered = filtered.filter(n => n.roles === roleFilter); displayNodes(filtered); }
        function sortNodes() { const sortBy = document.getElementById('nodes-sort').value; const sorted = [...nodesData]; if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (sortBy === 'status') sorted.sort((a, b) => a.status.localeCompare(b.status)); else if (sortBy === 'role') sorted.sort((a, b) => a.roles.localeCompare(b.roles)); displayNodes(sorted); }
        function clearFiltersNodes() { document.getElementById('nodes-status-filter').value = ''; document.getElementById('nodes-role-filter').value = ''; document.getElementById('nodes-sort').value = 'name'; displayNodes(nodesData); }
        function displayNodes(nodes) { const tbody = document.getElementById('nodes-tbody'); tbody.innerHTML = nodes.map(node => '<tr onclick="showNodeDetails(\'' + node.name + '\')" style="cursor: pointer;" onmouseover="this.style.background=\'rgba(6, 182, 212, 0.1)\'" onmouseout="this.style.background=\'transparent\'"><td>' + node.name + '</td><td><span class="badge badge-' + (node.status === 'Ready' ? 'success' : 'error') + '">' + node.status + '</span></td><td>' + node.roles + '</td><td>' + node.version + '</td><td><span style="color: #ec4899; font-weight: 600;">' + node.cpu + '</span> / <span style="color: #ec4899;">' + (node.cpuUsage || '-') + '</span></td><td><span style="color: #f59e0b; font-weight: 600;">' + node.memory + '</span> / <span style="color: #f59e0b;">' + (node.memoryUsage || '-') + '</span></td><td>' + node.age + '</td><td><button onclick="event.stopPropagation(); showNodeDetails(\'' + node.name + '\')" style="padding: 0.25rem 0.75rem; background: #06b6d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Details</button></td></tr>').join(''); }

        // Connection status tracking
        let isConnected = true;

        function checkConnectionStatus() {
            return fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    isConnected = data.connected;
                    const dot = document.getElementById('connection-dot');
                    const text = document.getElementById('connection-text');
                    const banner = document.getElementById('connection-error-banner');
                    const errorMsg = document.getElementById('connection-error-message');

                    if (data.connected) {
                        dot.style.background = '#22c55e';
                        dot.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.6)';
                        text.textContent = 'Connected';
                        banner.style.display = 'none';
                        if (data.cluster) {
                            document.getElementById('cluster-name').textContent = data.cluster;
                        }
                    } else {
                        dot.style.background = '#ef4444';
                        dot.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
                        text.textContent = 'Disconnected';
                        banner.style.display = 'block';
                        errorMsg.textContent = data.error || 'Unable to connect to Kubernetes cluster';
                        document.getElementById('cluster-name').textContent = 'Not Connected';
                    }
                    return data.connected;
                })
                .catch(err => {
                    console.error('Error checking connection status:', err);
                    return false;
                });
        }

        // Initial load - check connection first
        checkConnectionStatus().then(connected => {
            if (connected) {
                fetch('/api/metrics').then(r => r.json()).then(updateMetrics);
                loadResourceOverview();
                // Load namespaces first, then load pods with correct namespace
                loadNamespaces().then(() => {
                    loadPods();
                });
            } else {
                // Still load namespaces structure but they'll be empty
                document.getElementById('namespace-selector').innerHTML = '<option value="">No cluster connected</option>';
            }
        });

        // Refresh resource overview every 10 seconds (only if connected)
        setInterval(() => {
            if (isConnected) {
                loadResourceOverview();
            }
        }, 10000);

        // Check connection status every 5 seconds
        setInterval(checkConnectionStatus, 5000);
    </script>
    </div>

    <!-- Footer -->
    <footer style="background: rgba(15, 23, 42, 0.95); border-top: 1px solid rgba(100, 116, 139, 0.3); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="color: #64748b; font-size: 0.875rem;">KubeGraf v2.0.0</span>
            <span style="color: #475569;">|</span>
            <span style="color: #64748b; font-size: 0.875rem;">Advanced Kubernetes Visualization</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="color: #64748b; font-size: 0.875rem;">© 2025 KubeGraf Contributors</span>
            <span style="color: #475569;">|</span>
            <span style="color: #64748b; font-size: 0.875rem;">Apache License 2.0</span>
            <span style="color: #475569;">|</span>
            <a href="#" onclick="showCreditsModal(); return false;" style="color: #a855f7; text-decoration: none; font-size: 0.875rem;">Credits</a>
            <a href="https://github.com/kubegraf/kubegraf" target="_blank" style="color: #06b6d4; text-decoration: none; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                GitHub
            </a>
        </div>
    </footer>

    <!-- Credits Modal -->
    <div id="credits-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 9999; align-items: center; justify-content: center;">
        <div style="background: #1e293b; padding: 1.5rem; border-radius: 8px; border: 1px solid #334155; max-width: 480px; width: 90%; position: relative;">
            <button onclick="closeCreditsModal()" style="position: absolute; top: 0.75rem; right: 0.75rem; background: none; border: none; color: #64748b; cursor: pointer; font-size: 1.25rem; line-height: 1;">&times;</button>
            <h3 style="margin: 0 0 1rem 0; color: #f1f5f9; font-size: 1rem; font-weight: 600;">Third-Party Libraries</h3>
            <table style="width: 100%; font-size: 0.8125rem; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #334155;"><td style="padding: 0.4rem 0; color: #e2e8f0;">D3.js</td><td style="padding: 0.4rem 0; color: #64748b; text-align: right;">BSD-3-Clause</td></tr>
                <tr style="border-bottom: 1px solid #334155;"><td style="padding: 0.4rem 0; color: #e2e8f0;">k8s.io/client-go</td><td style="padding: 0.4rem 0; color: #64748b; text-align: right;">Apache-2.0</td></tr>
                <tr style="border-bottom: 1px solid #334155;"><td style="padding: 0.4rem 0; color: #e2e8f0;">rivo/tview</td><td style="padding: 0.4rem 0; color: #64748b; text-align: right;">MIT</td></tr>
                <tr style="border-bottom: 1px solid #334155;"><td style="padding: 0.4rem 0; color: #e2e8f0;">gdamore/tcell</td><td style="padding: 0.4rem 0; color: #64748b; text-align: right;">Apache-2.0</td></tr>
                <tr style="border-bottom: 1px solid #334155;"><td style="padding: 0.4rem 0; color: #e2e8f0;">gorilla/websocket</td><td style="padding: 0.4rem 0; color: #64748b; text-align: right;">BSD-2-Clause</td></tr>
                <tr><td style="padding: 0.4rem 0; color: #e2e8f0;">go-yaml/yaml</td><td style="padding: 0.4rem 0; color: #64748b; text-align: right;">MIT</td></tr>
            </table>
            <p style="margin: 1rem 0 0 0; color: #64748b; font-size: 0.75rem; text-align: center;">Full license details available in project repository.</p>
        </div>
    </div>

    <script>
        function showCreditsModal() {
            document.getElementById('credits-modal').style.display = 'flex';
        }
        function closeCreditsModal() {
            document.getElementById('credits-modal').style.display = 'none';
        }
    </script>
</body>
</html>`
