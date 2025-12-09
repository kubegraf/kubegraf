// Copyright 2025 KubeGraf Contributors
// Production-grade event severity badge component

import { Component, Show } from 'solid-js';

interface EventSeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  count?: number;
  showCount?: boolean;
}

const EventSeverityBadge: Component<EventSeverityBadgeProps> = (props) => {
  const getSeverityConfig = () => {
    switch (props.severity) {
      case 'critical':
        return {
          color: '#ef4444',
          bgColor: '#ef444420',
          borderColor: '#ef444440',
          icon: '🔴',
          label: 'CRITICAL',
        };
      case 'high':
        return {
          color: '#f59e0b',
          bgColor: '#f59e0b20',
          borderColor: '#f59e0b40',
          icon: '🟠',
          label: 'HIGH',
        };
      case 'medium':
        return {
          color: '#3b82f6',
          bgColor: '#3b82f620',
          borderColor: '#3b82f640',
          icon: '🔵',
          label: 'MEDIUM',
        };
      case 'low':
        return {
          color: '#6b7280',
          bgColor: '#6b728020',
          borderColor: '#6b728040',
          icon: '⚪',
          label: 'LOW',
        };
      case 'info':
        return {
          color: '#10b981',
          bgColor: '#10b98120',
          borderColor: '#10b98140',
          icon: 'ℹ️',
          label: 'INFO',
        };
      default:
        return {
          color: '#6b7280',
          bgColor: '#6b728020',
          borderColor: '#6b728040',
          icon: '',
          label: 'UNKNOWN',
        };
    }
  };

  const config = getSeverityConfig();

  return (
    <span
      class="px-2 py-1 rounded text-xs font-medium border flex items-center gap-1"
      style={{
        background: config.bgColor,
        color: config.color,
        borderColor: config.borderColor,
      }}
    >
      <Show when={config.icon}>
        <span>{config.icon}</span>
      </Show>
      <span>{config.label}</span>
      <Show when={props.showCount && props.count && props.count > 1}>
        <span class="ml-1 px-1 rounded" style={{ background: config.color, color: '#fff' }}>
          {props.count}
        </span>
      </Show>
    </span>
  );
};

export default EventSeverityBadge;

