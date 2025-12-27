import { Component, Show, For, createEffect, createSignal, onCleanup } from 'solid-js';
import {
  executionPanelOpen,
  executionPanelExpanded,
  executionStatus,
  executionMode,
  executionSourceLabel,
  executionLabel,
  executionLines,
  executionSummaryState,
  executionSeveritySummary,
  executionError,
  executionRawError,
  executionAutoScrollEnabled,
  executionHasManualScroll,
  executionDurationDisplay,
  executionCombinedOutput,
  hideExecutionPanel,
  toggleExecutionPanelExpanded,
  onUserManualScroll,
  enableAutoScroll,
  clearExecutionOutput,
  retryLastExecution,
} from '../stores/executionPanel';
import { addNotification } from '../stores/ui';

const ExecutionPanel: Component = () => {
  let containerRef: HTMLDivElement | undefined;
  const [showRawError, setShowRawError] = createSignal(false);

  // Auto-scroll when new lines arrive unless the user has manually scrolled up
  createEffect(() => {
    const _ = executionLines();
    if (!executionAutoScrollEnabled() || !containerRef) return;
    queueMicrotask(() => {
      if (!containerRef) return;
      containerRef.scrollTop = containerRef.scrollHeight;
    });
  });

  const handleScroll = () => {
    if (!containerRef) return;
    const nearBottom =
      containerRef.scrollHeight - containerRef.scrollTop - containerRef.clientHeight < 32;
    if (!nearBottom) {
      onUserManualScroll();
    }
  };

  const handleCopyOutput = async () => {
    try {
      const text = executionCombinedOutput();
      if (!text) {
        addNotification('No output to copy yet', 'warning');
        return;
      }
      await navigator.clipboard.writeText(text);
      addNotification('Execution output copied to clipboard', 'success');
    } catch (err) {
      console.error('[ExecutionPanel] Failed to copy output:', err);
      addNotification('Failed to copy output to clipboard', 'error');
    }
  };

  // Keep panel cleanup simple on unmount
  onCleanup(() => {
    clearExecutionOutput();
  });

  const statusBadge = () => {
    const s = executionStatus();
    const mode = executionMode();
    const label = (() => {
      switch (s) {
        case 'planned':
          return 'Planned';
        case 'running':
          return 'Executing…';
        case 'succeeded':
          return 'Succeeded';
        case 'failed':
          return 'Failed';
        default:
          return 'Idle';
      }
    })();

    const baseColor =
      s === 'failed'
        ? 'var(--error-color)'
        : s === 'succeeded'
          ? 'var(--success-color)'
          : s === 'running'
            ? 'var(--accent-primary)'
            : 'var(--text-muted)';

    const bg =
      mode === 'dry-run'
        ? 'color-mix(in srgb, var(--warning-color) 15%, transparent)'
        : mode === 'apply'
          ? 'color-mix(in srgb, var(--error-color) 12%, transparent)'
          : 'var(--bg-tertiary)';

    return (
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: bg,
          color: baseColor,
        }}
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          style={{
            background:
              s === 'failed'
                ? 'var(--error-color)'
                : s === 'succeeded'
                  ? 'var(--success-color)'
                  : s === 'running'
                    ? 'var(--accent-primary)'
                    : 'var(--text-muted)',
          }}
        />
        {label}
      </span>
    );
  };

  const modeBadge = () => {
    const mode = executionMode();
    const label = mode === 'dry-run' ? 'Dry run' : 'Apply';
    const bg =
      mode === 'dry-run'
        ? 'color-mix(in srgb, var(--warning-color) 15%, transparent)'
        : 'color-mix(in srgb, var(--error-color) 12%, transparent)';
    const color =
      mode === 'dry-run'
        ? 'var(--warning-color)'
        : 'var(--error-color)';

    return (
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
        style={{
          background: bg,
          color,
        }}
        title={mode === 'dry-run' ? 'Dry run (no changes applied)' : 'Real apply (changes applied)'}
      >
        {mode === 'dry-run' ? 'DRY RUN' : 'APPLY'}
      </span>
    );
  };

  const sourceLabel = () => {
    const src = executionSourceLabel();
    const label = src === 'kubectl-equivalent' ? 'kubectl-equivalent' : 'Shell';
    return (
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
        title={
          src === 'kubectl-equivalent'
            ? 'Execution path is equivalent to kubectl / Kubernetes API calls'
            : 'Execution is running as a local shell command'
        }
      >
        {label}
      </span>
    );
  };

  const summaryChips = () => {
    const s = executionSummaryState();
    if (!s) return null;
    const chips: { label: string; value: string; color: string }[] = [];

    if (s.exitCode !== undefined && s.exitCode !== null) {
      chips.push({
        label: 'Exit code',
        value: String(s.exitCode),
        color: s.exitCode === 0 ? 'var(--success-color)' : 'var(--error-color)',
      });
    }
    if (s.durationMs !== undefined && s.durationMs !== null) {
      chips.push({
        label: 'Duration',
        value: executionDurationDisplay() || `${(s.durationMs / 1000).toFixed(1)}s`,
        color: 'var(--text-secondary)',
      });
    }
    if (s.resourcesChanged) {
      const r = s.resourcesChanged;
      if (r.created) {
        chips.push({
          label: 'Created',
          value: String(r.created),
          color: 'var(--success-color)',
        });
      }
      if (r.configured) {
        chips.push({
          label: 'Configured',
          value: String(r.configured),
          color: 'var(--accent-secondary)',
        });
      }
      if (r.deleted) {
        chips.push({
          label: 'Deleted',
          value: String(r.deleted),
          color: 'var(--error-color)',
        });
      }
      if (r.unchanged) {
        chips.push({
          label: 'Unchanged',
          value: String(r.unchanged),
          color: 'var(--text-secondary)',
        });
      }
    }

    return (
      <div class="flex flex-wrap gap-2 mt-1">
        <For each={chips}>
          {(chip) => (
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
              style={{
                background: 'var(--bg-secondary)',
                color: chip.color,
                border: '1px solid var(--border-color)',
              }}
            >
              <span class="uppercase tracking-wide opacity-70">{chip.label}</span>
              <span class="font-semibold">{chip.value}</span>
            </span>
          )}
        </For>
      </div>
    );
  };

  const severityChips = () => {
    const sev = executionSeveritySummary();
    if (!sev) return null;
    const chips: { label: string; value: number; color: string }[] = [];

    if (sev.errors > 0) {
      chips.push({ label: 'Errors', value: sev.errors, color: 'var(--error-color)' });
    }
    if (sev.warnings > 0) {
      chips.push({ label: 'Warnings', value: sev.warnings, color: 'var(--warning-color)' });
    }

    if (!chips.length) return null;

    return (
      <div class="flex flex-wrap gap-2 mt-1">
        <For each={chips}>
          {(chip) => (
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
              style={{
                background: 'var(--bg-secondary)',
                color: chip.color,
                border: '1px solid var(--border-color)',
              }}
            >
              <span class="uppercase tracking-wide opacity-70">{chip.label}</span>
              <span class="font-semibold">{chip.value}</span>
            </span>
          )}
        </For>
      </div>
    );
  };

  const prettyTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString();
  };

  const stepChips = () => {
    const mode = executionMode();
    const isApply = mode === 'apply';
    const steps = [
      { key: 'preview', label: 'Preview', active: true },
      { key: 'dry', label: 'Dry run', active: true },
      { key: 'apply', label: 'Apply', active: isApply },
    ];
    return (
      <div class="flex flex-wrap gap-2">
        <For each={steps}>
          {(step) => (
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: step.active ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: step.active ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                style={{
                  background: step.active ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              />
              {step.label}
              <Show when={step.key === 'dry'}>
                <span style={{ color: 'var(--text-muted)', 'font-weight': 500 }}>
                  (server-side validation)
                </span>
              </Show>
            </span>
          )}
        </For>
      </div>
    );
  };

  return (
    <Show when={executionPanelOpen()}>
      <div
        class="fixed right-4 bottom-24 z-40"
        style={{
          maxWidth: '640px',
          width: executionPanelExpanded() ? '640px' : '360px',
        }}
      >
        <div
          class="card shadow-lg border"
          style={{
            background: 'var(--bg-card)',
            'border-color': 'var(--border-color)',
          }}
        >
          {/* Header */}
          <div
            class="flex items-center justify-between px-3 py-2 border-b"
            style={{ 'border-color': 'var(--border-color)' }}
          >
            <div class="flex items-center gap-2 min-w-0">
              <div
                class="w-6 h-6 rounded-md flex items-center justify-center"
                style={{
                  background:
                    executionMode() === 'dry-run'
                      ? 'color-mix(in srgb, var(--warning-color) 12%, transparent)'
                      : 'color-mix(in srgb, var(--error-color) 12%, transparent)',
                  color:
                    executionMode() === 'dry-run'
                      ? 'var(--warning-color)'
                      : 'var(--error-color)',
                }}
              >
                {/* Terminal-like icon */}
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {executionLabel() || 'Command execution'}
                  </span>
                  {modeBadge()}
                  {sourceLabel()}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  {statusBadge()}
                  <Show when={executionDurationDisplay()}>
                    <span class="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {executionDurationDisplay()}
                    </span>
                  </Show>
                </div>
                <div class="mt-1">
                  {stepChips()}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1">
              {/* Auto-scroll toggle */}
              <Show when={executionHasManualScroll()}>
                <button
                  class="px-2 py-1 rounded text-[11px]"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={() => enableAutoScroll()}
                  title="Resume auto-scroll"
                >
                  Auto-scroll
                </button>
              </Show>

              {/* Clear output */}
              <button
                class="p-1.5 rounded transition-colors"
                onClick={() => clearExecutionOutput()}
                title="Clear output"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Copy output */}
              <button
                class="p-1.5 rounded transition-colors"
                onClick={handleCopyOutput}
                title="Copy output"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {/* Expand / collapse */}
              <button
                class="p-1.5 rounded transition-colors"
                onClick={() => toggleExecutionPanelExpanded()}
                title={executionPanelExpanded() ? 'Collapse' : 'Expand'}
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d={
                      executionPanelExpanded()
                        ? 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'
                        : 'M3 4h7m0 0V3m0 1L3 11m18 9h-7m0 0v1m0-1l7-7'
                    }
                  />
                </svg>
              </button>

              {/* Close */}
              <button
                class="p-1.5 rounded transition-colors"
                onClick={() => hideExecutionPanel()}
                title="Hide execution panel"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <Show when={executionPanelExpanded()}>
            <div class="px-3 pt-2 pb-2 space-y-2 text-xs">
              {/* Status + summary */}
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <Show when={executionStatus() === 'running'}>
                    <div class="flex items-center gap-1.5">
                      <div class="spinner" style={{ width: '14px', height: '14px' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>Executing…</span>
                    </div>
                  </Show>
                  <Show when={executionStatus() === 'planned'}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Planned &mdash; awaiting execution start
                    </span>
                  </Show>
                  <Show when={executionStatus() === 'succeeded'}>
                    <span style={{ color: 'var(--success-color)' }}>Execution succeeded</span>
                  </Show>
                  <Show when={executionStatus() === 'failed'}>
                    <span style={{ color: 'var(--error-color)' }}>Execution failed</span>
                  </Show>
                </div>

                <div class="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <Show when={executionSummaryState()}>
                    <>
                      <span>Started: {prettyTime(executionSummaryState()?.startedAt ?? null)}</span>
                      <span>Completed: {prettyTime(executionSummaryState()?.completedAt ?? null)}</span>
                    </>
                  </Show>
                </div>
              </div>

              {/* Resource summary chips */}
              <Show when={executionSummaryState()}>
                {summaryChips()}
              </Show>

              {/* Warning/error summary */}
              <Show when={executionSeveritySummary().errors > 0 || executionSeveritySummary().warnings > 0}>
                {severityChips()}
              </Show>

              {/* Log output */}
              <div
                ref={containerRef}
                class="mt-2 rounded-md border font-mono text-[11px] leading-relaxed"
                style={{
                  'border-color': 'var(--border-color)',
                  background: 'var(--bg-primary)',
                  maxHeight: '260px',
                  minHeight: '140px',
                  overflow: 'auto',
                }}
                onScroll={handleScroll}
              >
                <Show
                  when={executionLines().length > 0}
                  fallback={
                    <div
                      class="px-3 py-2 text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {executionMode() === 'dry-run'
                        ? 'Dry run: server-side validation only. No resources changed.'
                        : 'Live execution stream. Secrets are masked. Watch for apply progress and outcomes here.'}
                    </div>
                  }
                >
                  <For each={executionLines()}>
                    {(line) => {
                      const d = new Date(line.timestamp);
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      const ss = String(d.getSeconds()).padStart(2, '0');
                      return (
                        <div
                          class="px-3 py-0.5 whitespace-pre-wrap"
                          style={{
                            color:
                              line.stream === 'stderr'
                                ? 'var(--error-color)'
                                : 'var(--text-secondary)',
                          }}
                        >
                          <span
                            class="mr-2"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            [{hh}:{mm}:{ss}]
                          </span>
                          <span
                            class="mr-2"
                            style={{
                              color:
                                line.stream === 'stderr'
                                  ? 'var(--error-color)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {line.stream === 'stderr' ? 'ERR' : 'OUT'}
                          </span>
                          <span>{line.text}</span>
                        </div>
                      );
                    }}
                  </For>
                </Show>
              </div>

              {/* Error details + actions */}
              <Show when={executionError()}>
                <div
                  class="mt-2 rounded-md px-3 py-2 text-[11px]"
                  style={{
                    background: 'color-mix(in srgb, var(--error-color) 12%, transparent)',
                    color: 'var(--error-color)',
                    border: '1px solid color-mix(in srgb, var(--error-color) 40%, transparent)',
                  }}
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-1.5 mb-1">
                        <svg
                          class="w-3.5 h-3.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 5a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"
                          />
                        </svg>
                        <span class="font-semibold">Error</span>
                      </div>
                      <div>{executionError()}</div>
                    </div>
                    <div class="flex flex-col gap-1 items-end">
                      <button
                        class="px-2 py-1 rounded text-[11px] font-medium"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                        }}
                        onClick={() => retryLastExecution()}
                      >
                        Retry
                      </button>
                      <Show when={executionRawError()}>
                        <button
                          class="px-2 py-1 rounded text-[10px]"
                          style={{
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                          }}
                          onClick={() => setShowRawError((prev) => !prev)}
                        >
                          {showRawError() ? 'Hide raw output' : 'Show raw output'}
                        </button>
                      </Show>
                    </div>
                  </div>
                  <Show when={showRawError() && executionRawError()}>
                    <pre
                      class="mt-2 p-2 rounded overflow-auto max-h-32"
                      style={{
                        border: '1px solid color-mix(in srgb, var(--error-color) 40%, transparent)',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-secondary)',
                      }}
                    >
                      {executionRawError()}
                    </pre>
                  </Show>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default ExecutionPanel;


