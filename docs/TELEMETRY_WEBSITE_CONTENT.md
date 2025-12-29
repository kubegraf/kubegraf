# Telemetry Transparency - Website Content

This file contains user-facing content suitable for kubegraf.io website.

---

## Telemetry & Privacy

### We Respect Your Privacy

KubeGraf uses **opt-in, anonymous telemetry** to understand adoption. You are prompted **once** on first run, and can easily opt-out.

### What We Collect

**ONE install event** containing:
- KubeGraf version
- Operating system (macOS, Linux, Windows)
- Architecture (amd64, arm64)
- Install method (Homebrew, Scoop, manual, etc.)
- Timestamp

### What We NEVER Collect

- ❌ Cluster data (pods, services, namespaces)
- ❌ kubectl commands
- ❌ IP addresses
- ❌ User identifiers
- ❌ Kubeconfig contents
- ❌ Continuous tracking

### How It Works

1. **First run** → You see a prompt with 10-second timeout
2. **Choose** → Type `y` for yes, `n` for no, or wait (defaults to NO)
3. **Decision saved** → Never prompted again
4. **If opted in** → ONE anonymous install event sent
5. **Done** → No further tracking

### Control Your Data

```bash
# Check status
kubegraf telemetry status

# Opt in
kubegraf telemetry enable

# Opt out
kubegraf telemetry disable
```

### Industry Standard

This approach follows best practices from:
- Terraform (opt-in telemetry)
- kubectl plugins (anonymous usage stats)
- Tilt (install tracking)
- Homebrew (analytics)

But with **stronger privacy**:
- ✅ Opt-in (not opt-out)
- ✅ One-time only (not continuous)
- ✅ No user IDs
- ✅ No IP logging

### Open Source

All telemetry code is open-source. You can verify exactly what's sent:

📁 [View telemetry code](https://github.com/kubegraf/kubegraf/tree/main/internal/telemetry)

---

## FAQ

**Q: Why do you need telemetry?**  
A: To understand if KubeGraf is being adopted, which platforms to prioritize, and whether to continue investing in the project.

**Q: Can you track my clusters?**  
A: No. We never collect cluster data, kubeconfig, or kubectl commands.

**Q: Can you identify me?**  
A: No. We don't collect IP addresses, hostnames, emails, or any identifiers.

**Q: What if I'm offline?**  
A: The telemetry request silently fails. Your CLI works normally.

**Q: Can I change my mind?**  
A: Yes. Run `kubegraf telemetry enable` or `kubegraf telemetry disable` anytime.

---

## For Compliance Teams

### GDPR/CCPA Compliance

KubeGraf telemetry is compliant with GDPR and CCPA because:
- **No personal data** is collected (version, OS, architecture are not personal data)
- **No IP addresses** are stored
- **No identifiers** link events to individuals
- **Opt-in by default** (explicit consent)
- **Easy opt-out** (one command)

### Enterprise-Friendly

- **Non-blocking**: Telemetry failure never breaks the CLI
- **Timeout**: 3-second request timeout
- **Firewall-safe**: Silent failure if blocked
- **No retry**: One attempt only
- **No dependencies**: Works offline

### Audit Trail

- Configuration stored in: `~/.kubegraf/config.json`
- Decision is persistent and inspectable
- Open-source code for verification

---

**Questions?** Email privacy@kubegraf.io
