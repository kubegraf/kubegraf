/**
 * Namespace API response helpers.
 *
 * The backend `/api/namespaces` currently returns an array of objects like:
 *   [{ name, status, age, labels, createdAt }, ...]
 *
 * Some callers historically expected a shape like:
 *   { namespaces: ["default", ...], success: true }
 *
 * This helper makes the frontend resilient to both.
 */

export interface NamespaceListItem {
  name: string;
  [key: string]: unknown;
}

export function normalizeNamespaceList(payload: unknown): NamespaceListItem[] {
  const items: NamespaceListItem[] = [];

  const pushName = (v: unknown) => {
    if (typeof v === 'string') {
      const s = v.trim();
      if (s) items.push({ name: s });
      return;
    }
    if (v && typeof v === 'object' && 'name' in (v as any)) {
      const n = (v as any).name;
      if (typeof n === 'string' && n.trim()) items.push(v as NamespaceListItem);
    }
  };

  if (Array.isArray(payload)) {
    for (const item of payload) pushName(item);
    // Unique by name
    const byName = new Map<string, NamespaceListItem>();
    for (const it of items) {
      const key = it.name.trim();
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, it);
    }
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  if (payload && typeof payload === 'object') {
    const maybe = (payload as any).namespaces;
    if (Array.isArray(maybe)) {
      for (const item of maybe) pushName(item);
      const byName = new Map<string, NamespaceListItem>();
      for (const it of items) {
        const key = it.name.trim();
        if (!key) continue;
        if (!byName.has(key)) byName.set(key, it);
      }
      return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return [];
}

export function extractNamespaceNames(payload: unknown): string[] {
  return normalizeNamespaceList(payload).map((n) => n.name);
}


