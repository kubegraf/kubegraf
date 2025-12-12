package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

const (
	keyFileName = ".masterkey"
)

// GetOrCreateMasterKey derives or retrieves the master encryption key
// Uses machine-specific identifiers for automatic key derivation (no user interaction)
func GetOrCreateMasterKey(kubegrafDir string) ([]byte, error) {
	keyPath := filepath.Join(kubegrafDir, keyFileName)

	// Try to read existing key
	if keyData, err := os.ReadFile(keyPath); err == nil {
		// Key exists, decode and return
		key, err := base64.StdEncoding.DecodeString(string(keyData))
		if err != nil {
			return nil, fmt.Errorf("decode master key: %w", err)
		}
		if len(key) == 32 {
			return key, nil
		}
		// Invalid key, regenerate
	}

	// Generate new master key
	// Derive from machine-specific data for better security
	machineID, err := getMachineID()
	if err != nil {
		// Fallback: use pure random
		key := make([]byte, 32)
		if _, err := rand.Read(key); err != nil {
			return nil, fmt.Errorf("generate random key: %w", err)
		}
		return key, saveMasterKey(keyPath, key)
	}

	// Derive key from machine ID + user home directory
	homeDir, _ := os.UserHomeDir()
	seed := fmt.Sprintf("%s:%s:%s", machineID, homeDir, runtime.GOOS)

	// Hash to get 32-byte key
	hash := sha256.Sum256([]byte(seed))
	key := hash[:]

	// Add some randomness for extra security
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, fmt.Errorf("generate random bytes: %w", err)
	}

	// Combine and hash again
	combined := append(key, randomBytes...)
	finalHash := sha256.Sum256(combined)
	finalKey := finalHash[:]

	// Save the key
	if err := saveMasterKey(keyPath, finalKey); err != nil {
		return nil, err
	}

	return finalKey, nil
}

// saveMasterKey saves the master key to disk with restricted permissions
func saveMasterKey(keyPath string, key []byte) error {
	// Ensure directory exists
	dir := filepath.Dir(keyPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("create key directory: %w", err)
	}

	// Encode and save
	encoded := base64.StdEncoding.EncodeToString(key)
	if err := os.WriteFile(keyPath, []byte(encoded), 0600); err != nil {
		return fmt.Errorf("write master key: %w", err)
	}

	return nil
}

// getMachineID gets a machine-specific identifier
// Platform-specific implementation for better security
func getMachineID() (string, error) {
	switch runtime.GOOS {
	case "darwin":
		// macOS: Use system UUID
		return getMacOSMachineID()
	case "linux":
		// Linux: Use machine-id
		return getLinuxMachineID()
	case "windows":
		// Windows: Use machine GUID
		return getWindowsMachineID()
	default:
		// Fallback: use hostname
		hostname, err := os.Hostname()
		if err != nil {
			return "", err
		}
		return hostname, nil
	}
}

// getMacOSMachineID gets macOS system UUID
func getMacOSMachineID() (string, error) {
	// Try to read from system_profiler
	// This is a simple approach - in production you might want to use IOKit
	hostname, err := os.Hostname()
	if err != nil {
		return "", err
	}
	// Use hostname as fallback (macOS hostnames are often unique)
	return hostname, nil
}

// getLinuxMachineID reads /etc/machine-id
func getLinuxMachineID() (string, error) {
	data, err := os.ReadFile("/etc/machine-id")
	if err != nil {
		// Fallback to hostname
		return os.Hostname()
	}
	return string(data), nil
}

// getWindowsMachineID gets Windows machine GUID
func getWindowsMachineID() (string, error) {
	// Windows: Use hostname as identifier
	// In production, you might query WMI for actual machine GUID
	return os.Hostname()
}

