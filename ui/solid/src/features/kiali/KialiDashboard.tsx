// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

import { Component, Show, createSignal, onMount, onCleanup } from 'solid-js';
import { kialiService, KialiStatus } from '../../services/kiali';
import { addNotification } from '../../stores/ui';

interface KialiDashboardProps {
  status: KialiStatus;
}

const KialiDashboard: Component<KialiDashboardProps> = (props) => {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [iframeUrl, setIframeUrl] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      // Create port-forward and get URL
      // The proxy endpoint will handle port-forwarding automatically
      const proxyUrl = '/api/kiali/proxy/';
      setIframeUrl(proxyUrl);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to open Kiali dashboard');
      setLoading(false);
      addNotification('Failed to open Kiali dashboard', 'error');
    }
  });

  return (
    <div class="w-full h-full flex flex-col">
      <Show when={loading()}>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p style={{ color: 'var(--text-muted)' }}>Connecting to Kiali...</p>
          </div>
        </div>
      </Show>

      <Show when={error()}>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <p class="text-red-500 mb-4">{error()}</p>
            <button
              onClick={() => window.open(`http://localhost:20001`, '_blank')}
              class="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--accent-primary)',
                color: '#000',
              }}
            >
              Open in New Tab
            </button>
          </div>
        </div>
      </Show>

      <Show when={!loading() && !error() && iframeUrl()}>
        <iframe
          src={iframeUrl()!}
          class="w-full h-full border-0"
          style={{ minHeight: '600px' }}
          title="Kiali Dashboard"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        />
      </Show>
    </div>
  );
};

export default KialiDashboard;

