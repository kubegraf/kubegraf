package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// BackupStatus represents the current backup configuration and status
type BackupStatus struct {
	Enabled      bool       `json:"enabled"`
	Interval     int        `json:"interval"`     // in hours
	BackupDir    string     `json:"backup_dir"`
	LastBackup   *time.Time `json:"last_backup,omitempty"`
	NextBackup   *time.Time `json:"next_backup,omitempty"`
	BackupCount  int        `json:"backup_count"`
	TotalSize    int64      `json:"total_size"` // in bytes
	Error        string     `json:"error,omitempty"`
}

// BackupConfig represents backup configuration
type BackupConfig struct {
	Enabled  bool   `json:"enabled"`
	Interval int    `json:"interval"` // in hours
	BackupDir string `json:"backup_dir,omitempty"`
}

var (
	backupEnabled  = true
	backupInterval = 6 * time.Hour
	backupDir      = ""
	lastBackupTime *time.Time
	backupCancel   func()
)

// handleBackupStatus returns the current backup status
func (ws *WebServer) handleBackupStatus(w http.ResponseWriter, r *http.Request) {
	if ws.db == nil {
		http.Error(w, "Database not initialized", http.StatusServiceUnavailable)
		return
	}

	status := BackupStatus{
		Enabled:   backupEnabled,
		Interval:  int(backupInterval.Hours()),
		BackupDir: backupDir,
	}

	// Get backup directory info
	if backupDir != "" {
		files, err := os.ReadDir(backupDir)
		if err == nil {
			status.BackupCount = len(files)
			var totalSize int64
			for _, file := range files {
				if !file.IsDir() {
					info, err := file.Info()
					if err == nil {
						totalSize += info.Size()
					}
				}
			}
			status.TotalSize = totalSize

			// Find most recent backup
			var mostRecent time.Time
			for _, file := range files {
				if !file.IsDir() {
					info, err := file.Info()
					if err == nil {
						if info.ModTime().After(mostRecent) {
							mostRecent = info.ModTime()
						}
					}
				}
			}
			if !mostRecent.IsZero() {
				status.LastBackup = &mostRecent
				nextBackup := mostRecent.Add(backupInterval)
				status.NextBackup = &nextBackup
			}
		}
	}

	if lastBackupTime != nil {
		status.LastBackup = lastBackupTime
		nextBackup := lastBackupTime.Add(backupInterval)
		status.NextBackup = &nextBackup
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleBackupConfig updates backup configuration
func (ws *WebServer) handleBackupConfig(w http.ResponseWriter, r *http.Request) {
	if ws.db == nil {
		http.Error(w, "Database not initialized", http.StatusServiceUnavailable)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var config BackupConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	// Update configuration
	backupEnabled = config.Enabled
	if config.Interval > 0 {
		backupInterval = time.Duration(config.Interval) * time.Hour
	}

	// Set backup directory
	if config.BackupDir != "" {
		backupDir = config.BackupDir
	} else {
		// Default backup directory
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = "."
		}
		backupDir = filepath.Join(homeDir, ".kubegraf", "backups")
	}

	// Stop existing backup service if running
	if backupCancel != nil {
		backupCancel()
		backupCancel = nil
	}

	// Start backup service if enabled
	if backupEnabled && ws.db != nil {
		ctx, cancel := context.WithCancel(context.Background())
		backupCancel = cancel
		go func() {
			if err := ws.db.AutoBackup(ctx, backupDir, backupInterval); err != nil {
				fmt.Printf("⚠️  Database backup service stopped: %v\n", err)
			}
		}()
		fmt.Printf("✅ Database automatic backups enabled (every %v, stored in %s)\n", backupInterval, backupDir)
	} else {
		fmt.Println("⚠️  Database automatic backups disabled")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Backup configuration updated",
	})
}

// handleBackupNow triggers an immediate backup
func (ws *WebServer) handleBackupNow(w http.ResponseWriter, r *http.Request) {
	if ws.db == nil {
		http.Error(w, "Database not initialized", http.StatusServiceUnavailable)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Determine backup directory
	targetDir := backupDir
	if targetDir == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = "."
		}
		targetDir = filepath.Join(homeDir, ".kubegraf", "backups")
	}

	// Create backup with timestamp
	backupPath := filepath.Join(targetDir, fmt.Sprintf("backup-%s.db", time.Now().Format("20060102-150405")))
	
	if err := ws.db.Backup(backupPath); err != nil {
		http.Error(w, fmt.Sprintf("Backup failed: %v", err), http.StatusInternalServerError)
		return
	}

	now := time.Now()
	lastBackupTime = &now

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"message":    "Backup created successfully",
		"backup_path": backupPath,
		"timestamp":   now,
	})
}

// handleBackupList returns a list of available backups
func (ws *WebServer) handleBackupList(w http.ResponseWriter, r *http.Request) {
	if ws.db == nil {
		http.Error(w, "Database not initialized", http.StatusServiceUnavailable)
		return
	}

	// Determine backup directory
	targetDir := backupDir
	if targetDir == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = "."
		}
		targetDir = filepath.Join(homeDir, ".kubegraf", "backups")
	}

	files, err := os.ReadDir(targetDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read backup directory: %v", err), http.StatusInternalServerError)
		return
	}

	type BackupInfo struct {
		Name      string    `json:"name"`
		Path      string    `json:"path"`
		Size      int64     `json:"size"`
		CreatedAt time.Time `json:"created_at"`
	}

	var backups []BackupInfo
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".db" {
			info, err := file.Info()
			if err != nil {
				continue
			}
			backups = append(backups, BackupInfo{
				Name:      file.Name(),
				Path:      filepath.Join(targetDir, file.Name()),
				Size:      info.Size(),
				CreatedAt: info.ModTime(),
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"backups": backups,
		"count":   len(backups),
	})
}

// handleBackupRestore restores the database from a backup file
func (ws *WebServer) handleBackupRestore(w http.ResponseWriter, r *http.Request) {
	if ws.db == nil {
		http.Error(w, "Database not initialized", http.StatusServiceUnavailable)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BackupPath string `json:"backup_path"`
		DbPath     string `json:"db_path,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.BackupPath == "" {
		http.Error(w, "backup_path is required", http.StatusBadRequest)
		return
	}

	// Determine database path
	dbPath := req.DbPath
	if dbPath == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = "."
		}
		dbPath = filepath.Join(homeDir, ".kubegraf", "db.sqlite")
	}

	// Verify backup file exists
	if _, err := os.Stat(req.BackupPath); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("Backup file not found: %s", req.BackupPath), http.StatusNotFound)
		return
	}

	// Restore from backup
	if err := ws.db.RestoreFromBackup(req.BackupPath, dbPath); err != nil {
		http.Error(w, fmt.Sprintf("Restore failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"message":     "Database restored successfully",
		"backup_path": req.BackupPath,
		"db_path":     dbPath,
	})
}

