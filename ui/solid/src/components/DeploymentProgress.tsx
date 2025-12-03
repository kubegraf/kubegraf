import { Component, Show, For, createSignal, onCleanup, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';

export interface DeploymentTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  startTime?: number;
  endTime?: number;
}

export interface Deployment {
  id: string;
  appName: string;
  appVersion: string;
  namespace: string;
  tasks: DeploymentTask[];
  overallStatus: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
}

const [deployments, setDeployments] = createSignal<Deployment[]>([]);
const [isMinimized, setIsMinimized] = createSignal(false);
const [soundEnabled, setSoundEnabled] = createSignal(
  localStorage.getItem('kubegraf_sound_enabled') !== 'false'
);

// Audio context for sound alerts
let audioContext: AudioContext | null = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playSuccessSound = () => {
  if (!soundEnabled()) return;
  try {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.error('Failed to play success sound:', error);
  }
};

const playErrorSound = () => {
  if (!soundEnabled()) return;
  try {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (error) {
    console.error('Failed to play error sound:', error);
  }
};

// Export functions for use in other components
export const addDeployment = (appName: string, appVersion: string, namespace: string, tasks: string[]) => {
  const deployment: Deployment = {
    id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    appName,
    appVersion,
    namespace,
    tasks: tasks.map((taskName, index) => ({
      id: `task-${index}`,
      name: taskName,
      status: index === 0 ? 'running' : 'pending',
      progress: index === 0 ? 10 : 0,
    })),
    overallStatus: 'running',
    createdAt: Date.now(),
  };

  setDeployments((prev) => [...prev, deployment]);
  return deployment.id;
};

export const updateDeploymentTask = (
  deploymentId: string,
  taskId: string,
  updates: Partial<DeploymentTask>
) => {
  setDeployments((prev) =>
    prev.map((dep) => {
      if (dep.id !== deploymentId) return dep;

      const updatedTasks = dep.tasks.map((task) => {
        if (task.id !== taskId) return task;

        const updated = { ...task, ...updates };

        // If task completed, play sound and start next task
        if (updated.status === 'completed' && task.status !== 'completed') {
          updated.endTime = Date.now();
          playSuccessSound();

          // Start next task
          const currentIndex = dep.tasks.findIndex((t) => t.id === taskId);
          if (currentIndex < dep.tasks.length - 1) {
            setTimeout(() => {
              updateDeploymentTask(deploymentId, dep.tasks[currentIndex + 1].id, {
                status: 'running',
                progress: 10,
                startTime: Date.now(),
              });
            }, 300);
          }
        } else if (updated.status === 'failed' && task.status !== 'failed') {
          updated.endTime = Date.now();
          playErrorSound();
        }

        return updated;
      });

      // Update overall status
      const allCompleted = updatedTasks.every((t) => t.status === 'completed');
      const anyFailed = updatedTasks.some((t) => t.status === 'failed');

      return {
        ...dep,
        tasks: updatedTasks,
        overallStatus: anyFailed ? 'failed' : allCompleted ? 'completed' : 'running',
      };
    })
  );
};

export const cancelDeployment = (deploymentId: string) => {
  setDeployments((prev) =>
    prev.map((dep) => {
      if (dep.id !== deploymentId) return dep;
      return {
        ...dep,
        overallStatus: 'cancelled' as const,
        tasks: dep.tasks.map((task) =>
          task.status === 'pending' || task.status === 'running'
            ? { ...task, status: 'failed' as const, message: 'Cancelled by user' }
            : task
        ),
      };
    })
  );
};

export const removeDeployment = (deploymentId: string) => {
  setDeployments((prev) => prev.filter((dep) => dep.id !== deploymentId));
};

export const toggleSound = () => {
  const newValue = !soundEnabled();
  setSoundEnabled(newValue);
  localStorage.setItem('kubegraf_sound_enabled', String(newValue));
};

const DeploymentProgress: Component = () => {
  const activeDeployments = () =>
    deployments().filter((d) => d.overallStatus === 'running' || d.overallStatus === 'pending');

  const completedDeployments = () =>
    deployments().filter((d) => d.overallStatus === 'completed' || d.overallStatus === 'failed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'var(--success-color)';
      case 'failed':
        return 'var(--error-color)';
      case 'running':
        return 'var(--primary-color)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '⟳';
      default:
        return '○';
    }
  };

  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime) return '';
    const end = endTime || Date.now();
    const duration = Math.floor((end - startTime) / 1000);
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Auto-remove completed deployments after 10 seconds
  createEffect(() => {
    const completed = completedDeployments();
    completed.forEach((dep) => {
      const lastTask = dep.tasks[dep.tasks.length - 1];
      if (lastTask.endTime && Date.now() - lastTask.endTime > 10000) {
        removeDeployment(dep.id);
      }
    });
  });

  return (
    <Show when={deployments().length > 0}>
      <Portal>
        <div
          class="fixed bottom-6 right-6 z-50 transition-all duration-300"
          style={{
            width: isMinimized() ? '320px' : '420px',
            'max-height': isMinimized() ? '60px' : '600px',
          }}
        >
          <div
            class="rounded-lg shadow-2xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Header */}
            <div
              class="flex items-center justify-between px-4 py-3 cursor-pointer"
              style={{
                background: 'var(--header-bg)',
                'border-bottom': isMinimized() ? 'none' : '1px solid var(--border-color)',
              }}
              onClick={() => setIsMinimized(!isMinimized())}
            >
              <div class="flex items-center gap-3">
                <svg
                  class="w-5 h-5 animate-spin"
                  classList={{ hidden: activeDeployments().length === 0 }}
                  style={{ color: 'var(--primary-color)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <div>
                  <h3 class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Deployments ({deployments().length})
                  </h3>
                  <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {activeDeployments().length} active
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                {/* Sound Toggle */}
                <button
                  class="p-1.5 rounded hover:opacity-70 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSound();
                  }}
                  title={soundEnabled() ? 'Disable sounds' : 'Enable sounds'}
                >
                  <Show
                    when={soundEnabled()}
                    fallback={
                      <svg class="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    }
                  >
                    <svg class="w-4 h-4" style={{ color: 'var(--success-color)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </Show>
                </button>

                {/* Minimize/Maximize */}
                <svg
                  class="w-4 h-4 transition-transform"
                  classList={{ 'rotate-180': !isMinimized() }}
                  style={{ color: 'var(--text-secondary)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Content */}
            <Show when={!isMinimized()}>
              <div class="overflow-y-auto" style={{ 'max-height': '520px' }}>
                {/* Active Deployments */}
                <Show when={activeDeployments().length > 0}>
                  <div class="p-4 space-y-4">
                    <For each={activeDeployments()}>
                      {(deployment) => (
                        <div
                          class="p-4 rounded-lg"
                          style={{
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {/* Deployment Header */}
                          <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                              <h4 class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {deployment.appName}
                              </h4>
                              <p class="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                v{deployment.appVersion} → {deployment.namespace}
                              </p>
                            </div>
                            <button
                              class="text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                              style={{
                                background: 'var(--error-color-alpha)',
                                color: 'var(--error-color)',
                              }}
                              onClick={() => cancelDeployment(deployment.id)}
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Tasks */}
                          <div class="space-y-2">
                            <For each={deployment.tasks}>
                              {(task) => (
                                <div class="flex items-center gap-3">
                                  {/* Status Icon */}
                                  <div
                                    class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{
                                      background:
                                        task.status === 'running'
                                          ? 'var(--primary-color-alpha)'
                                          : 'transparent',
                                      color: getStatusColor(task.status),
                                      border:
                                        task.status === 'pending'
                                          ? '1px solid var(--border-color)'
                                          : 'none',
                                    }}
                                    classList={{ 'animate-pulse': task.status === 'running' }}
                                  >
                                    {getStatusIcon(task.status)}
                                  </div>

                                  {/* Task Info */}
                                  <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                      <p class="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {task.name}
                                      </p>
                                      <span class="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                                        {formatDuration(task.startTime, task.endTime)}
                                      </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <Show when={task.status === 'running' && task.progress > 0}>
                                      <div
                                        class="mt-1.5 h-1 rounded-full overflow-hidden"
                                        style={{ background: 'var(--border-color)' }}
                                      >
                                        <div
                                          class="h-full transition-all duration-300"
                                          style={{
                                            background: 'var(--primary-color)',
                                            width: `${task.progress}%`,
                                          }}
                                        />
                                      </div>
                                    </Show>

                                    {/* Task Message */}
                                    <Show when={task.message}>
                                      <p class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        {task.message}
                                      </p>
                                    </Show>
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Completed Deployments */}
                <Show when={completedDeployments().length > 0}>
                  <div
                    class="p-4 space-y-2 border-t"
                    style={{ 'border-color': 'var(--border-color)' }}
                  >
                    <h4 class="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Recent
                    </h4>
                    <For each={completedDeployments()}>
                      {(deployment) => (
                        <div
                          class="flex items-center justify-between p-2 rounded"
                          style={{ background: 'var(--input-bg)' }}
                        >
                          <div class="flex items-center gap-2 flex-1 min-w-0">
                            <span
                              class="text-sm"
                              style={{
                                color: getStatusColor(deployment.overallStatus),
                              }}
                            >
                              {getStatusIcon(deployment.overallStatus)}
                            </span>
                            <span class="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                              {deployment.appName}
                            </span>
                          </div>
                          <button
                            class="text-xs opacity-50 hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={() => removeDeployment(deployment.id)}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default DeploymentProgress;
export { deployments, soundEnabled };
