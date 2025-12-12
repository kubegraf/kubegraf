import { Component, Show, createSignal, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

interface DockedTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DockedTerminal: Component<DockedTerminalProps> = (props) => {
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [command, setCommand] = createSignal('');
  const [output, setOutput] = createSignal<string[]>([
    'KubeGraf Terminal v1.3.0',
    'Type "help" for available commands',
    ''
  ]);
  const [history, setHistory] = createSignal<string[]>([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);

  let inputRef: HTMLInputElement | undefined;
  let outputRef: HTMLDivElement | undefined;

  onMount(() => {
    if (props.isOpen && inputRef) {
      inputRef.focus();
    }
  });

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    // Add to history
    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Add command to output
    setOutput(prev => [...prev, `$ ${cmd}`, '']);

    // Simple command handling (expand this with real kubectl commands)
    if (cmd === 'help') {
      setOutput(prev => [...prev,
        'Available commands:',
        '  kubectl <args>  - Execute kubectl commands',
        '  clear          - Clear terminal',
        '  help           - Show this help',
        ''
      ]);
    } else if (cmd === 'clear') {
      setOutput(['KubeGraf Terminal v1.3.0', 'Type "help" for available commands', '']);
    } else if (cmd.startsWith('kubectl')) {
      // Send to backend API
      try {
        const response = await fetch('/api/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });

        if (response.ok) {
          const data = await response.json();
          setOutput(prev => [...prev, data.output || 'Command executed', '']);
        } else {
          setOutput(prev => [...prev, 'Error: Failed to execute command', '']);
        }
      } catch (error) {
        setOutput(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, '']);
      }
    } else {
      setOutput(prev => [...prev, `Command not found: ${cmd}`, 'Type "help" for available commands', '']);
    }

    // Scroll to bottom
    setTimeout(() => {
      if (outputRef) {
        outputRef.scrollTop = outputRef.scrollHeight;
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(command());
      setCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const hist = history();
      if (hist.length > 0) {
        const newIndex = historyIndex() === -1 ? hist.length - 1 : Math.max(0, historyIndex() - 1);
        setHistoryIndex(newIndex);
        setCommand(hist[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const hist = history();
      if (historyIndex() !== -1) {
        const newIndex = historyIndex() + 1;
        if (newIndex >= hist.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(hist[newIndex]);
        }
      }
    }
  };

  console.log('[DockedTerminal] Render called - isOpen:', props.isOpen);

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
            {/* Maximize/Restore */}
            <button
              onClick={() => setIsMaximized(!isMaximized())}
              class="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title={isMaximized() ? 'Restore' : 'Maximize'}
            >
              <Show
                when={isMaximized()}
                fallback={
                  <svg class="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                }
              >
                <svg class="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              </Show>
            </button>

            {/* Close */}
            <button
              onClick={props.onClose}
              class="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title="Close"
            >
              <svg class="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={outputRef}
          class="overflow-y-auto p-4 font-mono text-sm"
          style={{
            height: 'calc(100% - 100px)',
            background: '#0d1117',
            color: '#c9d1d9',
          }}
        >
          {output().map((line, index) => (
            <div
              key={index}
              style={{
                color: line.startsWith('$') ? '#58a6ff' : line.startsWith('Error') ? '#f85149' : '#c9d1d9',
                'margin-bottom': '4px',
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Input */}
        <div
          class="flex items-center gap-2 px-4 py-3"
          style={{
            background: '#161b22',
            'border-top': '1px solid var(--border-color)',
          }}
        >
          <span class="text-sm font-mono" style={{ color: '#58a6ff' }}>$</span>
          <input
            ref={inputRef}
            type="text"
            value={command()}
            onInput={(e) => setCommand(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (e.g., kubectl get pods)"
            class="flex-1 bg-transparent font-mono text-sm outline-none"
            style={{
              color: '#c9d1d9',
              border: 'none',
            }}
            autocomplete="off"
          />
        </div>
      </div>
    </Portal>
    </Show>
  );
};

export default DockedTerminal;
