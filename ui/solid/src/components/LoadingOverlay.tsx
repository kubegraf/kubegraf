import { Component, Show, JSX } from 'solid-js';

interface LoadingOverlayProps {
  isLoading: () => boolean;
  children: JSX.Element;
  showLastKnownState?: boolean;
  lastKnownState?: JSX.Element;
}

/**
 * Loading overlay component
 * Shows a subtle overlay when loading, optionally preserving last-known state
 */
export const LoadingOverlay: Component<LoadingOverlayProps> = (props) => {
  const showLastKnownState = () => props.showLastKnownState ?? true;
  const lastKnownState = () => props.lastKnownState;

  return (
    <div class="relative">
      {/* Content - always rendered */}
      {props.children}

      {/* Loading overlay */}
      <Show when={props.isLoading()}>
        <div
          class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
          style={{
            background: 'rgba(0, 0, 0, 0.1)',
            'backdrop-filter': 'blur(1px)',
          }}
        >
          {/* Subtle loading indicator */}
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div class="spinner" style={{ width: '16px', height: '16px' }} />
            <span class="text-xs" style={{ color: 'var(--text-secondary)' }}>Updating...</span>
          </div>
        </div>
      </Show>

      {/* Last known state overlay (when loading and showLastKnownState is true) */}
      <Show when={props.isLoading() && showLastKnownState() && lastKnownState()}>
        <div class="absolute inset-0 z-5 pointer-events-none opacity-50">
          {lastKnownState()}
        </div>
      </Show>
    </div>
  );
};

