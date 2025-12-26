// Copyright 2025 KubeGraf Contributors
// Store for Incident Modal V2 - manages snapshot and tab data caching

import { createSignal, createStore } from 'solid-js/store';
import type { IncidentSnapshot } from '../services/api';

// Tab types for lazy loading
export type TabType = 'evidence' | 'logs' | 'metrics' | 'changes' | 'runbooks' | 'similar' | 'citations';

// Tab data types
export interface TabData {
  data: any;
  loading: boolean;
  error: string | null;
  loadedAt: number; // Timestamp when data was loaded
}

// Store structure
interface IncidentsV2Store {
  // Snapshot cache - keyed by incident ID
  snapshotById: Record<string, IncidentSnapshot>;
  
  // Tab data cache - keyed by incident ID + tab
  tabDataByIncidentIdAndTab: Record<string, TabData>;
  
  // Loading states
  snapshotLoading: Record<string, boolean>;
  snapshotError: Record<string, string | null>;
}

// Create the store
const [store, setStore] = createStore<IncidentsV2Store>({
  snapshotById: {},
  tabDataByIncidentIdAndTab: {},
  snapshotLoading: {},
  snapshotError: {},
});

// Helper to generate tab cache key
const getTabKey = (incidentId: string, tab: TabType): string => {
  return `${incidentId}:${tab}`;
};

// Store API
export const incidentsV2Store = {
  // Snapshot operations
  getSnapshot: (incidentId: string): IncidentSnapshot | null => {
    return store.snapshotById[incidentId] || null;
  },
  
  setSnapshot: (incidentId: string, snapshot: IncidentSnapshot) => {
    setStore('snapshotById', incidentId, snapshot);
  },
  
  setSnapshotLoading: (incidentId: string, loading: boolean) => {
    setStore('snapshotLoading', incidentId, loading);
  },
  
  setSnapshotError: (incidentId: string, error: string | null) => {
    setStore('snapshotError', incidentId, error);
  },
  
  isSnapshotLoading: (incidentId: string): boolean => {
    return store.snapshotLoading[incidentId] || false;
  },
  
  getSnapshotError: (incidentId: string): string | null => {
    return store.snapshotError[incidentId] || null;
  },
  
  // Tab operations
  getTabData: (incidentId: string, tab: TabType): TabData | null => {
    const key = getTabKey(incidentId, tab);
    return store.tabDataByIncidentIdAndTab[key] || null;
  },
  
  setTabData: (incidentId: string, tab: TabType, data: any) => {
    const key = getTabKey(incidentId, tab);
    setStore('tabDataByIncidentIdAndTab', key, {
      data,
      loading: false,
      error: null,
      loadedAt: Date.now(),
    });
  },
  
  setTabLoading: (incidentId: string, tab: TabType, loading: boolean) => {
    const key = getTabKey(incidentId, tab);
    const existing = store.tabDataByIncidentIdAndTab[key];
    setStore('tabDataByIncidentIdAndTab', key, {
      data: existing?.data || null,
      loading,
      error: existing?.error || null,
      loadedAt: existing?.loadedAt || 0,
    });
  },
  
  setTabError: (incidentId: string, tab: TabType, error: string | null) => {
    const key = getTabKey(incidentId, tab);
    const existing = store.tabDataByIncidentIdAndTab[key];
    setStore('tabDataByIncidentIdAndTab', key, {
      data: existing?.data || null,
      loading: false,
      error,
      loadedAt: existing?.loadedAt || 0,
    });
  },
  
  isTabLoading: (incidentId: string, tab: TabType): boolean => {
    const key = getTabKey(incidentId, tab);
    return store.tabDataByIncidentIdAndTab[key]?.loading || false;
  },
  
  getTabError: (incidentId: string, tab: TabType): string | null => {
    const key = getTabKey(incidentId, tab);
    return store.tabDataByIncidentIdAndTab[key]?.error || null;
  },
  
  hasTabData: (incidentId: string, tab: TabType): boolean => {
    const key = getTabKey(incidentId, tab);
    return !!store.tabDataByIncidentIdAndTab[key]?.data;
  },
  
  // Clear all data for an incident (useful when modal closes)
  // Note: In SolidJS stores, we don't actually delete keys - we just ignore them if they're null/undefined
  // This is fine for our use case as we check for existence before using
  clearIncidentData: (incidentId: string) => {
    // Note: We don't actually clear the data - it persists for the session
    // This allows users to quickly reopen the same incident without refetching
    // If you want to clear on modal close, you can implement deletion logic here
  },
  
  // Get store for reactive access
  getStore: () => store,
};

export default incidentsV2Store;

