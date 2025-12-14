import { Component, Show, createSignal, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import LocalTerminal from './LocalTerminal';

interface DockedTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DockedTerminal: Component<DockedTerminalProps> = (props) => {
  const [isMaximized, setIsMaximized] = createSignal(false);

  const handleOpenInNewWindow = () => {
    // Open terminal in a new window using current URL with hash
    const currentUrl = window.location.origin + window.location.pathname;
    const terminalUrl = `${currentUrl}#terminal`;
    const newWindow = window.open(terminalUrl, '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    if (newWindow) {
      newWindow.focus();
    }
  };

  const height = isMaximized() ? 'calc(100vh - 60px)' : '400px';

  return (
    <Show when={props.isOpen}>
      <Portal>
      <div
        class="fixed bottom-0 left-0 right-0 transition-all duration-300"
        style={{
          height: height,
          'z-index': '1000',
          background: 'var(--bg-primary)',
          'border-top': '2px solid var(--border-color)',
          'box-shadow': '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          class="flex items-center justify-between px-4 py-2"
          style={{
            background: 'var(--bg-secondary)',
            'border-bottom': '1px solid var(--border-color)',
          }}
        >
          <div class="flex items-center gap-3">
            <svg
              class="w-5 h-5"
              style={{ color: 'var(--accent-primary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Terminal
            </span>
            <span class="text-xs" style={{ color: 'var(--text-secondary)' }}>
              kubectl ready
            </span>
          </div>

          <div class="flex items-center gap-2">
            {/* Open in New Window */}
            <button
              onClick={handleOpenInNewWindow}
              class="p-1.5 rounded transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title="Open in New Window"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            {/* Maximize/Restore */}
            <button
              onClick={() => setIsMaximized(!isMaximized())}
              class="p-1.5 rounded transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title={isMaximized() ? 'Restore' : 'Maximize'}
            >
              <Show
                when={isMaximized()}
                fallback={
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                }
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              </Show>
            </button>

            {/* Close */}
            <button
              onClick={props.onClose}
              class="p-1.5 rounded transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title="Close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Terminal Content - Use LocalTerminal component */}
        <div
          style={{
            height: 'calc(100% - 50px)',
            overflow: 'hidden',
          }}
        >
          <LocalTerminal />
        </div>
      </div>
    </Portal>
    </Show>
  );
};

export default DockedTerminal;
