# Security Enhancement Research

## Current State Analysis

### Existing Security Features
1. **Application-level encryption**: AES-256-GCM encryption for sensitive fields (tokens, credentials)
2. **Session management**: Token-based sessions stored in database
3. **IAM system**: User authentication and RBAC already implemented
4. **Database**: Plain SQLite file (not encrypted at rest)

### Security Gaps Identified
1. **Database file is plain**: If laptop is stolen, SQLite file can be read directly (though sensitive fields are encrypted)
2. **No OS keychain usage**: Master key stored in environment variable or default
3. **Server binds to all interfaces**: Currently `:port` instead of `127.0.0.1:port`
4. **No initial access control**: Web UI accessible without initial token
5. **No secure mode**: No PIN/passphrase protection
6. **No ephemeral mode**: No option for temporary, in-memory storage

## Recommendations

### 1. SQLCipher vs App-Level Encryption
**Decision: Hybrid Approach**
- **Keep app-level encryption** for sensitive fields (already implemented)
- **Add SQLCipher** for database-level encryption (defense in depth)
- **Rationale**: If laptop is stolen, even if attacker bypasses OS keychain, they still need to decrypt the database file itself

### 2. Master Key Management
**Decision: Simplified Approach (No OS Keychain)**
- Derive master key from machine-specific identifiers (machine ID + user home dir)
- Store encrypted key in a protected location (~/.kubegraf/.key)
- No user interaction required - seamless UX
- Environment variable override still available for advanced users

### 3. Secure Mode (PIN/Passphrase)
**Decision: Optional Feature**
- Combine master key + user PIN using HKDF
- Require PIN on startup (terminal prompt or browser UI)
- Without PIN, database cannot be opened

### 4. Ephemeral Mode
**Decision: Implement**
- `--ephemeral` flag for in-memory database
- Wipe on exit
- Useful for demos and shared machines

### 5. Localhost-Only Binding
**Decision: Implement**
- Bind to `127.0.0.1` and `::1` only
- Prevent network access from other machines

### 6. Initial Session Token
**Decision: Implement**
- Generate secure token on startup
- Open browser with `?token=...` parameter
- Exchange token for session cookie on first access
- Mark token as used (single-use)

## Implementation Plan

### File Structure
1. `internal/security/masterkey.go` - Master key derivation and management (machine-based, no keychain)
2. `internal/security/securemode.go` - PIN/passphrase handling (optional)
3. `internal/security/sessiontoken.go` - Initial session token generation
4. `internal/security/ephemeral.go` - Ephemeral mode support
5. `web_server_security.go` - Security middleware and handlers

### Dependencies Needed
- None! Using standard library only for better UX and simplicity
- Consider: `github.com/mutecomm/go-sqlcipher/v4` - SQLCipher support (optional, for database-level encryption)

## Risk Assessment

### High Priority
- ✅ Master key derivation (machine-based, seamless UX)
- ✅ Localhost-only binding (prevents network access, no UX impact)
- ✅ Initial session token (prevents unauthorized access, good UX)

### Medium Priority
- ⚠️ SQLCipher (adds complexity, but provides defense-in-depth)
- ⚠️ Secure mode with PIN (adds UX friction, but provides extra security)

### Low Priority
- ℹ️ Ephemeral mode (nice-to-have for specific use cases)

## Conclusion

**Recommended Implementation Order:**
1. Master key derivation (machine-based, no user interaction)
2. Localhost-only binding + session token (seamless UX)
3. Ephemeral mode (useful feature, no friction)
4. Secure mode with PIN (optional, only for users who want extra security)
5. SQLCipher (optional, for database-level encryption if needed)

**UX Principles:**
- ✅ No prompts or user interaction for basic security
- ✅ Seamless experience by default
- ✅ Optional features (secure mode, ephemeral) available for power users
- ✅ Security should be invisible to the user

