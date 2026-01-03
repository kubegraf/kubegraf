// Copyright 2025 KubeGraf Contributors
// Policy acceptance blocking modal

import { Component, Show, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { api, type PolicyStatus } from '../services/api';
import { setCurrentView } from '../stores/ui';

interface PolicyModalProps {
  policyStatus: PolicyStatus;
  onAccept: () => void;
}

const PolicyModal: Component<PolicyModalProps> = (props) => {
  const [accepting, setAccepting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isMinimized, setIsMinimized] = createSignal(false);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await api.acceptPolicy(props.policyStatus.policy_version);
      props.onAccept();
      // Navigate to ClusterManager after successful acceptance
      setCurrentView('clustermanager');
    } catch (err: any) {
      console.error('Failed to accept policy:', err);
      setError(err.message || 'Failed to accept policy. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Show when={props.policyStatus.policy_required}>
      <Portal>
        {/* Minimized floating reminder - snackbar style above footer */}
        <Show when={isMinimized()}>
          <div
            class="fixed bottom-0 left-0 right-0 z-[9998] animate-slide-in"
            style={{
              'padding-bottom': '3.5rem', // Space above footer (footer is ~3rem height)
            }}
          >
            <div class="max-w-7xl mx-auto px-6">
              <button
                onClick={() => setIsMinimized(false)}
                class="w-full flex items-center justify-between gap-4 px-6 py-4 rounded-t-lg shadow-2xl border-t-4 transition-all hover:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]"
                style={{
                  background: 'linear-gradient(to bottom, var(--bg-card) 0%, var(--bg-secondary) 100%)',
                  'border-color': 'var(--accent-primary)',
                  'border-left': '1px solid var(--border-color)',
                  'border-right': '1px solid var(--border-color)',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.3), 0 0 0 1px var(--border-color)',
                }}
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0"
                    style={{
                      background: 'var(--accent-primary)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  >
                    <span class="text-2xl">📋</span>
                  </div>
                  <div class="text-left">
                    <div class="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                      Policy Acceptance Required
                    </div>
                    <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      You must review and accept our Terms & Privacy Policy to continue using cluster features
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                  <div class="text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{
                    background: 'var(--accent-primary)',
                    color: '#000',
                  }}>
                    Review & Accept →
                  </div>
                </div>
              </button>
            </div>
          </div>
        </Show>

        {/* Full modal */}
        <Show when={!isMinimized()}>
          <div
            class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(8px)' }}
          >
          <div
            class="rounded-lg border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--bg-card)',
              'border-color': 'var(--border-color)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
          >
            {/* Header */}
            <div class="mb-6 text-center">
              <div class="text-5xl mb-4">📋</div>
              <h2
                id="policy-modal-title"
                class="text-2xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Updated Terms & Privacy Policy
              </h2>
              <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Please review and accept to continue using cluster features
              </p>
            </div>

            {/* Content */}
            <div class="mb-6 space-y-4">
              <div
                class="p-4 rounded-lg"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <h3 class="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  What's new in this policy:
                </h3>
                <ul class="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li class="flex items-start gap-2">
                    <span class="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                    <span>Clarified that KubeGraf is <strong>local-first</strong> and stores all data locally by default</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                    <span>Added optional announcements feature with strict privacy controls (opt-in, no telemetry)</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                    <span>Updated security practices and data handling policies</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                    <span>Clarified terms regarding cluster access and Kubernetes operations</span>
                  </li>
                </ul>
              </div>

              {/* Privacy Highlight */}
              <div
                class="p-4 rounded-lg"
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
              >
                <div class="flex items-start gap-3">
                  <div class="text-2xl flex-shrink-0">🔒</div>
                  <div>
                    <h4 class="font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>
                      Privacy First
                    </h4>
                    <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No telemetry, no tracking, no data collection by default. Your cluster data stays on your machine.
                    </p>
                  </div>
                </div>
              </div>

              {/* Read Full Policy Link */}
              <div class="text-center">
                <button
                  onClick={() => {
                    setCurrentView('privacy');
                    setIsMinimized(true);
                  }}
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Read Full Policy Document
                </button>
              </div>
            </div>

            {/* Error Message */}
            <Show when={error()}>
              <div
                class="mb-4 p-3 rounded-lg"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <p class="text-sm" style={{ color: 'var(--error-color)' }}>
                  {error()}
                </p>
              </div>
            </Show>

            {/* Actions */}
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={() => window.close()}
                class="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
                disabled={accepting()}
              >
                Exit Application
              </button>
              <button
                onClick={handleAccept}
                class="px-8 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#000',
                }}
                disabled={accepting()}
              >
                {accepting() ? (
                  <span class="flex items-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Accepting...
                  </span>
                ) : (
                  'Accept & Continue'
                )}
              </button>
            </div>

            {/* Policy Version Info */}
            <div class="mt-4 pt-4 border-t text-center" style={{ 'border-color': 'var(--border-color)' }}>
              <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                Policy Version: {props.policyStatus.policy_version}
              </p>
            </div>
          </div>
        </div>
        </Show>
      </Portal>
    </Show>
  );
};

export default PolicyModal;
