import { Component, For, createSignal, createEffect, onMount } from 'solid-js';

interface VirtualizedTableProps<T> {
  data: () => T[];
  columns: Array<{
    header: string;
    accessor: (row: T) => any;
    width?: string;
  }>;
  rowHeight?: number;
  headerHeight?: number;
  containerHeight?: number;
}

// Simple virtualized table implementation
// For large datasets, this provides smooth scrolling
export function VirtualizedTable<T>(props: VirtualizedTableProps<T>) {
  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | null>(null);
  const rowHeight = () => props.rowHeight || 40;
  const headerHeight = () => props.headerHeight || 48;
  const containerHeight = () => props.containerHeight || 600;
  const data = () => props.data() || [];

  const visibleStart = () => Math.floor(scrollTop() / rowHeight());
  const visibleEnd = () => {
    const end = visibleStart() + Math.ceil(containerHeight() / rowHeight()) + 1;
    return Math.min(end, data().length);
  };

  const visibleData = () => {
    const start = visibleStart();
    const end = visibleEnd();
    return data().slice(start, end).map((item, index) => ({
      item,
      index: start + index,
    }));
  };

  const totalHeight = () => data().length * rowHeight();

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  };

  return (
    <div
      class="w-full overflow-auto"
      style={{ height: `${containerHeight()}px` }}
      onScroll={handleScroll}
      ref={setContainerRef}
    >
      {/* Header */}
      <div
        class="sticky top-0 z-10 flex border-b"
        style={{
          height: `${headerHeight()}px`,
          background: 'var(--bg-secondary)',
          'border-color': 'var(--border-color)',
        }}
      >
        <For each={props.columns}>
          {(column) => (
            <div
              class="px-4 py-3 font-semibold text-sm flex items-center"
              style={{
                width: column.width || 'auto',
                flex: column.width ? 'none' : '1',
                color: 'var(--text-primary)',
              }}
            >
              {column.header}
            </div>
          )}
        </For>
      </div>

      {/* Virtualized rows */}
      <div style={{ height: `${totalHeight()}px`, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${visibleStart() * rowHeight()}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          <For each={visibleData()}>
            {({ item, index }) => (
              <div
                class="flex border-b hover:bg-opacity-50 transition-colors"
                style={{
                  height: `${rowHeight()}px`,
                  'border-color': 'var(--border-color)',
                  background: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                }}
              >
                <For each={props.columns}>
                  {(column) => (
                    <div
                      class="px-4 py-2 text-sm flex items-center overflow-hidden text-ellipsis"
                      style={{
                        width: column.width || 'auto',
                        flex: column.width ? 'none' : '1',
                        color: 'var(--text-primary)',
                      }}
                      title={String(column.accessor(item))}
                    >
                      {column.accessor(item)}
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

