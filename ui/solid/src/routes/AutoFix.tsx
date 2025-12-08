import { Component, createSignal, createResource, For, Show } from 'solid-js';
import { api, type AutoFixRule, type AutoFixRuleSettings } from '../services/api';
import { addNotification } from '../stores/ui';

interface AutoFixAction {
  id: string;
  timestamp: string;
  type: string;
  resource: string;
  namespace: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
}

const AutoFix: Component = () => {
  const [selectedType, setSelectedType] = createSignal<string>('all');
  const [editingRule, setEditingRule] = createSignal<string | null>(null);
  const [ruleSettings, setRuleSettings] = createSignal<Record<string, AutoFixRuleSettings>>({});

  // Fetch auto-fix rules
  const [rules, { refetch: refetchRules }] = createResource(async () => {
    try {
      return await api.getAutoFixRules();
    } catch (error) {
      console.error('Failed to fetch auto-fix rules:', error);
      addNotification('Failed to load AutoFix rules', 'error');
      return [];
    }
  });

  // Fetch AutoFix enabled state
  const [autoFixEnabledState, { refetch: refetchEnabled }] = createResource(async () => {
    try {
      return await api.getAutoFixEnabled();
    } catch (error) {
      console.error('Failed to fetch AutoFix enabled state:', error);
      return false; // Default to disabled
    }
  });

  // Fetch recent auto-fix actions
  const [actions, { refetch: refetchActions }] = createResource(async () => {
    try {
      return await api.getAutoFixActions();
    } catch (error) {
      console.error('Failed to fetch auto-fix actions:', error);
      return [];
    }
  });

  const filteredRules = () => {
    const all = rules() || [];
    if (selectedType() === 'all') return all;
    return all.filter((rule) => rule.type === selectedType());
  };

  const filteredActions = () => {
    const all = actions() || [];
    if (selectedType() === 'all') return all;
    return all.filter((action) => action.type === selectedType());
  };

  const toggleRule = async (ruleId: string) => {
    try {
      const rule = (rules() || []).find((r) => r.id === ruleId);
      if (!rule) {
        addNotification('Rule not found', 'error');
        return;
      }

      const newEnabled = !rule.enabled;
      const settings = ruleSettings()[ruleId] || rule.settings;
      await api.toggleAutoFixRule(ruleId, newEnabled, settings);
      refetchRules();
      addNotification(`${rule.name} ${newEnabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error: any) {
      console.error('Failed to toggle rule:', error);
      addNotification(error.message || 'Failed to update rule', 'error');
    }
  };

  const updateRuleSettings = async (ruleId: string, settings: AutoFixRuleSettings) => {
    try {
      const rule = (rules() || []).find((r) => r.id === ruleId);
      if (!rule) {
        addNotification('Rule not found', 'error');
        return;
      }

      setRuleSettings({ ...ruleSettings(), [ruleId]: settings });
      await api.toggleAutoFixRule(ruleId, rule.enabled, settings);
      refetchRules();
      setEditingRule(null);
      addNotification('Settings updated', 'success');
    } catch (error: any) {
      console.error('Failed to update rule settings:', error);
      addNotification(error.message || 'Failed to update settings', 'error');
    }
  };

  const handleToggleAutoFix = async (enabled: boolean) => {
    try {
      await api.setAutoFixEnabled(enabled);
      refetchEnabled();
      addNotification(`AutoFix ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error: any) {
      console.error('Failed to toggle AutoFix:', error);
      addNotification(error.message || 'Failed to update AutoFix state', 'error');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'oom':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'hpa_max':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'security':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'drift':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 text-green-400';
      case 'failed':
        return 'bg-red-500/10 text-red-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            AutoFix Engine
          </h1>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Automated remediation for OOM, HPA max, security, and drift issues
          </p>
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoFixEnabledState() ?? false}
            onChange={(e) => handleToggleAutoFix(e.currentTarget.checked)}
            class="w-4 h-4 rounded"
            style={{ accentColor: 'var(--accent-primary)' }}
          />
          <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Enable AutoFix
          </span>
        </label>
      </div>

      {/* Filter Tabs */}
      <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        {['all', 'oom', 'hpa_max', 'security', 'drift'].map((type) => (
          <button
            onClick={() => setSelectedType(type)}
            class={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedType() === type
                ? 'border-b-2'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              color: selectedType() === type ? 'var(--accent-primary)' : 'var(--text-secondary)',
              'border-color': selectedType() === type ? 'var(--accent-primary)' : 'transparent',
            }}
          >
            {type === 'all'
              ? 'All'
              : type === 'oom'
              ? 'OOM'
              : type === 'hpa_max'
              ? 'HPA Max'
              : type === 'security'
              ? 'Security'
              : 'Drift'}
          </button>
        ))}
      </div>

      {/* Rules Section */}
      <div>
        <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          AutoFix Rules
        </h2>
        <div class="grid gap-4">
          <For each={filteredRules()}>
            {(rule) => (
              <div
                class="p-4 rounded-lg border"
                style={{
                  background: 'var(--bg-secondary)',
                  'border-color': 'var(--border-color)',
                }}
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {rule.name}
                      </h3>
                      <span
                        class={`px-2 py-0.5 rounded text-xs border ${getTypeColor(rule.type)}`}
                      >
                        {rule.type === 'hpa_max' ? 'HPA MAX' : rule.type.toUpperCase()}
                      </span>
                    </div>
                    <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {rule.description}
                    </p>
                    {/* Configuration for HPA Max */}
                    <Show when={rule.type === 'hpa_max'}>
                      <div class="text-xs mb-2 p-3 rounded border" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', 'border-color': 'var(--border-color)' }}>
                        <div class="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Scaling Configuration:</div>
                        <Show when={editingRule() !== rule.id}>
                          <div class="space-y-1 mb-2">
                            <div>• Adds <strong class="text-blue-400">{rule.settings?.additionalReplicas ?? 2} additional replicas</strong> per trigger</div>
                            <Show when={(rule.settings?.maxReplicasLimit ?? 0) > 0}>
                              <div>• Maximum limit: <strong class="text-yellow-400">{rule.settings?.maxReplicasLimit} replicas</strong></div>
                            </Show>
                            <Show when={(rule.settings?.maxReplicasLimit ?? 0) === 0}>
                              <div>• <strong class="text-yellow-400">No maximum limit</strong> - can scale indefinitely</div>
                            </Show>
                          </div>
                          <button
                            onClick={() => setEditingRule(rule.id)}
                            class="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--accent-primary)', color: '#000' }}
                          >
                            Configure
                          </button>
                        </Show>
                        <Show when={editingRule() === rule.id}>
                          <div class="space-y-2">
                            <div>
                              <label class="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Additional Replicas per Trigger:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={ruleSettings()[rule.id]?.additionalReplicas ?? rule.settings?.additionalReplicas ?? 2}
                                onInput={(e) => {
                                  const val = parseInt(e.currentTarget.value) || 2;
                                  setRuleSettings({
                                    ...ruleSettings(),
                                    [rule.id]: {
                                      ...ruleSettings()[rule.id],
                                      ...rule.settings,
                                      additionalReplicas: val,
                                    },
                                  });
                                }}
                                class="w-full px-2 py-1 rounded text-sm"
                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                              />
                            </div>
                            <div>
                              <label class="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Maximum Replicas Limit (0 = no limit):
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={ruleSettings()[rule.id]?.maxReplicasLimit ?? rule.settings?.maxReplicasLimit ?? 0}
                                onInput={(e) => {
                                  const val = parseInt(e.currentTarget.value) || 0;
                                  setRuleSettings({
                                    ...ruleSettings(),
                                    [rule.id]: {
                                      ...ruleSettings()[rule.id],
                                      ...rule.settings,
                                      maxReplicasLimit: val,
                                    },
                                  });
                                }}
                                class="w-full px-2 py-1 rounded text-sm"
                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                              />
                            </div>
                            <div class="flex gap-2">
                              <button
                                onClick={() => updateRuleSettings(rule.id, ruleSettings()[rule.id] || rule.settings || {})}
                                class="text-xs px-3 py-1 rounded"
                                style={{ background: 'var(--accent-primary)', color: '#000' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRule(null);
                                  setRuleSettings({ ...ruleSettings(), [rule.id]: rule.settings || {} });
                                }}
                                class="text-xs px-3 py-1 rounded"
                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>
                    </Show>
                    {/* Configuration for OOM */}
                    <Show when={rule.type === 'oom'}>
                      <div class="text-xs mb-2 p-3 rounded border" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', 'border-color': 'var(--border-color)' }}>
                        <div class="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Memory Configuration:</div>
                        <Show when={editingRule() !== rule.id}>
                          <div class="space-y-1 mb-2">
                            <div>• Restarts pod and increases memory by <strong class="text-red-400">{rule.settings?.memoryIncreaseMiB ?? 500} MiB</strong></div>
                            <div>• Deletes the pod to trigger Kubernetes recreation</div>
                          </div>
                          <button
                            onClick={() => setEditingRule(rule.id)}
                            class="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--accent-primary)', color: '#000' }}
                          >
                            Configure
                          </button>
                        </Show>
                        <Show when={editingRule() === rule.id}>
                          <div class="space-y-2">
                            <div>
                              <label class="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Memory Increase (MiB):
                              </label>
                              <input
                                type="number"
                                min="100"
                                max="10000"
                                step="100"
                                value={ruleSettings()[rule.id]?.memoryIncreaseMiB ?? rule.settings?.memoryIncreaseMiB ?? 500}
                                onInput={(e) => {
                                  const val = parseInt(e.currentTarget.value) || 500;
                                  setRuleSettings({
                                    ...ruleSettings(),
                                    [rule.id]: {
                                      ...ruleSettings()[rule.id],
                                      ...rule.settings,
                                      memoryIncreaseMiB: val,
                                    },
                                  });
                                }}
                                class="w-full px-2 py-1 rounded text-sm"
                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                              />
                            </div>
                            <div class="flex gap-2">
                              <button
                                onClick={() => updateRuleSettings(rule.id, ruleSettings()[rule.id] || rule.settings || {})}
                                class="text-xs px-3 py-1 rounded"
                                style={{ background: 'var(--accent-primary)', color: '#000' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRule(null);
                                  setRuleSettings({ ...ruleSettings(), [rule.id]: rule.settings || {} });
                                }}
                                class="text-xs px-3 py-1 rounded"
                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>
                    </Show>
                    <Show when={rule.type === 'security'}>
                      <div class="text-xs mb-2 p-2 rounded border" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', 'border-color': 'var(--border-color)' }}>
                        <div class="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Default Settings:</div>
                        <div class="space-y-1">
                          <div>• Automatically applies <strong class="text-yellow-400">security policy fixes</strong></div>
                          <div>• Fixes policy violations automatically</div>
                          <div>• Applies recommended security configurations</div>
                        </div>
                      </div>
                    </Show>
                    <Show when={rule.type === 'drift'}>
                      <div class="text-xs mb-2 p-2 rounded border" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', 'border-color': 'var(--border-color)' }}>
                        <div class="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Default Settings:</div>
                        <div class="space-y-1">
                          <div>• <strong class="text-purple-400">Reverts configuration</strong> to expected state</div>
                          <div>• Corrects drift from Git/declared configuration</div>
                          <div>• Restores resources to match source of truth</div>
                        </div>
                      </div>
                    </Show>
                    <div class="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>Triggered {rule.triggerCount} times</span>
                      <Show when={rule.lastTriggered}>
                        <span>
                          Last: {new Date(rule.lastTriggered!).toLocaleString()}
                        </span>
                      </Show>
                    </div>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleRule(rule.id)}
                      disabled={!(autoFixEnabledState() ?? false)}
                      class="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Recent Actions */}
      <div>
        <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent Actions
        </h2>
        <div class="space-y-2">
          <For each={filteredActions()}>
            {(action) => (
              <div
                class="p-3 rounded-lg border flex items-center justify-between"
                style={{
                  background: 'var(--bg-secondary)',
                  'border-color': 'var(--border-color)',
                }}
              >
                <div class="flex items-center gap-3 flex-1">
                  <span
                    class={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(action.status)}`}
                  >
                    {action.status.toUpperCase()}
                  </span>
                  <div class="flex-1">
                    <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {action.resource} ({action.namespace})
                    </div>
                    <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {action.message}
                    </div>
                  </div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(action.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </For>
          <Show when={filteredActions().length === 0}>
            <div
              class="p-8 text-center rounded-lg border"
              style={{
                background: 'var(--bg-secondary)',
                'border-color': 'var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              No recent actions
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default AutoFix;

