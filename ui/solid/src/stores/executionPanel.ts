import { createSignal, createMemo } from 'solid-js';
import { addNotification } from './ui';

export type ExecutionMode = 'dry-run' | 'apply';

export type ExecutionStatus = 'idle' | 'planned' | 'running' | 'succeeded' | 'failed';

export type ExecutionStreamType = 'stdout' | 'stderr';

export interface ExecutionLine {
  id: string;
  timestamp: string;
  stream: ExecutionStreamType;
  text: string;
}

export interface ExecutionResourcesChanged {
  created: number;
  configured: number;
  unchanged: number;
  deleted: number;
}

export interface ExecutionSummary {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  exitCode: number;
  resourcesChanged?: ExecutionResourcesChanged | null;
}

export interface StartExecutionOptions {
  label?: string;
  command: string;
  args?: string[];
  mode: ExecutionMode;
  kubernetesEquivalent?: boolean;
  workingDir?: string;
  // Optional Kubernetes-aware metadata for secured executions.
  namespace?: string;
  context?: string;
  userAction?: string;
  dryRun?: boolean;
  allowClusterWide?: boolean;
  resource?: string;
  action?: string;
  intent?: string;
  yaml?: string;
}

type ExecutionMessageType = 'state' | 'line' | 'complete' | 'error' | 'phase';

interface BaseExecutionMessage {
  type: ExecutionMessageType;
  executionId: string;
  timestamp: string;
  mode: ExecutionMode;
  sourceLabel: 'shell' | 'kubectl-equivalent';
}

interface ExecutionStateMessage extends BaseExecutionMessage {
  status: 'planned' | 'running' | 'succeeded' | 'failed';
  label?: string;
}

interface ExecutionLineMessage extends BaseExecutionMessage {
  stream: ExecutionStreamType;
  text: string;
}

interface ExecutionCompleteMessage extends BaseExecutionMessage {
  status: 'succeeded' | 'failed';
  summary?: ExecutionSummary;
  error?: string;
  rawError?: string;
}

interface ExecutionPhaseMessage extends BaseExecutionMessage {
  name: string;
  detail?: string;
  progress?: number;
  total?: number;
}

export interface ExecutionRecord {
  executionId: string;
  status: 'planned' | 'running' | 'succeeded' | 'failed';
  startedAt: string;
  lastLineAt: string;
  summary?: ExecutionSummary | null;
}

interface ExecutionLogsResponse {
  executionId: string;
  logs: {
    timestamp: string;
    stream: ExecutionStreamType;
    text: string;
  }[];
}

type ServerExecutionMessage =
  | ExecutionStateMessage
  | ExecutionLineMessage
  | ExecutionCompleteMessage
  | ExecutionPhaseMessage;

let currentSocket: WebSocket | null = null;

const [panelOpen, setPanelOpen] = createSignal(false);
const [panelExpanded, setPanelExpanded] = createSignal(false);
const [status, setStatus] = createSignal<ExecutionStatus>('idle');
const [mode, setMode] = createSignal<ExecutionMode>('apply');
const [sourceLabel, setSourceLabel] = createSignal<'shell' | 'kubectl-equivalent'>('shell');
const [label, setLabel] = createSignal<string | undefined>(undefined);
const [lines, setLines] = createSignal<ExecutionLine[]>([]);
const [autoScrollEnabled, setAutoScrollEnabled] = createSignal(true);
const [hasManualScroll, setHasManualScroll] = createSignal(false);
const [summary, setSummary] = createSignal<ExecutionSummary | null>(null);
const [error, setError] = createSignal<string | null>(null);
const [rawError, setRawError] = createSignal<string | null>(null);
const [currentExecutionId, setCurrentExecutionId] = createSignal<string | null>(null);
const [lastRequest, setLastRequest] = createSignal<StartExecutionOptions | null>(null);

const [startedAt, setStartedAt] = createSignal<string | null>(null);
const [completedAt, setCompletedAt] = createSignal<string | null>(null);

const [recentExecutions, setRecentExecutions] = createSignal<ExecutionRecord[]>([]);
const [loadingExecutions, setLoadingExecutions] = createSignal(false);
const [phases, setPhases] = createSignal<ExecutionPhaseMessage[]>([]);

function makeExecutionId() {
  return `exec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function connectWebSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/execution/stream`;
  return new WebSocket(wsUrl);
}

export function startExecution(opts: StartExecutionOptions) {
  // Close any existing stream
  if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
    currentSocket.close();
  }

  const executionId = makeExecutionId();

  // Reset state
  setPanelOpen(true);
  setPanelExpanded(true);
  setStatus('planned');
  setMode(opts.mode);
  setSourceLabel(opts.kubernetesEquivalent ? 'kubectl-equivalent' : 'shell');
  setLabel(opts.label);
  setLines([]);
  setSummary(null);
  setError(null);
  setRawError(null);
  setStartedAt(null);
  setCompletedAt(null);
  setAutoScrollEnabled(true);
  setHasManualScroll(false);
  setCurrentExecutionId(executionId);
  setLastRequest(opts);

  const socket = connectWebSocket();
  currentSocket = socket;

  socket.onopen = () => {
    const payload = {
      type: 'start',
      executionId,
      command: opts.command,
      args: opts.args || [],
      mode: opts.mode,
      kubernetesEquivalent: opts.kubernetesEquivalent ?? false,
      workingDir: opts.workingDir || '',
      label: opts.label || '',
      namespace: opts.namespace || '',
      context: opts.context || '',
      userAction: opts.userAction || '',
      dryRun: opts.dryRun ?? (opts.mode === 'dry-run'),
      allowClusterWide: opts.allowClusterWide ?? false,
      resource: opts.resource || '',
      action: opts.action || '',
      intent: opts.intent || '',
      yaml: opts.yaml || '',
    };
    try {
      socket.send(JSON.stringify(payload));
    } catch (err) {
      console.error('[ExecutionPanel] Failed to send start payload:', err);
      setStatus('failed');
      setError('Failed to send execution request');
      setRawError(err instanceof Error ? err.message : String(err));
    }
  };

  socket.onerror = (event) => {
    console.error('[ExecutionPanel] WebSocket error:', event);
    if (status() === 'planned' || status() === 'running') {
      setStatus('failed');
      setError('Execution stream connection failed');
    }
  };

  socket.onclose = () => {
    // If we were still running when the socket closed unexpectedly, mark as failed.
    if (status() === 'planned' || status() === 'running') {
      setStatus('failed');
      if (!error()) {
        setError('Execution stream closed unexpectedly');
      }
    }
  };

  socket.onmessage = (event) => {
    let msg: ServerExecutionMessage;
    try {
      msg = JSON.parse(event.data) as ServerExecutionMessage;
    } catch (err) {
      console.error('[ExecutionPanel] Failed to parse execution message:', err, event.data);
      return;
    }

    if (msg.executionId && msg.executionId !== currentExecutionId()) {
      // Ignore messages for a previous execution
      return;
    }

    switch (msg.type) {
      case 'state': {
        const stateMsg = msg as ExecutionStateMessage;
        // Map server status into our local status model
        if (stateMsg.status === 'running') {
          setStatus('running');
        } else if (stateMsg.status === 'planned') {
          setStatus('planned');
        }
        setMode(stateMsg.mode);
        setSourceLabel(stateMsg.sourceLabel);
        if (stateMsg.label) {
          setLabel(stateMsg.label);
        }
        setStartedAt(stateMsg.timestamp);
        break;
      }
      case 'line': {
        const lineMsg = msg as ExecutionLineMessage;
        const line: ExecutionLine = {
          id: `${lineMsg.executionId}-${lines().length}`,
          timestamp: lineMsg.timestamp,
          stream: lineMsg.stream,
          text: lineMsg.text,
        };
        setLines((prev) => [...prev, line]);
        if (!startedAt()) {
          setStartedAt(lineMsg.timestamp);
        }
        break;
      }
      case 'phase': {
        const phaseMsg = msg as ExecutionPhaseMessage;
        setPhases((prev) => [...prev, phaseMsg]);
        break;
      }
      case 'complete':
      case 'error': {
        const completeMsg = msg as ExecutionCompleteMessage;
        setStatus(completeMsg.status === 'succeeded' ? 'succeeded' : 'failed');
        setMode(completeMsg.mode);
        setSourceLabel(completeMsg.sourceLabel);
        if (completeMsg.summary) {
          setSummary(completeMsg.summary);
          setStartedAt(completeMsg.summary.startedAt);
          setCompletedAt(completeMsg.summary.completedAt);
        } else {
          setCompletedAt(completeMsg.timestamp);
        }
        if (completeMsg.error) {
          setError(completeMsg.error);
        }
        if (completeMsg.rawError) {
          setRawError(completeMsg.rawError);
        }
        // Close the socket after completion
        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
          currentSocket.close();
        }
        currentSocket = null;
        break;
      }
      default:
        break;
    }
  };
}

export function retryLastExecution() {
  const last = lastRequest();
  if (!last) {
    addNotification('No previous execution to retry', 'warning');
    return;
  }
  startExecution(last);
}

export function hideExecutionPanel() {
  setPanelOpen(false);
}

export function toggleExecutionPanelExpanded() {
  setPanelExpanded((prev) => !prev);
}

export function onUserManualScroll() {
  setHasManualScroll(true);
  setAutoScrollEnabled(false);
}

export function enableAutoScroll() {
  setHasManualScroll(false);
  setAutoScrollEnabled(true);
}

export function clearExecutionOutput() {
  setLines([]);
  setSummary(null);
  setError(null);
  setRawError(null);
}

// Manually set execution state for REST API responses (like fix apply)
export function setExecutionStateFromResult(opts: {
  executionId: string;
  label?: string;
  status: 'succeeded' | 'failed';
  message: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number;
  resourcesChanged?: ExecutionResourcesChanged;
  error?: string;
  lines?: ExecutionLine[];
}) {
  const now = new Date().toISOString();
  const started = opts.startedAt || now;
  const completed = opts.completedAt || now;
  const duration = opts.durationMs || (new Date(completed).getTime() - new Date(started).getTime());

  // Open and expand the panel
  setPanelOpen(true);
  setPanelExpanded(true);
  
  // Set status
  setStatus(opts.status);
  setMode('apply');
  setSourceLabel('kubectl-equivalent');
  setLabel(opts.label || 'Fix Applied');
  setCurrentExecutionId(opts.executionId);
  
  // Set summary
  setSummary({
    startedAt: started,
    completedAt: completed,
    durationMs: duration,
    exitCode: opts.exitCode || (opts.status === 'succeeded' ? 0 : 1),
    resourcesChanged: opts.resourcesChanged || null,
  });
  
  // Set timestamps
  setStartedAt(started);
  setCompletedAt(completed);
  
  // Set error if failed
  if (opts.status === 'failed') {
    setError(opts.error || opts.message);
  } else {
    setError(null);
    setRawError(null);
  }
  
  // Set lines
  let executionLines: ExecutionLine[] = opts.lines || [];
  // Add id field to lines if missing
  executionLines = executionLines.map((line, idx) => ({
    ...line,
    id: line.id || `${opts.executionId}-${idx}`,
  }));
  
  if (opts.message && !opts.lines) {
    executionLines.push({
      id: `${opts.executionId}-${executionLines.length}`,
      timestamp: completed,
      stream: 'stdout',
      text: opts.message,
    });
  }
  if (opts.error && opts.status === 'failed' && !opts.lines) {
    executionLines.push({
      id: `${opts.executionId}-${executionLines.length}`,
      timestamp: completed,
      stream: 'stderr',
      text: opts.error,
    });
  }
  setLines(executionLines);
  
  // Reset scroll state
  setAutoScrollEnabled(true);
  setHasManualScroll(false);
  setPhases([]);
}

// Export setLines for external use
export { setLines };

function mapBackendStatusToLocal(status: ExecutionRecord['status']): ExecutionStatus {
  switch (status) {
    case 'running':
      return 'running';
    case 'succeeded':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'planned':
      return 'planned';
    default:
      return 'idle';
  }
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function loadExecutionLogsInternal(executionId: string) {
  try {
    const data = await fetchJSON<ExecutionLogsResponse>(`/api/executions/logs?executionId=${encodeURIComponent(executionId)}`);
    const newLines: ExecutionLine[] = (data.logs || []).map((log, idx) => ({
      id: `${executionId}-${idx}`,
      timestamp: log.timestamp,
      stream: log.stream,
      text: log.text,
    }));
    setLines(newLines);
  } catch (err) {
    console.error('[ExecutionPanel] Failed to load execution logs:', err);
    addNotification('Failed to load execution logs', 'error');
  }
}

export async function loadRecentExecutions(limit = 20) {
  try {
    setLoadingExecutions(true);
    const data = await fetchJSON<{ executions?: ExecutionRecord[] }>(`/api/executions?limit=${limit}`);
    setRecentExecutions(Array.isArray(data.executions) ? data.executions : []);
  } catch (err) {
    console.error('[ExecutionPanel] Failed to load recent executions:', err);
    addNotification('Failed to load recent executions', 'error');
  } finally {
    setLoadingExecutions(false);
  }
}

export async function reattachExecution(record: ExecutionRecord) {
  const executionId = record.executionId;
  setPanelOpen(true);
  setPanelExpanded(true);
  setCurrentExecutionId(executionId);
  setStatus(mapBackendStatusToLocal(record.status));
  setMode(record.summary?.exitCode === 0 ? mode() : mode()); // keep existing mode; backend doesn't expose it here yet
  setSourceLabel('shell'); // best-effort; detailed source not exposed via /api/executions
  setLabel(record.summary ? label() : label());
  setSummary(record.summary ?? null);
  setError(null);
  setRawError(null);
  setAutoScrollEnabled(true);
  setHasManualScroll(false);
  setPhases([]);

  if (record.summary) {
    setStartedAt(record.summary.startedAt);
    setCompletedAt(record.summary.completedAt);
  } else {
    setStartedAt(record.startedAt);
    setCompletedAt(null);
  }

  await loadExecutionLogsInternal(executionId);
}

export async function autoReattachMostRecentRunning() {
  await loadRecentExecutions(20);
  const records = recentExecutions();
  if (!records.length) return;

  const running = records.find((r) => r.status === 'running');
  if (!running) return;

  await reattachExecution(running);
  addNotification('Execution still running — reattached', 'info');
}

export const executionPanelOpen = panelOpen;
export const executionPanelExpanded = panelExpanded;
export const executionStatus = status;
export const executionMode = mode;
export const executionSourceLabel = sourceLabel;
export const executionLabel = label;
export const executionLines = lines;
export const executionSummaryState = summary;
export const executionError = error;
export const executionRawError = rawError;
export const executionStartedAt = startedAt;
export const executionCompletedAt = completedAt;
export const executionAutoScrollEnabled = autoScrollEnabled;
export const executionHasManualScroll = hasManualScroll;
export const executionPhases = phases;
export const recentExecutionRecords = recentExecutions;
export const recentExecutionsLoading = loadingExecutions;

export const executionDurationDisplay = createMemo(() => {
  const s = summary();
  if (s && s.durationMs != null) {
    const seconds = Math.round(s.durationMs / 100) / 10;
    return `${seconds.toFixed(1)}s`;
  }
  const start = startedAt();
  const end = completedAt();
  if (!start || !end) return '';
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return '';
  const seconds = Math.round((endTime - startTime) / 100) / 10;
  return `${seconds.toFixed(1)}s`;
});

export const executionCombinedOutput = createMemo(() => {
  return executionLines()
    .map((line) => {
      const time = new Date(line.timestamp);
      const hh = String(time.getHours()).padStart(2, '0');
      const mm = String(time.getMinutes()).padStart(2, '0');
      const ss = String(time.getSeconds()).padStart(2, '0');
      const prefix = `[${hh}:${mm}:${ss}]`;
      return `${prefix} ${line.stream.toUpperCase()}: ${line.text}`;
    })
    .join('\n');
});

export const executionSeveritySummary = createMemo(() => {
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  for (const line of executionLines()) {
    const textLower = line.text.toLowerCase();
    if (line.stream === 'stderr') {
      if (textLower.includes('warning') || textLower.includes('deprecated')) {
        warnings++;
      } else {
        errors++;
      }
    } else {
      infos++;
    }
  }

  return { errors, warnings, infos };
});


