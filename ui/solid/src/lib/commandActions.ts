// Copyright 2025 KubeGraf Contributors
// Command Palette Actions Registry

import type { View } from '../stores/ui';
import { setCurrentView } from '../stores/ui';
import { setNamespace } from '../stores/cluster';
import { navSections } from '../config/navSections';

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  icon?: string;
  category?: string;
  run: () => void;
}

/**
 * Parse namespace filter from query (e.g., "ns:default pods")
 */
function parseNamespaceFilter(query: string): { namespace?: string; remainingQuery: string } {
  const nsMatch = query.match(/^ns:(\w+)\s*(.*)$/i);
  if (nsMatch) {
    return {
      namespace: nsMatch[1],
      remainingQuery: nsMatch[2].trim(),
    };
  }
  return { remainingQuery: query };
}

/**
 * Check if action matches query (case-insensitive fuzzy match)
 */
function matchesQuery(action: CommandAction, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const searchableText = [
    action.title,
    action.subtitle,
    ...(action.keywords || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(lowerQuery);
}

/**
 * Get all navigation actions from navSections
 */
function getNavigationActions(): CommandAction[] {
  const actions: CommandAction[] = [];

  navSections.forEach((section) => {
    section.items.forEach((item) => {
      actions.push({
        id: `nav-${item.id}`,
        title: item.label,
        subtitle: section.title,
        keywords: [item.id, section.title.toLowerCase()],
        icon: item.icon,
        category: section.title,
        run: () => {
          setCurrentView(item.id as View);
        },
      });
    });
  });

  return actions;
}

/**
 * Get all available command actions
 */
export function getCommandActions(): CommandAction[] {
  return [
    ...getNavigationActions(),
    // Add more actions here as needed
  ];
}

/**
 * Filter actions based on query
 * Supports namespace filter: "ns:default pods"
 */
export function filterActions(actions: CommandAction[], query: string): CommandAction[] {
  const { namespace, remainingQuery } = parseNamespaceFilter(query);

  // If namespace filter is present, apply it (no-op for now, but structure is ready)
  // In the future, you could filter actions or pre-select namespace
  if (namespace) {
    // Could set namespace here: setNamespace(namespace);
    // For now, we'll just parse it but not apply it automatically
  }

  if (!remainingQuery) {
    return actions;
  }

  return actions.filter((action) => matchesQuery(action, remainingQuery));
}

/**
 * Group actions by category
 */
export function groupActionsByCategory(actions: CommandAction[]): Map<string, CommandAction[]> {
  const grouped = new Map<string, CommandAction[]>();

  actions.forEach((action) => {
    const category = action.category || 'Other';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(action);
  });

  return grouped;
}

