/**
 * Realtime Cluster Metrics Store
 * Connects to /ws/metrics for CPU and Memory monitoring
 */
import { createSignal, batch } from 'solid-js';

// Maximum points to keep in memory (15 minutes at 5s intervals)
const MAX_POINTS = 180;

// Reconnect delays (seconds)
const RECONNECT_DELAYS = [1, 2, 5, 10, 30];

export interface ClusterMetrics {
  cpuPct: number;
  memPct: number;
}

export interface PeakMetrics {
  cpuPct: number;
  memPct: number;
}

export interface NodeMetrics {
  name: string;
  cpuPct: number;
  memPct: number;
}

export interface MetricPoint {
  ts: number; // Unix seconds
  cluster: ClusterMetrics;
  peaks: PeakMetrics;
  topNodes?: NodeMetrics[];
  source: 'metrics_api' | 'summary_api' | 'unavailable';
  error?: string;
}

export interface MetricsStatus {
  connected: boolean;
  reconnecting: boolean;
  source: string;
  error: string | null;
}

// Signals
const [points, setPoints] = createSignal<MetricPoint[]>([]);
const [latestPoint, setLatestPoint] = createSignal<MetricPoint | null>(null);
const [status, setStatus] = createSignal<MetricsStatus>({
  connected: false,
  reconnecting: false,
  source: 'unknown',
  error: null,
});

// WebSocket connection
let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Get the WebSocket URL for metrics streaming
 */
function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/metrics`;
}

/**
 * Connect to the metrics WebSocket
 */
export function connectMetrics() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return; // Already connected or connecting
  }

  const url = getWsUrl();
  console.log('[MetricsStore] Connecting to', url);

  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.error('[MetricsStore] Failed to create WebSocket:', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('[MetricsStore] Connected');
    reconnectAttempt = 0;
    batch(() => {
      setStatus({
        connected: true,
        reconnecting: false,
        source: 'connecting',
        error: null,
      });
    });
  };

  ws.onmessage = (event) => {
    try {
      const data = event.data;
      // Handle multiple messages (batched by hub)
      const messages = data.split('\n').filter((m: string) => m.trim());
      for (const msgStr of messages) {
        const msg = JSON.parse(msgStr);
        handleMessage(msg);
      }
    } catch (err) {
      console.error('[MetricsStore] Failed to parse message:', err);
    }
  };

  ws.onerror = (error) => {
    console.error('[MetricsStore] WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('[MetricsStore] Connection closed');
    ws = null;
    setStatus((prev) => ({
      ...prev,
      connected: false,
      reconnecting: true,
    }));
    scheduleReconnect();
  };
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(msg: any) {
  switch (msg.type) {
    case 'snapshot':
      // Replace all points with snapshot
      if (Array.isArray(msg.points)) {
        const pts = msg.points.slice(-MAX_POINTS);
        batch(() => {
          setPoints(pts);
          if (pts.length > 0) {
            const latest = pts[pts.length - 1];
            setLatestPoint(latest);
            setStatus({
              connected: true,
              reconnecting: false,
              source: latest.source,
              error: latest.error || null,
            });
          }
        });
      }
      break;

    case 'point':
      // Append single point
      if (msg.point) {
        batch(() => {
          setPoints((prev) => {
            const newPoints = [...prev, msg.point];
            // Keep only MAX_POINTS
            if (newPoints.length > MAX_POINTS) {
              return newPoints.slice(-MAX_POINTS);
            }
            return newPoints;
          });
          setLatestPoint(msg.point);
          setStatus({
            connected: true,
            reconnecting: false,
            source: msg.point.source,
            error: msg.point.error || null,
          });
        });
      }
      break;

    case 'status':
      // Status update (usually error state)
      setStatus({
        connected: true,
        reconnecting: false,
        source: msg.source || 'unavailable',
        error: msg.error || null,
      });
      break;

    default:
      console.warn('[MetricsStore] Unknown message type:', msg.type);
  }
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)] * 1000;
  console.log(`[MetricsStore] Reconnecting in ${delay / 1000}s...`);

  reconnectTimer = setTimeout(() => {
    reconnectAttempt++;
    connectMetrics();
  }, delay);
}

/**
 * Disconnect from metrics WebSocket
 */
export function disconnectMetrics() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  setStatus({
    connected: false,
    reconnecting: false,
    source: 'disconnected',
    error: null,
  });
}

/**
 * Get the latest N points for charting
 */
export function getRecentPoints(count: number = 30): MetricPoint[] {
  const pts = points();
  if (pts.length <= count) {
    return pts;
  }
  return pts.slice(-count);
}

/**
 * Get sparkline data (just the values) for CPU
 */
export function getCpuSparkline(count: number = 30): number[] {
  return getRecentPoints(count).map(p => p.cluster.cpuPct);
}

/**
 * Get sparkline data (just the values) for Memory
 */
export function getMemSparkline(count: number = 30): number[] {
  return getRecentPoints(count).map(p => p.cluster.memPct);
}

/**
 * Get status color based on percentage
 */
export function getStatusLevel(pct: number): 'normal' | 'moderate' | 'hot' {
  if (pct >= 80) return 'hot';
  if (pct >= 60) return 'moderate';
  return 'normal';
}

/**
 * Get status color CSS value
 */
export function getStatusColor(pct: number): string {
  const level = getStatusLevel(pct);
  switch (level) {
    case 'hot': return '#ef4444'; // red
    case 'moderate': return '#f59e0b'; // amber
    default: return '#22c55e'; // green
  }
}

// Export signals
export { points, latestPoint, status };

// Auto-connect when module is imported
if (typeof window !== 'undefined') {
  // Delay connection slightly to allow the app to initialize
  setTimeout(() => {
    connectMetrics();
  }, 500);
}

