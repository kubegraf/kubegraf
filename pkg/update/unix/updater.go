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

package unix

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// UpdateConfig contains configuration for Unix update process
type UpdateConfig struct {
	ExecPath      string // Path to current executable
	NewBinaryPath string // Path to downloaded new binary
	AppName       string // Application name (e.g., "KubeGraf")
	Args          []string // Command line arguments to pass to new process
}

// CreateUpdaterScript creates a shell script that will handle the update
// This script runs after the main application exits
func CreateUpdaterScript(config UpdateConfig) (string, error) {
	if runtime.GOOS == "windows" {
		return "", fmt.Errorf("Unix updater can only be created on Unix-like systems")
	}

	// Get temp directory
	tmpDir := os.TempDir()
	scriptPath := filepath.Join(tmpDir, "kubegraf-updater.sh")

	// Get executable name
	exeName := filepath.Base(config.ExecPath)
	processName := strings.TrimSuffix(exeName, ".exe")

	// Escape paths for shell script
	escapeShell := func(s string) string {
		// Escape single quotes by replacing ' with '\''
		s = strings.ReplaceAll(s, "'", "'\\''")
		return s
	}

	execPathEscaped := escapeShell(config.ExecPath)
	newBinaryPathEscaped := escapeShell(config.NewBinaryPath)

	// Build arguments string
	argsStr := ""
	if len(config.Args) > 0 {
		escapedArgs := make([]string, len(config.Args))
		for i, arg := range config.Args {
			escapedArgs[i] = escapeShell(arg)
		}
		argsStr = strings.Join(escapedArgs, " ")
	}

	// Shell script content
	script := fmt.Sprintf(`#!/bin/sh
# KubeGraf Unix Updater Script
# This script handles the update process after the main application exits

set -e

EXEC_PATH='%s'
NEW_BINARY_PATH='%s'
PROCESS_NAME='%s'
ARGS='%s'

echo "🔄 KubeGraf Updater Starting..."

# Wait for the main process to exit (max 30 seconds)
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if ! pgrep -f "$PROCESS_NAME" > /dev/null 2>&1; then
        echo "✓ Main process has exited"
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
    echo "⏳ Waiting for main process to exit... ($WAITED/$MAX_WAIT)"
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "⚠️  Main process did not exit in time, attempting to terminate..."
    pkill -f "$PROCESS_NAME" 2>/dev/null || true
    sleep 2
fi

# Additional wait to ensure file handles are released
sleep 2

# Step 1: Backup old binary
BACKUP_PATH="${EXEC_PATH}.old"
if [ -f "$EXEC_PATH" ]; then
    echo "📦 Backing up old binary..."
    if [ -f "$BACKUP_PATH" ]; then
        rm -f "$BACKUP_PATH"
    fi
    mv "$EXEC_PATH" "$BACKUP_PATH"
    echo "✓ Backup created: $BACKUP_PATH"
fi

# Step 2: Install new binary
if [ ! -f "$NEW_BINARY_PATH" ]; then
    echo "❌ New binary not found: $NEW_BINARY_PATH"
    # Try to restore backup
    if [ -f "$BACKUP_PATH" ]; then
        echo "🔄 Restoring backup..."
        mv "$BACKUP_PATH" "$EXEC_PATH"
    fi
    exit 1
fi

echo "📥 Installing new binary..."
cp "$NEW_BINARY_PATH" "$EXEC_PATH"
chmod +x "$EXEC_PATH"

# Remove macOS quarantine attribute if present (prevents Gatekeeper blocking)
if command -v xattr > /dev/null 2>&1; then
    xattr -d com.apple.quarantine "$EXEC_PATH" 2>/dev/null || true
fi

echo "✓ New binary installed"

# Step 3: Verify new binary works
if ! "$EXEC_PATH" --version > /dev/null 2>&1; then
    echo "❌ New binary verification failed, restoring backup..."
    if [ -f "$BACKUP_PATH" ]; then
        mv "$BACKUP_PATH" "$EXEC_PATH"
        echo "✓ Backup restored"
    fi
    exit 1
fi

# Step 4: Clean up backup after delay (in background)
(sleep 10 && rm -f "$BACKUP_PATH" 2>/dev/null) &

# Step 5: Restart the application
echo "🚀 Restarting KubeGraf..."
sleep 1

# Detach from terminal and run in background
if [ -n "$ARGS" ]; then
    nohup "$EXEC_PATH" $ARGS > /dev/null 2>&1 &
else
    nohup "$EXEC_PATH" > /dev/null 2>&1 &
fi

NEW_PID=$!
sleep 1

# Verify the new process started
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✓ KubeGraf restarted successfully (PID: $NEW_PID)"
else
    echo "❌ Failed to restart application"
    exit 1
fi

echo "✅ Update completed successfully!"
sleep 2
`,
		execPathEscaped,
		newBinaryPathEscaped,
		processName,
		argsStr,
	)

	// Write script to file
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return "", fmt.Errorf("failed to create updater script: %w", err)
	}

	return scriptPath, nil
}

// LaunchUpdater launches the shell updater script
func LaunchUpdater(scriptPath string) error {
	if runtime.GOOS == "windows" {
		return fmt.Errorf("Unix updater can only be launched on Unix-like systems")
	}

	// Use sh to execute the script
	// The script will run after we exit
	cmd := exec.Command("sh", scriptPath)
	
	// Don't wait for the script to complete - it will run after we exit
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to launch updater: %w", err)
	}

	// Give it a moment to start
	time.Sleep(500 * time.Millisecond)

	return nil
}

