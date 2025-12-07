import { Component, For } from 'solid-js';
import { Incident } from '../services/api';
import ActionMenu from './ActionMenu';

interface IncidentTableProps {
  incidents: Incident[];
  onViewPod?: (incident: Incident) => void;
  onViewLogs?: (incident: Incident) => void;
  onViewEvents?: (incident: Incident) => void;
}

const IncidentTable: Component<IncidentTableProps> = (props) => {
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'oom':
        return '⚠️';
      case 'crashloop':
        return '🔄';
      case 'node_pressure':
      case 'node_memory_pressure':
      case 'node_disk_pressure':
        return '💾';
      case 'job_failure':
      case 'cronjob_failure':
        return '❌';
      default:
        return '⚠️';
    }
  };

  const getSeverityColor = (severity: string): string => {
    return severity === 'critical' ? '#ef4444' : '#f59e0b';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div class="w-full overflow-x-auto" style={{ background: '#000000', border: '1px solid #333333', 'border-radius': '4px' }}>
      <table class="w-full" style={{ 'border-collapse': 'collapse' }}>
        <thead>
          <tr style={{ 
            background: '#161b22', 
            'border-bottom': '1px solid #333333',
            height: '40px'
          }}>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>Type</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>Resource</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>Namespace</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>Severity</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>First Seen</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>Last Seen</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>Count</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: '#0ea5e9', 'font-weight': '900' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.incidents} fallback={
            <tr>
              <td colspan="8" style={{ padding: '24px', 'text-align': 'center', color: '#8b949e' }}>
                No incidents found
              </td>
            </tr>
          }>
            {(incident) => (
              <tr style={{ 
                'border-bottom': '1px solid #333333',
                height: '48px',
                '&:hover': { background: '#161b22' }
              }}>
                <td style={{ padding: '8px 12px', color: '#0ea5e9' }}>
                  <span style={{ 'margin-right': '8px' }}>{getTypeIcon(incident.type)}</span>
                  <span style={{ 'text-transform': 'capitalize' }}>{incident.type.replace(/_/g, ' ')}</span>
                </td>
                <td style={{ padding: '8px 12px', color: '#0ea5e9' }}>
                  <div>
                    <div style={{ 'font-weight': '600' }}>{incident.resourceName}</div>
                    <div style={{ 'font-size': '12px', color: '#8b949e' }}>{incident.resourceKind}</div>
                  </div>
                </td>
                <td style={{ padding: '8px 12px', color: '#0ea5e9' }}>
                  {incident.namespace || '-'}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ 
                    padding: '4px 8px',
                    'border-radius': '4px',
                    'font-size': '12px',
                    'font-weight': '600',
                    background: getSeverityColor(incident.severity) + '20',
                    color: getSeverityColor(incident.severity)
                  }}>
                    {incident.severity.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: '#8b949e', 'font-size': '13px' }}>
                  {formatDate(incident.firstSeen)}
                </td>
                <td style={{ padding: '8px 12px', color: '#8b949e', 'font-size': '13px' }}>
                  {formatDate(incident.lastSeen)}
                </td>
                <td style={{ padding: '8px 12px', color: '#0ea5e9', 'font-weight': '600' }}>
                  {incident.count}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <ActionMenu
                    actions={[
                      ...(incident.resourceKind === 'Pod' && props.onViewPod ? [
                        { label: 'View Pod', icon: 'pod', onClick: () => props.onViewPod?.(incident) }
                      ] : []),
                      ...(props.onViewLogs ? [
                        { label: 'View Logs', icon: 'logs', onClick: () => props.onViewLogs?.(incident) }
                      ] : []),
                      ...(props.onViewEvents ? [
                        { label: 'View Events', icon: 'events', onClick: () => props.onViewEvents?.(incident) }
                      ] : []),
                    ]}
                  />
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};

export default IncidentTable;



