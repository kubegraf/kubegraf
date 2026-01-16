# KubeGraf Development Guide

A comprehensive guide for developing, testing, and deploying KubeGraf - a Kubernetes dashboard with AI-powered incident intelligence.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [API Standards](#api-standards)
5. [Clean Start Guide](#clean-start-guide)
6. [Feature Implementation Guide](#feature-implementation-guide)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- npm or pnpm
- kubectl configured with a cluster

### One-Command Start

```bash
# Clean build and start (recommended for fresh development)
./scripts/clean-start.sh

# Or manually:
# 1. Build backend
go build -o kubegraf .

# 2. Build frontend
cd ui/solid && npm install && npm run build && cd ../..

# 3. Start server
./kubegraf web --port 3003
```

### Open in Browser

```
http://localhost:3003
```

---

## Project Structure

```
kubegraf/
├── *.go                      # Backend Go files (main package)
│   ├── main.go               # Entry point
│   ├── web_server.go         # HTTP server and route registration
│   ├── web_*.go              # API handlers by domain
│   ├── cluster_manager*.go   # Cluster management
│   └── app.go                # Application initialization
│
├── pkg/                      # Internal packages
│   ├── incidents/            # Incident intelligence system
│   │   ├── manager.go        # Incident manager
│   │   ├── aggregator.go     # Signal aggregation
│   │   ├── scanner.go        # Cluster scanner
│   │   ├── intelligence_handlers.go  # API handlers
│   │   └── fix_handlers.go   # SafeFix handlers
│   ├── metrics/              # Metrics collection
│   └── telemetry/            # Performance instrumentation
│
├── internal/                 # Internal utilities
│   ├── database/             # SQLite database layer
│   ├── cluster/              # Cluster health checking
│   ├── cache/                # LRU caching
│   └── ...
│
├── ui/solid/                 # Frontend (SolidJS)
│   ├── src/
│   │   ├── routes/           # Page components
│   │   ├── components/       # Reusable components
│   │   ├── stores/           # Reactive state stores
│   │   └── services/api.ts   # Backend API client
│   └── package.json
│
├── web/dist/                 # Embedded frontend (auto-generated)
├── docs/                     # Documentation
└── scripts/                  # Build and utility scripts
```

---

## Development Workflow

### Standard Development Cycle

```bash
# 1. Make changes to backend (*.go files)
# 2. Build and test
go build -o kubegraf . && ./kubegraf web --port 3003

# 3. For frontend changes, run in separate terminal:
cd ui/solid && npm run dev

# 4. The dev server proxies API calls to :3003
```

### Backend-Only Changes

```bash
# Quick rebuild and restart
go build -o kubegraf . && lsof -ti:3003 | xargs kill -9 2>/dev/null; ./kubegraf web --port 3003
```

### Frontend-Only Changes

```bash
cd ui/solid

# Development with hot reload
npm run dev

# Build for production
npm run build

# The built files go to ../web/dist and are embedded in the Go binary
```

### Full Rebuild (Clean)

```bash
# Stop all servers
lsof -ti:3003 | xargs kill -9 2>/dev/null

# Clean caches
rm -rf ~/.kubegraf/cache/*
rm -rf .gocache/*

# Rebuild everything
go build -o kubegraf .
cd ui/solid && npm run build && cd ../..

# Start fresh
./kubegraf web --port 3003
```

---

## API Standards

### REST API Pattern

All APIs follow RESTful conventions:

```
GET    /api/v2/{resource}              # List resources
GET    /api/v2/{resource}/{id}         # Get single resource
POST   /api/v2/{resource}              # Create resource
PUT    /api/v2/{resource}/{id}         # Update resource
DELETE /api/v2/{resource}/{id}         # Delete resource
POST   /api/v2/{resource}/{id}/{action} # Perform action
```

### Standard Incident Fix API (SafeFix)

**Use these endpoints - they are the standard:**

```bash
# Preview a fix (dry run)
POST /api/v2/incidents/{incidentId}/fix-preview
Content-Type: application/json
{
  "fixId": "rec-INC-xxx-1"
}

# Response
{
  "valid": true,
  "description": "Delete pod to trigger recreation",
  "dryRunCmd": "kubectl delete pod xxx --dry-run=client",
  "applyCmd": "kubectl delete pod xxx",
  "rollbackCmd": "...",
  "citations": [...],
  "risks": [...]
}

# Apply a fix
POST /api/v2/incidents/{incidentId}/fix-apply
Content-Type: application/json
{
  "fixId": "rec-INC-xxx-1",
  "confirmed": true
}
```

### Frontend API Client Usage

```typescript
// In ui/solid/src/services/api.ts

// Preview a fix
const preview = await api.previewFix(incidentId, fixId);

// Apply a fix
const result = await api.applyFix(incidentId, fixId, true);

// DO NOT use legacy methods (deprecated):
// - api.previewIncidentFix()
// - api.dryRunIncidentFix()
// - api.applyIncidentFix()
```

### Adding a New API Endpoint

1. **Backend Handler** (e.g., `web_myfeature.go`):

```go
func (ws *WebServer) handleMyFeature(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // Parse request
    var req MyFeatureRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Process and return response
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(MyFeatureResponse{...})
}
```

2. **Register Route** (in `web_server.go`):

```go
http.HandleFunc("/api/v2/myfeature", ws.handleMyFeature)
```

3. **Frontend Client** (in `ui/solid/src/services/api.ts`):

```typescript
myFeature: async (params: MyFeatureParams) => {
    return fetchAPI<MyFeatureResponse>('/v2/myfeature', {
        method: 'POST',
        body: JSON.stringify(params),
    });
},
```

---

## Clean Start Guide

### When to Do a Clean Start

- After pulling major changes
- When encountering stale data issues
- Before testing a new feature end-to-end
- When switching clusters

### Complete Clean Start Script

Create `scripts/clean-start.sh`:

```bash
#!/bin/bash
set -e

echo "=== KubeGraf Clean Start ==="

# 1. Stop any running servers
echo "Stopping servers..."
lsof -ti:3003 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 2. Clean caches
echo "Cleaning caches..."
rm -rf ~/.kubegraf/cache/* 2>/dev/null || true
rm -rf ~/.kubegraf/intelligence/embeddings/* 2>/dev/null || true
rm -rf .gocache/* 2>/dev/null || true

# 3. Clean and rebuild frontend
echo "Building frontend..."
cd ui/solid
rm -rf node_modules/.vite 2>/dev/null || true
npm run build
cd ../..

# 4. Rebuild backend
echo "Building backend..."
go build -o kubegraf .

# 5. Start server
echo "Starting server..."
./kubegraf web --port 3003

echo "=== Server running at http://localhost:3003 ==="
```

### Cache Locations

| Cache | Location | When to Clear |
|-------|----------|---------------|
| Go build cache | `.gocache/` | After Go version updates |
| Database | `~/.kubegraf/db.sqlite` | When schema changes |
| Intelligence cache | `~/.kubegraf/intelligence/` | After embedding model changes |
| API cache | `~/.kubegraf/cache/` | When data seems stale |
| Vite cache | `ui/solid/node_modules/.vite/` | After npm updates |
| CVE cache | `~/.kubegraf/nvd_cache.json` | Rarely (auto-updates) |

### Database Reset

```bash
# Full database reset (loses all settings)
rm ~/.kubegraf/db.sqlite

# The database is recreated on next start
./kubegraf web --port 3003
```

---

## Feature Implementation Guide

### Example: Adding a New Incident Action

Let's add a "Snooze Incident" feature as an example.

#### Step 1: Backend Handler

Create or edit `pkg/incidents/intelligence_handlers.go`:

```go
func (h *IntelligenceHandlers) handleSnoozeIncident(w http.ResponseWriter, r *http.Request, incidentID string) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req struct {
        Duration string `json:"duration"` // e.g., "1h", "24h"
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    // Implement snooze logic
    if err := h.manager.SnoozeIncident(incidentID, req.Duration); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "snoozed"})
}
```

#### Step 2: Add Route

In the route handler switch statement:

```go
case "snooze":
    h.handleSnoozeIncident(w, r, incidentID)
```

#### Step 3: Frontend API

In `ui/solid/src/services/api.ts`:

```typescript
snoozeIncident: async (incidentId: string, duration: string) => {
    return fetchAPI<{ status: string }>(`/v2/incidents/${incidentId}/snooze`, {
        method: 'POST',
        body: JSON.stringify({ duration }),
    });
},
```

#### Step 4: Frontend UI

In your component:

```tsx
const handleSnooze = async (incidentId: string) => {
    try {
        await api.snoozeIncident(incidentId, '1h');
        // Refresh incidents list
        refetch();
    } catch (err) {
        console.error('Failed to snooze:', err);
    }
};

<button onClick={() => handleSnooze(incident.id)}>
    Snooze 1h
</button>
```

#### Step 5: Test

```bash
# Build and start
go build -o kubegraf . && ./kubegraf web --port 3003

# Test API directly
curl -X POST http://localhost:3003/api/v2/incidents/INC-xxx/snooze \
  -H "Content-Type: application/json" \
  -d '{"duration": "1h"}'
```

---

## Testing

### Backend Tests

```bash
# Run all tests
go test ./...

# Run specific package tests
go test ./pkg/incidents/...

# With coverage
go test -cover ./...
```

### API Testing

```bash
# Test incidents endpoint
curl -s http://localhost:3003/api/v2/incidents | jq '.'

# Test fix preview
curl -s -X POST http://localhost:3003/api/v2/incidents/{id}/fix-preview \
  -H "Content-Type: application/json" \
  -d '{"fixId": "rec-xxx-1"}' | jq '.'

# Test cluster status
curl -s http://localhost:3003/api/clusters/enhanced?cached=true | jq '.active.status'
```

### Frontend Tests

```bash
cd ui/solid
npm test
```

---

## Troubleshooting

### Common Issues

#### "Unknown endpoint" Error

**Cause:** Route not registered or wrong URL pattern.

**Solution:**
1. Check route registration in `web_server.go`
2. Verify URL path matches handler pattern
3. Check for typos in endpoint name

#### "Incident not found"

**Cause:** Incident not in manager's memory.

**Solution:**
1. The `handleIncidentsV2` fallback should trigger `scanAndIngestIncidents()`
2. Check if cluster is connected: `ws.app.connected`
3. Verify incident scanner is finding pods

#### Stale Data in UI

**Solution:**
```bash
# Clear all caches and restart
rm -rf ~/.kubegraf/cache/*
lsof -ti:3003 | xargs kill -9
./kubegraf web --port 3003
```

#### Frontend Not Loading

**Cause:** Embedded assets out of date.

**Solution:**
```bash
cd ui/solid && npm run build && cd ../..
go build -o kubegraf .
./kubegraf web --port 3003
```

#### Cluster Shows "Connecting" Forever

**Cause:** Health check timeout or network issues.

**Solution:**
1. Verify kubectl works: `kubectl get pods`
2. Check cluster status: `curl http://localhost:3003/api/status`
3. The optimistic UI should show "Connected" if `ws.app.connected` is true

### Debug Logging

```bash
# Enable verbose logging
export KUBEGRAF_DEBUG=1
./kubegraf web --port 3003

# Check server logs for [INTELLIGENCE], [EventMonitor], etc.
```

### Port Already in Use

```bash
# Kill process on port 3003
lsof -ti:3003 | xargs kill -9

# Or use a different port
./kubegraf web --port 3004
```

---

## Performance Tips

### Backend

1. Use `ListClustersCached()` for fast UI responses
2. Trigger heavy operations in goroutines
3. Use the LRU cache for expensive K8s API calls

### Frontend

1. Use SolidJS `createResource` for data fetching
2. Avoid `createEffect` with setters that create loops
3. Use `createMemo` for derived state

---

## Code Style

### Backend (Go)

- Use standard Go formatting: `gofmt -w .`
- Error messages should be lowercase without trailing punctuation
- Log prefixes: `[ModuleName]` e.g., `[INTELLIGENCE]`, `[EventMonitor]`

### Frontend (TypeScript)

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over raw promises
- Component files: PascalCase (e.g., `IncidentTable.tsx`)
- Utility files: camelCase (e.g., `api.ts`)

---

## Release Process

See [RELEASING.md](./RELEASING.md) for detailed release instructions.

Quick release:
```bash
# Tag and push
git tag v1.x.x
git push origin v1.x.x

# GitHub Actions will build and release automatically
```

---

## Getting Help

- Check existing [documentation files](./docs/)
- Review [CONTRIBUTING.md](./CONTRIBUTING.md)
- Open an issue on GitHub

---

*Last updated: January 2026*
