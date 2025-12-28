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

package update

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"time"
)

// Updater is the main auto-update service
type Updater struct {
	currentVersion string
	applier        *Applier
	progress       func(UpdateProgress)
	mu             sync.RWMutex
	lastCheck      *UpdateInfo
	lastCheckTime  time.Time
}

// NewUpdater creates a new Updater instance
func NewUpdater(currentVersion string) (*Updater, error) {
	applier, err := NewApplier()
	if err != nil {
		return nil, err
	}

	return &Updater{
		currentVersion: currentVersion,
		applier:        applier,
	}, nil
}

// SetProgressCallback sets the progress callback for update operations
func (u *Updater) SetProgressCallback(fn func(UpdateProgress)) {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.progress = fn
	u.applier.SetProgressCallback(fn)
}

// CheckForUpdate checks if a new version is available
// Returns UpdateInfo with details about available updates
func (u *Updater) CheckForUpdate(ctx context.Context) (*UpdateInfo, error) {
	// Check cache first (15 minutes for no update, 4 hours if update available)
	u.mu.RLock()
	if u.lastCheck != nil {
		cacheDuration := 15 * time.Minute
		if u.lastCheck.UpdateAvailable {
			cacheDuration = 4 * time.Hour
		}
		if time.Since(u.lastCheckTime) < cacheDuration {
			info := *u.lastCheck
			u.mu.RUnlock()
			return &info, nil
		}
	}
	u.mu.RUnlock()

	// Fetch latest release from GitHub
	info, err := CheckGitHubLatestRelease(u.currentVersion)
	if err != nil {
		return nil, err
	}

	// Detect installation method and add to info
	installInfo := u.applier.GetInstallationInfo()
	info.InstallMethod = installInfo.Method
	info.CanAutoUpdate = installInfo.CanUpdate

	// Add update command for package manager installations
	if installInfo.Method.IsPackageManagerInstall() {
		info.UpdateCommand = installInfo.Method.GetUpdateCommand()
	}

	// Cache the result
	u.mu.Lock()
	u.lastCheck = info
	u.lastCheckTime = time.Now()
	u.mu.Unlock()

	return info, nil
}

// ApplyUpdate downloads and applies an update
func (u *Updater) ApplyUpdate(ctx context.Context, req ApplyUpdateRequest) (*ApplyUpdateResponse, error) {
	return u.applier.Apply(ctx, req)
}

// GetInstallationInfo returns information about the current installation
func (u *Updater) GetInstallationInfo() *InstallationInfo {
	return u.applier.GetInstallationInfo()
}

// GetPlatformInfo returns information about the current platform
func (u *Updater) GetPlatformInfo() *PlatformInfo {
	installInfo := u.applier.GetInstallationInfo()
	return &PlatformInfo{
		OS:            runtime.GOOS,
		Arch:          runtime.GOARCH,
		InstallMethod: installInfo.Method,
		InstallPath:   installInfo.InstallPath,
		CanUpdate:     installInfo.CanUpdate,
		UpdateCommand: installInfo.Method.GetUpdateCommand(),
	}
}

// ClearCache clears the cached update information
func (u *Updater) ClearCache() {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.lastCheck = nil
	u.lastCheckTime = time.Time{}
	ClearCache() // Also clear the checker cache
}

// RestartApplication restarts the application
// NOTE: This is a fallback method - normally the updater script handles restart
func (u *Updater) RestartApplication() error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	args := os.Args[1:]
	cmd := exec.Command(execPath, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start new process: %w", err)
	}

	time.Sleep(500 * time.Millisecond)
	os.Exit(0)

	return nil
}

// Global updater instance for convenience functions
var (
	globalUpdater     *Updater
	globalUpdaterOnce sync.Once
	globalUpdaterErr  error
)

// Init initializes the global updater with the current version
func Init(currentVersion string) error {
	globalUpdaterOnce.Do(func() {
		globalUpdater, globalUpdaterErr = NewUpdater(currentVersion)
	})
	return globalUpdaterErr
}

// CheckForUpdateGlobal checks for updates using the global updater
func CheckForUpdateGlobal(ctx context.Context) (*UpdateInfo, error) {
	if globalUpdater == nil {
		return nil, fmt.Errorf("updater not initialized, call Init() first")
	}
	return globalUpdater.CheckForUpdate(ctx)
}

// ApplyUpdateGlobal applies an update using the global updater
func ApplyUpdateGlobal(ctx context.Context, req ApplyUpdateRequest) (*ApplyUpdateResponse, error) {
	if globalUpdater == nil {
		return nil, fmt.Errorf("updater not initialized, call Init() first")
	}
	return globalUpdater.ApplyUpdate(ctx, req)
}

// GetPlatformInfoGlobal returns platform info using the global updater
func GetPlatformInfoGlobal() (*PlatformInfo, error) {
	if globalUpdater == nil {
		return nil, fmt.Errorf("updater not initialized, call Init() first")
	}
	return globalUpdater.GetPlatformInfo(), nil
}
