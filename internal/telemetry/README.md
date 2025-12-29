# Internal Telemetry Package

This package implements opt-in, privacy-preserving install tracking for KubeGraf CLI.

## Architecture

```
internal/telemetry/
├─ telemetry.go   # Core config management, first-run detection
├─ prompt.go      # Interactive user prompt with timeout
├─ detector.go    # Install method detection (Homebrew, Scoop, etc.)
├─ sender.go      # Anonymous event sender (fire-and-forget)
└─ README.md      # This file
```

## Design Principles

### 1. Opt-In by Default
- User must **explicitly consent**
- Default answer is **NO**
- 10-second timeout → **NO**
- Non-interactive terminal → **NO**

### 2. One-Time Only
- Prompt shown **ONCE** on first run
- Decision saved to `~/.kubegraf/config.json`
- Never prompts again after decision

### 3. Truly Anonymous
- **NO** IP addresses
- **NO** user IDs or session tokens
- **NO** hostnames or machine names
- **NO** cluster data or kubectl commands

### 4. Fire-and-Forget
- Runs in background goroutine
- 3-second timeout
- Silent on error
- Never blocks CLI startup

### 5. Non-Intrusive
- Only runs in interactive terminals
- Never prompts during command execution
- Never prompts in CI/CD, Docker, or scripts

## Usage

### Main Integration

In `main.go`:

```go
import "github.com/kubegraf/kubegraf/internal/telemetry"

func main() {
    // ... other startup code ...

    // ONE-TIME first-run telemetry setup
    telemetry.RunFirstTimeSetup(version)

    // ... rest of application ...
}
```

That's it. The package handles everything else.

### Manual Control

Users can manually control telemetry:

```bash
# Check status
kubegraf telemetry status

# Enable
kubegraf telemetry enable

# Disable
kubegraf telemetry disable
```

## Implementation Details

### First-Run Detection

**File**: `telemetry.go`

```go
func IsFirstRun() bool {
    config, _ := LoadConfig()
    return !config.Telemetry.Decided
}
```

Checks if `~/.kubegraf/config.json` has `telemetry.decided = true`.

### Interactive Prompt

**File**: `prompt.go`

```go
func PromptUser() bool {
    // Check if interactive terminal
    if !IsInteractiveTerminal() {
        return false // Default NO
    }

    // Show prompt
    fmt.Print("[Y] Yes   [N] No (default)   ")

    // Wait for input or timeout
    select {
    case response := <-responseChan:
        return response == "y" || response == "yes"
    case <-time.After(10 * time.Second):
        return false // Timeout = NO
    }
}
```

Features:
- Terminal detection using `golang.org/x/term`
- 10-second timeout
- Default to NO on timeout
- Goroutine-based input reading

### Install Method Detection

**File**: `detector.go`

```go
func DetectInstallMethod() InstallMethod {
    execPath, _ := os.Executable()

    // Homebrew detection
    if strings.HasPrefix(execPath, "/usr/local/bin") ||
       strings.HasPrefix(execPath, "/opt/homebrew/bin") {
        return InstallMethodHomebrew
    }

    // Scoop detection
    if strings.Contains(execPath, "\\scoop\\apps\\") {
        return InstallMethodScoop
    }

    // ... more detection logic ...
}
```

Detects:
- **Homebrew** - `/usr/local/bin`, `/opt/homebrew/bin`, `$HOMEBREW_PREFIX`
- **Scoop** - `~\scoop\apps\`, `C:\ProgramData\scoop`
- **Windows EXE** - `Program Files`, `AppData\Local\Programs`
- **Install Script** - `/usr/local/bin` (non-Homebrew), `~/.local/bin`
- **Manual** - `Downloads`, `Desktop`, `Documents`
- **Unknown** - Fallback

### Anonymous Event Sender

**File**: `sender.go`

```go
func SendInstallEvent(version string) {
    go func() {
        event := InstallEvent{
            Event:         "install",
            Version:       version,
            OS:            runtime.GOOS,
            Arch:          runtime.GOARCH,
            InstallMethod: string(DetectInstallMethod()),
            Timestamp:     time.Now().UTC().Format(time.RFC3339),
        }

        // POST to https://api.kubegraf.io/telemetry/install
        // Silent on error, 3-second timeout
    }()
}
```

Payload example:
```json
{
  "event": "install",
  "version": "1.7.35",
  "os": "darwin",
  "arch": "amd64",
  "install_method": "homebrew",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Configuration File

**Location**: `~/.kubegraf/config.json`

**Format**:
```json
{
  "telemetry": {
    "decided": true,
    "enabled": false
  }
}
```

**Fields**:
- `decided`: Has user made a decision? (boolean)
- `enabled`: Is telemetry enabled? (boolean)

**States**:
1. **First run** → `{"decided": false, "enabled": false}`
2. **User opts in** → `{"decided": true, "enabled": true}`
3. **User opts out** → `{"decided": true, "enabled": false}`

## Testing

### Test Interactive Prompt

```bash
# Delete config to simulate first run
rm ~/.kubegraf/config.json

# Run KubeGraf
kubegraf

# You should see the prompt
```

### Test Non-Interactive (Should NOT Prompt)

```bash
# Delete config
rm ~/.kubegraf/config.json

# Run in non-interactive mode
echo "" | kubegraf

# Should NOT prompt, should default to disabled
```

### Test Install Method Detection

```bash
# From macOS Homebrew install
/opt/homebrew/bin/kubegraf
# Should detect: homebrew

# From Scoop install
C:\Users\user\scoop\apps\kubegraf\current\kubegraf.exe
# Should detect: scoop
```

### Test Timeout

```bash
rm ~/.kubegraf/config.json
kubegraf
# Don't type anything, wait 10 seconds
# Should timeout and default to NO
```

## Privacy Audit Checklist

- [x] No IP addresses sent in payload
- [x] No IP addresses logged by backend
- [x] No user identifiers or session tokens
- [x] No hostnames or machine names
- [x] No cluster data (namespaces, pods, etc.)
- [x] No kubectl commands or kubeconfig
- [x] No file paths or environment variables
- [x] Opt-in by default (not opt-out)
- [x] 10-second timeout defaults to NO
- [x] One-time only (no continuous tracking)
- [x] Fire-and-forget (error doesn't block CLI)
- [x] Open-source and auditable

## Dependencies

- `golang.org/x/term` - Terminal detection (IsTerminal)
- Standard library only:
  - `encoding/json` - Config and event serialization
  - `net/http` - HTTP client for telemetry request
  - `os` - File system and executable path
  - `runtime` - GOOS, GOARCH detection
  - `time` - Timestamp and timeout

No external analytics SDKs or tracking libraries.

## Backend Requirements

The telemetry endpoint (`https://api.kubegraf.io/telemetry/install`) MUST:

✅ **Do**:
- Accept POST requests with JSON payload
- Validate JSON schema
- Aggregate counts (version, OS, install method)
- Return 200 OK on success

❌ **Do NOT**:
- Store IP addresses
- Log request headers (beyond Content-Type)
- Create user profiles or sessions
- Track individual users over time
- Share data with third parties
- Use cookies or browser fingerprinting

## Rollout Plan

### Phase 1: Internal Testing
- Test on macOS, Linux, Windows
- Test Homebrew, Scoop, manual installs
- Test interactive vs non-interactive terminals
- Verify prompt timeout behavior

### Phase 2: Beta Release
- Include in beta builds (v1.7.36-beta1)
- Monitor backend logs (ensure no PII)
- Collect feedback from beta users

### Phase 3: General Availability
- Include in stable release (v1.7.36)
- Document on website (kubegraf.io/telemetry)
- Announce in release notes

## Support

**Code**: `internal/telemetry/`  
**Docs**: `docs/TELEMETRY.md`  
**Issues**: https://github.com/kubegraf/kubegraf/issues  
**Privacy**: privacy@kubegraf.io

---

**Last Updated**: 2025-01-15
