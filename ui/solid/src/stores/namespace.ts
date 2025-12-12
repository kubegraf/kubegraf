import { createSignal, createEffect } from 'solid-js';
import { extractNamespaceNames } from '../utils/namespaceResponse';

// Multi-namespace selection store with persistence
const STORAGE_KEY = 'kubegraf_selected_namespaces';
const ALL_NAMESPACES_KEY = 'kubegraf_all_namespaces';

// Load from localStorage
const loadFromStorage = (key: string, defaultValue: string[]): string[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Initialize with persisted values or defaults
const [selectedNamespaces, setSelectedNamespaces] = createSignal<string[]>(
  loadFromStorage(STORAGE_KEY, ['default'])
);

const [allNamespaces, setAllNamespaces] = createSignal<string[]>(
  loadFromStorage(ALL_NAMESPACES_KEY, ['default'])
);

const [namespaceFilter, setNamespaceFilter] = createSignal<string>('');

// Persist to localStorage on changes
createEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedNamespaces()));
  } catch (error) {
    console.error('Failed to save selected namespaces:', error);
  }
});

createEffect(() => {
  try {
    localStorage.setItem(ALL_NAMESPACES_KEY, JSON.stringify(allNamespaces()));
  } catch (error) {
    console.error('Failed to save all namespaces:', error);
  }
});

// Helper functions
export const toggleNamespace = (namespace: string) => {
  setSelectedNamespaces((current) => {
    if (current.includes(namespace)) {
      // Don't allow deselecting all namespaces
      if (current.length === 1) return current;
      return current.filter((ns) => ns !== namespace);
    } else {
      return [...current, namespace];
    }
  });
};

export const selectAllNamespaces = () => {
  setSelectedNamespaces([...allNamespaces()]);
};

export const clearAllNamespaces = () => {
  setSelectedNamespaces(['default']);
};

export const isNamespaceSelected = (namespace: string): boolean => {
  return selectedNamespaces().includes(namespace);
};

export const fetchAndUpdateNamespaces = async () => {
  try {
    const response = await fetch('/api/namespaces');
    if (response.ok) {
      const data = await response.json();
      // Backend returns an array of objects; normalize to string names
      const namespaces = extractNamespaceNames(data);
      setAllNamespaces(namespaces);

      // If selected namespaces don't exist anymore, reset to default
      const validSelected = selectedNamespaces().filter((ns) =>
        namespaces.includes(ns)
      );
      if (validSelected.length === 0) {
        setSelectedNamespaces(['default']);
      } else if (validSelected.length !== selectedNamespaces().length) {
        setSelectedNamespaces(validSelected);
      }
    }
  } catch (error) {
    console.error('Failed to fetch namespaces:', error);
  }
};

export {
  selectedNamespaces,
  setSelectedNamespaces,
  allNamespaces,
  setAllNamespaces,
  namespaceFilter,
  setNamespaceFilter,
};
