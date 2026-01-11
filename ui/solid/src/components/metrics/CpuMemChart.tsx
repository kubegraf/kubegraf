/**
 * Realtime CPU and Memory Charts - Separated
 * Professional monitoring style with individual graphs for CPU and Memory
 *
 * Configuration:
 * - Shows 30 minutes of data (360 points at 5s intervals) for slower, smoother movement
 * - Minimum 20% Y-axis range for better visibility
 * - 6 time labels on X-axis
 * - Updates every 5 seconds via WebSocket
 */
import { Component, createMemo, createSignal, Show, For } from 'solid-js';
import { points, MetricPoint } from '../../stores/metricsStore';

interface CpuMemChartProps {
  height?: number;
  maxPoints?: number;
  showLegend?: boolean;
  class?: string;
}

interface TooltipData {
  x: number;
  y: number;
  timestamp: string;
  value: number;
  type: 'cpu' | 'mem';
}

const CpuMemChart: Component<CpuMemChartProps> = (props) => {
  const totalHeight = props.height || 400;
  const maxPoints = props.maxPoints || 360; // 30 minutes at 5s intervals for slower movement
  const showLegend = props.showLegend ?? true;

  // Each chart gets half the height minus spacing
  const chartHeight = (totalHeight - 60) / 2; // 60px for spacing and labels

  // Tooltip state
  const [tooltip, setTooltip] = createSignal<TooltipData | null>(null);
  const [hovering, setHovering] = createSignal(false);
  let cpuSvgRef: SVGSVGElement | undefined;
  let memSvgRef: SVGSVGElement | undefined;

  // Professional colors
  const CPU_COLOR = '#ff6b35'; // Orange
  const MEM_COLOR = '#4a90e2'; // Blue

  // Chart dimensions with proper margins
  const MARGIN = { top: 10, right: 15, bottom: 25, left: 50 };
  const chartWidth = 100 - MARGIN.left - MARGIN.right;
  const chartInnerHeight = chartHeight - MARGIN.top - MARGIN.bottom;

  // Get the data points
  const data = createMemo(() => {
    const pts = points();
    if (pts.length > maxPoints) {
      return pts.slice(-maxPoints);
    }
    return pts;
  });

  // Calculate dynamic min/max for CPU - WIDER RANGE FOR BETTER VISIBILITY
  const cpuRange = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return { min: 0, max: 100 };

    const cpuValues = pts.map(p => p.cluster.cpuPct);
    const min = Math.min(...cpuValues);
    const max = Math.max(...cpuValues);

    let range = max - min;

    // Use minimum 20% range for better visibility
    if (range < 20) {
      const center = (min + max) / 2;
      return {
        min: Math.max(0, center - 10),
        max: Math.min(100, center + 10)
      };
    }

    // Add 20% padding to the range
    const padding = range * 0.2;
    return {
      min: Math.max(0, min - padding),
      max: Math.min(100, max + padding)
    };
  });

  // Calculate dynamic min/max for Memory - WIDER RANGE FOR BETTER VISIBILITY
  const memRange = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return { min: 0, max: 100 };

    const memValues = pts.map(p => p.cluster.memPct);
    const min = Math.min(...memValues);
    const max = Math.max(...memValues);

    let range = max - min;

    // Use minimum 20% range for better visibility
    if (range < 20) {
      const center = (min + max) / 2;
      return {
        min: Math.max(0, center - 10),
        max: Math.min(100, center + 10)
      };
    }

    // Add 20% padding to the range
    const padding = range * 0.2;
    return {
      min: Math.max(0, min - padding),
      max: Math.min(100, max + padding)
    };
  });

  // Create path for a metric
  const createPath = (getData: (p: MetricPoint) => number, range: { min: number; max: number }) => {
    const pts = data();
    if (pts.length < 2) return '';

    const xScale = (i: number) => MARGIN.left + (i / (pts.length - 1)) * chartWidth;
    const yScale = (v: number) => {
      const rangeSize = range.max - range.min;
      if (rangeSize === 0) return MARGIN.top + chartInnerHeight / 2;
      const normalized = (v - range.min) / rangeSize;
      return MARGIN.top + chartInnerHeight - normalized * chartInnerHeight;
    };

    let path = `M ${xScale(0)} ${yScale(getData(pts[0]))}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${xScale(i)} ${yScale(getData(pts[i]))}`;
    }
    return path;
  };

  const cpuPath = createMemo(() => createPath(p => p.cluster.cpuPct, cpuRange()));
  const memPath = createMemo(() => createPath(p => p.cluster.memPct, memRange()));

  // Latest values
  const latestCpu = createMemo(() => {
    const pts = data();
    return pts.length > 0 ? pts[pts.length - 1].cluster.cpuPct : 0;
  });

  const latestMem = createMemo(() => {
    const pts = data();
    return pts.length > 0 ? pts[pts.length - 1].cluster.memPct : 0;
  });

  // Time labels for x-axis - show more labels for 30-minute window
  const timeLabels = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return [];

    const labels = [];
    // Show 6 time labels across the axis for better time visibility
    const numLabels = 6;

    for (let i = 0; i < numLabels; i++) {
      const idx = Math.floor((i / (numLabels - 1)) * (pts.length - 1));
      if (idx < pts.length) {
        const point = pts[idx];
        const date = new Date(point.ts * 1000);
        const timeStr = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const x = MARGIN.left + (idx / (pts.length - 1)) * chartWidth;
        labels.push({ x, label: timeStr });
      }
    }
    return labels;
  });

  // Y-axis labels generator
  const getYAxisLabels = (range: { min: number; max: number }) => {
    return [
      { value: range.max, y: MARGIN.top },
      { value: range.max - (range.max - range.min) * 0.25, y: MARGIN.top + chartInnerHeight * 0.25 },
      { value: range.max - (range.max - range.min) * 0.5, y: MARGIN.top + chartInnerHeight * 0.5 },
      { value: range.max - (range.max - range.min) * 0.75, y: MARGIN.top + chartInnerHeight * 0.75 },
      { value: range.min, y: MARGIN.top + chartInnerHeight },
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
      {/* Legend */}
      <Show when={showLegend}>
        <div class="flex items-center justify-between mb-3 px-2">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" style={{ background: CPU_COLOR }} />
              <span class="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>CPU</span>
              <span class="text-sm font-semibold" style={{ color: CPU_COLOR }}>
                {latestCpu().toFixed(1)}%
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" style={{ background: MEM_COLOR }} />
              <span class="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Memory</span>
              <span class="text-sm font-semibold" style={{ color: MEM_COLOR }}>
                {latestMem().toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </Show>

      {/* CPU Chart */}
      <div class="relative mb-4">
        <div class="text-xs font-semibold mb-1 px-2" style={{ color: CPU_COLOR }}>
          CPU Usage
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

          {/* Grid lines */}
          <g opacity="0.12" stroke="currentColor" stroke-width="0.15" stroke-dasharray="3,3">
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
            <For each={[0.25, 0.5, 0.75]}>
              {(ratio) => (
                <line
                  x1={MARGIN.left + chartWidth * ratio}
                  y1={MARGIN.top}
                  x2={MARGIN.left + chartWidth * ratio}
                  y2={MARGIN.top + chartInnerHeight}
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
            <For each={getYAxisLabels(cpuRange())}>
              {({ value, y }) => (
                <g>
                  <line x1={MARGIN.left - 1} y1={y} x2={MARGIN.left} y2={y} stroke="currentColor" stroke-width="0.2" opacity="0.5" />
                  <text x={MARGIN.left - 2} y={y + 1} font-size="3" fill="currentColor" opacity="0.6" text-anchor="end">
                    {value.toFixed(1)}%
                  </text>
                </g>
              )}
            </For>
          </Show>

          {/* CPU line */}
          <path
            d={cpuPath()}
            fill="none"
            stroke={CPU_COLOR}
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            filter="url(#cpu-shadow)"
            opacity="0.95"
            style={{ transition: 'd 0.5s ease-in-out' }}
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
        <div class="text-xs font-semibold mb-1 px-2" style={{ color: MEM_COLOR }}>
          Memory Usage
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

          {/* Grid lines */}
          <g opacity="0.12" stroke="currentColor" stroke-width="0.15" stroke-dasharray="3,3">
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
            <For each={[0.25, 0.5, 0.75]}>
              {(ratio) => (
                <line
                  x1={MARGIN.left + chartWidth * ratio}
                  y1={MARGIN.top}
                  x2={MARGIN.left + chartWidth * ratio}
                  y2={MARGIN.top + chartInnerHeight}
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
            <For each={getYAxisLabels(memRange())}>
              {({ value, y }) => (
                <g>
                  <line x1={MARGIN.left - 1} y1={y} x2={MARGIN.left} y2={y} stroke="currentColor" stroke-width="0.2" opacity="0.5" />
                  <text x={MARGIN.left - 2} y={y + 1} font-size="3" fill="currentColor" opacity="0.6" text-anchor="end">
                    {value.toFixed(1)}%
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

          {/* Memory line */}
          <path
            d={memPath()}
            fill="none"
            stroke={MEM_COLOR}
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            filter="url(#mem-shadow)"
            opacity="0.95"
            style={{ transition: 'd 0.5s ease-in-out' }}
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
