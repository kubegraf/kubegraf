import { Component, createSignal, createEffect, onCleanup, Show, onMount } from 'solid-js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { logger } from '../utils/logger';

interface LocalTerminalProps {
  // Optional: if provided, will be called when terminal is ready
  onReady?: () => void;
  // Optional: preferred shell to use (e.g., "powershell.exe", "bash.exe", "wsl.exe")
  preferredShell?: string;
}

// Detect if the client is running on Windows
const isWindows = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  return platform.includes('win') || userAgent.includes('windows');
};

const LocalTerminal: Component<LocalTerminalProps> = (props) => {
  const [connected, setConnected] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isWindowsPlatform] = createSignal(isWindows());
  let ws: WebSocket | null = null;
  let terminalContainer: HTMLDivElement | undefined;
  let term: any = null;
  let fitAddon: any = null;

  const initializeTerminal = () => {
    if (!terminalContainer || term) {
      console.log('Terminal init skipped - container:', !!terminalContainer, 'term:', !!term);
      return;
    }

    console.log('Initializing terminal...');
    try {
      term = new Terminal({
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          cursorAccent: '#0d1117',
          selection: 'rgba(88, 166, 255, 0.3)',
          black: '#484f58',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#b1bac4',
        },
        fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Fira Code", monospace',
        fontSize: 13,
        cursorBlink: true,
        cursorStyle: 'bar',
      });

      console.log('Terminal created:', term);

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalContainer);
      console.log('Terminal opened in container, element:', term.element);
      
      // Fit terminal to container
      setTimeout(() => {
        fitAddon?.fit();
        // Focus the terminal element directly
        if (term.element) {
          (term.element as HTMLElement).focus();
          (term.element as HTMLElement).setAttribute('tabindex', '0');
        }
        term.focus();
        console.log('Terminal fitted and focused, activeElement:', document.activeElement);
        if (props.onReady) {
          props.onReady();
        }
      }, 100);

      // Setup input handler IMMEDIATELY after terminal is created
      term.onData((data: string) => {
        console.log('TERMINAL INPUT CAPTURED:', data, 'char codes:', Array.from(data).map(c => c.charCodeAt(0)));
        if (ws && ws.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({ type: 'input', data: data });
          console.log('Sending to WebSocket:', message);
          ws.send(message);
        } else {
          console.warn('WebSocket not ready, state:', ws?.readyState);
        }
      });
      console.log('Input handler attached to terminal');
      
      // Also add a direct keyboard listener as backup
      if (terminalContainer) {
        const handleKeyDown = (e: KeyboardEvent) => {
          console.log('Direct keydown on container:', e.key, 'code:', e.code);
          // Let xterm handle it, but ensure it's focused
          if (term && !term.element?.contains(document.activeElement)) {
            term.focus();
          }
        };
        terminalContainer.addEventListener('keydown', handleKeyDown);
        // Store cleanup
        (terminalContainer as any)._keydownHandler = handleKeyDown;
      }
    } catch (err) {
      console.error('Failed to initialize terminal:', err);
      setError(`Failed to load terminal: ${err}`);
    }
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Add shell preference to query string if provided
    const shellParam = props.preferredShell ? `?shell=${encodeURIComponent(props.preferredShell)}` : '';
    const wsUrl = `${protocol}//${window.location.host}/api/local/terminal${shellParam}`;

    console.log('Connecting to WebSocket:', wsUrl);
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected!');
        setConnected(true);
        setError(null);
        if (term) {
          term.write('\r\n\x1b[32mConnected to local terminal\x1b[0m\r\n\r\n');
          
          // Send initial resize
          if (fitAddon) {
            fitAddon.fit();
            ws?.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
          }
          
          // Focus terminal after connection
          setTimeout(() => {
            term.focus();
            console.log('Terminal focused after connection, element:', term.element);
          }, 100);
        }
      };

      ws.onmessage = (event) => {
        if (term) {
          term.write(event.data);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection failed');
        setConnected(false);
        if (term) {
          term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setConnected(false);
        if (term) {
          term.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n');
        }
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setError(`Failed to connect: ${e}`);
    }
  };

  onMount(() => {
    // Check if Windows platform before initializing
    if (isWindowsPlatform()) {
      logger.warn('LocalTerminal', 'Windows platform detected - terminal not supported via WebSocket');
      setError('windows-not-supported');
      return;
    }

    // Initialize terminal when component mounts
    setTimeout(() => {
      initializeTerminal();
      // Connect WebSocket after terminal is initialized
      setTimeout(() => {
        connectWebSocket();
      }, 200);
    }, 100);

    // Handle window resize
    const handleResize = () => {
      if (fitAddon && term) {
        fitAddon.fit();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  onCleanup(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (term) {
      term.dispose();
      term = null;
    }
    // Cleanup direct keyboard listener
    if (terminalContainer && (terminalContainer as any)._keydownHandler) {
      terminalContainer.removeEventListener('keydown', (terminalContainer as any)._keydownHandler);
      delete (terminalContainer as any)._keydownHandler;
    }
    fitAddon = null;
    setConnected(false);
    setError(null);
  });

  return (
    <div class="flex flex-col h-full" style={{ height: '100%' }}>
      {/* Status bar */}
      <div class="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
        <span
          class={`w-2 h-2 rounded-full ${connected() ? 'bg-green-500' : 'bg-red-500'}`}
        />
        <span style={{ color: 'var(--text-secondary)' }} class="text-sm">
          {connected() ? 'Connected' : 'Disconnected'}
        </span>
        <span style={{ color: 'var(--text-muted)' }} class="text-sm ml-auto">
          {props.preferredShell ? `Shell: ${props.preferredShell}` : 'Local System Terminal'}
        </span>
      </div>

      {/* Error message */}
      <Show when={error() && error() !== 'windows-not-supported'}>
        <div class="mb-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)' }}>
          {error()}
        </div>
      </Show>

      {/* Windows not supported message */}
      <Show when={error() === 'windows-not-supported'}>
        <div class="flex-1 flex flex-col items-center justify-center p-6 rounded-lg" style={{ background: '#0d1117', border: '1px solid var(--border-color)' }}>
          <div class="max-w-2xl text-center space-y-4">
            {/* Warning Icon */}
            <div class="flex justify-center mb-4">
              <svg class="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 class="text-xl font-semibold text-white">
              Interactive Terminal Not Available on Windows
            </h3>

            {/* Explanation */}
            <p class="text-gray-400 text-sm">
              Windows does not support interactive terminal sessions via WebSocket due to fundamental limitations
              with Windows pipes (no PTY support). Interactive shells require a pseudo-terminal (PTY), which is
              available on Unix-like systems but not in the Windows standard library.
            </p>

            {/* Alternative Solutions */}
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-left space-y-3">
              <h4 class="text-sm font-semibold text-blue-400 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Alternative Solutions
              </h4>
              <ul class="text-sm text-gray-300 space-y-2 list-disc list-inside">
                <li>Use Windows Terminal or PowerShell directly on your system</li>
                <li>Use WSL (Windows Subsystem for Linux) for a full Linux terminal experience</li>
                <li>For Kubernetes operations, use the pod terminal feature (works on all platforms)</li>
                <li>Run commands via the execution panel in other parts of the application</li>
              </ul>
            </div>

            {/* Technical Details Link */}
            <details class="text-left">
              <summary class="text-sm text-cyan-400 cursor-pointer hover:text-cyan-300">
                Technical Details (for developers)
              </summary>
              <div class="mt-2 text-xs text-gray-400 space-y-2 bg-gray-900/50 p-3 rounded border border-gray-700">
                <p><strong>Why this limitation exists:</strong></p>
                <ul class="list-disc list-inside space-y-1 ml-2">
                  <li>Windows PowerShell/CMD buffer output when stdout is a pipe (4KB buffer)</li>
                  <li>Shells disable echo in pipe mode, causing no input feedback</li>
                  <li>ANSI colors are not emitted to pipes</li>
                  <li>Control signals (Ctrl+C) don't work through pipes</li>
                </ul>
                <p class="mt-2"><strong>Potential future solution:</strong></p>
                <p class="ml-2">ConPTY (Windows 10 1809+) could provide PTY support, but requires external dependencies and is not yet implemented.</p>
              </div>
            </details>
          </div>
        </div>
      </Show>

      {/* Terminal container - only show when not Windows */}
      <Show when={!isWindowsPlatform()}>
        <div
          ref={terminalContainer}
          class="flex-1 rounded-lg overflow-hidden"
          data-terminal="true"
          tabindex="0"
          style={{
            background: '#0d1117',
            border: '1px solid var(--border-color)',
            padding: '8px',
            minHeight: '500px',
            height: '100%',
            outline: 'none',
          }}
          onClick={(e) => {
            console.log('Container clicked, focusing terminal...');
            e.stopPropagation();
            if (term) {
              term.focus();
              // Also focus the container
              terminalContainer?.focus();
              console.log('Terminal focused, element:', term.element, 'activeElement:', document.activeElement);
            }
          }}
          onKeyDown={(e) => {
            console.log('Container keydown:', e.key, 'target:', e.target);
            // Let xterm handle it
            e.stopPropagation();
          }}
        />
      </Show>
    </div>
  );
};

export default LocalTerminal;

