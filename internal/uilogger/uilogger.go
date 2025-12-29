// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package uilogger

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/natefinch/lumberjack.v2"
)

// LogLevel represents the severity of a log entry
type LogLevel string

const (
	LogLevelDebug LogLevel = "DEBUG"
	LogLevelInfo  LogLevel = "INFO"
	LogLevelWarn  LogLevel = "WARN"
	LogLevelError LogLevel = "ERROR"
)

// LogEntry represents a single log entry from the UI
type LogEntry struct {
	Timestamp string   `json:"timestamp"`
	Level     LogLevel `json:"level"`
	Category  string   `json:"category"`
	Message   string   `json:"message"`
	Data      any      `json:"data,omitempty"`
}

// UILogger manages frontend logs with file rotation
type UILogger struct {
	logger         *log.Logger
	rotatingWriter *lumberjack.Logger
	logDir         string
}

var instance *UILogger

// Initialize creates a new UI logger with file rotation
// Follows industry best practices from lumberjack documentation
func Initialize() (*UILogger, error) {
	if instance != nil {
		return instance, nil
	}

	// Get home directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	// Create log directory: ~/.kubegraf/logs
	logDir := filepath.Join(homeDir, ".kubegraf", "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	// Configure lumberjack for log rotation
	// Based on best practices from:
	// - https://github.com/natefinch/lumberjack
	// - https://signoz.io/guides/zerolog-golang/
	rotatingWriter := &lumberjack.Logger{
		Filename:   filepath.Join(logDir, "kubegraf-ui.log"),
		MaxSize:    10,    // Max size in MB before rotation (10 MB)
		MaxBackups: 30,    // Max number of old log files to keep (30 days)
		MaxAge:     90,    // Max days to retain old log files (90 days for errors/warns)
		Compress:   true,  // Compress rotated files with gzip
		LocalTime:  true,  // Use local time for filenames
	}

	// Create multi-writer: write to both file and stdout (for debugging)
	multiWriter := io.MultiWriter(rotatingWriter, os.Stdout)

	// Create logger
	logger := log.New(multiWriter, "", 0) // No prefix, we'll format ourselves

	instance = &UILogger{
		logger:         logger,
		rotatingWriter: rotatingWriter,
		logDir:         logDir,
	}

	log.Printf("[UILogger] Initialized - logs will be written to: %s\n", logDir)
	log.Printf("[UILogger] Log rotation: MaxSize=%dMB, MaxBackups=%d, MaxAge=%d days\n",
		rotatingWriter.MaxSize, rotatingWriter.MaxBackups, rotatingWriter.MaxAge)

	return instance, nil
}

// GetInstance returns the singleton instance
func GetInstance() *UILogger {
	if instance == nil {
		// Initialize if not already done
		logger, err := Initialize()
		if err != nil {
			log.Printf("[UILogger] Failed to initialize: %v\n", err)
			return nil
		}
		return logger
	}
	return instance
}

// WriteLog writes a log entry to the file
func (ul *UILogger) WriteLog(entry LogEntry) error {
	if ul == nil {
		return fmt.Errorf("UILogger not initialized")
	}

	// Format log entry
	// Format: [TIMESTAMP] [LEVEL] [CATEGORY] MESSAGE {DATA}
	logLine := fmt.Sprintf("[%s] [%s] [%s] %s",
		entry.Timestamp,
		entry.Level,
		entry.Category,
		entry.Message,
	)

	// Add data if present
	if entry.Data != nil {
		dataJSON, err := json.Marshal(entry.Data)
		if err == nil {
			logLine += fmt.Sprintf(" %s", string(dataJSON))
		}
	}

	// Write to log
	ul.logger.Println(logLine)

	return nil
}

// WriteLogs writes multiple log entries (batch write)
func (ul *UILogger) WriteLogs(entries []LogEntry) error {
	if ul == nil {
		return fmt.Errorf("UILogger not initialized")
	}

	for _, entry := range entries {
		if err := ul.WriteLog(entry); err != nil {
			log.Printf("[UILogger] Failed to write log entry: %v\n", err)
			// Continue with other entries
		}
	}

	return nil
}

// Rotate forces a log rotation
func (ul *UILogger) Rotate() error {
	if ul == nil {
		return fmt.Errorf("UILogger not initialized")
	}

	return ul.rotatingWriter.Rotate()
}

// Close closes the logger
func (ul *UILogger) Close() error {
	if ul == nil {
		return nil
	}

	return ul.rotatingWriter.Close()
}

// GetLogDir returns the directory where logs are stored
func (ul *UILogger) GetLogDir() string {
	if ul == nil {
		return ""
	}
	return ul.logDir
}

// CleanupOldLogs manually removes logs older than the specified days
// This is called in addition to lumberjack's automatic cleanup
func (ul *UILogger) CleanupOldLogs(maxAgeDays int) error {
	if ul == nil {
		return fmt.Errorf("UILogger not initialized")
	}

	now := time.Now()
	pattern := filepath.Join(ul.logDir, "kubegraf-ui-*.log.gz")

	files, err := filepath.Glob(pattern)
	if err != nil {
		return fmt.Errorf("failed to glob log files: %w", err)
	}

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			continue
		}

		age := now.Sub(info.ModTime())
		if age > time.Duration(maxAgeDays)*24*time.Hour {
			if err := os.Remove(file); err != nil {
				log.Printf("[UILogger] Failed to remove old log file %s: %v\n", file, err)
			} else {
				log.Printf("[UILogger] Removed old log file: %s (age: %v)\n", file, age)
			}
		}
	}

	return nil
}

// GetLogStats returns statistics about log files
func (ul *UILogger) GetLogStats() (map[string]interface{}, error) {
	if ul == nil {
		return nil, fmt.Errorf("UILogger not initialized")
	}

	pattern := filepath.Join(ul.logDir, "kubegraf-ui*.log*")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to glob log files: %w", err)
	}

	var totalSize int64
	fileCount := len(files)

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			continue
		}
		totalSize += info.Size()
	}

	stats := map[string]interface{}{
		"log_dir":       ul.logDir,
		"total_files":   fileCount,
		"total_size_mb": float64(totalSize) / (1024 * 1024),
		"current_log":   filepath.Join(ul.logDir, "kubegraf-ui.log"),
		"max_size_mb":   ul.rotatingWriter.MaxSize,
		"max_backups":   ul.rotatingWriter.MaxBackups,
		"max_age_days":  ul.rotatingWriter.MaxAge,
		"compress":      ul.rotatingWriter.Compress,
	}

	return stats, nil
}
