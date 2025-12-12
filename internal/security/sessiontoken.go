package security

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"
)

// SessionTokenManager manages initial session tokens for secure web access
type SessionTokenManager struct {
	tokens map[string]*TokenInfo
	mu     sync.RWMutex
}

// TokenInfo stores information about a session token
type TokenInfo struct {
	Token     string
	Used      bool
	CreatedAt time.Time
	ExpiresAt time.Time
}

// NewSessionTokenManager creates a new session token manager
func NewSessionTokenManager() *SessionTokenManager {
	return &SessionTokenManager{
		tokens: make(map[string]*TokenInfo),
	}
}

// GenerateToken generates a new secure session token
// Returns a URL-safe base64 encoded token
func (stm *SessionTokenManager) GenerateToken() (string, error) {
	// Generate 32 random bytes
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	// Encode as URL-safe base64 (no padding)
	token := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(b)

	// Store token info
	stm.mu.Lock()
	stm.tokens[token] = &TokenInfo{
		Token:     token,
		Used:      false,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute), // Token expires in 5 minutes
	}
	stm.mu.Unlock()

	return token, nil
}

// ValidateAndConsumeToken validates a token and marks it as used
// Returns true if token is valid and not yet used
func (stm *SessionTokenManager) ValidateAndConsumeToken(token string) bool {
	stm.mu.Lock()
	defer stm.mu.Unlock()

	info, exists := stm.tokens[token]
	if !exists {
		return false
	}

	// Check if expired
	if time.Now().After(info.ExpiresAt) {
		delete(stm.tokens, token)
		return false
	}

	// Check if already used
	if info.Used {
		return false
	}

	// Mark as used
	info.Used = true
	return true
}

// CleanupExpiredTokens removes expired tokens periodically
func (stm *SessionTokenManager) CleanupExpiredTokens() {
	stm.mu.Lock()
	defer stm.mu.Unlock()

	now := time.Now()
	for token, info := range stm.tokens {
		if now.After(info.ExpiresAt) {
			delete(stm.tokens, token)
		}
	}
}

// StartCleanup starts a background goroutine to clean up expired tokens
func (stm *SessionTokenManager) StartCleanup() {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			stm.CleanupExpiredTokens()
		}
	}()
}

