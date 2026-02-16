/**
 * Realtime CPU and Memory Charts - Grafana Style
 * Production-grade monitoring with smooth curves and professional design
 *
 * Features:
 * - Smooth curve interpolation (Catmull-Rom splines)
 * - Large, clean charts with minimal clutter
 * - Fixed 0-100% Y-axis (industry standard)
 * - Gradient area fills
 * - Professional spacing and typography
 */
import { Component, createMemo, createSignal, Show, For } from 'solid-js';
import { points, MetricPoint } from '../../stores/metricsStore';

interface CpuMemChartProps {
  height?: number;
  maxPoints?: number;
  showLegend?: boolean;
  class?: string;
}

type TimeRange = '5m' | '15m' | '30m' | '1h';

const TIME_RANGE_CONFIG: Record<TimeRange, { points: number; label: string }> = {
  '5m': { points: 60, label: '5 min' },
  '15m': { points: 180, label: '15 min' },
  '30m': { points: 360, label: '30 min' },
  '1h': { points: 720, label: '1 hour' },
};

interface TooltipData {
  x: number;
  y: number;
  timestamp: string;
  value: number;
  type: 'cpu' | 'mem';
}

const CpuMemChart: Component<CpuMemChartProps> = (props) => {
  const totalHeight = props.height || 500; // Taller charts for better visibility
  const showLegend = props.showLegend ?? true;

  // Time range and pause state
  const [timeRange, setTimeRange] = createSignal<TimeRange>('30m');
  const [isPaused, setIsPaused] = createSignal(false);
  const [pausedData, setPausedData] = createSignal<MetricPoint[]>([]);
  const maxPoints = () => props.maxPoints || TIME_RANGE_CONFIG[timeRange()].points;

  // Each chart gets half the height - much larger now
  const chartHeight = (totalHeight - 40) / 2; // Minimal spacing

  // Tooltip state
  const [tooltip, setTooltip] = createSignal<TooltipData | null>(null);
  const [hovering, setHovering] = createSignal(false);
  let cpuSvgRef: SVGSVGElement | undefined;
  let memSvgRef: SVGSVGElement | undefined;

  // Handle pause toggle
  const togglePause = () => {
    if (!isPaused()) {
      setPausedData([...data()]);
      setIsPaused(true);
    } else {
      setPausedData([]);
      setIsPaused(false);
    }
  };

  // Grafana Standard Colors (exact match)
  const CPU_COLOR = '#FF8833'; // Orange (Grafana standard)
  const MEM_COLOR = '#1F78C1'; // Blue (Grafana standard)
  const WARNING_COLOR = '#F59E0B'; // Amber
  const CRITICAL_COLOR = '#EF4444'; // Red

  // Threshold values
  const WARNING_THRESHOLD = 60;
  const CRITICAL_THRESHOLD = 80;

  // Chart dimensions with proper margins
  const MARGIN = { top: 10, right: 15, bottom: 25, left: 50 };
  const chartWidth = 100 - MARGIN.left - MARGIN.right;
  const chartInnerHeight = chartHeight - MARGIN.top - MARGIN.bottom;

  // Get the data points - use paused snapshot if paused
  const data = createMemo(() => {
    if (isPaused()) {
      return pausedData();
    }
    const pts = points();
    const limit = maxPoints();
    if (pts.length > limit) {
      return pts.slice(-limit);
    }
    return pts;
  });

  // Calculate statistics
  const cpuStats = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return { current: 0, peak: 0, avg: 0, min: 0 };

    const cpuValues = pts.map(p => p.cluster.cpuPct);
    const current = cpuValues[cpuValues.length - 1];
    const peak = Math.max(...cpuValues);
    const min = Math.min(...cpuValues);
    const avg = cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length;

    return { current, peak, avg, min };
  });

  const memStats = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return { current: 0, peak: 0, avg: 0, min: 0 };

    const memValues = pts.map(p => p.cluster.memPct);
    const current = memValues[memValues.length - 1];
    const peak = Math.max(...memValues);
    const min = Math.min(...memValues);
    const avg = memValues.reduce((sum, v) => sum + v, 0) / memValues.length;

    return { current, peak, avg, min };
  });

  // Fixed 0-100% range (Grafana/Production Standard for percentage metrics)
  const cpuRange = createMemo(() => ({ min: 0, max: 100 }));
  const memRange = createMemo(() => ({ min: 0, max: 100 }));

  // LINEAR interpolation (Grafana default - most accurate)
  const createLinearPath = (getData: (p: MetricPoint) => number, range: { min: number; max: number }) => {
    const pts = data();
    if (pts.length < 2) return '';

    const xScale = (i: number) => MARGIN.left + (i / (pts.length - 1)) * chartWidth;
    const yScale = (v: number) => {
      const rangeSize = range.max - range.min;
      if (rangeSize === 0) return MARGIN.top + chartInnerHeight / 2;
      const normalized = (v - range.min) / rangeSize;
      return MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;
    };

    // Start path at first point
    let path = `M ${xScale(0)} ${yScale(getData(pts[0]))}`;

    // Draw straight lines to each subsequent point (Grafana default)
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${xScale(i)} ${yScale(getData(pts[i]))}`;
    }

    return path;
  };

  // Create area path (for gradient fill)
  const createAreaPath = (getData: (p: MetricPoint) => number, range: { min: number; max: number }) => {
    const pts = data();
    if (pts.length < 2) return '';

    const xScale = (i: number) => MARGIN.left + (i / (pts.length - 1)) * chartWidth;
    const yScale = (v: number) => {
      const rangeSize = range.max - range.min;
      if (rangeSize === 0) return MARGIN.top + chartInnerHeight / 2;
      const normalized = (v - range.min) / rangeSize;
      return MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;
    };

    const baselineY = MARGIN.top + chartInnerHeight;

    // Start at bottom-left
    let path = `M ${xScale(0)} ${baselineY}`;
    // Line to first data point
    path += ` L ${xScale(0)} ${yScale(getData(pts[0]))}`;
    // Draw the line across all points
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${xScale(i)} ${yScale(getData(pts[i]))}`;
    }
    // Line down to baseline at end
    path += ` L ${xScale(pts.length - 1)} ${baselineY}`;
    // Close path
    path += ' Z';
    return path;
  };

  // Y-scale helper for threshold lines
  const getThresholdY = (threshold: number, range: { min: number; max: number }) => {
    const rangeSize = range.max - range.min;
    if (rangeSize === 0) return MARGIN.top + chartInnerHeight / 2;
    const normalized = (threshold - range.min) / rangeSize;
    return MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;
  };

  const cpuPath = createMemo(() => createLinearPath(p => p.cluster.cpuPct, cpuRange()));
  const memPath = createMemo(() => createLinearPath(p => p.cluster.memPct, memRange()));
  const cpuAreaPath = createMemo(() => createAreaPath(p => p.cluster.cpuPct, cpuRange()));
  const memAreaPath = createMemo(() => createAreaPath(p => p.cluster.memPct, memRange()));

  // Latest values
  const latestCpu = createMemo(() => {
    const pts = data();
    return pts.length > 0 ? pts[pts.length - 1].cluster.cpuPct : 0;
  });

  const latestMem = createMemo(() => {
    const pts = data();
    return pts.length > 0 ? pts[pts.length - 1].cluster.memPct : 0;
  });

  // Time labels - Grafana Standard (absolute time format)
  const timeLabels = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return [];

    const labels = [];
    const numLabels = 5; // Grafana uses 4-6 labels

    for (let i = 0; i < numLabels; i++) {
      const idx = Math.floor((i / (numLabels - 1)) * (pts.length - 1));
      if (idx < pts.length) {
        const point = pts[idx];
        const date = new Date(point.ts * 1000);

        // GRAFANA STANDARD: Show absolute time (HH:mm format)
        const timeStr = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false // 24-hour format like Grafana
        });

        const x = MARGIN.left + (idx / (pts.length - 1)) * chartWidth;
        labels.push({ x, label: timeStr });
      }
    }
    return labels;
  });

  // Y-axis labels generator (Grafana style - clean round numbers)
  const getYAxisLabels = () => {
    return [
      { value: 100, y: MARGIN.top },
      { value: 75, y: MARGIN.top + chartInnerHeight * 0.25 },
      { value: 50, y: MARGIN.top + chartInnerHeight * 0.5 },
      { value: 25, y: MARGIN.top + chartInnerHeight * 0.75 },
      { value: 0, y: MARGIN.top + chartInnerHeight },
    ];
  };

  // Mouse handlers for CPU chart
  const handleCpuMouseMove = (e: MouseEvent) => {
    if (!cpuSvgRef) return;
    const rect = cpuSvgRef.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const pts = data();
    if (pts.length < 2) return;

    const dataIndex = Math.round(((mouseX - MARGIN.left) / chartWidth) * (pts.length - 1));
    if (dataIndex >= 0 && dataIndex < pts.length) {
      const point = pts[dataIndex];
      const xPos = MARGIN.left + (dataIndex / (pts.length - 1)) * chartWidth;
      const cpuRng = cpuRange();
      const rangeSize = cpuRng.max - cpuRng.min;
      const normalized = rangeSize > 0 ? (point.cluster.cpuPct - cpuRng.min) / rangeSize : 0.5;
      const yPos = MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;

      const date = new Date(point.ts * 1000);
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      setTooltip({
        x: xPos,
        y: yPos,
        timestamp: timeStr,
        value: point.cluster.cpuPct,
        type: 'cpu'
      });
    }
  };

  // Mouse handlers for Memory chart
  const handleMemMouseMove = (e: MouseEvent) => {
    if (!memSvgRef) return;
    const rect = memSvgRef.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const pts = data();
    if (pts.length < 2) return;

    const dataIndex = Math.round(((mouseX - MARGIN.left) / chartWidth) * (pts.length - 1));
    if (dataIndex >= 0 && dataIndex < pts.length) {
      const point = pts[dataIndex];
      const xPos = MARGIN.left + (dataIndex / (pts.length - 1)) * chartWidth;
      const memRng = memRange();
      const rangeSize = memRng.max - memRng.min;
      const normalized = rangeSize > 0 ? (point.cluster.memPct - memRng.min) / rangeSize : 0.5;
      const yPos = MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;

      const date = new Date(point.ts * 1000);
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      setTooltip({
        x: xPos,
        y: yPos,
        timestamp: timeStr,
        value: point.cluster.memPct,
        type: 'mem'
      });
    }
  };

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => {
    setHovering(false);
    setTooltip(null);
  };

  return (
    <div class={`relative ${props.class || ''}`}>
      {/* Grafana-Style Header */}
      <Show when={showLegend}>
        <div class="flex items-center justify-between mb-3 px-1" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
          {/* Left: Current Values */}
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-sm" style={{ background: CPU_COLOR }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                CPU {latestCpu().toFixed(1)}%
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-sm" style={{ background: MEM_COLOR }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Memory {latestMem().toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Right: Minimal Controls */}
          <div class="flex items-center gap-2">
            {/* Time Range Selector - Minimal */}
            <select
              class="text-xs px-2 py-1 rounded border-0 outline-none"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
              value={timeRange()}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <For each={Object.keys(TIME_RANGE_CONFIG) as TimeRange[]}>
                {(range) => <option value={range}>{TIME_RANGE_CONFIG[range].label}</option>}
              </For>
            </select>

            {/* Pause Button - Icon Only */}
            <button
              class="p-1.5 rounded transition-opacity hover:opacity-70"
              style={{
                background: isPaused() ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: isPaused() ? 'var(--error-color)' : 'var(--text-muted)',
              }}
              onClick={togglePause}
              title={isPaused() ? 'Resume' : 'Pause'}
            >
              <Show when={isPaused()} fallback={
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              }>
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </Show>
            </button>
          </div>
        </div>
      </Show>

      {/* CPU Chart */}
      <div class="relative mb-3">
        <div class="text-xs font-medium mb-1 px-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          CPU
        </div>
        <svg
          ref={cpuSvgRef}
          width="100%"
          height={chartHeight}
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
          class="overflow-visible cursor-crosshair"
          onMouseMove={handleCpuMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <filter id="cpu-shadow">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feOffset in="blur" dx="0" dy="0.5" result="offsetBlur" />
              <feMerge>
                <feMergeNode in="offsetBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Grafana Standard Gradient - CPU */}
            <linearGradient id="cpu-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color={CPU_COLOR} stop-opacity="0.2" />
              <stop offset="100%" stop-color={CPU_COLOR} stop-opacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={chartWidth}
            height={chartInnerHeight}
            fill="var(--bg-card)"
            opacity="0.2"
            rx="1"
          />

          {/* Minimal Grid - Horizontal Only (Grafana Style) */}
          <g opacity="0.06" stroke="currentColor" stroke-width="0.1">
            <For each={[0.25, 0.5, 0.75]}>
              {(ratio) => (
                <line
                  x1={MARGIN.left}
                  y1={MARGIN.top + chartInnerHeight * ratio}
                  x2={MARGIN.left + chartWidth}
                  y2={MARGIN.top + chartInnerHeight * ratio}
                />
              )}
            </For>
          </g>

          {/* Axes */}
          <g stroke="currentColor" stroke-width="0.3" opacity="0.5">
            <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + chartInnerHeight} />
            <line x1={MARGIN.left} y1={MARGIN.top + chartInnerHeight} x2={MARGIN.left + chartWidth} y2={MARGIN.top + chartInnerHeight} />
          </g>

          {/* Y-axis labels */}
          <Show when={data().length > 0}>
            <For each={getYAxisLabels()}>
              {({ value, y }) => (
                <g>
                  <line x1={MARGIN.left - 1} y1={y} x2={MARGIN.left} y2={y} stroke="currentColor" stroke-width="0.2" opacity="0.5" />
                  <text x={MARGIN.left - 2} y={y + 1} font-size="3" fill="currentColor" opacity="0.6" text-anchor="end">
                    {value}%
                  </text>
                </g>
              )}
            </For>
          </Show>

          {/* Threshold lines for CPU */}
          <Show when={data().length > 0}>
            <line
              x1={MARGIN.left}
              y1={getThresholdY(WARNING_THRESHOLD, cpuRange())}
              x2={MARGIN.left + chartWidth}
              y2={getThresholdY(WARNING_THRESHOLD, cpuRange())}
              stroke={WARNING_COLOR}
              stroke-width="0.3"
              stroke-dasharray="3,3"
              opacity="0.4"
            />
            <line
              x1={MARGIN.left}
              y1={getThresholdY(CRITICAL_THRESHOLD, cpuRange())}
              x2={MARGIN.left + chartWidth}
              y2={getThresholdY(CRITICAL_THRESHOLD, cpuRange())}
              stroke={CRITICAL_COLOR}
              stroke-width="0.3"
              stroke-dasharray="3,3"
              opacity="0.4"
            />
          </Show>

          {/* CPU area fill with gradient */}
          <path
            d={cpuAreaPath()}
            fill="url(#cpu-gradient)"
            style={{ transition: 'd 0.5s ease-in-out' }}
          />

          {/* CPU line - Grafana standard */}
          <path
            d={cpuPath()}
            fill="none"
            stroke={CPU_COLOR}
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style={{ transition: 'd 0.2s linear' }}
          />

          {/* Tooltip indicator */}
          <Show when={hovering() && tooltip()?.type === 'cpu'}>
            {(() => {
              const t = tooltip();
              if (!t) return null;
              return (
                <g>
                  <line
                    x1={t.x}
                    y1={MARGIN.top}
                    x2={t.x}
                    y2={MARGIN.top + chartInnerHeight}
                    stroke="currentColor"
                    stroke-width="0.2"
                    stroke-dasharray="2,2"
                    opacity="0.4"
                  />
                  <circle cx={t.x} cy={t.y} r="2.5" fill={CPU_COLOR} stroke="white" stroke-width="1.5" />
                </g>
              );
            })()}
          </Show>

          {/* Latest point */}
          <Show when={data().length > 0}>
            <circle
              cx={MARGIN.left + chartWidth}
              cy={(() => {
                const cpuRng = cpuRange();
                const rangeSize = cpuRng.max - cpuRng.min;
                if (rangeSize === 0) return MARGIN.top + chartInnerHeight / 2;
                const normalized = (latestCpu() - cpuRng.min) / rangeSize;
                return MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;
              })()}
              r="2"
              fill={CPU_COLOR}
              stroke="white"
              stroke-width="1"
            />
          </Show>
        </svg>
      </div>

      {/* Memory Chart */}
      <div class="relative">
        <div class="text-xs font-medium mb-1 px-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          Memory
        </div>
        <svg
          ref={memSvgRef}
          width="100%"
          height={chartHeight}
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
          class="overflow-visible cursor-crosshair"
          onMouseMove={handleMemMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <filter id="mem-shadow">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feOffset in="blur" dx="0" dy="0.5" result="offsetBlur" />
              <feMerge>
                <feMergeNode in="offsetBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Grafana Standard Gradient - Memory */}
            <linearGradient id="mem-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color={MEM_COLOR} stop-opacity="0.2" />
              <stop offset="100%" stop-color={MEM_COLOR} stop-opacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={chartWidth}
            height={chartInnerHeight}
            fill="var(--bg-card)"
            opacity="0.2"
            rx="1"
          />

          {/* Minimal Grid - Horizontal Only (Grafana Style) */}
          <g opacity="0.06" stroke="currentColor" stroke-width="0.1">
            <For each={[0.25, 0.5, 0.75]}>
              {(ratio) => (
                <line
                  x1={MARGIN.left}
                  y1={MARGIN.top + chartInnerHeight * ratio}
                  x2={MARGIN.left + chartWidth}
                  y2={MARGIN.top + chartInnerHeight * ratio}
                />
              )}
            </For>
          </g>

          {/* Axes */}
          <g stroke="currentColor" stroke-width="0.3" opacity="0.5">
            <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + chartInnerHeight} />
            <line x1={MARGIN.left} y1={MARGIN.top + chartInnerHeight} x2={MARGIN.left + chartWidth} y2={MARGIN.top + chartInnerHeight} />
          </g>

          {/* Y-axis labels */}
          <Show when={data().length > 0}>
            <For each={getYAxisLabels()}>
              {({ value, y }) => (
                <g>
                  <line x1={MARGIN.left - 1} y1={y} x2={MARGIN.left} y2={y} stroke="currentColor" stroke-width="0.2" opacity="0.5" />
                  <text x={MARGIN.left - 2} y={y + 1} font-size="3" fill="currentColor" opacity="0.6" text-anchor="end">
                    {value}%
                  </text>
                </g>
              )}
            </For>
          </Show>

          {/* X-axis time labels (only on bottom chart) */}
          <Show when={timeLabels().length > 0}>
            <For each={timeLabels()}>
              {({ x, label }) => (
                <g>
                  <line x1={x} y1={MARGIN.top + chartInnerHeight} x2={x} y2={MARGIN.top + chartInnerHeight + 1} stroke="currentColor" stroke-width="0.2" opacity="0.5" />
                  <text x={x} y={MARGIN.top + chartInnerHeight + 5} font-size="2.8" fill="currentColor" opacity="0.6" text-anchor="middle">
                    {label}
                  </text>
                </g>
              )}
            </For>
          </Show>

          {/* Threshold lines for Memory */}
          <Show when={data().length > 0}>
            <line
              x1={MARGIN.left}
              y1={getThresholdY(WARNING_THRESHOLD, memRange())}
              x2={MARGIN.left + chartWidth}
              y2={getThresholdY(WARNING_THRESHOLD, memRange())}
              stroke={WARNING_COLOR}
              stroke-width="0.3"
              stroke-dasharray="3,3"
              opacity="0.4"
            />
            <line
              x1={MARGIN.left}
              y1={getThresholdY(CRITICAL_THRESHOLD, memRange())}
              x2={MARGIN.left + chartWidth}
              y2={getThresholdY(CRITICAL_THRESHOLD, memRange())}
              stroke={CRITICAL_COLOR}
              stroke-width="0.3"
              stroke-dasharray="3,3"
              opacity="0.4"
            />
          </Show>

          {/* Memory area fill with gradient */}
          <path
            d={memAreaPath()}
            fill="url(#mem-gradient)"
            style={{ transition: 'd 0.5s ease-in-out' }}
          />

          {/* Memory line - Grafana standard */}
          <path
            d={memPath()}
            fill="none"
            stroke={MEM_COLOR}
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style={{ transition: 'd 0.2s linear' }}
          />

          {/* Tooltip indicator */}
          <Show when={hovering() && tooltip()?.type === 'mem'}>
            {(() => {
              const t = tooltip();
              if (!t) return null;
              return (
                <g>
                  <line
                    x1={t.x}
                    y1={MARGIN.top}
                    x2={t.x}
                    y2={MARGIN.top + chartInnerHeight}
                    stroke="currentColor"
                    stroke-width="0.2"
                    stroke-dasharray="2,2"
                    opacity="0.4"
                  />
                  <circle cx={t.x} cy={t.y} r="2.5" fill={MEM_COLOR} stroke="white" stroke-width="1.5" />
                </g>
              );
            })()}
          </Show>

          {/* Latest point */}
          <Show when={data().length > 0}>
            <circle
              cx={MARGIN.left + chartWidth}
              cy={(() => {
                const memRng = memRange();
                const rangeSize = memRng.max - memRng.min;
                if (rangeSize === 0) return MARGIN.top + chartInnerHeight / 2;
                const normalized = (latestMem() - memRng.min) / rangeSize;
                return MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;
              })()}
              r="2"
              fill={MEM_COLOR}
              stroke="white"
              stroke-width="1"
            />
          </Show>
        </svg>
      </div>

      {/* Floating tooltip */}
      <Show when={hovering() && tooltip()}>
        {(() => {
          const t = tooltip();
          if (!t) return null;
          const color = t.type === 'cpu' ? CPU_COLOR : MEM_COLOR;
          const label = t.type === 'cpu' ? 'CPU' : 'Memory';

          return (
            <div
              class="absolute pointer-events-none z-10"
              style={{
                left: `${(t.x / 100) * 100}%`,
                top: t.type === 'cpu' ? `${t.y}px` : `${chartHeight + 30 + t.y}px`,
                transform: 'translate(-50%, -100%)',
                'margin-top': '-10px'
              }}
            >
              <div
                class="rounded-lg px-3 py-2 shadow-xl border"
                style={{
                  background: 'var(--bg-card)',
                  'border-color': 'var(--border-color)',
                  'min-width': '120px'
                }}
              >
                <div class="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.timestamp}
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span class="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  <span class="text-sm font-bold" style={{ color }}>
                    {t.value.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </Show>

      {/* No data message */}
      <Show when={data().length === 0}>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-sm" style={{ color: 'var(--text-muted)' }}>
            Waiting for metrics data...
          </span>
        </div>
      </Show>
    </div>
  );
};

export default CpuMemChart;
