/**
 * Container Table Component
 * 
 * Displays containers in a table format similar to pods view
 * with IDX, status, restarts, CPU, memory, age, and ports
 */

import { Component, For, Show } from 'solid-js';
import { ContainerTableRow } from '../utils/containerTableUtils';
import { getStatusColorClass } from '../utils/containerTableUtils';

interface ContainerTableProps {
  containers: ContainerTableRow[];
  onContainerClick?: (container: ContainerTableRow) => void;
}

const ContainerTable: Component<ContainerTableProps> = (props) => {
  return (
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              IDX
            </th>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Name
            </th>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Status
            </th>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Restarts
            </th>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              CPU
            </th>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Memory
            </th>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Age
            </th>
            <th class="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Ports
            </th>
          </tr>
        </thead>
        <tbody>
          <Show when={props.containers.length > 0} fallback={
            <tr>
              <td colSpan={8} class="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No containers found
              </td>
            </tr>
          }>
            <For each={props.containers}>
              {(row) => (
                <tr
                  class="border-b hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    'border-color': 'var(--border-color)',
                    background: row.type === 'init' ? 'var(--bg-secondary)' : 'transparent',
                  }}
                  onClick={() => props.onContainerClick?.(row)}
                >
                  <td class="py-2 px-3 text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    {row.idx}
                  </td>
                  <td class="py-2 px-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <div class="flex items-center gap-2">
                      <span>{row.name}</span>
                      {row.type === 'init' && (
                        <span class="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                          INIT
                        </span>
                      )}
                    </div>
                  </td>
                  <td class="py-2 px-3 text-sm">
                    <span class={getStatusColorClass(row.status)}>
                      {row.status}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {row.restarts > 0 ? (
                      <span style={{ color: 'var(--warning-color)' }}>{row.restarts}</span>
                    ) : (
                      row.restarts
                    )}
                  </td>
                  <td class="py-2 px-3 text-sm" style={{ color: '#ec4899', 'font-weight': '600' }}>
                    {row.cpu}
                  </td>
                  <td class="py-2 px-3 text-sm" style={{ color: '#f59e0b', 'font-weight': '600' }}>
                    {row.memory}
                  </td>
                  <td class="py-2 px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {row.age}
                  </td>
                  <td class="py-2 px-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {row.ports}
                  </td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  );
};

export default ContainerTable;


