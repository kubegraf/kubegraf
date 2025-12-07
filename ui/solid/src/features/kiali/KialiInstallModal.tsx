// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

import { Component, Show, createSignal, createResource, For } from 'solid-js';
import { kialiService, KialiInstallRequest, KialiVersion } from '../../services/kiali';
import { addNotification } from '../../stores/ui';

interface KialiInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalled: () => void;
}

const KialiInstallModal: Component<KialiInstallModalProps> = (props) => {
  const [installing, setInstalling] = createSignal(false);
  const [namespace, setNamespace] = createSignal('istio-system');
  const [version, setVersion] = createSignal('latest');
  const [authStrategy, setAuthStrategy] = createSignal<'anonymous' | 'token' | 'openid' | 'ldap'>('anonymous');
  const [serviceType, setServiceType] = createSignal<'ClusterIP' | 'NodePort' | 'LoadBalancer'>('ClusterIP');
  const [enableIngress, setEnableIngress] = createSignal(false);
  const [ingressHost, setIngressHost] = createSignal('');

  // Fetch available versions
  const [versions] = createResource(
    () => props.isOpen,
    async () => {
      try {
        return await kialiService.getVersions();
      } catch (err) {
        console.error('Failed to fetch Kiali versions:', err);
        return [];
      }
    }
  );

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const request: KialiInstallRequest = {
        namespace: namespace(),
        version: version(),
        authStrategy: authStrategy(),
        serviceType: serviceType(),
        enableIngress: enableIngress(),
        ingressHost: enableIngress() ? ingressHost() : undefined,
      };

      const result = await kialiService.install(request);
      
      if (result.success) {
        addNotification('Kiali installed successfully', 'success');
        props.onInstalled();
        props.onClose();
      } else {
        addNotification(result.error || 'Installation failed', 'error');
      }
    } catch (err: any) {
      addNotification(err.message || 'Failed to install Kiali', 'error');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            props.onClose();
          }
        }}
      >
        <div
          class="w-full max-w-2xl rounded-lg shadow-xl"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b" style={{ 'border-color': 'var(--border-color)' }}>
            <h2 class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Install Kiali
            </h2>
            <button
              onClick={props.onClose}
              class="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Namespace */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Namespace
              </label>
              <input
                type="text"
                value={namespace()}
                onInput={(e) => setNamespace(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                placeholder="istio-system"
              />
            </div>

            {/* Version */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Version
              </label>
              <select
                value={version()}
                onChange={(e) => setVersion(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <option value="latest">Latest</option>
                <Show when={!versions.loading && versions()}>
                  <For each={versions()}>
                    {(v) => <option value={v.tag_name}>{v.tag_name} - {v.name}</option>}
                  </For>
                </Show>
              </select>
              <Show when={versions.loading}>
                <p class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Loading versions...</p>
              </Show>
            </div>

            {/* Auth Strategy */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Authentication Strategy
              </label>
              <select
                value={authStrategy()}
                onChange={(e) => setAuthStrategy(e.currentTarget.value as any)}
                class="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <option value="anonymous">Anonymous</option>
                <option value="token">Token</option>
                <option value="openid">OpenID</option>
                <option value="ldap">LDAP</option>
              </select>
            </div>

            {/* Service Type */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Service Type
              </label>
              <select
                value={serviceType()}
                onChange={(e) => setServiceType(e.currentTarget.value as any)}
                class="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <option value="ClusterIP">ClusterIP</option>
                <option value="NodePort">NodePort</option>
                <option value="LoadBalancer">LoadBalancer</option>
              </select>
            </div>

            {/* Ingress */}
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableIngress()}
                  onChange={(e) => setEnableIngress(e.currentTarget.checked)}
                  class="w-4 h-4"
                />
                <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Enable Ingress
                </span>
              </label>
              <Show when={enableIngress()}>
                <input
                  type="text"
                  value={ingressHost()}
                  onInput={(e) => setIngressHost(e.currentTarget.value)}
                  class="w-full mt-2 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                  placeholder="kiali.example.com"
                />
              </Show>
            </div>
          </div>

          {/* Footer */}
          <div class="flex items-center justify-end gap-3 p-6 border-t" style={{ 'border-color': 'var(--border-color)' }}>
            <button
              onClick={props.onClose}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={installing()}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--accent-primary)',
                color: '#000',
              }}
            >
              {installing() ? 'Installing...' : 'Install'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default KialiInstallModal;

