# KubeGraf Pricing & Licensing Compliance Guide

**Status:** ✅ COMPLIANT (with proper implementation)
**License:** Apache 2.0 (Open Source)
**Document Date:** December 4, 2025

---

## Executive Summary

✅ **YES, you can offer paid plans** - but with specific compliance requirements.

### What You CAN Do ✅
- Offer free and paid tiers
- Charge for hosted/SaaS versions
- Charge for support/premium support
- Charge for enterprise features (that don't restrict core functionality)
- Charge for consulting/deployment services
- Create proprietary enterprise plugins/extensions

### What You CANNOT Do ❌
- Charge for the open-source binary itself
- Restrict free access to core Kubernetes functionality
- Gate the agent MVP behind paywall (must stay free)
- Remove source code visibility
- Change the Apache 2.0 license
- Prevent fork/redistribution

---

## Apache 2.0 License Terms

### Key Points

```
Apache 2.0 allows:
✅ Commercial use
✅ Modifications
✅ Distribution
✅ Sublicensing
✅ Private use

Apache 2.0 requires:
✅ License & copyright notice
✅ Document changes made
✅ Same license for derived works
✅ State modifications clearly

Apache 2.0 prohibits:
❌ Trademark use
❌ Liability claims
❌ Warranty claims
```

---

## Compliant Pricing Model for KubeGraf

### ✅ RECOMMENDED: Tiered SaaS Model

```
┌─────────────────────────────────────────────────────────────┐
│ KubeGraf Pricing Tiers                                       │
└─────────────────────────────────────────────────────────────┘

STANDARD (FREE) ✅
├─ Full kubegraf binary (open source)
├─ All core features (Terminal UI, Web Dashboard, Solid.js UI)
├─ Agent MVP (embedded, all features)
├─ Community support
├─ Self-hosted only
└─ Unlimited use

PRO ($29/month) ✅
├─ Everything in Standard, PLUS:
├─ Cloud-hosted version (managed infrastructure)
├─ Priority email support (24-hour response)
├─ Managed backups
├─ SSL/TLS certificate management
├─ Multi-team collaboration
├─ Single-tenant deployment
└─ Custom domain

ENTERPRISE ($299+/month) ✅
├─ Everything in Pro, PLUS:
├─ Dedicated support (4-hour response)
├─ SLA guarantee (99.9% uptime)
├─ Multi-team with role-based access
├─ SSO/SAML integration
├─ Audit compliance features
├─ Custom data retention policies
├─ On-premise deployment option
├─ Custom integrations (Slack, PagerDuty, etc.)
└─ Consulting hours included
```

### Why This Works ✅

1. **Core is free** - Anyone can download/use kubegraf binary at $0
2. **You charge for service** - Hosting, support, managed features
3. **Apache 2.0 compliant** - Users can fork/host themselves if they want
4. **Sustainable revenue** - Funds ongoing development
5. **Open source wins** - More users = more contributors

---

## Feature Gating - Compliance Matrix

### ✅ COMPLIANT - Can Gate (Enterprise Only)

| Feature | Standard | Pro | Enterprise | Notes |
|---------|----------|-----|------------|-------|
| **Agent MVP** | ✅ Free | ✅ Free | ✅ Free | Core agent is free for all |
| **Cloud Hosting** | ❌ | ✅ | ✅ You pay for infra |
| **Priority Support** | ❌ | ✅ | ✅ Service fee |
| **SSO/SAML** | ❌ | ❌ | ✅ Enterprise feature |
| **Audit Compliance UI** | ❌ | ❌ | ✅ Enterprise feature |
| **Slack Integration** | ❌ | ❌ | ✅ Premium integration |
| **PagerDuty Integration** | ❌ | ❌ | ✅ Premium integration |
| **Custom RBAC Rules** | ❌ | ❌ | ✅ Advanced feature |
| **Data Retention Policy** | Default | Default | Custom | Infrastructure feature |
| **SLA Guarantee** | ❌ | ❌ | ✅ Support service |

### ❌ CANNOT Gate - Must Be Free

| Feature | Status | Reason |
|---------|--------|--------|
| **Kubernetes resource management** | ✅ Free | Core functionality (Apache 2.0) |
| **Agent MVP (all tools)** | ✅ Free | Part of released code |
| **Terminal UI** | ✅ Free | Part of released code |
| **Web Dashboard** | ✅ Free | Part of released code |
| **Solid.js UI** | ✅ Free | Part of released code |
| **Cost analysis** | ✅ Free | Core agent feature |
| **Security scanning** | ✅ Free | Core security feature |
| **YAML editor** | ✅ Free | Core feature |
| **Pod exec/logs** | ✅ Free | Core K8s feature |
| **Source code** | ✅ Free | Apache 2.0 requirement |

---

## Implementation Guide

### Option 1: Cloud-Hosted Service (Recommended)

```
Your Revenue Model:
├─ kubegraf binary ($0) → Users can self-host
├─ kubegraf.io SaaS ($29-299/mo) → You host it
├─ GitHub → Source code (always free)
└─ Enterprise support → Premium service
```

**Advantages:**
- ✅ Apache 2.0 compliant (core is free)
- ✅ Sustainable revenue
- ✅ Users choose: free self-host or paid managed
- ✅ No code restrictions needed
- ✅ Community friendly

**Implementation:**
```bash
# Keep everything open source
git push origin main  # Public repo

# Add web server infrastructure for SaaS
.github/
├── workflows/
│   └── deploy-saas.yml  # Deploy to your server

# Deploy endpoint
https://app.kubegraf.io  # Your managed version

# Self-hosted still works free
kubegraf --web  # Anyone can run this locally
```

### Option 2: Enterprise Plugin System (Compliant)

```go
// plugins/enterprise/sso.go - Paid plugin
package enterprise

import "github.com/kubegraf/kubegraf"

type SSOPlugin struct {
    provider string  // "okta", "azure", "google"
}

// User must purchase license to use
// But core kubegraf stays free
```

**License Check:**
```go
func (s *SSOPlugin) Init(licenseKey string) error {
    if !ValidateLicense(licenseKey, "enterprise") {
        return errors.New("SSO plugin requires enterprise license")
    }
    return nil
}
```

✅ **Compliant because:**
- Core kubegraf is free (all core features included)
- Optional enterprise plugins are paid
- Users can fork/replace plugin system
- Apache 2.0 is respected

---

## Pricing Implementation (Code Example)

### ✅ RECOMMENDED: Use License Key for Features

```go
// license/license.go
package license

type License struct {
    Tier      string    // "free", "pro", "enterprise"
    Key       string
    ExpiresAt time.Time
    Features  map[string]bool
}

type LicenseManager struct {
    config *LicenseConfig
}

// Check tier
func (lm *LicenseManager) HasFeature(feature string) bool {
    license := lm.GetCurrentLicense()

    // Free tier gets core features
    freeTierFeatures := map[string]bool{
        "kubernetes_management": true,
        "agent_mvp":            true,
        "security_scan":        true,
        "cost_analysis":        true,
        "terminal_ui":          true,
        "web_dashboard":        true,
        "solid_ui":             true,
    }

    // Check if feature requires paid license
    if _, exists := freeTierFeatures[feature]; exists {
        return true  // Always available free
    }

    // Premium features need license
    switch license.Tier {
    case "pro":
        return license.Features[feature]
    case "enterprise":
        return true  // All features
    default:
        return false
    }
}
```

### License Key Generation

```go
// license/keygen.go
func GenerateLicenseKey(tier, customerId string) string {
    // Generates signed JWT token
    // Structure: header.payload.signature

    payload := jwt.MapClaims{
        "tier":     tier,
        "customer": customerId,
        "issued":   time.Now(),
        "expires":  time.Now().AddDate(1, 0, 0), // 1 year
    }

    token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, payload).
        SignedString([]byte(os.Getenv("LICENSE_SECRET")))

    return token
}
```

### Compliance Check in Code

```go
// web_server.go
func handleSSOSetup(w http.ResponseWriter, r *http.Request) {
    // SSO is enterprise feature
    license := license.GetCurrentLicense()

    if license.Tier != "enterprise" {
        http.Error(w, "SSO requires enterprise license", http.StatusPaymentRequired)
        return
    }

    // Proceed with SSO setup
    setupSSO(r)
}
```

### User-Facing Message

```tsx
// ui/solid/src/routes/Settings.tsx
export function Settings() {
  const [license, setLicense] = createSignal(null);

  return (
    <div class="settings">
      {/* Show license tier */}
      <div class="license-info">
        <h3>Current Plan: {license()?.tier || "Free"}</h3>
        {license()?.tier === "free" && (
          <p>
            <a href="https://kubegraf.io/pricing">
              Upgrade to Pro or Enterprise
            </a>
          </p>
        )}
      </div>

      {/* Feature that requires upgrade */}
      {license()?.tier !== "enterprise" && (
        <div class="feature-locked">
          <h4>🔒 SSO/SAML (Enterprise only)</h4>
          <button onclick={() => window.location.href = "/pricing"}>
            Upgrade to Enterprise
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Pricing Page Template

```markdown
# KubeGraf Pricing

## For Everyone

### Standard (Free) ✅
- $0/month
- **Perfect for:** Teams getting started, open source projects
- **What's included:**
  - Full kubegraf binary (Terminal, Web, Solid.js UI)
  - Autonomous Agent MVP (all 50+ tools)
  - Kubernetes management for unlimited clusters
  - Community support
  - Self-hosted only

[Get Started Free](#download)

---

## For Growing Teams

### Pro ($29/month)
- Cloud-hosted managed service
- **What's included:**
  - Everything in Standard, PLUS
  - Multi-team collaboration
  - Priority support (24h response)
  - Managed backups & SSL
  - Custom domain

[Start Free Trial](#trial)

---

## For Enterprises

### Enterprise ($299+/month)
- Full-featured managed platform
- **What's included:**
  - Everything in Pro, PLUS
  - Dedicated support (4h response)
  - SSO/SAML authentication
  - SLA guarantee (99.9%)
  - On-premise deployment
  - Custom integrations
  - Audit compliance features

[Contact Sales](#contact)

---

## FAQ

**Q: Can I use Standard (free) version in production?**
A: Absolutely! The free version has all core features. No restrictions.

**Q: Can I self-host Pro/Enterprise features?**
A: Yes! Download the source, it's all open source. These tiers are for managed hosting.

**Q: What happens if my license expires?**
A: Paid features are disabled, but all core features continue working.

**Q: Can I downgrade from Pro to Standard?**
A: Yes, anytime. No contracts.
```

---

## Legal/Compliance Checklist

### ✅ Before Launch

- [ ] Add `LICENSE_NOTICE.md` to `docs/`
- [ ] Update `README.md` with pricing info
- [ ] Add license check code to `license/license.go`
- [ ] Create pricing page on `kubegraf.io`
- [ ] Document in TERMS_OF_SERVICE.md that:
  - Core kubegraf is free/open-source
  - Paid tiers are for SaaS hosting/support
  - License keys are optional
  - Source code remains public
- [ ] Set up license validation in backend
- [ ] Create license upgrade flow in UI
- [ ] Test free → pro upgrade path

### ✅ Compliance Statements

```markdown
# License & Pricing Statement

## KubeGraf Core (Open Source)
- License: Apache 2.0
- Cost: FREE
- Users can: Download, modify, redistribute, self-host
- Restrictions: None (read Apache 2.0)

## KubeGraf Pricing Tiers
- Standard: Free (self-hosted)
- Pro: $29/month (managed infrastructure)
- Enterprise: $299+/month (dedicated support)

## What We Charge For
- ✅ Cloud infrastructure (hosting)
- ✅ Support services (enterprise SLA)
- ✅ Managed features (SSO, compliance, integrations)

## What We DON'T Charge For
- ✅ Open source binary
- ✅ Source code
- ✅ Core Kubernetes management
- ✅ Agent MVP
- ✅ Any features in public repository

## Compliance
- ✅ Apache 2.0 compliant
- ✅ No vendor lock-in
- ✅ Users can fork/self-host anytime
- ✅ Full transparency on features
```

---

## Revenue Streams (Compliant Options)

### ✅ Option 1: SaaS Hosting
```
kubegraf binary ($0) + infrastructure ($29-299/mo) = Revenue
```

### ✅ Option 2: Support Services
```
Open source software ($0) + premium support ($X/mo) = Revenue
```

### ✅ Option 3: Enterprise Services
```
Core software ($0) + consulting/deployment ($X) = Revenue
```

### ✅ Option 4: Plugins/Extensions
```
Core software ($0) + enterprise plugins ($X/mo) = Revenue
```

### ✅ Option 5: Training/Certification
```
Open source tool ($0) + training courses ($X) = Revenue
```

### ✅ Option 6: Hosted Marketplace
```
Free tool ($0) + marketplace apps commission = Revenue
```

---

## Apache 2.0 vs Commercial License

### If You Want STRICTER Control (Optional)

You can offer **dual licensing**:

```
┌─────────────────────────────────────────┐
│ Dual Licensing Model                    │
└─────────────────────────────────────────┘

Option 1: Apache 2.0 (Free)
├─ Open source
├─ Can modify/redistribute
└─ Must keep Apache 2.0 license

Option 2: Commercial License ($X)
├─ Proprietary modifications allowed
├─ No copyleft requirements
└─ Support included
```

**However:** For MVP, stick with Apache 2.0 only (simpler, more community-friendly)

---

## Recommended Pricing Strategy

### Phase 1 (MVP Launch)
```
✅ Everything is FREE
✅ Just release the agent MVP
✅ Gather user feedback
✅ Build community
```

### Phase 2 (v1.5 - 3-4 months later)
```
✅ Release cloud-hosted option (paid)
✅ Keep open source free
✅ Add premium support tier
```

### Phase 3 (v2.0 - 6 months later)
```
✅ Enterprise features (SSO, audit, etc.)
✅ Keep core free
✅ Sustainable revenue stream
```

---

## Summary: Compliance Status

| Item | Status | Notes |
|------|--------|-------|
| **Free Tier** | ✅ Compliant | All core features free |
| **Paid Tiers** | ✅ Compliant | Charge for infrastructure/support |
| **Gating Features** | ✅ Compliant | Only gate paid features, not core |
| **Open Source** | ✅ Compliant | Keep code public, Apache 2.0 |
| **License Key** | ✅ Compliant | Optional, for paid tiers only |
| **Revenue Model** | ✅ Compliant | SaaS hosting + support |

**Recommendation:** Launch MVP with everything free. Add SaaS tier in 3-4 months.

---

## References

- [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0)
- [Open Source Initiative - Commercial Use](https://opensource.org/faq)
- [Dual Licensing Guide](https://www.gnu.org/licenses/gpl-faq.html#commercial)
- [SaaS + Open Source Business Model](https://opencore.com/blog/open-source-business-models)

---

**Status:** ✅ **PRICING MODEL IS COMPLIANT**

You can implement the tiered pricing without violating Apache 2.0. Keep core free, charge for managed hosting/support.
