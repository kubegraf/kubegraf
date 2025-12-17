# KubeGraf Telemetry System

A privacy-respecting, anonymous telemetry system for understanding KubeGraf adoption. This system is designed to be minimal, opt-out, and completely transparent.

## Overview

KubeGraf collects anonymous telemetry to help us understand:
- How many people download KubeGraf
- How many successful installations exist
- How many active users we have

**What we DON'T collect:**
- ❌ Cluster data
- ❌ Kubeconfig contents
- ❌ IP addresses
- ❌ User identity
- ❌ Namespace names
- ❌ Resource names
- ❌ Any personal information

---

## Telemetry Events

### 1. Download Event

Sent when the installer script runs.

```json
{
  "event": "download",
  "os": "darwin",
  "arch": "arm64",
  "version": "0.1.0"
}
```

**When:** `install.sh` is executed
**Blocking:** No (fire-and-forget)
**Frequency:** Once per download

### 2. Install Event

Sent on the first successful startup.

```json
{
  "event": "install",
  "install_id": "550e8400-e29b-41d4-a716-446655440000",
  "os": "darwin",
  "arch": "arm64",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**When:** First time `kubegraf web` starts successfully
**Blocking:** No (fire-and-forget)
**Frequency:** Once per machine (stored in `~/.kubegraf/install_id`)

### 3. Heartbeat Event

Sent periodically to track active installations.

```json
{
  "event": "heartbeat",
  "install_id": "550e8400-e29b-41d4-a716-446655440000",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**When:** At most once every 24 hours while KubeGraf is running
**Blocking:** No (fire-and-forget)
**Frequency:** Rate-limited to once per day

---

## How to Control Telemetry

### CLI Commands

```bash
# Check current status
kubegraf telemetry status

# Disable telemetry
kubegraf telemetry disable

# Enable telemetry
kubegraf telemetry enable
```

### Example Output

```bash
$ kubegraf telemetry status

╔═══════════════════════════════════════════════════════════════╗
║                    KubeGraf Telemetry Status                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     ✅ Enabled                                       ║
║  Install ID: 550e8400-e29b-41d4-a716-446655440000             ║
║  Version:    0.1.0                                            ║
╚═══════════════════════════════════════════════════════════════╝

ℹ️  Anonymous telemetry helps us understand adoption and improve 
   KubeGraf. No cluster data or personal information is ever collected.

To disable: kubegraf telemetry disable
```

---

## Configuration Files

### Config File

Location: `~/.kubegraf/config.yaml`

```yaml
telemetry:
  enabled: true
```

### State File

Location: `~/.kubegraf/telemetry_state.json`

```json
{
  "last_heartbeat": "2024-01-15T10:30:00Z"
}
```

### Install ID File

Location: `~/.kubegraf/install_id`

Contains a single UUID v4 string:
```
550e8400-e29b-41d4-a716-446655440000
```

---

## Privacy Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Anonymous** | Install ID is a random UUID, not tied to any identity |
| **Minimal** | Only OS, architecture, and version are collected |
| **Opt-Out** | Can be disabled with `kubegraf telemetry disable` |
| **Non-Blocking** | Never blocks startup; 2-second timeout on all requests |
| **Offline-Safe** | Silently skips if network is unavailable |
| **No Cluster Data** | We never access or transmit kubeconfig or cluster info |
| **No IP Logging** | Server-side does not log IP addresses |

---

## Technical Implementation

### Package Structure

```
pkg/telemetry/
├── telemetry.go  # Core telemetry client
└── cli.go        # CLI command handlers
```

### TelemetryClient

```go
type TelemetryClient struct {
    configPath        string           // ~/.kubegraf/config.yaml
    statePath         string           // ~/.kubegraf/telemetry_state.json
    installIDPath     string           // ~/.kubegraf/install_id
    config            *TelemetryConfig // Current config
    state             *TelemetryState  // Current state
    httpClient        *http.Client     // 2s timeout
    kubegrafVersion   string           // App version
    telemetryEndpoint string           // API endpoint
}
```

### Key Methods

| Method | Description |
|--------|-------------|
| `TrackInstall()` | Send one-time install event |
| `StartHeartbeat(ctx)` | Start 24-hour heartbeat loop |
| `EnableTelemetry()` | Enable and persist |
| `DisableTelemetry()` | Disable and persist |
| `IsEnabled()` | Check current status |

---

## Integration Points

### Installer (install.sh)

The installer sends a download event:

```bash
track_download() {
    local PAYLOAD='{"event":"download","os":"'"$OS"'","arch":"'"$ARCH"'","version":"'"$VERSION"'"}'
    curl -s -X POST "https://api.kubegraf.io/telemetry" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        --max-time 2 > /dev/null 2>&1 &
}
```

### Daemon Startup (main.go)

On successful cluster connection:

```go
// Track successful install on first run
telemetryClient.TrackInstall()

// Start heartbeat for active usage
go telemetryClient.StartHeartbeat(app.ctx)
```

### CLI (main.go)

Command routing:

```go
case "telemetry":
    telemetry.HandleTelemetryCommand(telemetryClient, os.Args[2:])
    return
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Offline machine | Silently skip all telemetry |
| Read-only home directory | Gracefully fail, continue without telemetry |
| Multiple restarts | Rate-limited heartbeats (1 per 24h) |
| Version upgrades | Heartbeat continues with new version |
| Telemetry server down | Fire-and-forget, no retries |
| Very slow network | 2-second timeout, no blocking |

---

## Backend Contract

### Endpoint

```
POST https://api.kubegraf.io/telemetry
Content-Type: application/json
```

### Events

| Event | Fields |
|-------|--------|
| `download` | event, os, arch, version |
| `install` | event, install_id, os, arch, version, timestamp |
| `heartbeat` | event, install_id, version, timestamp |

### Response

- `200 OK` or `202 Accepted` - Success
- Any other status - Ignored (best-effort)

---

## Transparency Statement

```
Anonymous telemetry helps us understand adoption and improve KubeGraf.
No cluster data or personal information is ever collected.
```

This message is displayed:
- When running `kubegraf telemetry status`
- In the Settings page of the UI
- In this documentation

---

## Viewing Telemetry in the UI

### Settings Page

1. Open KubeGraf at `http://localhost:3003`
2. Navigate to **Settings** (gear icon in sidebar)
3. Look for the **Telemetry** section
4. Toggle to enable/disable
5. View your anonymous Install ID

### What You'll See

- Current telemetry status (enabled/disabled)
- Your anonymous Install ID
- Transparency statement
- Link to this documentation

---

## FAQ

### Why collect telemetry?

To understand:
- Which platforms (OS/arch) are most popular
- How many active users we have
- Whether new versions are being adopted

This helps us prioritize development and platform support.

### Can I see what's being sent?

Yes! Enable debug logging:
```bash
KUBEGRAF_LOG_LEVEL=debug kubegraf web
```

Telemetry events are logged at debug level.

### Is my data sold?

No. Telemetry data is used only for understanding KubeGraf usage.

### How long is data retained?

Telemetry data is aggregated and anonymized. Raw events are not stored long-term.

### What if I'm in an air-gapped environment?

Telemetry will silently fail with no impact on KubeGraf functionality.

---

## Opting Out

To completely disable telemetry:

```bash
kubegraf telemetry disable
```

This:
1. Disables all future telemetry events
2. Persists the setting in `~/.kubegraf/config.yaml`
3. Takes effect immediately

To verify:
```bash
kubegraf telemetry status
# Should show "Status: ❌ Disabled"
```

