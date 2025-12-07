// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, onMount, Show } from 'solid-js';
import { inferenceService, InferenceService, InferenceTestRequest, InferenceTestResponse } from '../../services/inference';
import { api } from '../../services/api';

interface InferenceServicePanelProps {
  serviceName: string;
  serviceNamespace: string;
}

const InferenceServicePanel: Component<InferenceServicePanelProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'overview' | 'test' | 'logs' | 'metrics'>('overview');
  const [testInput, setTestInput] = createSignal('{\n  "input": [1, 2, 3]\n}');
  const [testResponse, setTestResponse] = createSignal<InferenceTestResponse | null>(null);
  const [testing, setTesting] = createSignal(false);
  const [logs, setLogs] = createSignal('');
  const [logsLoading, setLogsLoading] = createSignal(false);

  const [service, { refetch }] = createResource(
    () => ({ name: props.serviceName, namespace: props.serviceNamespace }),
    async (params) => {
      return await inferenceService.get(params.name, params.namespace);
    }
  );

  const handleTest = async () => {
    setTesting(true);
    setTestResponse(null);

    try {
      let inputData: Record<string, any>;
      try {
        inputData = JSON.parse(testInput());
      } catch (e) {
        setTestResponse({
          success: false,
          error: 'Invalid JSON input',
        });
        setTesting(false);
        return;
      }

      const request: InferenceTestRequest = {
        name: props.serviceName,
        namespace: props.serviceNamespace,
        input: inputData,
      };

      const response = await inferenceService.test(request);
      setTestResponse(response);
    } catch (error: any) {
      setTestResponse({
        success: false,
        error: error.message || 'Test request failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      // Get deployment pods and fetch logs
      const pods = await api.getPods(props.serviceNamespace);
      const servicePod = pods.find(p => p.name?.includes(props.serviceName));
      
      if (servicePod) {
        // In a real implementation, you'd fetch pod logs via API
        setLogs('Logs would be fetched from pod: ' + servicePod.name);
      } else {
        setLogs('No pods found for this service');
      }
    } catch (error: any) {
      setLogs(`Error fetching logs: ${error.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  onMount(() => {
    if (activeTab() === 'logs') {
      fetchLogs();
    }
  });

  return (
    <div class="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{props.serviceName}</h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Namespace: {props.serviceNamespace}</p>
        </div>
        <button
          onClick={() => refetch()}
          class="px-4 py-2 rounded-lg text-white text-sm transition-colors"
          style={{ background: 'var(--accent-primary)', color: '#000' }}
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div class="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div class="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            class={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab() === 'overview'
                ? ''
                : 'border-transparent'
            }`}
            style={activeTab() === 'overview' ? {
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)'
            } : {
              color: 'var(--text-secondary)'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('test')}
            class={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab() === 'test'
                ? ''
                : 'border-transparent'
            }`}
            style={activeTab() === 'test' ? {
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)'
            } : {
              color: 'var(--text-secondary)'
            }}
          >
            Test Interface
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              fetchLogs();
            }}
            class={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab() === 'logs'
                ? ''
                : 'border-transparent'
            }`}
            style={activeTab() === 'logs' ? {
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)'
            } : {
              color: 'var(--text-secondary)'
            }}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            class={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab() === 'metrics'
                ? ''
                : 'border-transparent'
            }`}
            style={activeTab() === 'metrics' ? {
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)'
            } : {
              color: 'var(--text-secondary)'
            }}
          >
            Metrics
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      <Show when={activeTab() === 'overview' && service()}>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Status</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{service()?.status}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Runtime</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{service()?.runtime}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Endpoint</div>
              <div class="text-lg font-mono text-sm break-all" style={{ color: 'var(--text-primary)' }}>
                {service()?.endpoint || 'N/A'}
              </div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Replicas</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {service()?.readyReplicas}/{service()?.replicas}
              </div>
            </div>
          </div>

          <div class="card rounded-lg p-4 border" style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}>
            <div class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Resources</div>
            <div class="grid grid-cols-3 gap-4">
              {service()?.resources.cpu && (
                <div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>CPU</div>
                  <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{service()?.resources.cpu}</div>
                </div>
              )}
              {service()?.resources.memory && (
                <div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Memory</div>
                  <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{service()?.resources.memory}</div>
                </div>
              )}
              {service()?.resources.gpu && (
                <div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>GPU</div>
                  <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{service()?.resources.gpu}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Show>

      {/* Test Interface Tab */}
      <Show when={activeTab() === 'test'}>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Input JSON</label>
            <textarea
              value={testInput()}
              onInput={(e) => setTestInput(e.currentTarget.value)}
              class="w-full px-3 py-2 rounded-lg font-mono text-sm border"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
              rows={10}
              placeholder='{\n  "input": [1, 2, 3]\n}'
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing()}
            class="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            {testing() ? 'Testing...' : 'Send Test Request'}
          </button>
          <Show when={testResponse()}>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-medium" style={{ color: 'var(--text-primary)' }}>Response</h3>
                <Show when={testResponse()?.latency}>
                  <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Latency: {testResponse()?.latency}
                  </span>
                </Show>
              </div>
              <Show when={testResponse()?.success}>
                <pre class="text-sm font-mono p-3 rounded border overflow-auto" style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}>
                  {JSON.stringify(testResponse()?.output, null, 2)}
                </pre>
              </Show>
              <Show when={!testResponse()?.success}>
                <div class="text-sm p-3 rounded border" style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'var(--error-color)',
                  color: 'var(--error-color)'
                }}>
                  {testResponse()?.error}
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      {/* Logs Tab */}
      <Show when={activeTab() === 'logs'}>
        <div class="space-y-4">
          <div class="flex gap-2">
            <button
              onClick={fetchLogs}
              disabled={logsLoading()}
              class="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              {logsLoading() ? 'Loading...' : 'Refresh Logs'}
            </button>
          </div>
          <div class="font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto border" style={{
            background: '#000',
            borderColor: 'var(--border-color)',
            color: '#22c55e'
          }}>
            <pre class="whitespace-pre-wrap">{logs() || 'No logs available'}</pre>
          </div>
        </div>
      </Show>

      {/* Metrics Tab */}
      <Show when={activeTab() === 'metrics'}>
        <div class="card rounded-lg p-8 text-center border" style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)'
        }}>
          <p style={{ color: 'var(--text-secondary)' }}>Metrics visualization coming soon</p>
        </div>
      </Show>
    </div>
  );
};

export default InferenceServicePanel;

