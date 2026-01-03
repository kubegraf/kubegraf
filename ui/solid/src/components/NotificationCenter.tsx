// Copyright 2025 KubeGraf Contributors
// Notification Center with backend API integration

import { Component, Show, For, createSignal, onMount, createEffect, onCleanup } from 'solid-js';
import { createResource } from 'solid-js';
import { api, type Notification } from '../services/api';

const NotificationCenter: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<'all' | 'unread'>('unread');
  let buttonRef: HTMLButtonElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  // Fetch notifications from backend
  const [notificationsData, { refetch: refreshNotifications }] = createResource(
    () => api.getNotifications('all')
  );

  // Fetch unread count
  const [unreadCountData, { refetch: refreshUnreadCount }] = createResource(
    () => api.getUnreadNotificationCount()
  );

  const notifications = () => notificationsData()?.notifications || [];
  const unreadCount = () => unreadCountData()?.unread_count || 0;

  // Auto-refresh every 30 seconds
  onMount(() => {
    const interval = setInterval(() => {
      refreshNotifications();
      refreshUnreadCount();
    }, 30000);

    onCleanup(() => clearInterval(interval));
  });

  // Close on click outside
  createEffect(() => {
    if (isOpen()) {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          panelRef &&
          buttonRef &&
          !panelRef.contains(e.target as Node) &&
          !buttonRef.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
    }
  });

  // Close on Escape
  createEffect(() => {
    if (isOpen()) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
          buttonRef?.focus();
        }
      };

      document.addEventListener('keydown', handleEscape);
      onCleanup(() => document.removeEventListener('keydown', handleEscape));
    }
  });

  const filteredNotifications = () => {
    const all = notifications();
    if (activeTab() === 'unread') {
      return all.filter(n => !n.is_read);
    }
    return all;
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await api.markNotificationRead(notification.id);
      refreshNotifications();
      refreshUnreadCount();
    }
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    refreshNotifications();
    refreshUnreadCount();
  };

  const handleDelete = async (id: string, e: Event) => {
    e.stopPropagation();
    await api.deleteNotification(id);
    refreshNotifications();
    refreshUnreadCount();
  };

  const getSeverityColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'success': return 'var(--success-color)';
      case 'error': return 'var(--error-color)';
      case 'warning': return '#f59e0b';
      case 'security': return '#8b5cf6';
      case 'policy': return '#06b6d4';
      default: return 'var(--accent-primary)';
    }
  };

  const getSeverityIcon = (severity: Notification['severity']) => {
    switch (severity) {
      case 'success': return '✓';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'security': return '🔒';
      case 'policy': return '📋';
      default: return 'ℹ️';
    }
  };

  const formatTime = (timestamp: string) => {
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
      {/* Notification Bell Button */}
      <div class="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen())}
          class="p-2 rounded transition-colors hover:bg-[var(--bg-tertiary)] relative"
          style={{ color: 'var(--text-secondary)' }}
          title={`Notifications (${unreadCount()} unread)`}
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={isOpen()}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <Show when={unreadCount() > 0}>
            <span
              class="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold min-w-[16px] h-4 px-1"
              style={{ background: 'var(--error-color)', color: '#fff' }}
              aria-label={`${unreadCount()} unread notifications`}
            >
              {unreadCount() > 99 ? '99+' : unreadCount()}
            </span>
            <span class="sr-only">{unreadCount()} unread notifications</span>
          </Show>
        </button>
      </div>

      {/* Notification Panel */}
      <Show when={isOpen()}>
        <div
          ref={panelRef}
          class="fixed top-[4.5rem] right-6 z-50 w-96 max-w-[calc(100vw-3rem)] max-h-[600px] rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header with Tabs */}
          <div
            class="border-b"
            style={{ 'border-color': 'var(--border-color)' }}
          >
            <div class="flex items-center justify-between p-4 pb-2">
              <h3 class="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                Notifications
              </h3>
              <div class="flex items-center gap-2">
                <Show when={filteredNotifications().length > 0}>
                  <button
                    onClick={handleMarkAllRead}
                    class="text-xs px-2 py-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Mark all read
                  </button>
                </Show>
                <button
                  onClick={() => setIsOpen(false)}
                  class="p-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label="Close notifications"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div class="flex gap-4 px-4">
              <button
                onClick={() => setActiveTab('unread')}
                class={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab() === 'unread'
                    ? 'border-[var(--accent-primary)]'
                    : 'border-transparent'
                }`}
                style={{
                  color: activeTab() === 'unread' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                Unread {unreadCount() > 0 ? `(${unreadCount()})` : ''}
              </button>
              <button
                onClick={() => setActiveTab('all')}
                class={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab() === 'all'
                    ? 'border-[var(--accent-primary)]'
                    : 'border-transparent'
                }`}
                style={{
                  color: activeTab() === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                All
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div class="overflow-y-auto max-h-[500px]">
            <Show
              when={filteredNotifications().length > 0}
              fallback={
                <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p class="text-sm">
                    {activeTab() === 'unread' ? "You're all caught up!" : 'No notifications yet'}
                  </p>
                </div>
              }
            >
              <For each={filteredNotifications()}>
                {(notification) => (
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    class={`p-4 border-b cursor-pointer transition-colors hover:bg-[var(--bg-tertiary)]/50 ${
                      notification.is_read ? 'opacity-60' : 'bg-[var(--bg-tertiary)]/30'
                    }`}
                    style={{ 'border-color': 'var(--border-color)' }}
                  >
                    <div class="flex items-start gap-3">
                      <div class="text-xl flex-shrink-0 mt-0.5">
                        {getSeverityIcon(notification.severity)}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          {notification.title}
                        </p>
                        <p class="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                          {notification.body}
                        </p>
                        <div class="flex items-center justify-between">
                          <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatTime(notification.created_at)}
                          </span>
                          <Show when={notification.link_url}>
                            <a
                              href={notification.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-xs hover:underline"
                              style={{ color: 'var(--accent-primary)' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View more →
                            </a>
                          </Show>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(notification.id, e)}
                        class="p-1 rounded transition-colors hover:bg-[var(--bg-tertiary)] flex-shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label="Delete notification"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
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
