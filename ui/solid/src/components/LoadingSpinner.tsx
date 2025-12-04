import { Component } from 'solid-js';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullPage?: boolean;
}

const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const sizes = {
    sm: '16px',
    md: '32px',
    lg: '48px',
    xl: '64px',
  };

  const size = sizes[props.size || 'md'];

  const spinner = (
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
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray="80 50"
          style={{
            color: 'var(--accent-primary)',
            animation: 'spin 1.4s linear infinite',
          }}
        />
      </svg>
    </div>
  );

  if (props.fullPage) {
    return (
      <div
        class="fixed inset-0 flex items-center justify-center z-50"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdrop-filter: 'blur(4px)',
        }}
      >
        <div
          class="flex flex-col items-center gap-4 p-8 rounded-xl"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {spinner}
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
