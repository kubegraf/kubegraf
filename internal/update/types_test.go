// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package update

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// GetCurrentPlatform
// ─────────────────────────────────────────────────────────────────────────────

func TestGetCurrentPlatform_NotNil(t *testing.T) {
	p := GetCurrentPlatform()
	if p == nil {
		t.Fatal("GetCurrentPlatform returned nil")
	}
}

func TestGetCurrentPlatform_OSSet(t *testing.T) {
	p := GetCurrentPlatform()
	if p.OS == "" {
		t.Error("PlatformInfo.OS should not be empty")
	}
}

func TestGetCurrentPlatform_ArchSet(t *testing.T) {
	p := GetCurrentPlatform()
	if p.Arch == "" {
		t.Error("PlatformInfo.Arch should not be empty")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// InstallMethod constants
// ─────────────────────────────────────────────────────────────────────────────

func TestInstallMethodConstants_NonEmpty(t *testing.T) {
	methods := []InstallMethod{
		InstallMethodUnknown, InstallMethodBinary, InstallMethodScoop,
		InstallMethodChocolatey, InstallMethodHomebrew, InstallMethodApt,
		InstallMethodSnap, InstallMethodFlatpak,
	}
	for _, m := range methods {
		if m == "" {
			t.Error("InstallMethod constant should not be empty string")
		}
	}
}

func TestInstallMethodConstants_Unique(t *testing.T) {
	methods := []InstallMethod{
		InstallMethodUnknown, InstallMethodBinary, InstallMethodScoop,
		InstallMethodChocolatey, InstallMethodHomebrew, InstallMethodApt,
		InstallMethodSnap, InstallMethodFlatpak,
	}
	seen := make(map[InstallMethod]bool)
	for _, m := range methods {
		if seen[m] {
			t.Errorf("duplicate InstallMethod value: %q", m)
		}
		seen[m] = true
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// IsPackageManagerInstall
// ─────────────────────────────────────────────────────────────────────────────

func TestIsPackageManagerInstall_PackageManagers(t *testing.T) {
	pkgMgrs := []InstallMethod{
		InstallMethodScoop, InstallMethodChocolatey, InstallMethodHomebrew,
		InstallMethodApt, InstallMethodSnap, InstallMethodFlatpak,
	}
	for _, m := range pkgMgrs {
		if !m.IsPackageManagerInstall() {
			t.Errorf("%q.IsPackageManagerInstall() = false, want true", m)
		}
	}
}

func TestIsPackageManagerInstall_NotPackageManagers(t *testing.T) {
	nonPkg := []InstallMethod{InstallMethodBinary, InstallMethodUnknown}
	for _, m := range nonPkg {
		if m.IsPackageManagerInstall() {
			t.Errorf("%q.IsPackageManagerInstall() = true, want false", m)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetUpdateCommand
// ─────────────────────────────────────────────────────────────────────────────

func TestGetUpdateCommand_Scoop(t *testing.T) {
	got := InstallMethodScoop.GetUpdateCommand()
	if got == "" {
		t.Error("Scoop GetUpdateCommand should not be empty")
	}
}

func TestGetUpdateCommand_Chocolatey(t *testing.T) {
	got := InstallMethodChocolatey.GetUpdateCommand()
	if got == "" {
		t.Error("Chocolatey GetUpdateCommand should not be empty")
	}
}

func TestGetUpdateCommand_Homebrew(t *testing.T) {
	got := InstallMethodHomebrew.GetUpdateCommand()
	if got == "" {
		t.Error("Homebrew GetUpdateCommand should not be empty")
	}
}

func TestGetUpdateCommand_Apt(t *testing.T) {
	got := InstallMethodApt.GetUpdateCommand()
	if got == "" {
		t.Error("Apt GetUpdateCommand should not be empty")
	}
}

func TestGetUpdateCommand_Snap(t *testing.T) {
	got := InstallMethodSnap.GetUpdateCommand()
	if got == "" {
		t.Error("Snap GetUpdateCommand should not be empty")
	}
}

func TestGetUpdateCommand_Flatpak(t *testing.T) {
	got := InstallMethodFlatpak.GetUpdateCommand()
	if got == "" {
		t.Error("Flatpak GetUpdateCommand should not be empty")
	}
}

func TestGetUpdateCommand_Binary_Empty(t *testing.T) {
	got := InstallMethodBinary.GetUpdateCommand()
	if got != "" {
		t.Errorf("Binary GetUpdateCommand = %q, want empty string", got)
	}
}

func TestGetUpdateCommand_Unknown_Empty(t *testing.T) {
	got := InstallMethodUnknown.GetUpdateCommand()
	if got != "" {
		t.Errorf("Unknown GetUpdateCommand = %q, want empty string", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetWarningMessage
// ─────────────────────────────────────────────────────────────────────────────

func TestGetWarningMessage_PackageManagers_NotEmpty(t *testing.T) {
	pkgMgrs := []InstallMethod{
		InstallMethodScoop, InstallMethodChocolatey, InstallMethodHomebrew,
		InstallMethodApt, InstallMethodSnap, InstallMethodFlatpak,
	}
	for _, m := range pkgMgrs {
		if m.GetWarningMessage() == "" {
			t.Errorf("%q.GetWarningMessage() is empty, want non-empty", m)
		}
	}
}

func TestGetWarningMessage_NonPackageManagers_Empty(t *testing.T) {
	for _, m := range []InstallMethod{InstallMethodBinary, InstallMethodUnknown} {
		if got := m.GetWarningMessage(); got != "" {
			t.Errorf("%q.GetWarningMessage() = %q, want empty", m, got)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdateStatus constants
// ─────────────────────────────────────────────────────────────────────────────

func TestUpdateStatusConstants_NonEmpty(t *testing.T) {
	statuses := []UpdateStatus{
		UpdateStatusIdle, UpdateStatusChecking, UpdateStatusDownloading,
		UpdateStatusVerifying, UpdateStatusApplying, UpdateStatusRestarting,
		UpdateStatusComplete, UpdateStatusFailed,
	}
	for _, s := range statuses {
		if s == "" {
			t.Error("UpdateStatus constant should not be empty")
		}
	}
}
