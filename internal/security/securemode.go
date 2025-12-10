package security

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
)

const (
	secureModeKeyFile = ".securemode.key"
	pinHashFile       = ".pin.hash"
)

// SecureMode manages PIN/passphrase-based secure mode
// This is an optional feature for users who want extra security
type SecureMode struct {
	enabled     bool
	kubegrafDir string
}

// NewSecureMode creates a new secure mode manager
func NewSecureMode(kubegrafDir string) *SecureMode {
	return &SecureMode{
		enabled:     false,
		kubegrafDir: kubegrafDir,
	}
}

// IsEnabled checks if secure mode is configured
func (sm *SecureMode) IsEnabled() bool {
	pinHashPath := filepath.Join(sm.kubegrafDir, pinHashFile)
	_, err := os.Stat(pinHashPath)
	return err == nil
}

// SetupSecureMode sets up secure mode with a PIN/passphrase
// This should be called once during initial setup
func (sm *SecureMode) SetupSecureMode(pin string) error {
	// Hash the PIN
	pinHash := sm.hashPIN(pin)

	// Save PIN hash
	pinHashPath := filepath.Join(sm.kubegrafDir, pinHashFile)
	if err := os.MkdirAll(sm.kubegrafDir, 0700); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}

	if err := os.WriteFile(pinHashPath, []byte(pinHash), 0600); err != nil {
		return fmt.Errorf("save PIN hash: %w", err)
	}

	sm.enabled = true
	return nil
}

// VerifyPIN verifies the provided PIN/passphrase
func (sm *SecureMode) VerifyPIN(pin string) bool {
	if !sm.IsEnabled() {
		return true // If not enabled, always return true
	}

	pinHashPath := filepath.Join(sm.kubegrafDir, pinHashFile)
	storedHash, err := os.ReadFile(pinHashPath)
	if err != nil {
		return false
	}

	providedHash := sm.hashPIN(pin)
	return subtle.ConstantTimeCompare([]byte(storedHash), []byte(providedHash)) == 1
}

// DeriveEncryptionKey derives the encryption key from master key + PIN
// Uses HKDF-like approach for key derivation
func (sm *SecureMode) DeriveEncryptionKey(masterKey []byte, pin string) []byte {
	// Combine master key + PIN
	combined := append(masterKey, []byte(pin)...)

	// Hash multiple times for better security
	hash1 := sha256.Sum256(combined)
	hash2 := sha256.Sum256(hash1[:])
	hash3 := sha256.Sum256(hash2[:])

	// Use final hash as encryption key
	return hash3[:]
}

// hashPIN hashes a PIN/passphrase using SHA-256
func (sm *SecureMode) hashPIN(pin string) string {
	// Add salt for better security
	salt := "kubegraf-secure-mode-salt-v1"
	hash := sha256.Sum256([]byte(salt + pin))
	return base64.StdEncoding.EncodeToString(hash[:])
}

// DisableSecureMode disables secure mode (removes PIN requirement)
func (sm *SecureMode) DisableSecureMode() error {
	pinHashPath := filepath.Join(sm.kubegrafDir, pinHashFile)
	if err := os.Remove(pinHashPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	sm.enabled = false
	return nil
}

// GenerateSecureKey generates a secure key for encryption
func GenerateSecureKey() ([]byte, error) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	return key, nil
}
