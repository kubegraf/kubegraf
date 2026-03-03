# KubeGraf

**Incident Intelligence for Kubernetes.**

KubeGraf is a self-hosted platform that detects, investigates, and helps resolve Kubernetes incidents — powered by the Orkas AI agent.

> **Launch: 23 March 2026** — v1.0.0 coming soon.

---

## Install

### Helm (recommended)

```bash
helm repo add kubegraf https://kubegraf.github.io/charts
helm repo update
helm install kubegraf kubegraf/kubegraf --namespace kubegraf --create-namespace
```

### Binary

```bash
# macOS (Apple Silicon)
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# Linux (amd64)
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
```

Verify installation:

```bash
kubegraf --version
```

---

## Requirements

- Kubernetes 1.28 or later (1.29+ recommended)
- Helm 3.10+ (for Helm install)
- `kubectl` configured with cluster access

---

## Documentation

Full documentation is available at [kubegraf.io/docs](https://kubegraf.io/docs).

---

## Releases

All releases are published on the [Releases](https://github.com/kubegraf/kubegraf/releases) page with:
- Pre-built binaries for Linux, macOS, Windows (amd64 + arm64)
- SHA-256 checksums
- Release notes

---

## Security

To report a security vulnerability, see [SECURITY.md](SECURITY.md).

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
