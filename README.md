<div align="center">
  <img src="docs/kubegraf_logo.png" alt="KubeGraf" width="380">
  <br/><br/>

  ### The AI SRE for Kubernetes

  **Detect · Diagnose · Resolve — without leaving your terminal or browser**

  [![Release](https://img.shields.io/github/v/release/kubegraf/kubegraf?color=blue&label=release)](https://github.com/kubegraf/kubegraf/releases/latest)
  [![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go)](https://golang.org)
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![GitHub Stars](https://img.shields.io/github/stars/kubegraf/kubegraf?style=flat&color=yellow)](https://github.com/kubegraf/kubegraf/stargazers)

  **[Website](https://kubegraf.io)** · **[Documentation](https://kubegraf.io/docs/)** · **[Releases](https://github.com/kubegraf/kubegraf/releases)** · **[Report Bug](https://github.com/kubegraf/kubegraf/issues)**
</div>

---

KubeGraf is your **AI SRE** — it watches your Kubernetes clusters, tells you what's broken and why, and helps you fix it safely. No SaaS. No cluster-side install. Just download and run.

> **v1.0.0 launching 23 March 2026.**

---

## Install

### macOS

```bash
# Homebrew (recommended)
brew tap kubegraf/tap
brew install kubegraf

# Apple Silicon
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# Intel
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
```

### Linux

```bash
# amd64
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# arm64
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
```

### Windows

```powershell
# Scoop (recommended — no admin required, no SmartScreen)
scoop bucket add kubegraf https://github.com/kubegraf/scoop-bucket
scoop install kubegraf
```

Or download the latest `.zip` from [Releases](https://github.com/kubegraf/kubegraf/releases/latest), extract, and add to your `PATH`.

```bash
kubegraf --version
```

---

## Quick Start

```bash
# Web dashboard
kubegraf web
# → http://localhost:3000

kubegraf web --port=3003   # custom port

# Terminal UI — works over SSH
kubegraf
```

KubeGraf reads your existing `~/.kube/config` automatically. No configuration needed to get started.

<div align="center">
  <img src="docs/dashboard-screenshot.png" alt="KubeGraf Dashboard" width="780">
</div>

---

## What You Get

- **Incident detection** — Automatically spots failures across your cluster and tells you exactly what's wrong and why
- **AI-powered diagnosis** — Root cause analysis backed by real evidence: events, logs, and resource state
- **Safe fixes** — Every recommended fix includes a dry-run preview and risk assessment before you apply anything
- **GitOps management** — Manage Helm releases, ArgoCD applications, and Flux resources from one place
- **Resource management** — Full visibility and control over every resource in your cluster
- **Security posture** — Continuous assessment with actionable recommendations
- **AI agent integration** — Connect your AI tools directly to your cluster
- **Terminal UI** — Full-featured interface for SSH sessions and low-bandwidth environments
- **Multi-cluster** — Switch between contexts with a single click

---

## Authentication

Works with every standard Kubernetes auth method out of the box — client certificates, bearer tokens, OIDC, GKE, EKS, AKS, and any `exec`-based credential plugin. No extra flags or environment variables needed.

---

## Requirements

- `~/.kube/config` with cluster access
- Kubernetes 1.28 or later
- Modern browser for the web dashboard

---

## Support

| | |
|---|---|
| Bug reports | [Open an issue](https://github.com/kubegraf/kubegraf/issues/new?template=bug_report.yml) |
| Feature requests | [Open an issue](https://github.com/kubegraf/kubegraf/issues/new?template=feature_request.yml) |
| Documentation | [kubegraf.io/docs](https://kubegraf.io/docs/) |
| Email | [contact@kubegraf.io](mailto:contact@kubegraf.io) |

---

## Security

To report a vulnerability, email **contact@kubegraf.io** with subject `[Security] <title>`. Please do not open a public issue. See [SECURITY.md](SECURITY.md) for our disclosure policy.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

<div align="center">

Built for the engineers who keep production running.

**[Get Started](https://kubegraf.io)** · **[Documentation](https://kubegraf.io/docs/)** · **[Report Bug](https://github.com/kubegraf/kubegraf/issues)**

</div>
