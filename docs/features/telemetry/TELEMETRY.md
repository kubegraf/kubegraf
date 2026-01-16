# KubeGraf Telemetry - Privacy & Transparency

## Overview

KubeGraf uses **opt-in, anonymous telemetry** to understand adoption and improve the product. This document explains exactly what is collected, how it works, and how to control it.

## Privacy Guarantees

✅ **What We Collect**:
- Install event (one-time, on first run)
- KubeGraf version (e.g., `1.7.35`)
- Operating system (e.g., `darwin`, `linux`, `windows`)
- Architecture (e.g., `amd64`, `arm64`)
- Install method (e.g., `homebrew`, `scoop`, `manual`)
- Timestamp (UTC, RFC3339 format)

❌ **What We NEVER Collect**:
- **NO** cluster data (namespaces, pods, services, etc.)
- **NO** kubeconfig contents
- **NO** kubectl commands you run
- **NO** IP addresses (not logged by backend)
- **NO** hostnames or machine IDs
- **NO** user identifiers or emails
- **NO** file paths or environment variables
- **NO** network topology or cluster size
- **NO** container images or registry details
- **NO** continuous tracking or heartbeats

## How It Works

### First-Run Experience

When you run KubeGraf for the first time, you'll see this prompt:

```
╭─────────────────────────────────────────────────────────────╮
│                    Help improve KubeGraf?                   │
╰─────────────────────────────────────────────────────────────╯

  Send anonymous install metadata (version, OS, install method).
  No cluster data. No commands. No identifiers.

  [Y] Yes   [N] No (default)
```

**Your options**:
- Type `y` or `yes` → Enable telemetry
- Type `n` or `no` → Disable telemetry
- Wait 10 seconds → Default to **NO** (telemetry disabled)

**After you choose**:
- Your decision is saved to `~/.kubegraf/config.json`
- You will **NEVER be prompted again**
- If you opted in, **ONE** anonymous install event is sent
- No further tracking occurs

### Non-Interactive Environments

Telemetry **NEVER prompts** in:
- CI/CD pipelines
- Docker containers
- Kubernetes Jobs/CronJobs
- Shell scripts (non-interactive terminals)
- SSH sessions without TTY

In these environments, telemetry automatically defaults to **DISABLED**.

## Controlling Telemetry

### Check Status

```bash
kubegraf telemetry status
```

### Enable Telemetry

```bash
kubegraf telemetry enable
```

### Disable Telemetry

```bash
kubegraf telemetry disable
```

## Why We Need This

**Problem**: We don't know how many people use KubeGraf.

Without basic adoption metrics, we can't answer questions like:
- Is KubeGraf being adopted?
- Which platforms should we prioritize?
- Which install methods are most popular?

**Solution**: One-time, opt-in, anonymous install tracking.

## Trust Over Metrics

We believe **trust is more important than metrics**. That's why:

1. **Telemetry is opt-in** - You must explicitly consent
2. **Default is NO** - If you don't respond, telemetry is disabled
3. **One-time only** - No continuous tracking
4. **Anonymous** - No identifiers, IPs, or personal data
5. **Open-source** - You can verify exactly what's sent

---

**Last Updated**: 2025-01-15
