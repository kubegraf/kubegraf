import { Component } from 'solid-js';

interface NamespaceBadgeProps {
  namespace: string;
  showLabel?: boolean;
  size?: 'xs' | 'sm';
}

const NamespaceBadge: Component<NamespaceBadgeProps> = (props) => {
  const size = () => props.size || 'xs';

  const badgeStyle = () => ({
    background: 'rgba(139, 92, 246, 0.18)', // violet
    color: '#a78bfa',
    border: '1px solid rgba(139, 92, 246, 0.35)',
  });

  return (
    <span class="inline-flex items-center gap-1 min-w-0">
      {props.showLabel !== false && (
        <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
          namespace:
        </span>
      )}
      <span
        class={`font-mono rounded whitespace-nowrap truncate ${size() === 'sm' ? 'text-xs px-2 py-0.5' : 'text-[11px] px-1.5 py-0.5'}`}
        style={badgeStyle()}
        title={props.namespace}
      >
        {props.namespace}
      </span>
    </span>
  );
};

export default NamespaceBadge;


