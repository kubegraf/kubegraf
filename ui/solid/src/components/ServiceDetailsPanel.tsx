/**
 * Service Details Panel Component
 *
 * Shows comprehensive service details in a centrally aligned modal like Deployments
 */

import { Component, For, Show, createSignal, createEffect, createResource } from 'solid-js';
import { ServicePort } from './ServicePortForwardModal';
import ServicePortForwardModal from './ServicePortForwardModal';
import Modal from './Modal';
import YAMLViewer from './YAMLViewer';
import YAMLEditor from './YAMLEditor';
import CommandPreview from './CommandPreview';
import DescribeModal from './DescribeModal';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';
import { clusterStatus } from '../stores/cluster';
import { startExecution } from '../stores/executionPanel';

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
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);

  // Fetch YAML when the view or edit modal is shown
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && props.serviceName ? { name: props.serviceName, ns: props.serviceNamespace } : null,
    async (params) => {
      if (!params) return '';
      try {
        const data = await api.getServiceYAML(params.name, params.ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch service YAML:', error);
        return '';
      }
    }
  );

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

  const getRemotePort = (port: any): number => {
    if (typeof port.targetPort === 'number') {
      return port.targetPort;
    }
    return port.port || port.portNumber || 0;
  };

  const isPortForwarded = (port: any): boolean => {
    const remotePort = getRemotePort(port);
    return portForwards().some((pf) =>
      pf.name === props.serviceName &&
      pf.namespace === props.serviceNamespace &&
      pf.remotePort === remotePort
    );
  };

  const getPortForward = (port: any) => {
    const remotePort = getRemotePort(port);
    return portForwards().find((pf) =>
      pf.name === props.serviceName &&
      pf.namespace === props.serviceNamespace &&
      pf.remotePort === remotePort
    );
  };

  const handlePortForwardClick = (port: any) => {
    const svcPort: ServicePort = {
      name: port.name || '',
      port: port.port || port.portNumber,
      targetPort: port.targetPort ?? (port.port || port.portNumber),
      protocol: port.protocol || 'TCP',
      nodePort: port.nodePort,
    };
    setSelectedPort(svcPort);
    setShowPortForward(true);
  };

  const handleStopPortForward = async (port: any) => {
    const pf = getPortForward(port);
    if (!pf) return;

    try {
      await api.stopPortForward(pf.id);
      addNotification('Port forward stopped', 'success');
      const pfs = await api.listPortForwards();
      setPortForwards(pfs || []);

      if (props.onPortForwardChange) {
        props.onPortForwardChange();
      }
    } catch (error) {
      console.error('Failed to stop port forward:', error);
      addNotification('Failed to stop port forward', 'error');
    }
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

  // Handle saving YAML edits
  const handleSaveYAML = async (yaml: string) => {
    const trimmed = yaml.trim();
    if (!trimmed) {
      addNotification('YAML content is empty', 'error');
      return;
    }

    const cluster = clusterStatus();
    if (!cluster?.connected) {
      addNotification('Not connected to a cluster', 'error');
      return;
    }

    startExecution({
      label: `Apply Service YAML: ${props.serviceName}`,
      command: '__k8s-apply-yaml',
      args: [],
      context: cluster.context || '',
      namespace: props.serviceNamespace,
      resourceType: 'service',
      resourceName: props.serviceName,
      yaml: trimmed,
    });

    setShowEdit(false);
  };

  // Handle dry-run YAML edits
  const handleDryRunYAML = async (yaml: string) => {
    const trimmed = yaml.trim();
    if (!trimmed) {
      addNotification('YAML content is empty', 'error');
      return;
    }

    const cluster = clusterStatus();
    if (!cluster?.connected) {
      addNotification('Not connected to a cluster', 'error');
      return;
    }

    startExecution({
      label: `Dry Run Service YAML: ${props.serviceName}`,
      command: '__k8s-apply-yaml',
      args: [],
      context: cluster.context || '',
      namespace: props.serviceNamespace,
      resourceType: 'service',
      resourceName: props.serviceName,
      yaml: trimmed,
      dryRun: true,
    });
  };

  return (
    <>
      <Modal
        isOpen={props.isOpen}
        onClose={props.onClose}
        title={`Service: ${props.serviceName}`}
        size="xl"
      >
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
                <div class="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Name</div>
                        <div style={{ color: 'var(--text-primary)' }}>{svc().name}</div>
                      </div>
                      <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                        <div style={{ color: 'var(--text-primary)' }}>{svc().namespace}</div>
                      </div>
                      <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Type</div>
                        <div style={{ color: 'var(--text-primary)' }}>{svc().type}</div>
                      </div>
                      <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Cluster IP</div>
                        <div style={{ color: 'var(--text-primary)' }}>{svc().clusterIP}</div>
                      </div>
                    </div>
                  </div>

                  {/* Labels & Annotations */}
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Labels & Annotations</h3>
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

                  {/* Selector */}
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Selector</h3>
                    <div class="font-mono text-sm" style={{ color: 'var(--text-secondary)', 'line-height': '1.8' }}>
                      {formatSelector(svc().selector)}
                    </div>
                  </div>

                  {/* Service Configuration */}
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Service Configuration</h3>
                    <div class="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
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

                  {/* Network Configuration */}
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Network Configuration</h3>
                    <div class="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                      <div>
                        <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Cluster IPs:</span>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{(svc().clusterIPs || []).join(', ') || svc().clusterIP}</span>
                      </div>
                      <Show when={(svc().externalIPs || []).length > 0}>
                        <div>
                          <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>External IPs:</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{(svc().externalIPs || []).join(', ')}</span>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Ports */}
                  <Show when={ports.length > 0}>
                    <div>
                      <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Ports</h3>
                      <div class="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)', 'line-height': '1.8' }}>
                        <For each={ports}>
                          {(port: any) => {
                            const forwarded = isPortForwarded(port);
                            return (
                              <div class="flex items-center justify-between gap-3 p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
                                <div class="space-y-1">
                                  <div>
                                    <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>Port:</span>
                                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{formatPort(port)}</span>
                                  </div>
                                  <div>
                                    <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>TargetPort:</span>
                                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{formatTargetPort(port)}</span>
                                  </div>
                                  <Show when={port.nodePort}>
                                    <div>
                                      <span class="font-semibold" style={{ color: 'var(--text-primary)' }}>NodePort:</span>
                                      <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{port.nodePort}</span>
                                    </div>
                                  </Show>
                                </div>
                                <Show
                                  when={forwarded}
                                  fallback={
                                    <button
                                      onClick={() => handlePortForwardClick(port)}
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
                                    Stop Forward
                                  </button>
                                </Show>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  </Show>

                  {/* Endpoints */}
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Endpoints</h3>
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

                  {/* Events */}
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Events</h3>
                    <div class="font-mono text-sm" style={{ color: 'var(--text-muted)', 'line-height': '1.8' }}>
                      &lt;none&gt;
                    </div>
                  </div>

                  {/* Actions */}
                  <div class="grid grid-cols-3 md:grid-cols-6 gap-2 pt-3">
                    <button
                      onClick={() => {
                        if (ports.length > 0) {
                          handlePortForwardClick(ports[0]);
                        } else {
                          addNotification('No ports available for forwarding', 'warning');
                        }
                      }}
                      class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                      title="Port Forward"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Forward</span>
                    </button>
                    <button
                      onClick={() => setShowYaml(true)}
                      class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                      title="View YAML"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>View YAML</span>
                    </button>
                    <button
                      onClick={() => setShowDescribe(true)}
                      class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                      title="Describe"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Describe</span>
                    </button>
                    <button
                      onClick={() => setShowEdit(true)}
                      class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                      title="Edit"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        const text = `Service: ${svc().name}\n\n${formatServiceDetails(svc())}`;
                        navigator.clipboard.writeText(text);
                        addNotification('Copied to clipboard', 'success');
                      }}
                      class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                      title="Copy"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete service ${svc().name}?`)) {
                          try {
                            await api.deleteService(svc().name, svc().namespace);
                            addNotification('Service deleted', 'success');
                            props.onClose();
                          } catch (error) {
                            addNotification('Failed to delete service', 'error');
                          }
                        }
                      }}
                      class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                      title="Delete"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            }}
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

      {/* YAML Viewer Modal */}
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${props.serviceName}`} size="xl">
        <Show
          when={!yamlContent.loading && yamlContent()}
          fallback={
            <div class="flex items-center justify-center p-8">
              <div class="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{
                borderColor: 'var(--accent-primary)',
                borderTopColor: 'transparent'
              }} />
              <span class="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading YAML...</span>
            </div>
          }
        >
          <YAMLViewer yaml={yamlContent() || ''} title={props.serviceName} />
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal
        isOpen={showDescribe()}
        onClose={() => setShowDescribe(false)}
        resourceType="service"
        name={props.serviceName}
        namespace={props.serviceNamespace}
      />

      {/* Edit YAML Modal */}
      <Modal isOpen={showEdit()} onClose={() => setShowEdit(false)} title={`Edit YAML: ${props.serviceName}`} size="xl">
        <Show
          when={!yamlContent.loading && yamlContent()}
          fallback={
            <div class="flex items-center justify-center p-8">
              <div class="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{
                borderColor: 'var(--accent-primary)',
                borderTopColor: 'transparent'
              }} />
              <span class="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading YAML...</span>
            </div>
          }
        >
          <div style={{ height: '70vh' }}>
            <CommandPreview
              command="kubectl"
              args={['apply', '-f', '-']}
              context={clusterStatus()?.context || ''}
              namespace={props.serviceNamespace}
            />
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={props.serviceName}
              onSave={handleSaveYAML}
              onDryRun={handleDryRunYAML}
              onCancel={() => setShowEdit(false)}
            />
          </div>
        </Show>
      </Modal>
    </>
  );
};

export default ServiceDetailsPanel;
