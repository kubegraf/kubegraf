/**
 * Lightweight Sparkline Component
 * Pure SVG polyline for fast rendering
 */
import { Component, createMemo } from 'solid-js';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  showDots?: boolean;
  class?: string;
}

const Sparkline: Component<SparklineProps> = (props) => {
  const height = props.height || 40;
  const width = props.width || 120;
  const color = props.color || '#06b6d4';
  const strokeWidth = props.strokeWidth || 1.5;
  const showDots = props.showDots ?? false;

  const points = createMemo(() => {
    const data = props.data;
    if (!data || data.length === 0) return '';

    const padding = 4;
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    return data.map((value, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - minVal) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');
  });

  const lastPoint = createMemo(() => {
    const data = props.data;
    if (!data || data.length === 0) return null;

    const padding = 4;
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    const i = data.length - 1;
    const value = data[i];

    return {
      x: padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2),
      y: height - padding - ((value - minVal) / range) * (height - padding * 2),
    };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      class={`overflow-visible ${props.class || ''}`}
    >
      <defs>
        <linearGradient id={`sparkline-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color={color} stop-opacity="0.3" />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {props.data && props.data.length > 0 && (
        <polygon
          points={`4,${height - 4} ${points()} ${width - 4},${height - 4}`}
          fill={`url(#sparkline-grad-${color.replace('#', '')})`}
        />
      )}

      {/* Line */}
      <polyline
        points={points()}
        fill="none"
        stroke={color}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      {/* End dot */}
      {showDots && lastPoint() && (
        <circle
          cx={lastPoint()!.x}
          cy={lastPoint()!.y}
          r={3}
          fill={color}
          class="animate-pulse"
        />
      )}
    </svg>
  );
};

export default Sparkline;

