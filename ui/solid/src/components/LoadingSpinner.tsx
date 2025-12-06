import { Component, Show } from 'solid-js';

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Type of spinner */
  type?: 'circle' | 'dots' | 'bars' | 'pulse' | 'ring';
  /** Color of the spinner */
  color?: string;
  /** Custom CSS class */
  class?: string;
  /** Show loading text */
  showText?: boolean;
  /** Custom loading text */
  text?: string;
  /** Full page overlay */
  fullPage?: boolean;
  /** Progress indicator (0-100) */
  progress?: number;
  /** Show progress percentage */
  showProgress?: boolean;
  /** Animation speed in seconds */
  speed?: 'slow' | 'normal' | 'fast';
  /** Inline spinner (no flex centering) */
  inline?: boolean;
}

const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const sizes = {
    xs: '16px',
    sm: '24px',
    md: '32px',
    lg: '48px',
    xl: '64px',
  };

  const getSize = () => {
    if (typeof props.size === 'number') {
      return `${props.size}px`;
    }
    return sizes[props.size || 'md'];
  };

  const getSpeed = () => {
    switch (props.speed) {
      case 'slow': return '2s';
      case 'fast': return '0.6s';
      default: return '1.4s';
    }
  };

  const getColor = () => props.color || 'var(--accent-primary)';

  const renderCircleSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();

    return (
      <div class="loading-spinner-container" style={{
        width: size,
        height: size,
        position: 'relative'
      }}>
        <svg class="loading-spinner" viewBox="0 0 50 50" style={{ width: size, height: size }}>
          <circle
            class="loading-spinner-circle"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke={color}
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="80 50"
            style={{
              animation: `spin ${speed} linear infinite`,
            }}
          />
        </svg>
      </div>
    );
  };

  const renderDotsSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    const dotSize = parseInt(size) / 4;

    return (
      <div class="flex items-center justify-center gap-1" style={{ width: size, height: size }}>
        {[0, 1, 2].map((i) => (
          <div
            class="rounded-full"
            style={{
              width: `${dotSize}px`,
              height: `${dotSize}px`,
              background: color,
              animation: `pulse ${speed} ease-in-out infinite ${i * 0.15}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    );
  };

  const renderBarsSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    const barWidth = parseInt(size) / 5;
    const barHeight = parseInt(size) * 0.6;

    return (
      <div class="flex items-end justify-center gap-1" style={{ width: size, height: size }}>
        {[0, 1, 2].map((i) => (
          <div
            class="rounded-sm"
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
              background: color,
              animation: `scale-up ${speed} ease-in-out infinite ${i * 0.15}s`,
              opacity: 0.6,
              'transform-origin': 'bottom center',
            }}
          />
        ))}
      </div>
    );
  };

  const renderPulseSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();

    return (
      <div
        class="rounded-full"
        style={{
          width: size,
          height: size,
          background: color,
          animation: `pulse ${speed} ease-in-out infinite`,
          opacity: 0.7,
        }}
      />
    );
  };

  const renderRingSpinner = () => {
    const size = getSize();
    const speed = getSpeed();
    const color = getColor();
    const ringSize = parseInt(size);

    return (
      <div class="relative" style={{ width: size, height: size }}>
        <div
          class="absolute inset-0 rounded-full border-4 border-transparent"
          style={{
            'border-top-color': color,
            'border-right-color': color,
            animation: `spin ${speed} linear infinite`,
          }}
        />
        <div
          class="absolute inset-2 rounded-full border-4 border-transparent"
          style={{
            'border-bottom-color': color,
            'border-left-color': color,
            animation: `spin ${speed} linear infinite reverse`,
          }}
        />
      </div>
    );
  };

  const renderSpinner = () => {
    switch (props.type) {
      case 'dots': return renderDotsSpinner();
      case 'bars': return renderBarsSpinner();
      case 'pulse': return renderPulseSpinner();
      case 'ring': return renderRingSpinner();
      default: return renderCircleSpinner();
    }
  };

  const renderProgress = () => {
    if (props.progress === undefined) return null;

    const size = getSize();
    const color = getColor();
    const numericSize = parseInt(size);
    const strokeWidth = 4;
    const radius = (numericSize / 2) - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (props.progress / 100) * circumference;

    return (
      <div class="relative" style={{ width: size, height: size }}>
        <svg class="absolute inset-0" viewBox={`0 0 ${numericSize} ${numericSize}`}>
          {/* Background circle */}
          <circle
            cx={numericSize / 2}
            cy={numericSize / 2}
            r={radius}
            fill="none"
            stroke="var(--border-color)"
            stroke-width={strokeWidth}
            stroke-linecap="round"
          />
          {/* Progress circle */}
          <circle
            cx={numericSize / 2}
            cy={numericSize / 2}
            r={radius}
            fill="none"
            stroke={color}
            stroke-width={strokeWidth}
            stroke-linecap="round"
            stroke-dasharray={`${circumference}`}
            stroke-dashoffset={offset}
            transform={`rotate(-90 ${numericSize / 2} ${numericSize / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>
        <Show when={props.showProgress}>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-xs font-semibold" style={{ color }}>
              {Math.round(props.progress)}%
            </span>
          </div>
        </Show>
      </div>
    );
  };

  const spinnerContent = () => {
    if (props.progress !== undefined) {
      return renderProgress();
    }
    return renderSpinner();
  };

  const containerClass = () => {
    const classes = [];
    if (!props.inline) {
      classes.push('flex items-center justify-center');
    }
    if (props.class) {
      classes.push(props.class);
    }
    return classes.join(' ');
  };

  const content = (
    <div class={containerClass()} style={{ gap: '8px' }}>
      {spinnerContent()}
      <Show when={props.showText || props.text}>
        <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {props.text || 'Loading...'}
        </div>
      </Show>
    </div>
  );

  if (props.fullPage) {
    return (
      <div
        class="fixed inset-0 flex items-center justify-center z-50"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          'backdrop-filter': 'blur(4px)',
        }}
      >
        <div
          class="flex flex-col items-center gap-4 p-8 rounded-xl"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            'box-shadow': '0 20px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Add CSS animations to global styles if not already present
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.1); opacity: 1; }
  }
  
  @keyframes scale-up {
    0%, 100% { transform: scaleY(0.6); opacity: 0.6; }
    50% { transform: scaleY(1); opacity: 1; }
  }
`;

// Only add if not already present
if (!document.querySelector('style[data-loading-spinner]')) {
  style.setAttribute('data-loading-spinner', 'true');
  document.head.appendChild(style);
}

export default LoadingSpinner;
