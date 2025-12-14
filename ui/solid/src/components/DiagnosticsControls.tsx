import { Component, Show, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { addNotification } from '../stores/ui';

interface DiagnosticsControlsProps {
  onRun: () => void;
  isRunning: boolean;
  lastRunTime: Date | null;
}

const DiagnosticsControls: Component<DiagnosticsControlsProps> = (props) => {
  const getStoredFrequency = (): number => {
    const stored = localStorage.getItem('diagnostics-frequency-minutes');
    // Default to once per day (1440 minutes)
    return stored ? parseInt(stored, 10) : 1440;
  };

  const [frequency, setFrequency] = createSignal<number>(getStoredFrequency());
  const [nextRunTime, setNextRunTime] = createSignal<Date | null>(null);
  const [intervalId, setIntervalId] = createSignal<number | null>(null);

  // Save frequency to localStorage
  const updateFrequency = (minutes: number) => {
    setFrequency(minutes);
    localStorage.setItem('diagnostics-frequency-minutes', minutes.toString());
    setupAutoRun();
    addNotification(`Diagnostics frequency set to ${minutes} minutes`, 'success');
  };

  // Setup auto-run based on frequency
  const setupAutoRun = () => {
    // Clear existing interval
    if (intervalId() !== null) {
      clearInterval(intervalId()!);
    }

    const freqMinutes = frequency();
    
    // Don't auto-run if frequency is 0 (manual only)
    if (freqMinutes === 0) {
      setNextRunTime(null);
      return;
    }

    // Calculate next run time
    const lastRun = props.lastRunTime;
    let nextRun: Date;
    
    if (lastRun) {
      nextRun = new Date(lastRun.getTime() + freqMinutes * 60 * 1000);
      // If next run time is in the past, run immediately
      if (nextRun.getTime() < Date.now()) {
        nextRun = new Date(Date.now() + freqMinutes * 60 * 1000);
      }
    } else {
      nextRun = new Date(Date.now() + freqMinutes * 60 * 1000);
    }

    setNextRunTime(nextRun);

    // Set up interval
    const id = window.setInterval(() => {
      props.onRun();
      setNextRunTime(new Date(Date.now() + freqMinutes * 60 * 1000));
    }, freqMinutes * 60 * 1000);

    setIntervalId(id);
  };

  // Initialize auto-run on mount
  onMount(() => {
    setupAutoRun();
  });

  // Cleanup interval on unmount
  onCleanup(() => {
    if (intervalId() !== null) {
      clearInterval(intervalId()!);
    }
  });

  // Update when lastRunTime changes
  createEffect(() => {
    if (props.lastRunTime) {
      setupAutoRun();
    }
  });

  const formatTimeUntil = (targetDate: Date): string => {
    const now = Date.now();
    const target = targetDate.getTime();
    const diff = target - now;

    if (diff <= 0) return 'Now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `in ${hours}h ${minutes % 60}m`;
    }
    return `in ${minutes}m`;
  };

  return (
    <div class="flex items-center gap-3 flex-wrap">
      {/* Frequency Selector */}
      <div class="flex items-center gap-2">
        <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Run every:
        </label>
        <select
          value={frequency()}
          onChange={(e) => updateFrequency(parseInt(e.currentTarget.value, 10))}
          class="px-3 py-1.5 rounded-lg text-sm border"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
          disabled={props.isRunning}
        >
          <option value="0">Manual only</option>
          <option value="1440" selected={frequency() === 1440}>Once per day</option>
          <option value="360">6 hours</option>
          <option value="720">12 hours</option>
          <option value="5">5 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="240">4 hours</option>
        </select>
      </div>

      {/* Status Message */}
      <Show when={frequency() > 0 && nextRunTime()}>
        <div class="text-xs px-3 py-1.5 rounded" style={{ 
          background: 'rgba(6, 182, 212, 0.1)', 
          color: 'var(--accent-primary)',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}>
          Next run: {nextRunTime() ? formatTimeUntil(nextRunTime()!) : 'Calculating...'}
        </div>
      </Show>

      {/* Manual Run Button */}
      <button
        onClick={props.onRun}
        disabled={props.isRunning}
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        style={{ 
          background: props.isRunning ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
          color: props.isRunning ? 'var(--text-secondary)' : 'white' 
        }}
      >
        <Show
          when={!props.isRunning}
          fallback={
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Show>
        {props.isRunning ? 'Running...' : 'Run Diagnostics Now'}
      </button>

      {/* Info Message */}
      <Show when={frequency() === 0}>
        <div class="text-xs px-3 py-1.5 rounded" style={{ 
          background: 'rgba(107, 114, 128, 0.1)', 
          color: 'var(--text-muted)'
        }}>
          Diagnostics set to manual mode. Click "Run Diagnostics Now" to scan.
        </div>
      </Show>
      
      {/* Schedule Info Message */}
      <Show when={frequency() > 0}>
        <div class="text-xs px-3 py-1.5 rounded" style={{ 
          background: 'rgba(6, 182, 212, 0.1)', 
          color: 'var(--accent-primary)',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}>
          {frequency() === 1440 
            ? 'Automatic scan runs once per day. You can also run manually anytime to get the latest results.'
            : frequency() === 360
            ? 'Automatic scan runs every 6 hours. You can also run manually anytime to get the latest results.'
            : frequency() === 720
            ? 'Automatic scan runs every 12 hours. You can also run manually anytime to get the latest results.'
            : `Automatic scan runs every ${frequency() < 60 ? `${frequency()} minutes` : `${Math.floor(frequency() / 60)} hour${Math.floor(frequency() / 60) > 1 ? 's' : ''}`}. You can also run manually anytime.`}
        </div>
      </Show>
    </div>
  );
};

export default DiagnosticsControls;

