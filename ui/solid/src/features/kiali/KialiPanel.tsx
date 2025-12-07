// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

import { Component, Show, createSignal, createResource, For } from 'solid-js';
import { kialiService, KialiStatus } from '../../services/kiali';
import { addNotification } from '../../stores/ui';
import KialiDashboard from './KialiDashboard';

const KialiPanel: Component = () => {
  const [showDashboard, setShowDashboard] = createSignal(false);
  const [refreshing, setRefreshing] = createSignal(false);

  // Fetch Kiali status
  const [status, { refetch }] = createResource(async () => {
    try {
      return await kialiService.getStatus();
    } catch (err) {
      console.error('Failed to fetch Kiali status:', err);
      return { installed: false, istioDetected: false } as KialiStatus;
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      addNotification('Status refreshed', 'success');
    } catch (err) {
      addNotification('Failed to refresh status', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenDashboard = () => {
    if (status()?.installed) {
      setShowDashboard(true);
    } else {
      addNotification('Kiali is not installed', 'error');
    }
  };

  const handleInstalled = () => {
    refetch();
  };

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Kiali Service Mesh
          </h1>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Service mesh observability and management for Istio
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing()}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Status Card */}
      <Show when={!status.loading}>
        <div
          class="rounded-lg p-6 border"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Installation Status
            </h2>
            <div
              class={`px-3 py-1 rounded-full text-xs font-medium ${
                status()?.installed ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
              }`}
            >
              {status()?.installed ? 'Installed' : 'Not Installed'}
            </div>
          </div>

          <Show when={status()?.installed}>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Version</p>
                  <p class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {status()?.version || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Namespace</p>
                  <p class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {status()?.namespace || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Service</p>
                  <p class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {status()?.serviceName || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Istio Detected</p>
                  <p class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {status()?.istioDetected ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
                <button
                  onClick={handleOpenDashboard}
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#000',
                  }}
                >
                  Open Kiali Dashboard
                </button>
              </div>
            </div>
          </Show>

          <Show when={!status()?.installed}>
            <div class="space-y-4">
              <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Kiali is not detected. Use the Traffic Map in Resource Map to visualize service mesh traffic.
              </p>
              <button
                onClick={() => {
                  // Navigate to Resource Map with Traffic Map tab
                  window.location.href = '#/resourcemap';
                }}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#000',
                }}
              >
                Open Traffic Map
              </button>
            </div>
          </Show>
        </div>
      </Show>

      {/* Dashboard View */}
      <Show when={showDashboard() && status()?.installed}>
        <div
          class="rounded-lg border overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            minHeight: '600px',
          }}
        >
          <div class="flex items-center justify-between p-4 border-b" style={{ 'border-color': 'var(--border-color)' }}>
            <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Kiali Dashboard
            </h2>
            <button
              onClick={() => setShowDashboard(false)}
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Close
            </button>
          </div>
          <div class="h-[600px]">
            <KialiDashboard status={status()!} />
          </div>
        </div>
      </Show>

    </div>
  );
};

export default KialiPanel;

