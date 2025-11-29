import { createSignal } from 'solid-js';

export type View =
  | 'landing'
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
  | 'nodes'
  | 'resourcemap'
  | 'security'
  | 'plugins'
  | 'ai';

const [currentView, setCurrentView] = createSignal<View>('dashboard');
const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
const [aiPanelOpen, setAIPanelOpen] = createSignal(false);
const [selectedResource, setSelectedResource] = createSignal<any>(null);
const [detailPanelOpen, setDetailPanelOpen] = createSignal(false);
const [searchQuery, setSearchQuery] = createSignal('');
const [notifications, setNotifications] = createSignal<Notification[]>([]);

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

function addNotification(type: Notification['type'], message: string) {
  const notification: Notification = {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: new Date(),
  };
  setNotifications(prev => [notification, ...prev].slice(0, 10));

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
