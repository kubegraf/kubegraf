import { Component, createSignal, Show } from 'solid-js';
import LocalTerminal from '../components/LocalTerminal';
import ShellSelector from '../components/ShellSelector';

const TerminalPage: Component = () => {
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [selectedShell, setSelectedShell] = createSignal<string | undefined>(undefined);
  const [key, setKey] = createSignal(0); // Force re-render of terminal when shell changes

  const handleShellChange = (shellName: string) => {
    setSelectedShell(shellName);
    // Increment key to force terminal to reconnect with new shell
    setKey(prev => prev + 1);
  };

  const handleOpenInNewWindow = () => {
    console.log('[Terminal] Open in new window clicked');
    // Open terminal in a new window
    const currentUrl = window.location.origin + window.location.pathname;
    const terminalUrl = `${currentUrl}#terminal`;
    console.log('[Terminal] Opening URL:', terminalUrl);
    const newWindow = window.open(terminalUrl, '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    if (newWindow) {
      newWindow.focus();
    } else {
      console.error('[Terminal] Failed to open new window - popup blocked?');
    }
  };

  const containerHeight = () => isMaximized() ? 'calc(100vh - 80px)' : 'calc(100vh - 120px)';

  return (
    <div class="flex flex-col h-full" style={{ height: containerHeight() }}>
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <div class="flex-1">
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Terminal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Local system terminal</p>
        </div>

        {/* Shell Selector */}
        <div class="flex items-center mr-4">
          <ShellSelector selectedShell={selectedShell()} onShellChange={handleShellChange} />
        </div>

        {/* Action buttons */}
        <div class="flex items-center gap-2" style={{ 'z-index': '10', position: 'relative' }}>
          {/* Open in New Window */}
          <button
            onClick={handleOpenInNewWindow}
            class="p-2 rounded transition-colors"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              'pointer-events': 'auto'
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
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={() => {
              console.log('[Terminal] Maximize clicked, current state:', isMaximized());
              setIsMaximized(!isMaximized());
              console.log('[Terminal] New state:', !isMaximized());
            }}
            class="p-2 rounded transition-colors"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              'pointer-events': 'auto'
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
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              }
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Show>
          </button>
        </div>
      </div>

      {/* Terminal component - key forces re-render when shell changes */}
      <LocalTerminal key={key()} preferredShell={selectedShell()} />
    </div>
  );
};

export default TerminalPage;

