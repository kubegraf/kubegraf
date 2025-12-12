import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

type Accessor<T> = () => T;

/**
 * Filters a list of strings. If list is large, offload to a Web Worker.
 */
export function useWorkerFilter(
  items: Accessor<string[]>,
  query: Accessor<string>,
  opts?: { threshold?: number }
) {
  const threshold = opts?.threshold ?? 2000;
  const [filtered, setFiltered] = createSignal<string[]>([]);

  const shouldUseWorker = createMemo(() => (items()?.length || 0) > threshold);

  createEffect(() => {
    const list = items() || [];
    const q = query() || '';

    // Fast path: small list
    if (!shouldUseWorker()) {
      const s = q.toLowerCase().trim();
      if (!s) {
        setFiltered(list);
      } else {
        setFiltered(list.filter((x) => (x || '').toLowerCase().includes(s)));
      }
      return;
    }

    // Worker path
    const worker = new Worker(new URL('../workers/listFilter.worker.ts', import.meta.url), { type: 'module' });
    const onMessage = (e: MessageEvent<{ items: string[] }>) => {
      setFiltered(e.data.items || []);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ items: list, query: q });

    onCleanup(() => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
    });
  });

  return filtered;
}
