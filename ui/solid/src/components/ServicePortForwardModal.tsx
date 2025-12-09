/**
 * Service Port Forward Modal Component
 * 
 * Simplified port forwarding for a single port
 */

import { Component, Show, createSignal, createEffect } from 'solid-js';
import Modal from './Modal';

export interface ServicePort {
  name: string;
  port: number;
  targetPort: number | string;
  protocol: string;
  nodePort?: number;
}

interface ServicePortForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  serviceNamespace: string;
  port: ServicePort | null;
  onStart: (localPort: number, remotePort: number, openInBrowser: boolean) => void;
}

const ServicePortForwardModal: Component<ServicePortForwardModalProps> = (props) => {
  const [localPort, setLocalPort] = createSignal(0);
  const [openInBrowser, setOpenInBrowser] = createSignal(true);

  // Generate random port when modal opens
  createEffect(() => {
    if (props.isOpen && props.port) {
      // Generate random port between 8000-9000
      const randomPort = Math.floor(Math.random() * 1000) + 8000;
      setLocalPort(randomPort);
    }
  });

  const handleStart = () => {
    if (!props.port) return;
    const remotePort = typeof props.port.targetPort === 'number' ? props.port.targetPort : props.port.port;
    props.onStart(localPort(), remotePort, openInBrowser());
  };

  const port = () => props.port;
  const remotePort = () => {
    const p = port();
    if (!p) return 0;
    return typeof p.targetPort === 'number' ? p.targetPort : p.port;
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Port Forwarding" size="xs">
      <Show when={port()}>
        <div class="space-y-3">
          <div class="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
            Port Forwarding for <span class="font-semibold">{props.serviceName}</span>
          </div>
          
          <div>
            <label class="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Local port to forward from:
            </label>
            <div class="flex items-center gap-2">
              <input
                type="number"
                min="1024"
                max="65535"
                value={localPort()}
                onInput={(e) => setLocalPort(parseInt(e.currentTarget.value) || 8080)}
                class="flex-1 px-3 py-2 rounded text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
              <button
                onClick={() => setLocalPort(Math.floor(Math.random() * 1000) + 8000)}
                class="px-3 py-2 rounded text-xs"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                Random
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="openInBrowser"
              checked={openInBrowser()}
              onChange={(e) => setOpenInBrowser(e.currentTarget.checked)}
              class="w-4 h-4 rounded"
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            <label for="openInBrowser" class="text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              Open in Browser
            </label>
          </div>

          <div class="text-xs px-2 py-1.5 rounded text-center" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            <span class="font-mono text-blue-400">localhost:{localPort()}</span> → <span class="font-mono text-green-400">{props.serviceName}:{remotePort()}</span>
          </div>

          <div class="flex gap-3 pt-1">
            <button onClick={props.onClose} class="btn-secondary flex-1 px-4 py-2 text-sm">Cancel</button>
            <button onClick={handleStart} class="btn-primary flex-1 px-4 py-2 text-sm">Start</button>
          </div>
        </div>
      </Show>
    </Modal>
  );
};

export default ServicePortForwardModal;
