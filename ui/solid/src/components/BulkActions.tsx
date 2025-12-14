import { Component, Show } from 'solid-js';

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  resourceType: string; // e.g., "pods", "deployments"
}

export const BulkActions: Component<BulkActionsProps> = (props) => {
  return (
    <Show when={props.selectedCount > 0}>
      <div class="flex items-center gap-2">
        {/* Selection badge */}
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium"
          style={{
            background: 'rgba(6, 182, 212, 0.15)',
            'border-color': 'rgba(6, 182, 212, 0.3)',
            color: 'var(--text-primary)',
          }}
        >
          <svg class="w-4 h-4" style={{ color: '#06b6d4' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{props.selectedCount} selected</span>
        </div>

        {/* Clear button */}
        <button
          onClick={props.onDeselectAll}
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{
            background: 'rgba(139, 92, 246, 0.2)',
            color: '#8b5cf6',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}
          title="Clear selection"
        >
          Clear
        </button>

        {/* Delete button */}
        <button
          onClick={props.onDelete}
          class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 flex items-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
          }}
          title={`Delete ${props.selectedCount} ${props.resourceType}`}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete ({props.selectedCount})
        </button>
      </div>
    </Show>
  );
};

// Checkbox component for individual row selection
export const SelectionCheckbox: Component<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = (props) => {
  return (
    <div
      class="flex items-center justify-center cursor-pointer w-full h-full"
      onClick={(e) => {
        e.stopPropagation();
        if (!props.disabled) {
          props.onChange(!props.checked);
        }
      }}
    >
      <div
        class={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          props.checked ? 'scale-110' : 'scale-100'
        }`}
        style={{
          'border-color': props.checked 
            ? '#06b6d4' 
            : 'var(--border-color, rgba(128, 128, 128, 0.5))',
          background: props.checked 
            ? 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' 
            : 'var(--bg-tertiary, rgba(128, 128, 128, 0.15))',
          opacity: props.disabled ? 0.5 : 1,
        }}
      >
        <Show when={props.checked}>
          <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Show>
      </div>
    </div>
  );
};

// Header checkbox for select all
export const SelectAllCheckbox: Component<{
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}> = (props) => {
  return (
    <div
      class="flex items-center justify-center cursor-pointer w-full h-full"
      onClick={(e) => {
        e.stopPropagation();
        props.onChange(!props.checked);
      }}
      title={props.checked ? 'Deselect all' : 'Select all'}
    >
      <div
        class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0"
        style={{
          'border-color': props.checked || props.indeterminate 
            ? '#06b6d4' 
            : 'var(--border-color, rgba(128, 128, 128, 0.5))',
          background: props.checked || props.indeterminate
            ? 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)'
            : 'var(--bg-tertiary, rgba(128, 128, 128, 0.15))',
        }}
      >
        <Show when={props.checked}>
          <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Show>
        <Show when={props.indeterminate && !props.checked}>
          <div class="w-2 h-0.5 bg-white" />
        </Show>
      </div>
    </div>
  );
};
