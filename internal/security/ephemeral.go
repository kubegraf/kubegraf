package security

import (
	"os"
	"path/filepath"
)

// EphemeralMode manages ephemeral (temporary) database mode
type EphemeralMode struct {
	enabled bool
	dbPath  string
}

// NewEphemeralMode creates a new ephemeral mode manager
func NewEphemeralMode() *EphemeralMode {
	return &EphemeralMode{
		enabled: false,
	}
}

// Enable enables ephemeral mode
// In ephemeral mode, database is stored in a temporary location and wiped on exit
func (em *EphemeralMode) Enable() {
	em.enabled = true
}

// IsEnabled returns whether ephemeral mode is enabled
func (em *EphemeralMode) IsEnabled() bool {
	return em.enabled
}

// GetDBPath returns the database path for ephemeral mode
// If ephemeral mode is enabled, returns a temporary file path
// Otherwise returns the normal path
func (em *EphemeralMode) GetDBPath(normalPath string) string {
	if !em.enabled {
		return normalPath
	}

	// Use system temp directory
	tmpDir := os.TempDir()
	em.dbPath = filepath.Join(tmpDir, "kubegraf-ephemeral.db")
	return em.dbPath
}

// Cleanup removes the ephemeral database file
// Should be called on application exit when ephemeral mode is enabled
func (em *EphemeralMode) Cleanup() error {
	if !em.enabled || em.dbPath == "" {
		return nil
	}

	// Remove database file
	if err := os.Remove(em.dbPath); err != nil && !os.IsNotExist(err) {
		return err
	}

	// Also remove WAL and SHM files if they exist
	os.Remove(em.dbPath + "-wal")
	os.Remove(em.dbPath + "-shm")

	return nil
}
