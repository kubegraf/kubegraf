/**
 * Keep uninstall messaging consistent across the marketplace UI.
 */

export function formatNamespacesForUninstall(namespaces: string[], maxShown = 4): string {
  const unique = Array.from(
    new Set((namespaces || []).map((n) => String(n || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  if (unique.length === 0) return '';
  if (unique.length === 1) return `namespace:${unique[0]}`;

  if (unique.length <= maxShown) {
    return unique.map((n) => `namespace:${n}`).join(', ');
  }
  const shown = unique.slice(0, maxShown).map((n) => `namespace:${n}`).join(', ');
  return `${shown} (+${unique.length - maxShown} more)`;
}


