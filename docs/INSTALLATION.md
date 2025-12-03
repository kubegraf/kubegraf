# Installation Guide

## Prerequisites

- **Go**: 1.24+ ([download](https://golang.org/dl/))
- **Node.js**: 20.19+ or 22.12+ ([download](https://nodejs.org))
- **Kubernetes**: Access to a cluster
- **Optional**: Redis, Ollama

## Quick Install

### macOS (Homebrew)
```bash
brew install kubegraf
kubegraf
```

### Linux
```bash
curl -fsSL https://kubegraf.io/install.sh | bash
kubegraf
```

### Windows (Scoop)
```bash
scoop install kubegraf
kubegraf
```

## Build from Source

```bash
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf

# Frontend
cd ui/solid
npm install
npm run build
cd ../..

# Copy assets
cp -r ui/solid/dist/* web/

# Backend
go build -o kubegraf .

# Run
./kubegraf
```

## Configuration

Edit `~/.kubegraf/config.yaml`:

```yaml
server:
  port: 3001

cache:
  backend: lru  # or redis

ai_agent:
  local:
    enabled: true
```

## First Run

1. Start: `./kubegraf`
2. Open: http://localhost:3001
3. Connect to cluster or create local K3s

## Troubleshooting

**Port already in use:**
```bash
export KUBEGRAF_PORT=3002
./kubegraf
```

**No cluster found:**
- Click "Connect to Cluster"
- Follow OAuth flow for cloud providers
- Or create local cluster with K3s/Minikube

**More help**: https://kubegraf.io/docs/troubleshooting
