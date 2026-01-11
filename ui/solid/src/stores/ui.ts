import { createSignal } from 'solid-js';

export type View =
  | 'dashboard'
  | 'topology'
  | 'pods'
  | 'deployments'
  | 'statefulsets'
  | 'daemonsets'
  | 'cronjobs'
  | 'jobs'
  | 'pdb'
  | 'hpa'
  | 'services'
  | 'ingresses'
  | 'configmaps'
  | 'secrets'
  | 'certificates'
  | 'nodes'
  | 'resourcemap'
  | 'trafficmap'
  | 'security'
  | 'anomalies'
  | 'incidents'
  | 'timeline'
  | 'timehelix'
  | 'resourcewaterfall'
  | 'plugins'
  | 'cost'
  | 'drift'
  | 'continuity'
  | 'ai'
  | 'autofix'
  | 'events'
  | 'monitoredevents'
  | 'logs'
  | 'apps'
  | 'customapps'
  | 'networkpolicies'
  | 'storage'
  | 'rbac'
  | 'serviceaccounts'
  | 'customresources'
  | 'settings'
  | 'aiinsights'
  | 'deployapp'
  | 'releases'
  | 'rollouts'
  | 'terminal'
  | 'connectors'
  | 'aiagents'
  | 'connect'
  | 'clustermanager'
  | 'usermanagement'
  | 'uidemo'
  | 'trainingjobs'
  | 'trainingjobdetails'
  | 'inferenceservices'
  | 'mlflow'
  | 'feast'
  | 'gpudashboard'
  | 'mlworkflows'
  | 'multicluster'
  | 'knowledgebank'
  | 'sreagent';

// Initialize currentView - check sessionStorage, default to 'clustermanager'
const getInitialView = (): View => {
  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem('kubegraf-current-view');
    if (stored) {
      return stored as View;
    }
  }

  return 'clustermanager';
};

const [currentViewBase, setCurrentViewBase] = createSignal<View>(getInitialView());

// Export wrapper that also saves to sessionStorage
const currentView = currentViewBase;
const setCurrentView = (view: View) => {
  setCurrentViewBase(view);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('kubegraf-current-view', view);
  }
};
// Sidebar behavior
// - sidebarCollapsed: compact (icons-only) mode
// - sidebarAutoHide: auto-hide behavior (collapse when not hovered)
const getInitialSidebarAutoHide = (): boolean => {
  try {
    return localStorage.getItem('kubegraf-sidebar-autohide') === 'true';
  } catch {
    return false;
  }
};

const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
const [sidebarAutoHide, setSidebarAutoHide] = createSignal(getInitialSidebarAutoHide());
const [aiPanelOpen, setAIPanelOpen] = createSignal(false);
const [selectedResource, setSelectedResource] = createSignal<any>(null);
const [detailPanelOpen, setDetailPanelOpen] = createSignal(false);
const [searchQuery, setSearchQuery] = createSignal('');
const [notifications, setNotifications] = createSignal<Notification[]>([]);
const [terminalOpen, setTerminalOpen] = createSignal(false);

interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'update';
  message: string;
  timestamp: Date;
  duration?: number; // Custom duration in ms (default 5000)
  actions?: NotificationAction[];
  persistent?: boolean; // If true, won't auto-dismiss
}

// Play sound effect for notification
function playNotificationSound(type: Notification['type']) {
  try {
    const soundEnabled = localStorage.getItem('kubegraf-sound');
    if (soundEnabled !== 'true') {
      return; // Sound effects disabled
    }

    // Create audio context for generating sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Generate different tones based on notification type
    const frequencies: Record<Notification['type'], number> = {
      success: 800,  // Higher pitch for success
      error: 300,   // Lower pitch for error
      warning: 500, // Medium pitch for warning
      info: 600,    // Medium-high pitch for info
    };

    const frequency = frequencies[type] || 600;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Silently fail if audio context is not available
    console.debug('Could not play notification sound:', error);
  }
}

interface AddNotificationOptions {
  duration?: number;
  actions?: NotificationAction[];
  persistent?: boolean;
}

function addNotification(message: string, type: Notification['type'] = 'info', options?: AddNotificationOptions) {
  const notification: Notification = {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: new Date(),
    duration: options?.duration,
    actions: options?.actions,
    persistent: options?.persistent,
  };
  setNotifications(prev => [notification, ...prev].slice(0, 10));

  // Play sound effect if enabled
  playNotificationSound(type === 'update' ? 'info' : type);

  // Auto-dismiss after specified duration (default 5 seconds), unless persistent
  if (!options?.persistent) {
    const duration = options?.duration || 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, duration);
  }
}

function dismissNotification(id: string) {
  setNotifications(prev => prev.filter(n => n.id !== id));
}

// Special function for update notifications with buttons
function showUpdateNotification(version: string, onApply: () => void) {
  const id = crypto.randomUUID();
  const notification: Notification = {
    id,
    type: 'update',
    message: `🆕 New version v${version} is available!`,
    timestamp: new Date(),
    duration: 10000,
    actions: [
      {
        label: 'Remind me later',
        variant: 'secondary',
        onClick: () => {
          dismissNotification(id);
          // Store reminder time to show again later
          localStorage.setItem('kubegraf-update-reminder-time', Date.now().toString());
        },
      },
      {
        label: 'Apply Update',
        variant: 'primary',
        onClick: () => {
          dismissNotification(id);
          onApply();
        },
      },
    ],
  };
  
  setNotifications(prev => [notification, ...prev].slice(0, 10));
  playNotificationSound('info');

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, 10000);
}

function toggleSidebar() {
  setSidebarCollapsed(!sidebarCollapsed());
}

function toggleSidebarAutoHide() {
  const next = !sidebarAutoHide();
  setSidebarAutoHide(next);
  try {
    localStorage.setItem('kubegraf-sidebar-autohide', String(next));
  } catch {
    // ignore
  }
}

function toggleAIPanel() {
  setAIPanelOpen(!aiPanelOpen());
}

function toggleTerminal() {
  const current = terminalOpen();
  console.log('[ui.ts] toggleTerminal called - current:', current, '-> new:', !current);
  setTerminalOpen(!current);
  console.log('[ui.ts] terminalOpen after setState:', terminalOpen());
}

function openResourceDetail(resource: any) {
  setSelectedResource(resource);
  setDetailPanelOpen(true);
}

function closeResourceDetail() {
  setDetailPanelOpen(false);
  setSelectedResource(null);
}

export {
  currentView,
  setCurrentView,
  sidebarCollapsed,
  setSidebarCollapsed,
  toggleSidebar,
  sidebarAutoHide,
  setSidebarAutoHide,
  toggleSidebarAutoHide,
  aiPanelOpen,
  setAIPanelOpen,
  toggleAIPanel,
  terminalOpen,
  setTerminalOpen,
  toggleTerminal,
  selectedResource,
  setSelectedResource,
  detailPanelOpen,
  setDetailPanelOpen,
  openResourceDetail,
  closeResourceDetail,
  searchQuery,
  setSearchQuery,
  notifications,
  addNotification,
  dismissNotification,
  showUpdateNotification,
};

export type { Notification, NotificationAction };
