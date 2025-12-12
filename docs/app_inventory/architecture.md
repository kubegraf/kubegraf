# Architecture (high-level)

## Runtime components

- **Go daemon (single binary)**
  - Entry point: `main.go`
  - Web server: `web_server.go` (serves API + WebSocket + embedded SPA)
  - Optional terminal UI (TUI) mode via `App.Run()`

- **Web UI (SolidJS SPA)**
  - Source: `ui/solid/src/**`
  - Built output: `web/dist` (embedded via `//go:embed web/dist` in `web_ui.go`)
  - Communicates with backend via REST (`/api/...`) and WebSocket (`/ws`)

- **State / persistence**
  - SQLite DB (encrypted) under `~/.kubegraf/db.sqlite` (or ephemeral path when enabled)
  - Cache layer (`internal/cache`) + DB layer (`internal/database`)

- **Cluster connectivity**
  - Kubernetes client-go access for resources/metrics
  - Multi-context/multi-cluster support via `internal/cluster` and related services

## Request flow

1. Browser loads SPA from the embedded `web/dist`.
2. UI calls backend endpoints under `/api/*` (JSON), for example list/CRUD operations on resources.
3. UI also connects to `/ws` for live updates (events, status, etc.).

## API surface

The authoritative list of backend endpoints is registered in `web_server.go` via `http.HandleFunc(...)`.
A generated mapping is available at:
- `docs/app_inventory/backend_endpoints_frontend_mapping.md`

## Diagram

```mermaid
graph TD
  Browser[Solid UI (Browser)] -->|GET /| GoWeb[Go Web Server]
  Browser -->|REST /api/*| GoWeb
  Browser -->|WebSocket /ws| GoWeb

  GoWeb -->|client-go| K8s[Kubernetes API Server]
  GoWeb -->|read/write| DB[SQLite (encrypted)]
  GoWeb --> Cache[Cache layer]
  GoWeb --> MCP[MCP Server (/api/mcp)]

  GoWeb --> UIAssets[Embedded web/dist]
```
