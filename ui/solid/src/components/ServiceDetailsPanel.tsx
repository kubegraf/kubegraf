/**
 * Service Details Panel Component
 * 
 * Shows comprehensive service details in a side panel view with sections like Brain panel
 */

import { Component, For, Show, createSignal, createEffect } from 'solid-js';
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
  portsDetails?: Array<{
    name?: string;
    port: number;
    targetPort?: number | string;
    protocol: string;
    nodePort?: number;
  }>;
  endpoints: Array<{ name: string; addresses: string[] }>;
}

interface ServiceDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  serviceNamespace: string;
  onPortForwardChange?: () => void;
}

const ServiceDetailsPanel: Component<ServiceDetailsPanelProps> = (props) => {
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
    return Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(', ');
  };

  const formatSelector = (selector: Record<string, string>): string => {
    return Object.entries(selector).map(([k, v]) => `${k}=${v}`).join(', ');
  };

  const formatPort = (port: any): string => {
    const name = port.name ? `${port.name}  ` : '<unset>  ';
    const portNum = port.port || port.portNumber || '';
    const protocol = port.protocol || 'TCP';
    return `${name}${portNum}/${protocol}`;
  };

  const formatTargetPort = (port: any): string => {
    const protocol = port.protocol || 'TCP';
    if (typeof port.targetPort === 'number') {
      return `${port.targetPort}/${protocol}`;
    } else if (typeof port.targetPort === 'string') {
      return `${port.targetPort}/${protocol}`;
    }
    const portNum = port.port || port.portNumber || '';
    return `${portNum}/${protocol}`;
  };

  const formatServiceDetails = (svc: ServiceDetails): string => {
    const lines = [
      `Name: ${svc.name}`,
      `Namespace: ${svc.namespace}`,
      `Labels: ${Object.keys(svc.labels || {}).length > 0 ? formatLabels(svc.labels) : '<none>'}`,
      `Annotations: ${Object.keys(svc.annotations || {}).length > 0 ? Object.entries(svc.annotations).map(([k, v]) => `${k}=${v}`).join(', ') : '<none>'}`,
      `Selector: ${formatSelector(svc.selector)}`,
      `Type: ${svc.type}`,
      `IP Family Policy: ${svc.ipFamilyPolicy || '-'}`,
      `IP Families: ${(svc.ipFamilies || []).join(', ') || '-'}`,
      `IP: ${svc.clusterIP}`,
      `IPs: ${(svc.clusterIPs || []).join(', ') || svc.clusterIP}`,
    ];
    
    // Ports
    const ports = svc.portsDetails || svc.ports || [];
    if (ports.length > 0) {
      ports.forEach((port: any) => {
        lines.push(`Port: ${formatPort(port)}`);
        lines.push(`TargetPort: ${formatTargetPort(port)}`);
      });
    }
    
    // Endpoints
    if (svc.endpoints && svc.endpoints.length > 0) {
      const endpointStrs = svc.endpoints.flatMap(e => e.addresses.map(addr => {
        const port = ports[0];
        if (port) {
          const targetPort = typeof port.targetPort === 'number' ? port.targetPort : (port.port || port.portNumber);
          return `${addr}:${targetPort}`;
        }
        return addr;
      }));
      lines.push(`Endpoints: ${endpointStrs.join(', ')}`);
    } else {
      lines.push(`Endpoints: <none>`);
    }
    
    lines.push(`Session Affinity: ${svc.sessionAffinity || 'None'}`);
    lines.push(`Events: <none>`);
    
    return lines.join('\n');
  };

  const serviceDetails = () => details();

  return (
    <>
      <Show when={props.isOpen}>
        <div class="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            class="flex-1 bg-black/50" 
            onClick={props.onClose}
          />
          
          {/* Side Panel */}
          <div 
            class="w-[600px] overflow-y-auto"
            style={{ 
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border-color)',
              boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div class="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: 'var(--bg-primary)', 'border-color': 'var(--border-color)' }}>
              <div>
                <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Describe: {props.serviceName}
                </h2>
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (serviceDetails()) {
                      const text = `Describe: ${props.serviceName}\n\n${formatServiceDetails(serviceDetails()!)}`;
                      navigator.clipboard.writeText(text);
                      addNotification('Copied to clipboard', 'success');
                    }
                  }}
                  class="px-3 py-1 rounded text-sm font-medium transition-colors hover:opacity-80"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  title="Copy"
                >
                  Copy
                </button>
                <button
                  onClick={props.onClose}
                  class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div class="flex-1 overflow-y-auto p-6 space-y-8" style={{ 
              'scrollbar-width': 'thin',
              'scrollbar-color': 'var(--border-color) var(--bg-primary)'
            }}>
              <Show when={!loading()} fallback={
                <div class="flex items-center justify-center h-64">
                  <div class="text-center">
                    <div class="inline-block w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" style={{ 
                      borderColor: 'var(--accent-primary)',
                      borderTopColor: 'transparent'
                    }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading service details...</p>
                  </div>
                </div>
              }>
                <Show when={serviceDetails()}>
                  {(svc) => {
                    const ports = svc().portsDetails || svc().ports || [];
                    return (
                      <>
                        {/* Basic Information Section */}
                        <div class="space-y-3">
                          <h3 class="text-base font-bold mb-4" style={{ 
                            background: 'var(--accent-gradient)',
                            '-webkit-background-clip': 'text',
                            '-webkit-text-fill-color': 'transparent',
                            'background-clip': 'text'
                          }}>
                            Basic Information
                          </h3>
                          <div class="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Name:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{svc().name}</span>
                            </div>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Namespace:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{svc().namespace}</span>
                            </div>
                          </div>
                        </div>

                        {/* Labels & Annotations Section */}
                        <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                          <h3 class="text-base font-bold mb-4" style={{ 
                            background: 'var(--accent-gradient)',
                            '-webkit-background-clip': 'text',
                            '-webkit-text-fill-color': 'transparent',
                            'background-clip': 'text'
                          }}>
                            Labels & Annotations
                          </h3>
                          <div class="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Labels:</span> 
                              <Show when={Object.keys(svc().labels || {}).length > 0} fallback={
                                <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>&lt;none&gt;</span>
                              }>
                                <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{formatLabels(svc().labels)}</span>
                              </Show>
                            </div>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Annotations:</span> 
                              <Show when={Object.keys(svc().annotations || {}).length > 0} fallback={
                                <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>&lt;none&gt;</span>
                              }>
                                <div class="mt-1 ml-4 break-all" style={{ color: 'var(--text-secondary)' }}>
                                  {Object.entries(svc().annotations).map(([k, v]) => (
                                    <div class="mb-1">{k}={v.length > 100 ? v.substring(0, 100) + '...' : v}</div>
                                  ))}
                                </div>
                              </Show>
                            </div>
                          </div>
                        </div>

                        {/* Selector Section */}
                        <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                          <h3 class="text-base font-bold mb-4" style={{ 
                            background: 'var(--accent-gradient)',
                            '-webkit-background-clip': 'text',
                            '-webkit-text-fill-color': 'transparent',
                            'background-clip': 'text'
                          }}>
                            Selector
                          </h3>
                          <div class="font-mono text-sm" style={{ color: 'var(--text-secondary)', 'line-height': '1.8' }}>
                            {formatSelector(svc().selector)}
                          </div>
                        </div>

                        {/* Service Configuration Section */}
                        <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                          <h3 class="text-base font-bold mb-4" style={{ 
                            background: 'var(--accent-gradient)',
                            '-webkit-background-clip': 'text',
                            '-webkit-text-fill-color': 'transparent',
                            'background-clip': 'text'
                          }}>
                            Service Configuration
                          </h3>
                          <div class="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Type:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{svc().type}</span>
                            </div>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>IP Family Policy:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{svc().ipFamilyPolicy || '-'}</span>
                            </div>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>IP Families:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{(svc().ipFamilies || []).join(', ') || '-'}</span>
                            </div>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Session Affinity:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{svc().sessionAffinity || 'None'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Network Configuration Section */}
                        <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                          <h3 class="text-base font-bold mb-4" style={{ 
                            background: 'var(--accent-gradient)',
                            '-webkit-background-clip': 'text',
                            '-webkit-text-fill-color': 'transparent',
                            'background-clip': 'text'
                          }}>
                            Network Configuration
                          </h3>
                          <div class="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>IP:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{svc().clusterIP}</span>
                            </div>
                            <div>
                              <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>IPs:</span> 
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{(svc().clusterIPs || []).join(', ') || svc().clusterIP}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ports Section */}
                        <Show when={ports.length > 0}>
                          <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                            <h3 class="text-base font-bold mb-4" style={{ 
                              background: 'var(--accent-gradient)',
                              '-webkit-background-clip': 'text',
                              '-webkit-text-fill-color': 'transparent',
                              'background-clip': 'text'
                            }}>
                              Ports
                            </h3>
                            <div class="space-y-3 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                              <For each={ports}>
                                {(port: any) => (
                                  <div class="space-y-1">
                                    <div>
                                      <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Port:</span> 
                                      <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{formatPort(port)}</span>
                                    </div>
                                    <div>
                                      <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>TargetPort:</span> 
                                      <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{formatTargetPort(port)}</span>
                                    </div>
                                  </div>
                                )}
                              </For>
                            </div>
                          </div>
                        </Show>

                        {/* Endpoints Section */}
                        <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                          <h3 class="text-base font-bold mb-4" style={{ 
                            background: 'var(--accent-gradient)',
                            '-webkit-background-clip': 'text',
                            '-webkit-text-fill-color': 'transparent',
                            'background-clip': 'text'
                          }}>
                            Endpoints
                          </h3>
                          <div class="font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                            <Show when={(svc().endpoints || []).length > 0} fallback={
                              <span style={{ color: 'var(--text-muted)' }}>&lt;none&gt;</span>
                            }>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {(svc().endpoints || []).flatMap(e => e.addresses.map(addr => {
                                  const port = ports[0];
                                  if (port) {
                                    const targetPort = typeof port.targetPort === 'number' ? port.targetPort : (port.port || port.portNumber);
                                    return `${addr}:${targetPort}`;
                                  }
                                  return addr;
                                })).join(', ')}
                              </span>
                            </Show>
                          </div>
                        </div>

                        {/* Events Section */}
                        <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                          <h3 class="text-base font-bold mb-4" style={{ 
                            background: 'var(--accent-gradient)',
                            '-webkit-background-clip': 'text',
                            '-webkit-text-fill-color': 'transparent',
                            'background-clip': 'text'
                          }}>
                            Events
                          </h3>
                          <div class="font-mono text-sm" style={{ color: 'var(--text-muted)', 'line-height': '1.8' }}>
                            &lt;none&gt;
                          </div>
                        </div>
                      </>
                    );
                  }}
                </Show>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* Port Forward Modal */}
      <ServicePortForwardModal
        isOpen={showPortForward()}
        onClose={() => { setShowPortForward(false); setSelectedPort(null); }}
        serviceName={props.serviceName}
        serviceNamespace={props.serviceNamespace}
        port={selectedPort()}
        onStart={async (localPort: number, remotePort: number, openInBrowser: boolean) => {
          try {
            await api.startPortForward('service', props.serviceName, props.serviceNamespace, localPort, remotePort);
            addNotification(`Port forward started: localhost:${localPort} → ${props.serviceName}:${remotePort}`, 'success');
            setShowPortForward(false);
            setSelectedPort(null);
            
            const pfs = await api.listPortForwards();
            setPortForwards(pfs || []);
            
            if (props.onPortForwardChange) {
              props.onPortForwardChange();
            }
            
            if (openInBrowser) {
              setTimeout(() => {
                window.open(`http://localhost:${localPort}`, '_blank');
              }, 500);
            }
          } catch (error) {
            console.error('Failed to start port forward:', error);
            addNotification('Failed to start port forward', 'error');
          }
        }}
      />
    </>
  );
};

export default ServiceDetailsPanel;
