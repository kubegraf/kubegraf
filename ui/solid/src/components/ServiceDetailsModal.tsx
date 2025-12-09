/**
 * Service Details Modal Component
 * 
 * Shows comprehensive service details including metadata, spec, and status
 */

import { Component, For, Show, createSignal, createEffect } from 'solid-js';
import Modal from './Modal';
import { ServicePort } from './ServicePortForwardModal';
import ServicePortForwardModal from './ServicePortForwardModal';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';

export interface ServiceDetails {
  name: string;
  namespace: string;
  created: string;
  createdTimestamp: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  finalizers: string[];
  selector: Record<string, string>;
  type: string;
  sessionAffinity: string;
  clusterIP: string;
  clusterIPs: string[];
  ipFamilies: string[];
  ipFamilyPolicy: string;
  externalIPs: string[];
  ports: ServicePort[];
  endpoints: Array<{ name: string; addresses: string[] }>;
}

interface ServiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  serviceNamespace: string;
  onPortForward?: (port: ServicePort) => void;
  onPortForwardChange?: () => void; // Callback to notify parent of port forward changes
}

const ServiceDetailsModal: Component<ServiceDetailsModalProps> = (props) => {
  const [details, setDetails] = createSignal<ServiceDetails | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [selectedPort, setSelectedPort] = createSignal<ServicePort | null>(null);
  const [showPortForward, setShowPortForward] = createSignal(false);
  const [portForwards, setPortForwards] = createSignal<any[]>([]);

  // Fetch service details
  createEffect(async () => {
    if (props.isOpen && props.serviceName) {
      setLoading(true);
      try {
        const data = await api.getServiceDetails(props.serviceName, props.serviceNamespace);
        setDetails(data as any);
        
        // Fetch active port forwards
        const pfs = await api.listPortForwards();
        setPortForwards(pfs || []);
      } catch (error) {
        console.error('Failed to fetch service details:', error);
        addNotification('Failed to load service details', 'error');
      } finally {
        setLoading(false);
      }
    }
  });

  const formatLabels = (labels: Record<string, string>): string => {
    return Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(' ');
  };

  const formatSelector = (selector: Record<string, string>): string => {
    return Object.entries(selector).map(([k, v]) => `${k}=${v}`).join(' ');
  };

  const formatPort = (port: ServicePort): string => {
    let portStr = `${port.port}`;
    if (typeof port.targetPort === 'number' && port.targetPort !== port.port) {
      portStr += `:${port.targetPort}`;
    } else if (typeof port.targetPort === 'string') {
      portStr += `:${port.targetPort}`;
    }
    if (port.nodePort && port.nodePort > 0) {
      portStr = `${port.nodePort}:${portStr}`;
    }
    portStr += `/${port.protocol}`;
    return portStr;
  };

  const isPortForwarded = (port: ServicePort): boolean => {
    const remotePort = typeof port.targetPort === 'number' ? port.targetPort : port.port;
    return portForwards().some(pf => 
      pf.name === props.serviceName && 
      pf.namespace === props.serviceNamespace &&
      pf.remotePort === remotePort
    );
  };

  const getPortForward = (port: ServicePort) => {
    const remotePort = typeof port.targetPort === 'number' ? port.targetPort : port.port;
    return portForwards().find(pf => 
      pf.name === props.serviceName && 
      pf.namespace === props.serviceNamespace &&
      pf.remotePort === remotePort
    );
  };

  const handlePortForward = (port: ServicePort) => {
    setSelectedPort(port);
    setShowPortForward(true);
  };

  const handleStopPortForward = async (port: ServicePort) => {
    const pf = getPortForward(port);
    if (pf) {
      try {
        await api.stopPortForward(pf.id);
        addNotification('Port forward stopped', 'success');
        const pfs = await api.listPortForwards();
        setPortForwards(pfs || []);
        
        // Notify parent to refresh its port forwards list
        if (props.onPortForwardChange) {
          props.onPortForwardChange();
        }
      } catch (error) {
        console.error('Failed to stop port forward:', error);
        addNotification('Failed to stop port forward', 'error');
      }
    }
  };

  const handleStartPortForward = async (localPort: number, remotePort: number, openInBrowser: boolean) => {
    try {
      await api.startPortForward('service', props.serviceName, props.serviceNamespace, localPort, remotePort);
      addNotification(`Port forward started: localhost:${localPort} → ${props.serviceName}:${remotePort}`, 'success');
      setShowPortForward(false);
      setSelectedPort(null);
      
      const pfs = await api.listPortForwards();
      setPortForwards(pfs || []);
      
      if (openInBrowser) {
        setTimeout(() => {
          window.open(`http://localhost:${localPort}`, '_blank');
        }, 500);
      }
    } catch (error) {
      console.error('Failed to start port forward:', error);
      addNotification('Failed to start port forward', 'error');
    }
  };

  const serviceDetails = () => details();

  return (
    <>
      <Modal isOpen={props.isOpen} onClose={props.onClose} title={`Service: ${props.serviceName}`} size="xl">
        <Show when={!loading()} fallback={<div class="flex items-center justify-center p-8">Loading...</div>}>
          <Show when={serviceDetails()}>
            {(svc) => (
              <div class="space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Created */}
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Created</div>
                    <div class="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {svc().created}
                    </div>
                    <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {svc().createdTimestamp}
                    </div>
                  </div>
                </div>

                {/* Name and Namespace */}
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Name</div>
                    <div class="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{svc().name}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                    <div class="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{svc().namespace}</div>
                  </div>
                </div>

                {/* Labels */}
                <Show when={Object.keys(svc().labels || {}).length > 0}>
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Labels</div>
                    <div class="text-sm font-mono break-all" style={{ color: 'var(--text-primary)' }}>
                      {formatLabels(svc().labels)}
                    </div>
                  </div>
                </Show>

                {/* Annotations */}
                <Show when={Object.keys(svc().annotations || {}).length > 0}>
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Annotations</div>
                    <div class="text-sm font-mono break-all whitespace-pre-wrap" style={{ color: 'var(--text-primary)', 'max-height': '200px', overflow: 'auto' }}>
                      {Object.entries(svc().annotations).map(([k, v]) => `${k}=${v}`).join('\n')}
                    </div>
                  </div>
                </Show>

                {/* Finalizers */}
                <Show when={(svc().finalizers || []).length > 0}>
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Finalizers</div>
                    <div class="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {svc().finalizers.join(', ')}
                    </div>
                  </div>
                </Show>

                {/* Selector */}
                <Show when={Object.keys(svc().selector || {}).length > 0}>
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Selector</div>
                    <div class="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatSelector(svc().selector)}
                    </div>
                  </div>
                </Show>

                {/* Type and Session Affinity */}
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Type</div>
                    <div class="text-sm" style={{ color: 'var(--text-primary)' }}>{svc().type}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Session Affinity</div>
                    <div class="text-sm" style={{ color: 'var(--text-primary)' }}>{svc().sessionAffinity || 'None'}</div>
                  </div>
                </div>

                {/* Connection */}
                <div>
                  <div class="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Connection</div>
                  <div class="space-y-1 pl-4">
                    <div class="text-sm">
                      <span class="font-semibold" style={{ color: 'var(--text-muted)' }}>Cluster IP:</span>
                      <span class="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{svc().clusterIP}</span>
                    </div>
                    <Show when={(svc().clusterIPs || []).length > 0}>
                      <div class="text-sm">
                        <span class="font-semibold" style={{ color: 'var(--text-muted)' }}>Cluster IPs:</span>
                        <span class="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{svc().clusterIPs.join(', ')}</span>
                      </div>
                    </Show>
                    <Show when={(svc().ipFamilies || []).length > 0}>
                      <div class="text-sm">
                        <span class="font-semibold" style={{ color: 'var(--text-muted)' }}>IP families:</span>
                        <span class="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{svc().ipFamilies.join(', ')}</span>
                      </div>
                    </Show>
                    <Show when={svc().ipFamilyPolicy}>
                      <div class="text-sm">
                        <span class="font-semibold" style={{ color: 'var(--text-muted)' }}>IP family policy:</span>
                        <span class="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{svc().ipFamilyPolicy}</span>
                      </div>
                    </Show>
                    <Show when={(svc().externalIPs || []).length > 0}>
                      <div class="text-sm">
                        <span class="font-semibold" style={{ color: 'var(--text-muted)' }}>External IPs:</span>
                        <span class="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{svc().externalIPs.join(', ')}</span>
                      </div>
                    </Show>
                  </div>
                </div>

                {/* Ports */}
                <div>
                  <div class="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Ports</div>
                  <div class="space-y-2">
                    <For each={svc().ports || []}>
                      {(port) => {
                        const isForwarded = isPortForwarded(port);
                        const pf = getPortForward(port);
                        return (
                          <div class="flex items-center justify-between px-3 py-2 rounded border" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                            <div class="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                              {formatPort(port)}
                            </div>
                            <Show 
                              when={isForwarded && pf}
                              fallback={
                                <button
                                  onClick={() => handlePortForward(port)}
                                  class="px-3 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                                >
                                  Port Forward
                                </button>
                              }
                            >
                              <button
                                onClick={() => handleStopPortForward(port)}
                                class="px-3 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                              >
                                Stop/Remove
                              </button>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </div>

                {/* Endpoints */}
                <Show when={(svc().endpoints || []).length > 0}>
                  <div>
                    <div class="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Endpoint</div>
                    <div class="space-y-1">
                      <For each={svc().endpoints}>
                        {(endpoint) => (
                          <div class="text-sm">
                            <span class="font-mono" style={{ color: 'var(--text-primary)' }}>{endpoint.name}</span>
                            {endpoint.addresses.length > 0 && (
                              <span class="ml-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                                {endpoint.addresses.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </Show>
      </Modal>

      {/* Port Forward Modal */}
      <ServicePortForwardModal
        isOpen={showPortForward()}
        onClose={() => { setShowPortForward(false); setSelectedPort(null); }}
        serviceName={props.serviceName}
        serviceNamespace={props.serviceNamespace}
        port={selectedPort()}
        onStart={handleStartPortForward}
      />
    </>
  );
};

export default ServiceDetailsModal;

