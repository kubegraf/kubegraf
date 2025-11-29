import { Component, createSignal, createEffect, onCleanup, Show } from 'solid-js';
import Modal from './Modal';

interface ShellModalProps {
  isOpen: boolean;
  onClose: () => void;
  podName: string;
  namespace: string;
  container?: string;
}

const ShellModal: Component<ShellModalProps> = (props) => {
  const [output, setOutput] = createSignal<string[]>([]);
  const [input, setInput] = createSignal('');
  const [connected, setConnected] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let ws: WebSocket | null = null;
  let outputDiv: HTMLDivElement | undefined;

  createEffect(() => {
    if (props.isOpen && props.podName) {
      connectWebSocket();
    }
    onCleanup(() => {
      if (ws) {
        ws.close();
        ws = null;
      }
    });
  });

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const container = props.container || '';
    const wsUrl = `${protocol}//${window.location.host}/ws/exec?name=${props.podName}&namespace=${props.namespace}&container=${container}`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        setOutput(prev => [...prev, `Connected to ${props.podName}/${props.container || 'default'}\n`]);
      };

      ws.onmessage = (event) => {
        setOutput(prev => [...prev, event.data]);
        // Auto-scroll to bottom
        if (outputDiv) {
          outputDiv.scrollTop = outputDiv.scrollHeight;
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        setOutput(prev => [...prev, '\n[Connection closed]\n']);
      };
    } catch (e) {
      setError(`Failed to connect: ${e}`);
    }
  };

  const sendCommand = (e: Event) => {
    e.preventDefault();
    if (ws && ws.readyState === WebSocket.OPEN && input().trim()) {
      ws.send(input() + '\n');
      setOutput(prev => [...prev, `$ ${input()}\n`]);
      setInput('');
    }
  };

  const handleClose = () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    setOutput([]);
    setConnected(false);
    setError(null);
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title={`Shell: ${props.podName}`} size="xl">
      <div class="flex flex-col h-[60vh]">
        {/* Status bar */}
        <div class="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <span
            class={`w-2 h-2 rounded-full ${connected() ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">
            {connected() ? 'Connected' : 'Disconnected'}
          </span>
          <Show when={props.container}>
            <span style={{ color: 'var(--text-muted)' }} class="text-sm">
              Container: {props.container}
            </span>
          </Show>
        </div>

        {/* Terminal output */}
        <div
          ref={outputDiv}
          class="flex-1 font-mono text-sm p-4 rounded-lg overflow-auto"
          style={{
            background: '#0d1117',
            color: '#c9d1d9',
            'border': '1px solid var(--border-color)',
          }}
        >
          <Show when={error()}>
            <div class="text-red-400 mb-2">{error()}</div>
          </Show>
          <pre class="whitespace-pre-wrap">{output().join('')}</pre>
        </div>

        {/* Input */}
        <form onSubmit={sendCommand} class="mt-2">
          <div class="flex gap-2">
            <input
              type="text"
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              placeholder={connected() ? 'Enter command...' : 'Not connected'}
              disabled={!connected()}
              class="flex-1 px-4 py-2 rounded-lg font-mono text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />
            <button
              type="submit"
              disabled={!connected()}
              class="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                background: connected() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: 'white',
                opacity: connected() ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ShellModal;
