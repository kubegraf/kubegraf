/**
 * Container List Component
 * 
 * Displays a list of containers grouped by type (main, init, sidecar)
 * with their individual statuses
 */

import { Component, For, Show } from 'solid-js';
import { ContainerInfo } from '../utils/containerTypes';
import { groupContainersByType } from '../utils/containerStatus';

interface ContainerListProps {
  containers: ContainerInfo[];
  showAll?: boolean; // If false, only show main containers
}

const ContainerList: Component<ContainerListProps> = (props) => {
  const grouped = () => groupContainersByType(props.containers);
  const showAll = () => props.showAll ?? true;

  const getStateColor = (state?: string, ready?: boolean) => {
    if (ready) return 'text-green-400';
    if (state === 'Waiting') return 'text-yellow-400';
    if (state === 'Terminated') return 'text-red-400';
    return 'text-gray-400';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'init': return 'Init';
      case 'sidecar': return 'Sidecar';
      default: return 'Main';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'init': return 'text-blue-400';
      case 'sidecar': return 'text-purple-400';
      default: return 'text-white';
    }
  };

  return (
    <div class="space-y-3">
      {/* Main Containers */}
      <Show when={grouped().main.length > 0}>
        <div>
          <div class="text-xs font-semibold text-gray-400 mb-1">Main Containers</div>
          <div class="space-y-1">
            <For each={grouped().main}>
              {(container) => (
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-gray-300">{container.name}</span>
                  <span class={`text-xs ${getStateColor(container.state, container.ready)}`}>
                    {container.ready ? '✓' : container.state || 'Pending'}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Init Containers */}
      <Show when={showAll() && grouped().init.length > 0}>
        <div>
          <div class="text-xs font-semibold text-blue-400 mb-1">Init Containers</div>
          <div class="space-y-1">
            <For each={grouped().init}>
              {(container) => (
                <div class="flex items-center gap-2 text-sm">
                  <span class={getTypeColor('init')}>{container.name}</span>
                  <span class={`text-xs ${getStateColor(container.state, container.ready)}`}>
                    {container.ready ? '✓' : container.state || 'Pending'}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Sidecar Containers */}
      <Show when={showAll() && grouped().sidecar.length > 0}>
        <div>
          <div class="text-xs font-semibold text-purple-400 mb-1">Sidecar Containers</div>
          <div class="space-y-1">
            <For each={grouped().sidecar}>
              {(container) => (
                <div class="flex items-center gap-2 text-sm">
                  <span class={getTypeColor('sidecar')}>{container.name}</span>
                  <span class={`text-xs ${getStateColor(container.state, container.ready)}`}>
                    {container.ready ? '✓' : container.state || 'Pending'}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ContainerList;

