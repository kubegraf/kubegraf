/**
 * Realtime CPU and Memory Chart
 * Uses SVG for fast incremental updates
 */
import { Component, createMemo, createEffect, onMount, onCleanup, Show } from 'solid-js';
import { points, MetricPoint } from '../../stores/metricsStore';

interface CpuMemChartProps {
  height?: number;
  maxPoints?: number;
  showLegend?: boolean;
  class?: string;
}

const CpuMemChart: Component<CpuMemChartProps> = (props) => {
  const height = props.height || 200;
  const maxPoints = props.maxPoints || 180;
  const showLegend = props.showLegend ?? true;

  // Get the data points (limited to maxPoints)
  const data = createMemo(() => {
    const pts = points();
    if (pts.length > maxPoints) {
      return pts.slice(-maxPoints);
    }
    return pts;
  });

  // Calculate path for a series
  const createPath = (getData: (p: MetricPoint) => number) => {
    const pts = data();
    if (pts.length < 2) return '';

    const width = 100; // percentage-based
    const h = height - 40; // leave room for labels
    const padding = 5;

    const xScale = (i: number) => padding + (i / (pts.length - 1)) * (width - padding * 2);
    const yScale = (v: number) => h - (Math.min(v, 100) / 100) * (h - padding * 2);

    let path = `M ${xScale(0)} ${yScale(getData(pts[0]))}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${xScale(i)} ${yScale(getData(pts[i]))}`;
    }
    return path;
  };

  // Create area path (filled under the line)
  const createAreaPath = (getData: (p: MetricPoint) => number) => {
    const pts = data();
    if (pts.length < 2) return '';

    const width = 100;
    const h = height - 40;
    const padding = 5;

    const xScale = (i: number) => padding + (i / (pts.length - 1)) * (width - padding * 2);
    const yScale = (v: number) => h - (Math.min(v, 100) / 100) * (h - padding * 2);

    let path = `M ${xScale(0)} ${h}`;
    path += ` L ${xScale(0)} ${yScale(getData(pts[0]))}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${xScale(i)} ${yScale(getData(pts[i]))}`;
    }
    path += ` L ${xScale(pts.length - 1)} ${h}`;
    path += ' Z';
    return path;
  };

  const cpuPath = createMemo(() => createPath(p => p.cluster.cpuPct));
  const memPath = createMemo(() => createPath(p => p.cluster.memPct));
  const cpuAreaPath = createMemo(() => createAreaPath(p => p.cluster.cpuPct));
  const memAreaPath = createMemo(() => createAreaPath(p => p.cluster.memPct));

  // Latest values for display
  const latestCpu = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return 0;
    return pts[pts.length - 1].cluster.cpuPct;
  });

  const latestMem = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return 0;
    return pts[pts.length - 1].cluster.memPct;
  });

  // Time range display
  const timeRange = createMemo(() => {
    const pts = data();
    if (pts.length < 2) return '';
    const startTs = pts[0].ts;
    const endTs = pts[pts.length - 1].ts;
    const duration = endTs - startTs;
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m`;
    return `${Math.floor(duration / 3600)}h`;
  });

  return (
    <div class={`relative ${props.class || ''}`}>
      {/* Legend */}
      <Show when={showLegend}>
        <div class="flex items-center justify-between mb-2 px-2">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" style={{ background: '#06b6d4' }} />
              <span class="text-xs" style={{ color: 'var(--text-muted)' }}>CPU</span>
              <span class="text-sm font-semibold" style={{ color: '#06b6d4' }}>
                {latestCpu().toFixed(1)}%
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" style={{ background: '#8b5cf6' }} />
              <span class="text-xs" style={{ color: 'var(--text-muted)' }}>Memory</span>
              <span class="text-sm font-semibold" style={{ color: '#8b5cf6' }}>
                {latestMem().toFixed(1)}%
              </span>
            </div>
          </div>
          <Show when={timeRange()}>
            <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
              Last {timeRange()}
            </span>
          </Show>
        </div>
      </Show>

      {/* Chart */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        class="overflow-visible"
      >
        <defs>
          {/* CPU gradient */}
          <linearGradient id="cpu-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.05" />
          </linearGradient>
          {/* Memory gradient */}
          <linearGradient id="mem-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.05" />
          </linearGradient>
          {/* Glow filters */}
          <filter id="cpu-glow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="mem-glow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <g opacity="0.15" stroke="currentColor" stroke-width="0.2">
          <line x1="5" y1={height * 0.25} x2="95" y2={height * 0.25} />
          <line x1="5" y1={height * 0.5} x2="95" y2={height * 0.5} />
          <line x1="5" y1={height * 0.75} x2="95" y2={height * 0.75} />
        </g>

        {/* Y-axis labels */}
        <text x="2" y={height * 0.25} font-size="3" fill="currentColor" opacity="0.4">75%</text>
        <text x="2" y={height * 0.5} font-size="3" fill="currentColor" opacity="0.4">50%</text>
        <text x="2" y={height * 0.75} font-size="3" fill="currentColor" opacity="0.4">25%</text>

        {/* Memory area (behind CPU) */}
        <path
          d={memAreaPath()}
          fill="url(#mem-gradient)"
          class="transition-all duration-500"
        />

        {/* CPU area */}
        <path
          d={cpuAreaPath()}
          fill="url(#cpu-gradient)"
          class="transition-all duration-500"
        />

        {/* Memory line */}
        <path
          d={memPath()}
          fill="none"
          stroke="#8b5cf6"
          stroke-width="0.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#mem-glow)"
          class="transition-all duration-500"
        />

        {/* CPU line */}
        <path
          d={cpuPath()}
          fill="none"
          stroke="#06b6d4"
          stroke-width="0.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#cpu-glow)"
          class="transition-all duration-500"
        />

        {/* Latest point indicators */}
        <Show when={data().length > 0}>
          <circle
            cx="95"
            cy={(height - 40) - (Math.min(latestCpu(), 100) / 100) * (height - 40 - 10)}
            r="1.5"
            fill="#06b6d4"
            class="animate-pulse"
          />
          <circle
            cx="95"
            cy={(height - 40) - (Math.min(latestMem(), 100) / 100) * (height - 40 - 10)}
            r="1.5"
            fill="#8b5cf6"
            class="animate-pulse"
          />
        </Show>
      </svg>

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

