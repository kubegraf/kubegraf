/**
 * Logger Utility for KubeGraf
 *
 * Features:
 * - Environment-based logging (verbose in dev, minimal in prod)
 * - Log levels: debug, info, warn, error
 * - Local storage persistence with rotation
 * - Automatic archival and cleanup
 *
 * Industry Best Practices:
 * - Debug logs: 7 days retention
 * - Info logs: 30 days retention
 * - Warn/Error logs: 90 days retention
 * - Daily log rotation
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private isDev: boolean;
  private logLevel: LogLevel;
  private maxLogsPerLevel = 100; // Keep only last 100 logs in localStorage (for quick debugging)
  private logs: LogEntry[] = [];
  private storageKey = 'kubegraf_logs';
  private lastRotation: Date;
  private backendBatchSize = 10; // Send logs to backend in batches
  private backendBatch: LogEntry[] = [];

  // Retention periods (in days) - These apply to backend file storage, not localStorage
  private retention = {
    [LogLevel.DEBUG]: 7,
    [LogLevel.INFO]: 30,
    [LogLevel.WARN]: 90,
    [LogLevel.ERROR]: 90,
  };

  constructor() {
    this.isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    this.logLevel = this.isDev ? LogLevel.DEBUG : LogLevel.WARN;
    this.lastRotation = new Date();

    // Initialize: Load existing logs and check if rotation is needed
    this.loadLogs();
    this.checkRotation();

    // Schedule daily rotation check (every hour)
    setInterval(() => this.checkRotation(), 60 * 60 * 1000);
  }

  /**
   * Check if daily rotation is needed
   */
  private checkRotation() {
    const now = new Date();
    const hoursSinceRotation = (now.getTime() - this.lastRotation.getTime()) / (1000 * 60 * 60);

    if (hoursSinceRotation >= 24) {
      this.rotateLogs();
    }
  }

  /**
   * Rotate logs: Archive current logs and cleanup old archives
   */
  private rotateLogs() {
    try {
      // Archive current logs
      const archiveKey = `${this.storageKey}_archive_${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(archiveKey, JSON.stringify(this.logs));

      // Clear current logs
      this.logs = [];
      localStorage.removeItem(this.storageKey);

      // Cleanup old archives
      this.cleanupOldArchives();

      this.lastRotation = new Date();

      this.info('Logger', 'Log rotation completed', { archiveKey });
    } catch (error) {
      console.error('[Logger] Failed to rotate logs:', error);
    }
  }

  /**
   * Remove archived logs older than retention period
   */
  private cleanupOldArchives() {
    try {
      const now = new Date();
      const keysToRemove: string[] = [];

      // Scan all localStorage keys for log archives
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.storageKey}_archive_`)) {
          // Extract date from key (format: kubegraf_logs_archive_2025-12-29)
          const dateStr = key.split('_archive_')[1];
          const archiveDate = new Date(dateStr);
          const ageInDays = (now.getTime() - archiveDate.getTime()) / (1000 * 60 * 60 * 24);

          // Determine retention based on log level (use max retention for archives)
          const maxRetention = Math.max(...Object.values(this.retention));

          if (ageInDays > maxRetention) {
            keysToRemove.push(key);
          }
        }
      }

      // Remove old archives
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        this.debug('Logger', `Removed old archive: ${key}`, { ageInDays: keysToRemove.length });
      });

      if (keysToRemove.length > 0) {
        this.info('Logger', `Cleaned up ${keysToRemove.length} old log archives`);
      }
    } catch (error) {
      console.error('[Logger] Failed to cleanup old archives:', error);
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Logger] Failed to load logs:', error);
      this.logs = [];
    }
  }

  /**
   * Persist logs to localStorage
   */
  private persistLogs() {
    try {
      // Only keep recent logs in active storage (last 100 entries)
      const recentLogs = this.logs.slice(-this.maxLogsPerLevel);
      localStorage.setItem(this.storageKey, JSON.stringify(recentLogs));
    } catch (error) {
      console.error('[Logger] Failed to persist logs:', error);
      // If storage is full, force rotation
      this.rotateLogs();
    }
  }

  /**
   * Send logs to backend in batches (fire-and-forget)
   */
  private async sendToBackend() {
    if (this.backendBatch.length === 0) {
      return;
    }

    const batch = [...this.backendBatch];
    this.backendBatch = [];

    try {
      await fetch('/api/ui-logs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch (error) {
      // Silent failure - don't want logging to break the app
      // Only log to console in dev mode
      if (this.isDev) {
        console.error('[Logger] Failed to send logs to backend:', error);
      }
    }
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, category: string, message: string, data?: any) {
    // Skip if log level is below threshold
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Add to in-memory logs
    this.logs.push(entry);

    // Persist to localStorage
    this.persistLogs();

    // Add to backend batch
    this.backendBatch.push(entry);

    // Send to backend if batch is full (fire-and-forget)
    if (this.backendBatch.length >= this.backendBatchSize) {
      this.sendToBackend();
    }

    // Console output (environment-based)
    const prefix = `[${LogLevel[level]}] [${category}]`;
    const consoleData = data ? [message, data] : [message];

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDev) console.log(prefix, ...consoleData);
        break;
      case LogLevel.INFO:
        if (this.isDev) console.info(prefix, ...consoleData);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...consoleData);
        break;
      case LogLevel.ERROR:
        console.error(prefix, ...consoleData);
        break;
    }
  }

  /**
   * Public logging methods
   */
  debug(category: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any) {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, category, message, data);
  }

  /**
   * Get logs for a specific level or all logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  /**
   * Get logs from archives
   */
  getArchivedLogs(date?: string): LogEntry[] {
    try {
      if (date) {
        const archiveKey = `${this.storageKey}_archive_${date}`;
        const stored = localStorage.getItem(archiveKey);
        return stored ? JSON.parse(stored) : [];
      } else {
        // Return all archived logs
        const allArchived: LogEntry[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`${this.storageKey}_archive_`)) {
            const stored = localStorage.getItem(key);
            if (stored) {
              allArchived.push(...JSON.parse(stored));
            }
          }
        }
        return allArchived;
      }
    } catch (error) {
      console.error('[Logger] Failed to get archived logs:', error);
      return [];
    }
  }

  /**
   * Clear all logs (for testing/debugging)
   */
  clearAll() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);

    // Clear all archives
    const archiveKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.storageKey}_archive_`)) {
        archiveKeys.push(key);
      }
    }
    archiveKeys.forEach(key => localStorage.removeItem(key));

    this.info('Logger', 'All logs cleared');
  }

  /**
   * Export logs as JSON (for support/debugging)
   */
  exportLogs(): string {
    const allLogs = {
      current: this.logs,
      archived: this.getArchivedLogs(),
      metadata: {
        exportDate: new Date().toISOString(),
        version: import.meta.env.VITE_APP_VERSION || 'unknown',
        environment: this.isDev ? 'development' : 'production',
        retention: this.retention,
      },
    };
    return JSON.stringify(allLogs, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();

// Export for use in other modules
export default logger;
