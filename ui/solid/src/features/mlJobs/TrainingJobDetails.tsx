// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { mlJobsService, MLTrainingJob } from '../../services/mlJobs';
import { namespace } from '../../stores/cluster';
import { api } from '../../services/api';

interface TrainingJobDetailsProps {
  jobName: string;
  jobNamespace: string;
}

const TrainingJobDetails: Component<TrainingJobDetailsProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'overview' | 'logs' | 'yaml'>('overview');
  const [logs, setLogs] = createSignal('');
  const [streaming, setStreaming] = createSignal(false);
  const [ws, setWs] = createSignal<WebSocket | null>(null);

  const [job, { refetch }] = createResource(
    () => ({ name: props.jobName, namespace: props.jobNamespace }),
    async (params) => {
      return await mlJobsService.get(params.name, params.namespace);
    }
  );

  const [yaml] = createResource(
    () => job() ? { name: props.jobName, namespace: props.jobNamespace } : null,
    async (params) => {
      if (!params) return '';
      // Use existing job YAML API
      const data = await api.getJobYAML(params.name, params.namespace);
      return data.yaml || '';
    }
  );

  const fetchLogs = async () => {
    try {
      const logText = await mlJobsService.getLogs(props.jobName, props.jobNamespace, false);
      setLogs(logText);
    } catch (error: any) {
      setLogs(`Error fetching logs: ${error.message}`);
    }
  };

  const startStreaming = () => {
    if (streaming()) return;

    setStreaming(true);
    setLogs(''); // Clear existing logs

    const websocket = mlJobsService.streamLogs(
      props.jobName,
      props.jobNamespace,
      (message) => {
        setLogs(prev => prev + message);
      },
      (error) => {
        setLogs(prev => prev + `\nError: ${error.message}\n`);
        setStreaming(false);
      }
    );

    setWs(websocket);
  };

  const stopStreaming = () => {
    if (ws()) {
      ws()!.close();
      setWs(null);
    }
    setStreaming(false);
  };

  onMount(() => {
    if (activeTab() === 'logs') {
      fetchLogs();
    }
  });

  onCleanup(() => {
    stopStreaming();
  });

  return (
    <div class="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{props.jobName}</h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Namespace: {props.jobNamespace}</p>
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
            onClick={() => {
              setActiveTab('logs');
              if (!streaming()) {
                fetchLogs();
              }
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
            onClick={() => setActiveTab('yaml')}
            class={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab() === 'yaml'
                ? ''
                : 'border-transparent'
            }`}
            style={activeTab() === 'yaml' ? {
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)'
            } : {
              color: 'var(--text-secondary)'
            }}
          >
            YAML
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      <Show when={activeTab() === 'overview' && job()}>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Status</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{job()?.status}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Image</div>
              <div class="text-lg font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{job()?.image}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Created</div>
              <div class="text-lg" style={{ color: 'var(--text-primary)' }}>{new Date(job()?.createdAt || '').toLocaleString()}</div>
            </div>
            <Show when={job()?.completedAt}>
              <div class="card rounded-lg p-4 border" style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)'
              }}>
                <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Completed</div>
                <div class="text-lg" style={{ color: 'var(--text-primary)' }}>{new Date(job()?.completedAt || '').toLocaleString()}</div>
              </div>
            </Show>
          </div>

          <div class="card rounded-lg p-4 border" style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}>
            <div class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Resources</div>
            <div class="grid grid-cols-3 gap-4">
              {job()?.resources.cpu && (
                <div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>CPU</div>
                  <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{job()?.resources.cpu}</div>
                </div>
              )}
              {job()?.resources.memory && (
                <div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Memory</div>
                  <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{job()?.resources.memory}</div>
                </div>
              )}
              {job()?.resources.gpu && (
                <div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>GPU</div>
                  <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{job()?.resources.gpu}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Show>

      {/* Logs Tab */}
      <Show when={activeTab() === 'logs'}>
        <div class="space-y-4">
          <div class="flex gap-2">
            <button
              onClick={fetchLogs}
              disabled={streaming()}
              class="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              Refresh Logs
            </button>
            <Show when={!streaming()}>
              <button
                onClick={startStreaming}
                class="px-4 py-2 rounded-lg text-white transition-colors"
                style={{ background: 'rgba(34, 197, 94, 0.8)', color: '#fff' }}
              >
                Start Streaming
              </button>
            </Show>
            <Show when={streaming()}>
              <button
                onClick={stopStreaming}
                class="px-4 py-2 rounded-lg text-white transition-colors"
                style={{ background: 'rgba(239, 68, 68, 0.8)', color: '#fff' }}
              >
                Stop Streaming
              </button>
            </Show>
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

      {/* YAML Tab */}
      <Show when={activeTab() === 'yaml'}>
        <div class="font-mono text-sm p-4 rounded-lg overflow-x-auto border" style={{
          background: '#1a1a1a',
          borderColor: 'var(--border-color)',
          color: '#e5e5e5'
        }}>
          <pre class="whitespace-pre">{yaml() || 'Loading YAML...'}</pre>
        </div>
      </Show>
    </div>
  );
};

export default TrainingJobDetails;

