import { Component, For, Show, createResource, createSignal, createMemo } from 'solid-js';
import { api } from '../services/api';

interface SREMetrics {
  incidentsDetected: number;
  incidentsResolved: number;
  autoRemediations: number;
  notificationsSent: number;
  escalations: number;
  avgResolutionTime: number;
  successRate: number;
  batchSLOMet: number;
  batchSLOViolated: number;
  actionsThisHour: number;
  lastHourReset: string;
}

interface SREStatus {
  enabled: boolean;
  autoRemediate: boolean;
  autoRemediateTypes: string[];
  notificationEnabled: boolean;
  batchMonitoring: boolean;
  batchSLO: string;
  maxAutoActionsPerHour: number;
  learningEnabled: boolean;
  metrics: SREMetrics;
}

interface SREIncident {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  resource: string;
  namespace: string;
  autoRemediated: boolean;
  remediationAction?: string;
  escalated: boolean;
}

interface SREAction {
  id: string;
  incidentID: string;
  action: string;
  timestamp: string;
  success: boolean;
  details: string;
  automated: boolean;
}

const SREAgent: Component = () => {
  const [sreStatus, { refetch: refetchStatus }] = createResource<SREStatus>(async () => {
    const response = await fetch('/api/sre/status');
    if (!response.ok) throw new Error('Failed to fetch SRE status');
    return response.json();
  });

  const [incidents, { refetch: refetchIncidents }] = createResource<{ incidents: SREIncident[]; total: number }>(async () => {
    const response = await fetch('/api/sre/incidents');
    if (!response.ok) throw new Error('Failed to fetch incidents');
    return response.json();
  });

  const [actions, { refetch: refetchActions }] = createResource<{ actions: SREAction[]; total: number }>(async () => {
    const response = await fetch('/api/sre/actions');
    if (!response.ok) throw new Error('Failed to fetch actions');
    return response.json();
  });

  // Fetch Kubernetes incidents for overview
  const [kubernetesIncidents] = createResource(async () => {
    try {
      return await api.getIncidents();
    } catch (err) {
      console.error('Failed to fetch Kubernetes incidents:', err);
      return [];
    }
  });

  const openIncidentsCount = createMemo(() => {
    const incidents = kubernetesIncidents();
    if (!incidents) return 0;
    return incidents.length;
  });

  const [activeTab, setActiveTab] = createSignal<'overview' | 'incidents' | 'actions' | 'config'>('overview');
  const [configEditing, setConfigEditing] = createSignal(false);
  const [configForm, setConfigForm] = createSignal<Partial<SREStatus>>({});

  const toggleAgent = async () => {
    const status = sreStatus();
    if (!status) return;

    const response = await fetch('/api/sre/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !status.enabled })
    });

    if (response.ok) {
      refetchStatus();
    }
  };

  const saveConfig = async () => {
    const response = await fetch('/api/sre/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configForm())
    });

    if (response.ok) {
      setConfigEditing(false);
      refetchStatus();
    }
  };

  const startEditing = () => {
    const status = sreStatus();
    if (status) {
      setConfigForm({
        autoRemediate: status.autoRemediate,
        notificationEnabled: status.notificationEnabled,
        batchMonitoring: status.batchMonitoring,
        maxAutoActionsPerHour: status.maxAutoActionsPerHour,
        learningEnabled: status.learningEnabled
      });
      setConfigEditing(true);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-700';
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-700';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-700';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return 'text-green-400';
      case 'active': return 'text-red-400';
      case 'investigating': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">SRE Agent</h1>
          <p class="text-gray-400">Intelligent incident detection and automated remediation</p>
        </div>
        <Show when={sreStatus()}>
          {(status) => (
            <button
              onClick={toggleAgent}
              class={`px-6 py-2 rounded-lg font-medium transition-colors ${
                status().enabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {status().enabled ? '✓ Enabled' : 'Disabled'}
            </button>
          )}
        </Show>
      </div>

      {/* Tabs */}
      <div class="flex space-x-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'incidents'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Incidents
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'actions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Actions
        </button>
        <button
          onClick={() => setActiveTab('config')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'config'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Configuration
        </button>
      </div>

      {/* Overview Tab */}
      <Show when={activeTab() === 'overview' && sreStatus()}>
        {(status) => (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metrics Cards */}
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Incidents Detected</div>
              <div class="text-3xl font-bold text-white">{status().metrics.incidentsDetected}</div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Auto Remediations</div>
              <div class="text-3xl font-bold text-green-400">{status().metrics.autoRemediations}</div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Success Rate</div>
              <div class="text-3xl font-bold text-blue-400">{status().metrics.successRate.toFixed(1)}%</div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Escalations</div>
              <div class="text-3xl font-bold text-orange-400">{status().metrics.escalations}</div>
            </div>

            {/* Additional Metrics */}
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Incidents Resolved</div>
              <div class="text-3xl font-bold text-white">{status().metrics.incidentsResolved}</div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Avg Resolution Time</div>
              <div class="text-2xl font-bold text-white">{Math.round(status().metrics.avgResolutionTime / 1000)}s</div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Batch SLO Met</div>
              <div class="text-3xl font-bold text-green-400">{status().metrics.batchSLOMet}</div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Actions This Hour</div>
              <div class="text-3xl font-bold text-purple-400">{status().metrics.actionsThisHour}</div>
              <div class="text-xs text-gray-500 mt-1">/ {status().maxAutoActionsPerHour} max</div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div class="text-gray-400 text-sm mb-2">Open Incidents</div>
              <div class="text-3xl font-bold text-red-400">{openIncidentsCount()}</div>
              <div class="text-xs text-gray-500 mt-1">From cluster resources</div>
            </div>
          </div>
        )}
      </Show>

      {/* Incidents Tab */}
      <Show when={activeTab() === 'incidents'}>
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 class="text-xl font-bold text-white">Active Incidents</h2>
            <button
              onClick={refetchIncidents}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
            >
              Refresh
            </button>
          </div>
          <Show when={incidents()?.incidents.length === 0}>
            <div class="p-8 text-center text-gray-400">
              <div class="text-6xl mb-4">🎉</div>
              <div class="text-xl font-medium">No active incidents</div>
              <div class="text-sm mt-2">Your cluster is running smoothly!</div>
            </div>
          </Show>
          <Show when={incidents() && incidents()!.incidents.length > 0}>
            <div class="divide-y divide-gray-700">
              <For each={incidents()!.incidents}>
                {(incident) => (
                  <div class="p-4 hover:bg-gray-700/50 transition-colors">
                    <div class="flex items-start justify-between mb-2">
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                          <span class={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </span>
                          <span class={`font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                          <Show when={incident.autoRemediated}>
                            <span class="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                              Auto-remediated
                            </span>
                          </Show>
                        </div>
                        <h3 class="text-lg font-medium text-white">{incident.title}</h3>
                        <p class="text-gray-400 text-sm mt-1">{incident.description}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Resource: {incident.resource}</span>
                      <span>Namespace: {incident.namespace}</span>
                      <span>Detected: {new Date(incident.detectedAt).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Actions Tab */}
      <Show when={activeTab() === 'actions'}>
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 class="text-xl font-bold text-white">Remediation Actions</h2>
            <button
              onClick={refetchActions}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
            >
              Refresh
            </button>
          </div>
          <Show when={actions()?.actions.length === 0}>
            <div class="p-8 text-center text-gray-400">
              <div class="text-6xl mb-4">📋</div>
              <div class="text-xl font-medium">No actions recorded</div>
              <div class="text-sm mt-2">Actions will appear here when incidents are remediated</div>
            </div>
          </Show>
          <Show when={actions() && actions()!.actions.length > 0}>
            <div class="divide-y divide-gray-700">
              <For each={actions()!.actions}>
                {(action) => (
                  <div class="p-4 hover:bg-gray-700/50 transition-colors">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                          <Show when={action.success}>
                            <span class="text-green-400">✓</span>
                          </Show>
                          <Show when={!action.success}>
                            <span class="text-red-400">✗</span>
                          </Show>
                          <span class="font-medium text-white">{action.action}</span>
                          <Show when={action.automated}>
                            <span class="px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-xs">
                              Automated
                            </span>
                          </Show>
                        </div>
                        <p class="text-gray-400 text-sm">{action.details}</p>
                      </div>
                      <span class="text-gray-500 text-sm">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Configuration Tab */}
      <Show when={activeTab() === 'config' && sreStatus()}>
        {(status) => (
          <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold text-white">Agent Configuration</h2>
              <Show when={!configEditing()}>
                <button
                  onClick={startEditing}
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  Edit Configuration
                </button>
              </Show>
              <Show when={configEditing()}>
                <div class="space-x-2">
                  <button
                    onClick={() => setConfigEditing(false)}
                    class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveConfig}
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                  >
                    Save
                  </button>
                </div>
              </Show>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-400 text-sm mb-2">Auto Remediation</label>
                  <Show when={configEditing()}>
                    <input
                      type="checkbox"
                      checked={configForm().autoRemediate}
                      onChange={(e) => setConfigForm({ ...configForm(), autoRemediate: e.target.checked })}
                      class="w-5 h-5"
                    />
                  </Show>
                  <Show when={!configEditing()}>
                    <span class="text-white">{status().autoRemediate ? 'Enabled' : 'Disabled'}</span>
                  </Show>
                </div>

                <div>
                  <label class="block text-gray-400 text-sm mb-2">Learning Mode</label>
                  <Show when={configEditing()}>
                    <input
                      type="checkbox"
                      checked={configForm().learningEnabled}
                      onChange={(e) => setConfigForm({ ...configForm(), learningEnabled: e.target.checked })}
                      class="w-5 h-5"
                    />
                  </Show>
                  <Show when={!configEditing()}>
                    <span class="text-white">{status().learningEnabled ? 'Enabled' : 'Disabled'}</span>
                  </Show>
                </div>

                <div>
                  <label class="block text-gray-400 text-sm mb-2">Notifications</label>
                  <Show when={configEditing()}>
                    <input
                      type="checkbox"
                      checked={configForm().notificationEnabled}
                      onChange={(e) => setConfigForm({ ...configForm(), notificationEnabled: e.target.checked })}
                      class="w-5 h-5"
                    />
                  </Show>
                  <Show when={!configEditing()}>
                    <span class="text-white">{status().notificationEnabled ? 'Enabled' : 'Disabled'}</span>
                  </Show>
                </div>

                <div>
                  <label class="block text-gray-400 text-sm mb-2">Batch Monitoring</label>
                  <Show when={configEditing()}>
                    <input
                      type="checkbox"
                      checked={configForm().batchMonitoring}
                      onChange={(e) => setConfigForm({ ...configForm(), batchMonitoring: e.target.checked })}
                      class="w-5 h-5"
                    />
                  </Show>
                  <Show when={!configEditing()}>
                    <span class="text-white">{status().batchMonitoring ? 'Enabled' : 'Disabled'}</span>
                  </Show>
                </div>

                <div class="col-span-2">
                  <label class="block text-gray-400 text-sm mb-2">Max Actions Per Hour</label>
                  <Show when={configEditing()}>
                    <input
                      type="number"
                      value={configForm().maxAutoActionsPerHour}
                      onChange={(e) => setConfigForm({ ...configForm(), maxAutoActionsPerHour: parseInt(e.target.value) })}
                      class="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                  </Show>
                  <Show when={!configEditing()}>
                    <span class="text-white">{status().maxAutoActionsPerHour}</span>
                  </Show>
                </div>
              </div>

              <div class="mt-6 pt-6 border-t border-gray-700">
                <h3 class="text-lg font-medium text-white mb-4">Auto-Remediate Types</h3>
                <div class="flex flex-wrap gap-2">
                  <For each={status().autoRemediateTypes}>
                    {(type) => (
                      <span class="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-sm">
                        {type}
                      </span>
                    )}
                  </For>
                </div>
              </div>

              <div class="mt-6 pt-6 border-t border-gray-700">
                <h3 class="text-lg font-medium text-white mb-2">Batch SLO</h3>
                <p class="text-gray-400">{status().batchSLO}</p>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default SREAgent;
