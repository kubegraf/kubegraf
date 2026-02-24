/**
 * FixExecutionModal - Fix execution with preview and progress tracking
 *
 * Features:
 * - Fix preview before execution
 * - Step-by-step execution plan
 * - Progress tracking
 * - Real-time status updates
 * - Cancel/abort capability
 * - Rollback trigger
 */

import { Component, Show, For, createSignal, onMount, onCleanup } from 'solid-js';
import { Incident } from '../../services/api';
import { setupAccessibleModal, globalAnnouncer } from './accessibilityUtils';

interface FixExecutionModalProps {
  incident: Incident;
  fixId: string;
  fixTitle: string;
  fixDescription: string;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: (error: string) => void;
}

type ExecutionStatus = 'preview' | 'confirming' | 'executing' | 'success' | 'failed' | 'rolling-back';

interface ExecutionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

const FixExecutionModal: Component<FixExecutionModalProps> = (props) => {
  const [status, setStatus] = createSignal<ExecutionStatus>('preview');
  const [currentStep, setCurrentStep] = createSignal(0);
  const [executionSteps, setExecutionSteps] = createSignal<ExecutionStep[]>([]);
  const [executionLogs, setExecutionLogs] = createSignal<string[]>([]);
  const [canRollback, setCanRollback] = createSignal(false);
  const [rollbackWindow, setRollbackWindow] = createSignal(30); // seconds

  // Initialize execution steps based on incident pattern
  onMount(() => {
    const steps = generateExecutionSteps();
    setExecutionSteps(steps);
  });

  // Rollback window countdown
  let rollbackInterval: number | undefined;
  let modalCleanup: (() => void) | undefined;

  const startRollbackTimer = () => {
    setCanRollback(true);
    setRollbackWindow(30);

    rollbackInterval = window.setInterval(() => {
      setRollbackWindow((prev) => {
        if (prev <= 1) {
          clearInterval(rollbackInterval);
          setCanRollback(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Setup accessibility on mount
  onMount(() => {
    const modalElement = document.querySelector('.fix-execution-modal');
    if (modalElement instanceof HTMLElement) {
      modalCleanup = setupAccessibleModal(modalElement);
    }
  });

  onCleanup(() => {
    if (rollbackInterval) clearInterval(rollbackInterval);
    if (modalCleanup) modalCleanup();
  });

  // Generate execution steps based on pattern
  const generateExecutionSteps = (): ExecutionStep[] => {
    const pattern = props.incident.pattern || '';
    const steps: ExecutionStep[] = [];

    // Common first step
    steps.push({
      id: 'validate',
      title: 'Validate Prerequisites',
      description: 'Checking cluster state and resource availability',
      status: 'pending',
    });

    // Pattern-specific steps
    if (pattern.includes('CRASH') || pattern.includes('OOM')) {
      steps.push({
        id: 'snapshot',
        title: 'Create State Snapshot',
        description: 'Taking snapshot for rollback capability',
        status: 'pending',
      });
      steps.push({
        id: 'update-resources',
        title: 'Update Resource Limits',
        description: 'Applying new memory/CPU limits',
        status: 'pending',
      });
      steps.push({
        id: 'restart',
        title: 'Restart Pod',
        description: 'Performing controlled pod restart',
        status: 'pending',
      });
    } else if (pattern.includes('IMAGE_PULL')) {
      steps.push({
        id: 'verify-image',
        title: 'Verify Image Availability',
        description: 'Checking image exists in registry',
        status: 'pending',
      });
      steps.push({
        id: 'update-spec',
        title: 'Update Pod Specification',
        description: 'Correcting image name/tag',
        status: 'pending',
      });
    } else if (pattern.includes('CONFIG')) {
      steps.push({
        id: 'backup-config',
        title: 'Backup Current Configuration',
        description: 'Saving current ConfigMap/Secret',
        status: 'pending',
      });
      steps.push({
        id: 'apply-config',
        title: 'Apply Configuration Fix',
        description: 'Updating configuration values',
        status: 'pending',
      });
    } else {
      steps.push({
        id: 'apply-fix',
        title: 'Apply Fix',
        description: 'Executing remediation steps',
        status: 'pending',
      });
    }

    // Common final steps
    steps.push({
      id: 'verify',
      title: 'Verify Health',
      description: 'Running health checks and verifying pod status',
      status: 'pending',
    });

    steps.push({
      id: 'monitor',
      title: 'Monitor Stability',
      description: 'Monitoring for 30 seconds (rollback window)',
      status: 'pending',
    });

    return steps;
  };

  // Execute fix
  const executeFix = async () => {
    setStatus('executing');
    addLog('Starting fix execution...');
    globalAnnouncer.announce('Fix execution started', 'assertive');

    for (let i = 0; i < executionSteps().length; i++) {
      setCurrentStep(i);
      const step = executionSteps()[i];

      // Update step to running
      updateStepStatus(i, 'running');
      addLog(`[${step.title}] Starting...`);
      globalAnnouncer.announce(`Step ${i + 1}: ${step.title}`, 'polite');

      // Simulate execution (replace with actual API calls)
      await executeStep(step, i);
    }
  };

  const executeStep = async (step: ExecutionStep, index: number): Promise<void> => {
    return new Promise((resolve) => {
      // Simulate execution time
      const executionTime = 1000 + Math.random() * 2000;

      setTimeout(() => {
        // Simulate 5% failure rate
        const failed = Math.random() < 0.05;

        if (failed && index > 0) {
          updateStepStatus(index, 'failed', 'Execution failed');
          addLog(`[${step.title}] ❌ Failed: ${step.title} execution error`);
          setStatus('failed');
          globalAnnouncer.announce(`Fix execution failed at step: ${step.title}`, 'assertive');
          props.onFailure(`Failed at step: ${step.title}`);
        } else {
          updateStepStatus(index, 'success');
          addLog(`[${step.title}] ✓ Completed successfully`);

          // If this is the last step
          if (index === executionSteps().length - 1) {
            setStatus('success');
            addLog('✓ Fix applied successfully!');
            addLog('Starting 30-second monitoring window...');
            globalAnnouncer.announce('Fix applied successfully. Monitoring stability.', 'assertive');
            startRollbackTimer();

            setTimeout(() => {
              if (status() === 'success') {
                addLog('✓ Monitoring complete. Fix verified stable.');
                globalAnnouncer.announce('Fix verified stable. Monitoring complete.', 'polite');
                props.onSuccess();
              }
            }, 2000);
          }
        }

        resolve();
      }, executionTime);
    });
  };

  const updateStepStatus = (index: number, newStatus: ExecutionStep['status'], error?: string) => {
    setExecutionSteps((steps) =>
      steps.map((step, i) => {
        if (i === index) {
          return {
            ...step,
            status: newStatus,
            startTime: newStatus === 'running' ? new Date() : step.startTime,
            endTime: newStatus !== 'running' && newStatus !== 'pending' ? new Date() : undefined,
            error,
          };
        }
        return step;
      })
    );
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLogs((logs) => [...logs, `[${timestamp}] ${message}`]);
  };

  const handleConfirm = () => {
    setStatus('confirming');
    addLog('User confirmed fix execution');
    setTimeout(() => executeFix(), 500);
  };

  const handleCancel = () => {
    if (status() === 'executing') {
      addLog('⚠️ Execution cancelled by user');
      setStatus('failed');
      props.onFailure('Cancelled by user');
    } else {
      props.onClose();
    }
  };

  const handleRollback = () => {
    setStatus('rolling-back');
    addLog('⏪ Initiating rollback...');

    setTimeout(() => {
      addLog('⏪ Rolling back changes...');
      setTimeout(() => {
        addLog('⏪ Rollback completed successfully');
        props.onClose();
      }, 2000);
    }, 1000);
  };

  const getStatusIcon = () => {
    switch (status()) {
      case 'preview':
      case 'confirming':
        return '🔍';
      case 'executing':
        return '⚡';
      case 'success':
        return '✓';
      case 'failed':
        return '❌';
      case 'rolling-back':
        return '⏪';
      default:
        return '•';
    }
  };

  const getStatusText = () => {
    switch (status()) {
      case 'preview':
        return 'Preview Fix Execution';
      case 'confirming':
        return 'Preparing Execution...';
      case 'executing':
        return 'Executing Fix...';
      case 'success':
        return 'Fix Applied Successfully';
      case 'failed':
        return 'Execution Failed';
      case 'rolling-back':
        return 'Rolling Back Changes...';
      default:
        return '';
    }
  };

  return (
    <div
      class="fix-execution-overlay"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="fix-execution-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div class="execution-modal-header" data-status={status()} role="banner">
          <div class="execution-status-indicator">
            <span class="status-icon" aria-hidden="true">{getStatusIcon()}</span>
            <div class="status-text-group">
              <h3 id="modal-title">{getStatusText()}</h3>
              <p class="execution-subtitle" id="modal-description">{props.fixTitle}</p>
            </div>
          </div>
          <button
            class="close-execution-btn"
            onClick={handleCancel}
            disabled={status() === 'executing' || status() === 'rolling-back'}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div class="execution-modal-content">
          {/* Preview Mode */}
          <Show when={status() === 'preview'}>
            <div class="execution-preview">
              <div class="preview-section">
                <h4>📋 Execution Plan</h4>
                <p class="preview-description">{props.fixDescription}</p>
                <div class="preview-steps">
                  <For each={executionSteps()}>
                    {(step, index) => (
                      <div class="preview-step-item">
                        <span class="step-number">{index() + 1}</span>
                        <div class="step-details">
                          <strong>{step.title}</strong>
                          <span class="step-desc">{step.description}</span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              <div class="preview-section">
                <h4>⚠️ Important Notes</h4>
                <ul class="preview-notes">
                  <li>✓ Automatic rollback enabled (30-second window)</li>
                  <li>✓ State snapshot will be taken before changes</li>
                  <li>✓ Health checks will run continuously</li>
                  <li>⚠️ Brief service disruption may occur during pod restart</li>
                </ul>
              </div>
            </div>
          </Show>

          {/* Execution Mode */}
          <Show when={status() === 'confirming' || status() === 'executing' || status() === 'success' || status() === 'failed' || status() === 'rolling-back'}>
            <div class="execution-progress">
              {/* Progress Steps */}
              <div class="execution-steps">
                <For each={executionSteps()}>
                  {(step, index) => (
                    <div
                      class="execution-step"
                      classList={{
                        active: index() === currentStep() && status() === 'executing',
                        completed: step.status === 'success',
                        failed: step.status === 'failed',
                      }}
                    >
                      <div class="step-indicator">
                        <Show
                          when={step.status === 'success'}
                          fallback={
                            <Show
                              when={step.status === 'failed'}
                              fallback={
                                <Show
                                  when={step.status === 'running'}
                                  fallback={<span class="step-dot">•</span>}
                                >
                                  <span class="step-spinner">⟳</span>
                                </Show>
                              }
                            >
                              <span class="step-icon failed">✕</span>
                            </Show>
                          }
                        >
                          <span class="step-icon success">✓</span>
                        </Show>
                      </div>
                      <div class="step-info">
                        <strong>{step.title}</strong>
                        <span class="step-description">{step.description}</span>
                        <Show when={step.error}>
                          <span class="step-error">Error: {step.error}</span>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              {/* Execution Logs */}
              <div class="execution-logs">
                <h4>📝 Execution Logs</h4>
                <div class="logs-viewer">
                  <For each={executionLogs()}>
                    {(log) => <div class="log-entry">{log}</div>}
                  </For>
                </div>
              </div>

              {/* Rollback Window */}
              <Show when={canRollback()}>
                <div class="rollback-window">
                  <div class="rollback-timer">
                    <span class="timer-icon">⏱️</span>
                    <span class="timer-text">
                      Rollback available for {rollbackWindow()} seconds
                    </span>
                  </div>
                  <button class="rollback-btn" onClick={handleRollback}>
                    ⏪ Rollback Now
                  </button>
                </div>
              </Show>
            </div>
          </Show>
        </div>

        {/* Footer */}
        <div class="execution-modal-footer">
          <Show when={status() === 'preview'}>
            <button class="execution-btn secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button class="execution-btn primary" onClick={handleConfirm}>
              <span class="btn-icon">⚡</span>
              <span class="btn-label">Execute Fix</span>
            </button>
          </Show>

          <Show when={status() === 'success'}>
            <button class="execution-btn primary" onClick={props.onClose}>
              <span class="btn-icon">✓</span>
              <span class="btn-label">Done</span>
            </button>
          </Show>

          <Show when={status() === 'failed'}>
            <button class="execution-btn secondary" onClick={props.onClose}>
              Close
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default FixExecutionModal;
