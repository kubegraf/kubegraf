/**
 * Service Ports List Component
 * 
 * Displays service ports with Forward buttons
 */

import { Component, For } from 'solid-js';
import { ServicePort } from './ServicePortForwardModal';

interface ServicePortsListProps {
  serviceName: string;
  ports: ServicePort[];
  onForward: (port: ServicePort) => void;
}

const ServicePortsList: Component<ServicePortsListProps> = (props) => {
  const formatPort = (port: ServicePort): string => {
    let portStr = `${port.port}`;
    if (typeof port.targetPort === 'number' && port.targetPort !== port.port) {
      portStr += `:${port.targetPort}`;
    } else if (typeof port.targetPort === 'string') {
      portStr += `:${port.targetPort}`;
    }
    if (port.nodePort && port.nodePort > 0) {
      portStr += `:${port.nodePort}`;
    }
    portStr += `/${port.protocol}`;
    return portStr;
  };

  return (
    <div class="space-y-2">
      <For each={props.ports}>
        {(port) => (
          <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div class="flex-1">
              <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {port.name || `Port ${port.port}`}
              </div>
              <div class="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {formatPort(port)}
              </div>
            </div>
            <button
              onClick={() => props.onForward(port)}
              class="px-4 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-80"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              Forward
            </button>
          </div>
        )}
      </For>
    </div>
  );
};

export default ServicePortsList;

