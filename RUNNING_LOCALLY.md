# Running KubeGraf Locally

A comprehensive guide to building and running KubeGraf on your local machine.

## Quick Start

If you just want to get it running quickly:

```bash
# Build the UI
cd ui/solid
npm install
npm run build

# Build the backend
cd ../..
go build -o kubegraf .

# Run it
./kubegraf web --port=3000
# Open http://localhost:3000
```

## Prerequisites

### Required
- **Go**: 1.24 or later ([download](https://golang.org/dl/))
- **Node.js**: 20.19+ or 22.12+ ([download](https://nodejs.org/))
- **npm**: Latest version (comes with Node.js)
- **kubectl**: For accessing Kubernetes clusters
- **kubeconfig**: Access to a Kubernetes cluster

### Optional
- **Redis**: For performance optimization (automatic fallback to in-memory cache if not available)
- **Docker**: For containerized development

### Verify Prerequisites

```bash
go version          # Should be go1.24 or later
node --version      # Should be v20.19+ or v22.12+
npm --version       # Should be latest
kubectl version     # Should show your cluster version
```

## Full Setup Guide

### Step 1: Clone and Navigate

```bash
cd kubegraf
```

### Step 2: Build the Frontend (Solid.js UI)

The frontend is a modern reactive single-page application built with Solid.js.

```bash
cd ui/solid

# Install dependencies (first time only)
npm install

# Build for production
npm run build

# Output: ui/solid/dist/
# This creates optimized assets with hashing: index.html, favicon.svg, assets/

cd ../..  # Back to project root
```

**Development Option**: If you want hot reload during frontend development:
```bash
cd ui/solid
npm run dev
# Runs on http://localhost:5173 with Vite dev server
# Use with backend on different port (see Development Mode section)
```

### Step 3: Copy Frontend Build to Backend

The backend embeds frontend files at compile time using Go's `go:embed` directive. The files must be in the `web/dist/` directory before building.

```bash
# Make sure we're at project root
cd /path/to/kubegraf

# Copy built frontend to web/dist
rm -rf web/dist/*
cp -r ui/solid/dist/* web/dist/

# Verify the files are there
ls -la web/dist/
# Should show: index.html, favicon.svg, logo.png, assets/
```

### Step 4: Build the Backend (Go)

```bash
# Build the binary
go build -o kubegraf .

# Or with version info
go build -ldflags="-s -w -X main.version=dev" -o kubegraf .

# Verify the binary was created
ls -lh kubegraf
# Should show a file ~50-100MB in size
```

**Build Options:**
```bash
# With debugging symbols (larger binary)
go build -o kubegraf .

# Optimized for production (smaller binary)
go build -ldflags="-s -w" -o kubegraf .

# Cross-compile for different OS
GOOS=linux GOARCH=amd64 go build -o kubegraf-linux-amd64 .
GOOS=darwin GOARCH=arm64 go build -o kubegraf-darwin-arm64 .
GOOS=windows GOARCH=amd64 go build -o kubegraf.exe .
```

### Step 5: Run the Application

#### Terminal UI Mode (Default)

Shows Kubernetes resources in your terminal with vim-key navigation:

```bash
# View current namespace
./kubegraf

# View specific namespace
./kubegraf production

# Show version
./kubegraf --version
```

**Key Controls in Terminal UI:**
```
Navigation:
  ↑/↓ or j/k      - Move up/down
  ←/→ or h/l      - Switch tabs (1-7 to jump directly)
  Enter           - View YAML/details of selected item

Actions:
  r               - Refresh data
  n               - Change namespace
  d               - Describe resource
  s               - Shell into pod
  Ctrl+D          - Delete resource

Views:
  i               - Graph view (terminal canvas)
  g               - Graph view (browser)

Exit:
  q or Ctrl+C     - Quit
```

#### Web UI Mode

Modern browser-based dashboard:

```bash
# Default port (3000)
./kubegraf web

# Custom port
./kubegraf web --port=8080

# With verbose logging
./kubegraf web --port=3000 --verbose

# Open in browser
# http://localhost:3000
```

**Features in Web UI:**
- Namespace and cluster switching
- Real-time pod logs (WebSocket streaming)
- Terminal access to pods
- YAML editing and viewing
- Deployment progress tracking
- Security analysis and cost estimation
- AI-powered insights (with OpenAI/Claude API key)
- Theme selection (Dark, Light, Midnight, Cyberpunk, Ocean)

## Development Mode

For development with hot reload on UI changes:

### Setup Terminal 1: Backend Server

```bash
./kubegraf web --port=8080
# Server running on http://localhost:8080
```

### Setup Terminal 2: Frontend Dev Server

```bash
cd ui/solid
npm run dev
# Vite dev server running on http://localhost:5173
```

### Access the Application

Open http://localhost:5173 in your browser.

**How it works:**
- Vite serves the UI with hot module replacement (HMR)
- Vite proxy is configured to forward API calls to http://localhost:8080
- Changes to frontend code are immediately reflected in the browser
- No need to rebuild backend for UI changes

**Edit vite.config.ts if backend port differs:**
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:YOUR_PORT',
    '/ws': { target: 'ws://localhost:YOUR_PORT', ws: true }
  }
}
```

## Building for Different Platforms

### macOS

```bash
# Apple Silicon (M1/M2/M3)
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o kubegraf-darwin-arm64 .

# Intel Mac
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o kubegraf-darwin-amd64 .
```

### Linux

```bash
# AMD64
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o kubegraf-linux-amd64 .

# ARM64 (Raspberry Pi, AWS Graviton)
GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o kubegraf-linux-arm64 .
```

### Windows

```bash
# 64-bit
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o kubegraf.exe .

# 32-bit
GOOS=windows GOARCH=386 go build -ldflags="-s -w" -o kubegraf-32.exe .
```

## Configuration

### Environment Variables

```bash
# Cluster access
export KUBECONFIG=~/.kube/config

# Web server
export KUBEGRAF_PORT=3000

# Optional: AI integration
export OPENAI_API_KEY=your-key-here
export CLAUDE_API_KEY=your-key-here

# Optional: Redis caching
export REDIS_URL=redis://localhost:6379
```

### Kubernetes Context

KubeGraf automatically loads all contexts from your kubeconfig:

```bash
# List available contexts
kubectl config get-contexts

# Set current context
kubectl config use-context my-cluster

# Run KubeGraf (it uses the current context)
./kubegraf web
```

## Features & Capabilities

### Included in Build

- ✅ Multi-cluster support (all kubeconfig contexts)
- ✅ Real-time resource monitoring
- ✅ Pod logging and terminal access
- ✅ YAML viewing and editing
- ✅ Deployment management
- ✅ Security analysis
- ✅ Cost estimation
- ✅ 7 built-in themes
- ✅ Responsive web UI
- ✅ WebSocket real-time updates

### Optional Features (Require Configuration)

- 🔑 AI Insights (OpenAI, Claude, or Ollama)
- 🚀 Advanced ML Anomaly Detection
- 💰 Cloud Cost Estimation (GCP, AWS, Azure)
- 🔐 Configuration Drift Detection
- 🎯 Event Correlation Analysis
- 🤖 SRE Agent for Automation
- 📊 Advanced Recommendations

## Troubleshooting

### Issue: "pattern web/dist: no matching files found"

**Cause**: Forgot to copy frontend build to `web/dist/` before building backend.

**Solution**:
```bash
rm -rf web/dist/*
cp -r ui/solid/dist/* web/dist/
go build -o kubegraf .
```

### Issue: "Cannot connect to cluster"

**Cause**: kubeconfig not set or cluster not accessible.

**Solution**:
```bash
# Verify kubeconfig
kubectl cluster-info

# Or specify kubeconfig
export KUBECONFIG=/path/to/kubeconfig
./kubegraf web
```

### Issue: "Port already in use"

**Solution**: Use a different port:
```bash
./kubegraf web --port=3001
# http://localhost:3001
```

### Issue: "Cannot find npm or Node.js"

**Solution**: Ensure they're installed and in PATH:
```bash
node --version
npm --version
which node
which npm
```

### Issue: Frontend shows "Cannot connect to backend"

**Cause**: Backend not running or on different port.

**Solutions**:
1. Ensure backend is running: `./kubegraf web --port=3000`
2. Update vite.config.ts proxy if using custom port
3. Check browser console for specific error (F12)

### Issue: Build fails with "Go version too old"

**Solution**: Update Go:
```bash
# Check current version
go version

# Should be 1.24 or later
# Download latest from https://golang.org/dl/
```

### Issue: npm install fails

**Solution**: Clear cache and try again:
```bash
cd ui/solid
rm -rf node_modules package-lock.json
npm install
```

## File Structure After Build

```
kubegraf/
├── kubegraf                 # Compiled binary
├── web/
│   ├── dist/
│   │   ├── index.html      # Embedded in binary
│   │   ├── favicon.svg     # Embedded in binary
│   │   ├── logo.png        # Embedded in binary
│   │   └── assets/         # Embedded in binary
│   │       ├── index-*.js  # JavaScript bundles
│   │       └── index-*.css # Stylesheets
│   ├── favicon.svg
│   ├── index.html
│   └── logo.png
├── ui/solid/
│   ├── dist/               # Frontend build output
│   ├── src/                # Source code (not needed at runtime)
│   └── package.json
└── [other Go source files]
```

## One-Liner Commands

### Complete Build + Run

```bash
cd ui/solid && npm install && npm run build && cd ../.. && \
rm -rf web/dist/* && cp -r ui/solid/dist/* web/dist/ && \
go build -o kubegraf . && \
./kubegraf web --port=3000
```

### Build Only

```bash
cd ui/solid && npm run build && cd ../.. && \
cp -r ui/solid/dist/* web/dist/ && \
go build -o kubegraf .
```

### Development (2 terminals)

Terminal 1:
```bash
./kubegraf web --port=8080
```

Terminal 2:
```bash
cd ui/solid && npm run dev
```

Then open http://localhost:5173

### Cross-Platform Builds

```bash
for os in linux darwin windows; do
  for arch in amd64 arm64; do
    [ "$os" = "windows" ] && [ "$arch" = "arm64" ] && continue
    cd ui/solid && npm run build && cd ../..
    cp -r ui/solid/dist/* web/dist/
    GOOS=$os GOARCH=$arch go build -o kubegraf-$os-$arch .
  done
done
```

## Performance Tips

### Enable Redis Caching (Optional)

If Redis is available, KubeGraf will automatically use it for ~15x performance improvement:

```bash
# Check if Redis is available
redis-cli ping
# PONG

# Run KubeGraf (it detects Redis automatically)
./kubegraf web
```

### Optimize Build Size

```bash
# Production build with optimizations
go build -ldflags="-s -w" -o kubegraf .
# Results in ~50-60MB binary vs ~100MB with debug symbols
```

## Next Steps

After running locally:

1. **Explore the Web UI**: Open http://localhost:3000
2. **Switch Namespaces**: Use the namespace selector in the top bar
3. **View Pod Logs**: Click on a pod and view its logs
4. **Access Pod Terminal**: Click "Shell" to access a pod's terminal
5. **Check Security Analysis**: Navigate to the Security tab
6. **View Costs**: Check the Cost tab for cost estimation

## Documentation

For more information:
- See `README.md` for feature overview
- See `BUILD.md` for detailed build instructions
- See `docs/` directory for specific feature documentation
- See `CONTRIBUTING.md` for development guidelines

## Support

If you encounter issues:

1. Check the Troubleshooting section above
2. Verify all prerequisites are installed
3. Check GitHub issues: https://github.com/kubegraf/kubegraf/issues
4. Review the logs: `./kubegraf web --verbose`

---

**Happy Clustering! 🚀**
