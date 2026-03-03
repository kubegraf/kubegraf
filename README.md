# KubeGraf

**Incident Intelligence for Kubernetes.**

KubeGraf is a self-hosted web application that connects to your Kubernetes clusters to detect, investigate, and help resolve incidents — powered by the Orkas AI agent.

It runs on your local machine and connects to any cluster your `kubectl` can reach. No Helm, no cluster-side install — just download and run.

> **Launch: 23 March 2026** — v1.0.0 coming soon.

---

## Install

### macOS

**Homebrew (recommended):**

```bash
brew install kubegraf/tap/kubegraf
```

**Direct download:**

```bash
# Apple Silicon (M1/M2/M3/M4)
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# Intel
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
```

### Windows

**Scoop (recommended — no admin required, no SmartScreen):**

```powershell
scoop bucket add kubegraf https://github.com/kubegraf/scoop-bucket
scoop install kubegraf
```

**Direct download:**

Download the latest `.zip` from [Releases](https://github.com/kubegraf/kubegraf/releases/latest), extract, and add the folder to your `PATH`.

### Linux

```bash
# amd64
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# arm64
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
```

**Verify:**

```bash
kubegraf --version
```

---

## Quick Start

```bash
kubegraf web --port=3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

KubeGraf reads your existing `~/.kube/config` automatically. Switch between clusters from the UI — no extra configuration needed.

---

## Requirements

- `kubectl` configured with cluster access (`~/.kube/config`)
- Kubernetes 1.28 or later
- Modern browser (Chrome, Firefox, Safari, Edge)

---

## Releases

All releases are on the [Releases](https://github.com/kubegraf/kubegraf/releases) page:

- Pre-built binaries for macOS, Linux, Windows (amd64 + arm64)
- SHA-256 checksums (`checksums.txt`)
- Release notes

---

## Documentation

Full documentation: [kubegraf.io/docs](https://kubegraf.io/docs)

---

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
