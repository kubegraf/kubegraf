import { createSignal } from 'solid-js';

export type View =
  | 'dashboard'
  | 'pods'
  | 'deployments'
  | 'statefulsets'
  | 'daemonsets'
  | 'cronjobs'
  | 'jobs'
  | 'services'
  | 'ingresses'
  | 'configmaps'
  | 'secrets'
  | 'certificates'
  | 'nodes'
  | 'resourcemap'
  | 'security'
  | 'anomalies'
  | 'plugins'
  | 'cost'
  | 'drift'
  | 'ai'
  | 'events'
  | 'monitoredevents'
  | 'logs'
  | 'apps'
  | 'customapps'
  | 'networkpolicies'
  | 'storage'
  | 'rbac'
  | 'settings'
  | 'aiinsights'
  | 'deployapp'
  | 'releases'
  | 'rollouts'
  | 'terminal'
  | 'connectors'
  | 'aiagents'
  | 'clustermanager'
  | 'usermanagement'
  | 'uidemo'
  | 'trainingjobs'
  | 'trainingjobdetails'
  | 'inferenceservices'
  | 'feast'
  | 'gpudashboard';

const [currentView, setCurrentView] = createSignal<View>('dashboard');
const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
const [aiPanelOpen, setAIPanelOpen] = createSignal(false);
const [selectedResource, setSelectedResource] = createSignal<any>(null);
const [detailPanelOpen, setDetailPanelOpen] = createSignal(false);
const [searchQuery, setSearchQuery] = createSignal('');
const [notifications, setNotifications] = createSignal<Notification[]>([]);
const [terminalOpen, setTerminalOpen] = createSignal(false);

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
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

function addNotification(message: string, type: Notification['type'] = 'info') {
  const notification: Notification = {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: new Date(),
  };
  setNotifications(prev => [notification, ...prev].slice(0, 10));

  // Play sound effect if enabled
  playNotificationSound(type);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
  }, 5000);
}

function toggleSidebar() {
  setSidebarCollapsed(!sidebarCollapsed());
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
};
