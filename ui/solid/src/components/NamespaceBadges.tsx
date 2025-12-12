import { Component, For, Show, createMemo } from 'solid-js';
import NamespaceBadge from './NamespaceBadge';

interface NamespaceBadgesProps {
  namespaces: string[];
  maxShown?: number;
  badgeSize?: 'xs' | 'sm';
}

const NamespaceBadges: Component<NamespaceBadgesProps> = (props) => {
  const maxShown = () => (typeof props.maxShown === 'number' ? props.maxShown : 3);

  const uniqueSorted = createMemo(() => {
    const set = new Set<string>();
    for (const ns of props.namespaces || []) {
      const v = String(ns || '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  const shown = createMemo(() => uniqueSorted().slice(0, maxShown()));
  const hiddenCount = createMemo(() => Math.max(0, uniqueSorted().length - shown().length));

  return (
    <span class="inline-flex flex-wrap items-center gap-1">
      <For each={shown()}>
        {(ns) => <NamespaceBadge namespace={ns} showLabel={false} size={props.badgeSize || 'xs'} />}
      </For>
      <Show when={hiddenCount() > 0}>
        <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
          +{hiddenCount()}
        </span>
      </Show>
    </span>
  );
};

export default NamespaceBadges;


