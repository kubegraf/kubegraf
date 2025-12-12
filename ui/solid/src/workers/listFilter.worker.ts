export type ListFilterRequest = {
  items: string[];
  query: string;
};

export type ListFilterResponse = {
  items: string[];
};

// Simple string filter worker to avoid blocking UI when lists are huge.
self.onmessage = (event: MessageEvent<ListFilterRequest>) => {
  const { items, query } = event.data;
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    (self as any).postMessage({ items } satisfies ListFilterResponse);
    return;
  }
  const filtered = items.filter((x) => (x || '').toLowerCase().includes(q));
  (self as any).postMessage({ items: filtered } satisfies ListFilterResponse);
};
