// Copyright 2025 KubeGraf Contributors
// Notification Center with persistent notifications

import { Component, Show, For, createSignal, onMount, createEffect } from 'solid-js';
import {
  loadPersistentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
  type PersistentNotification,
} from '../stores/persistent-notifications';

const NotificationCenter: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [notifications, setNotifications] = createSignal<PersistentNotification[]>([]);

  // Load notifications on mount and set up auto-refresh
  onMount(() => {
    refreshNotifications();
    
    // Refresh every 30 seconds to check for new notifications
    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  });

  const refreshNotifications = () => {
    setNotifications(loadPersistentNotifications());
  };

  const unreadCount = () => getUnreadCount();

  const handleNotificationClick = (notification: PersistentNotification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
      refreshNotifications();
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    refreshNotifications();
  };

  const handleDelete = (id: string, e: Event) => {
    e.stopPropagation();
    deleteNotification(id);
    refreshNotifications();
  };

  const handleClearAll = () => {
    clearAllNotifications();
    refreshNotifications();
  };

  const getTypeColor = (type: PersistentNotification['type']) => {
    switch (type) {
      case 'success':
        return 'var(--success-color)';
      case 'error':
        return 'var(--error-color)';
      case 'warning':
        return '#f59e0b';
      default:
        return 'var(--accent-primary)';
    }
  };

  const getTypeIcon = (type: PersistentNotification['type']) => {
    switch (type) {
      case 'success':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'error':
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 2) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Notification Icon Button */}
      <div class="relative">
        <button
          onClick={() => setIsOpen(!isOpen())}
          class="p-1.5 rounded transition-colors hover:bg-[var(--bg-tertiary)] relative"
          style={{
            color: 'var(--text-secondary)',
          }}
          title={`Notifications (${unreadCount()} unread)`}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <Show when={unreadCount() > 0}>
            <span
              class="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[10px] font-bold min-w-[14px] h-3.5 px-0.5"
              style={{
                background: 'var(--error-color)',
                color: '#fff',
              }}
            >
              {unreadCount() > 99 ? '99+' : unreadCount()}
            </span>
          </Show>
        </button>
      </div>

      {/* Notification Panel */}
      <Show when={isOpen()}>
        <div
          class="fixed bottom-12 right-6 z-50 w-96 max-h-[600px] rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Header */}
          <div
            class="flex items-center justify-between p-4 border-b"
            style={{ 'border-color': 'var(--border-color)' }}
          >
            <div class="flex items-center gap-2">
              <h3 class="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Notifications
              </h3>
              <Show when={unreadCount() > 0}>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#000',
                  }}
                >
                  {unreadCount()} new
                </span>
              </Show>
            </div>
            <div class="flex items-center gap-2">
              <Show when={notifications().length > 0}>
                <button
                  onClick={handleMarkAllRead}
                  class="text-xs px-2 py-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  class="text-xs px-2 py-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--error-color)' }}
                >
                  Clear all
                </button>
              </Show>
              <button
                onClick={() => setIsOpen(false)}
                class="p-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Notifications List */}
          <div class="overflow-y-auto max-h-[500px]">
            <Show
              when={notifications().length > 0}
              fallback={
                <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  <svg
                    class="w-12 h-12 mx-auto mb-2 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <p>No notifications</p>
                </div>
              }
            >
              <For each={notifications()}>
                {(notification) => (
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    class={`p-4 border-b cursor-pointer transition-colors ${
                      notification.read
                        ? 'opacity-60'
                        : 'bg-[var(--bg-tertiary)]/30'
                    }`}
                    style={{
                      'border-color': 'var(--border-color)',
                    }}
                  >
                    <div class="flex items-start gap-3">
                      <div
                        class="p-2 rounded-lg flex-shrink-0"
                        style={{
                          background: `${getTypeColor(notification.type)}20`,
                        }}
                      >
                        <svg
                          class="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: getTypeColor(notification.type) }}
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d={getTypeIcon(notification.type)}
                          />
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p
                          class="text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {notification.message}
                        </p>
                        <p
                          class="text-xs mt-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(notification.id, e)}
                        class="p-1 rounded transition-colors hover:bg-[var(--bg-tertiary)] flex-shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <svg
                          class="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <Show when={!notification.read}>
                      <div
                        class="mt-2 h-1 rounded-full"
                        style={{
                          background: getTypeColor(notification.type),
                          width: '100%',
                        }}
                      />
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </>
  );
};

export default NotificationCenter;

