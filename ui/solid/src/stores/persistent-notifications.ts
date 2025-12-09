// Copyright 2025 KubeGraf Contributors
// Persistent notification storage with 1-day retention

export interface PersistentNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number; // Unix timestamp in milliseconds
  read: boolean;
}

const STORAGE_KEY = 'kubegraf-persistent-notifications';
const RETENTION_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

/**
 * Load notifications from localStorage and filter out expired ones
 */
export function loadPersistentNotifications(): PersistentNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const notifications: PersistentNotification[] = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out notifications older than 1 day
    const validNotifications = notifications.filter(
      (n) => now - n.timestamp < RETENTION_MS
    );

    // Save back if any were removed
    if (validNotifications.length !== notifications.length) {
      savePersistentNotifications(validNotifications);
    }

    return validNotifications;
  } catch (error) {
    console.error('Error loading persistent notifications:', error);
    return [];
  }
}

/**
 * Save notifications to localStorage
 */
export function savePersistentNotifications(
  notifications: PersistentNotification[]
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving persistent notifications:', error);
  }
}

/**
 * Add a new persistent notification
 */
export function addPersistentNotification(
  message: string,
  type: PersistentNotification['type'] = 'info'
): PersistentNotification {
  const notification: PersistentNotification = {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: Date.now(),
    read: false,
  };

  const notifications = loadPersistentNotifications();
  notifications.unshift(notification); // Add to beginning
  savePersistentNotifications(notifications);

  return notification;
}

/**
 * Mark a notification as read
 */
export function markNotificationAsRead(id: string): void {
  const notifications = loadPersistentNotifications();
  const updated = notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  savePersistentNotifications(updated);
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(): void {
  const notifications = loadPersistentNotifications();
  const updated = notifications.map((n) => ({ ...n, read: true }));
  savePersistentNotifications(updated);
}

/**
 * Delete a notification
 */
export function deleteNotification(id: string): void {
  const notifications = loadPersistentNotifications();
  const filtered = notifications.filter((n) => n.id !== id);
  savePersistentNotifications(filtered);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  savePersistentNotifications([]);
}

/**
 * Get unread notification count
 */
export function getUnreadCount(): number {
  const notifications = loadPersistentNotifications();
  return notifications.filter((n) => !n.read).length;
}

