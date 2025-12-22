// Copyright 2025 KubeGraf Contributors
// Incident Header - Compact, immediately scannable incident summary

import { Component, Show } from 'solid-js';
import { Incident, IncidentSnapshot } from '../../services/api';

interface IncidentHeaderProps {
  incident: Incident;
  snapshot: IncidentSnapshot | null;
}

const IncidentHeader: Component<IncidentHeaderProps> = (props) => {
  const snap = props.snapshot;
  const inc = props.incident;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#ff6b6b';
      case 'medium': case 'warning': return '#ffc107';
      case 'low': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'rgba(220, 53, 69, 0.1)';
      case 'high': return 'rgba(255, 107, 107, 0.1)';
      case 'medium': case 'warning': return 'rgba(255, 193, 7, 0.1)';
      case 'low': return 'rgba(40, 167, 69, 0.1)';
      default: return 'var(--bg-secondary)';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const severity = snap?.severity || inc.severity;
  const confidence = snap?.confidence ?? inc.diagnosis?.confidence ?? 0;
  const status = snap?.status || inc.status;
  const firstSeen = snap?.firstSeen || inc.firstSeen;
  const lastSeen = snap?.lastSeen || inc.lastSeen;
  const title = snap?.title || inc.title || inc.description;
  const resource = snap?.resource || inc.resource;

  const isActive = status === 'open' || status === 'investigating' || status === 'remediating';

  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Title and Severity */}
      <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '12px' }}>
        <h2 style={{ 'font-size': '20px', 'font-weight': '600', 'margin': 0, color: 'var(--text-primary)', flex: 1 }}>
          {title}
        </h2>
        <span
          style={{
            padding: '6px 12px',
            'border-radius': '6px',
            'font-size': '12px',
            'font-weight': '600',
            background: getSeverityBg(severity),
            color: getSeverityColor(severity),
            'text-transform': 'uppercase',
          }}
        >
          {severity}
        </span>
      </div>

      {/* Resource, Status, Confidence Row */}
      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '16px', 'align-items': 'center', 'margin-bottom': '12px' }}>
        {/* Affected Resource */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <span style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>Resource:</span>
          <span style={{ 'font-size': '13px', 'font-weight': '500', color: 'var(--text-primary)' }}>
            {resource.namespace}/{resource.kind}/{resource.name}
          </span>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              'border-radius': '50%',
              background: isActive ? '#dc3545' : '#22c55e',
            }}
          />
          <span style={{ 'font-size': '13px', 'font-weight': '500', color: 'var(--text-primary)' }}>
            {isActive ? 'Active' : 'Resolved'}
          </span>
        </div>

        {/* Confidence */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <span style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>Confidence:</span>
          <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--text-primary)' }}>
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Timestamps Row */}
      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '16px', 'align-items': 'center', 'font-size': '12px', color: 'var(--text-secondary)' }}>
        <div>
          <span style={{ 'font-weight': '500' }}>First seen:</span> {formatRelativeTime(firstSeen)}
        </div>
        <div>
          <span style={{ 'font-weight': '500' }}>Last seen:</span> {formatRelativeTime(lastSeen)}
        </div>
        <Show when={snap?.occurrences || inc.occurrences}>
          <div>
            <span style={{ 'font-weight': '500' }}>Occurrences:</span> {snap?.occurrences || inc.occurrences}
          </div>
        </Show>
      </div>
    </div>
  );
};

export default IncidentHeader;

