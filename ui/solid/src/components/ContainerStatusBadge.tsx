/**
 * Container Status Badge Component
 * 
 * Displays container status with color coding and optional detailed breakdown
 */

import { Component, Show } from 'solid-js';
import { ContainerStatusSummary } from '../utils/containerTypes';
import { formatContainerStatus, getContainerStatusColor } from '../utils/containerStatus';

interface ContainerStatusBadgeProps {
  summary: ContainerStatusSummary;
  showDetailed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ContainerStatusBadge: Component<ContainerStatusBadgeProps> = (props) => {
  const statusText = () => formatContainerStatus(props.summary);
  const colorClass = () => getContainerStatusColor(props.summary);
  const sizeClass = () => {
    switch (props.size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  return (
    <span class={`font-mono font-medium ${colorClass()} ${sizeClass()}`}>
      {statusText()}
    </span>
  );
};

export default ContainerStatusBadge;

