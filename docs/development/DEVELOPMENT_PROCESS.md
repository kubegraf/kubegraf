# KubeGraf Standard Development Process

**Official Internal Documentation for AI Agents and Developers**

This document defines the mandatory development process for KubeGraf. All developers (human and AI agents) must follow these rules before modifying or adding any code. This guide contains **real code templates** you can copy-paste directly.

---

## Table of Contents

1. [Mandatory Pre-Development Rules](#1-mandatory-pre-development-rules)
2. [Repository Overview](#2-repository-overview)
3. [Directory Structure](#3-directory-structure)
4. [Backend Development Standards](#4-backend-development-standards)
5. [Frontend Development Standards](#5-frontend-development-standards)
6. [API-Frontend Integration Map](#6-api-frontend-integration-map)
7. [Step-by-Step Development Flow](#7-step-by-step-development-flow)
8. [Build, Run, and Restart Commands](#8-build-run-and-restart-commands)
9. [Validation & Completion Checklist](#9-validation--completion-checklist)
10. [Copy-Paste Code Templates](#10-copy-paste-code-templates)
11. [Common Issues & Debugging](#11-common-issues--debugging)

---

## 1. Mandatory Pre-Development Rules

### NON-NEGOTIABLE REQUIREMENTS

Before writing ANY code, you MUST:

#### 1.1 Explore Existing Code First
```
DO NOT create new files until you have:
1. Searched the entire codebase for existing solutions
2. Read related files in full
3. Understood the existing patterns
4. Confirmed reuse is impossible
```

#### 1.2 Search Requirements

| Task | Search Command | Files to Check |
|------|----------------|----------------|
| New API endpoint | `grep -rn "HandleFunc" web_server.go` | `web_*.go` files |
| New UI component | `ls ui/solid/src/components/` | `components/*.tsx` |
| New page/route | `ls ui/solid/src/routes/` | `routes/*.tsx` |
| New utility | `grep -rn "export function" ui/solid/src/utils/` | `utils/*.ts` |
| New API service | `grep -rn "export const api" ui/solid/src/services/` | `services/api.ts` |
| New store | `ls ui/solid/src/stores/` | `stores/*.ts` |
| New incident logic | `ls pkg/incidents/` | `pkg/incidents/*.go` |
| New cluster logic | `ls internal/cluster/` | `internal/cluster/*.go` |

#### 1.3 Quick Search Commands

```bash
# Find all API handlers
grep -rn "func.*WebServer.*handle" *.go

# Find all frontend API calls
grep -rn "fetchAPI\|api\." ui/solid/src/ --include="*.ts" --include="*.tsx"

# Find all stores
ls -la ui/solid/src/stores/*.ts

# Find existing component by name
find ui/solid/src/components -name "*.tsx" | xargs grep -l "ComponentName"

# Find route registration
grep -n "HandleFunc" web_server.go | head -50
```

#### 1.4 No Duplicate Files Rule

**Any duplicate logic is a development failure.**

Before creating a new file:
1. Search for files with similar names
2. Search for functions with similar purposes
3. Check if existing code can be extended
4. Document why new code is required (if it is)

---

## 2. Repository Overview

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         KubeGraf                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐       ┌─────────────────────────────┐ │
│  │     Frontend        │       │         Backend             │ │
│  │   (Solid.js SPA)    │ HTTP  │       (Go Server)           │ │
│  │                     │◄─────►│                             │ │
│  │  ui/solid/src/      │  API  │  Root .go files +           │ │
│  │                     │       │  pkg/ + internal/           │ │
│  └─────────────────────┘       └─────────────────────────────┘ │
│                                          │                      │
│                                          ▼                      │
│                               ┌─────────────────────┐          │
│                               │  Kubernetes API     │          │
│                               │  + SQLite DB        │          │
│                               └─────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Architectural Principles

1. **Modularity** - Each feature has its own handler file (`web_*.go`)
2. **API-First** - All data flows through REST API (`/api/*` endpoints)
3. **Reactive UI** - Solid.js stores for state management
4. **Background Processing** - Long tasks run in background with caching
5. **Type Safety** - TypeScript frontend, typed Go backend

---

## 3. Directory Structure

### 3.1 Backend Base Path

```
BACKEND_ROOT: /Users/puvendhan/Documents/new/kubegraf/
```

### 3.2 Frontend Base Path

```
FRONTEND_ROOT: /Users/puvendhan/Documents/new/kubegraf/ui/solid/src/
```

### 3.3 Critical File Locations

| What | Path | When to Modify |
|------|------|----------------|
| Route definitions | `web_server.go:443-842` | Adding new API endpoints |
| API handlers | `web_*.go` | Implementing endpoint logic |
| Frontend API service | `ui/solid/src/services/api.ts` | Adding API calls |
| Stores | `ui/solid/src/stores/*.ts` | State management |
| Components | `ui/solid/src/components/*.tsx` | UI elements |
| Pages | `ui/solid/src/routes/*.tsx` | Full page views |
| Incidents engine | `pkg/incidents/*.go` | Incident detection logic |
| Cluster operations | `internal/cluster/*.go` | Cluster management |

### 3.4 Files That Must NOT Be Modified Casually

```
⚠️ CRITICAL FILES - Require careful review:

Backend:
- web_server.go          # All route definitions
- app.go                 # App initialization
- types.go               # Core types
- main.go                # Entry point

Frontend:
- App.tsx                # Root component
- index.tsx              # Entry point
- services/api.ts        # All API calls (85KB)
- stores/cluster.ts      # Cluster state
- stores/globalStore.ts  # Global state
```

---

## 4. Backend Development Standards

### 4.1 API Handler Pattern (REAL CODE)

**From `web_clusters.go` - Copy this pattern exactly:**

```go
// handleYourFeature handles GET /api/your-feature
func (ws *WebServer) handleYourFeature(w http.ResponseWriter, r *http.Request) {
    // 1. Method check
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // 2. Service availability check (if needed)
    if ws.someService == nil {
        http.Error(w, "Service not initialized", http.StatusServiceUnavailable)
        return
    }

    // 3. Set content type
    w.Header().Set("Content-Type", "application/json")

    // 4. Business logic
    result, err := ws.someService.DoSomething()
    if err != nil {
        http.Error(w, fmt.Sprintf("Failed: %v", err), http.StatusInternalServerError)
        return
    }

    // 5. Return JSON response
    json.NewEncoder(w).Encode(result)
}
```

### 4.2 POST Handler with Request Body

```go
func (ws *WebServer) handleYourAction(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // Parse request body
    var req YourRequestType
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
        return
    }

    // Validate required fields
    if req.Name == "" {
        http.Error(w, "name is required", http.StatusBadRequest)
        return
    }

    // Business logic
    result, err := ws.service.DoAction(req)
    if err != nil {
        http.Error(w, fmt.Sprintf("Failed: %v", err), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "data":    result,
    })
}
```

### 4.3 Route Registration

**In `web_server.go` setupRoutes() function:**

```go
// Add your route here (around line 443-842)
mux.HandleFunc("/api/your-feature", ws.handleYourFeature)
mux.HandleFunc("/api/your-feature/action", ws.handleYourAction)
```

### 4.4 Response Types

```go
// Standard success response
type SuccessResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Message string      `json:"message,omitempty"`
}

// Standard error response
type ErrorResponse struct {
    Error   string `json:"error"`
    Code    string `json:"code,omitempty"`
    Details string `json:"details,omitempty"`
}
```

---

## 5. Frontend Development Standards

### 5.1 API Service Pattern (REAL CODE)

**From `services/api.ts` - Use this wrapper:**

```typescript
import { fetchAPI } from '../services/api';

// In your component or store:
const result = await fetchAPI<YourResponseType>('/your-endpoint');

// For POST requests:
const result = await fetchAPI<YourResponseType>('/your-endpoint', {
    method: 'POST',
    body: JSON.stringify({ key: 'value' }),
});
```

### 5.2 Store Pattern (REAL CODE)

**From `stores/incidentsV2.ts` - Copy this pattern:**

```typescript
import { createStore } from 'solid-js/store';

// Define types
interface YourStore {
    data: YourDataType[];
    loading: boolean;
    error: string | null;
}

// Create store
const [store, setStore] = createStore<YourStore>({
    data: [],
    loading: false,
    error: null,
});

// Export store API
export const yourStore = {
    getData: () => store.data,
    isLoading: () => store.loading,
    getError: () => store.error,

    setData: (data: YourDataType[]) => {
        setStore('data', data);
    },

    setLoading: (loading: boolean) => {
        setStore('loading', loading);
    },

    setError: (error: string | null) => {
        setStore('error', error);
    },

    // Fetch with caching pattern
    fetch: async () => {
        yourStore.setLoading(true);
        yourStore.setError(null);
        try {
            const result = await fetchAPI<YourDataType[]>('/your-endpoint');
            yourStore.setData(result);
        } catch (err) {
            yourStore.setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            yourStore.setLoading(false);
        }
    },
};
```

### 5.3 Component Pattern (REAL CODE)

**From `components/ConfirmationModal.tsx` - Use this structure:**

```typescript
import { Component, Show } from 'solid-js';

interface YourComponentProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

const YourComponent: Component<YourComponentProps> = (props) => {
    // Local state with createSignal
    const [localState, setLocalState] = createSignal(false);

    // Computed values
    const computedValue = createMemo(() => {
        return props.title.toUpperCase();
    });

    // Event handlers
    const handleClick = () => {
        setLocalState(true);
        props.onClose();
    };

    return (
        <Show when={props.isOpen}>
            <div class="your-component">
                <h2>{props.title}</h2>
                <button onClick={handleClick}>
                    Close
                </button>
            </div>
        </Show>
    );
};

export default YourComponent;
```

### 5.4 Page/Route Pattern (REAL CODE)

**From `routes/Incidents.tsx` - Use this structure:**

```typescript
import { Component, createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js';
import { api } from '../services/api';
import { yourStore } from '../stores/yourStore';

const YourPage: Component = () => {
    // Local state
    const [filter, setFilter] = createSignal('');
    const [isRefreshing, setIsRefreshing] = createSignal(false);

    // Fetch data on mount
    onMount(async () => {
        await yourStore.fetch();
    });

    // Cleanup on unmount (if needed)
    onCleanup(() => {
        // Cancel any pending requests
    });

    // Refresh handler
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await yourStore.fetch();
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div class="p-6">
            {/* Header */}
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-bold">Your Page Title</h1>
                    <p class="text-sm text-gray-500">Description here</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing()}
                    class="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    {isRefreshing() ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Loading state */}
            <Show when={yourStore.isLoading()}>
                <div>Loading...</div>
            </Show>

            {/* Error state */}
            <Show when={yourStore.getError()}>
                <div class="text-red-500">{yourStore.getError()}</div>
            </Show>

            {/* Data list */}
            <Show when={!yourStore.isLoading() && !yourStore.getError()}>
                <For each={yourStore.getData()}>
                    {(item) => (
                        <div class="p-4 border rounded mb-2">
                            {item.name}
                        </div>
                    )}
                </For>
            </Show>
        </div>
    );
};

export default YourPage;
```

---

## 6. API-Frontend Integration Map

### 6.1 Complete Integration Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Frontend-Backend Data Flow                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Component (routes/Incidents.tsx)                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Store (stores/incidents.ts) ◄──── Cache Check                          │
│       │                                                                  │
│       ▼                                                                  │
│  API Service (services/api.ts)                                          │
│       │  fetchAPI('/api/v2/incidents')                                  │
│       ▼                                                                  │
│  HTTP Request ─────────────────────────────────────────►                │
│                                                                          │
│  ◄─────────────────────────────────────────────────────                 │
│       │                                                                  │
│       ▼                                                                  │
│  Backend Route (web_server.go)                                          │
│       │  mux.HandleFunc("/api/v2/incidents", ws.handleIncidents)        │
│       ▼                                                                  │
│  Handler (web_incidents_v2.go)                                          │
│       │                                                                  │
│       ▼                                                                  │
│  Business Logic (pkg/incidents/)                                        │
│       │                                                                  │
│       ▼                                                                  │
│  JSON Response ◄─────────────────────────────────────────               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Key Integration Points (REAL PATHS)

| Feature | Frontend | API Endpoint | Backend Handler |
|---------|----------|--------------|-----------------|
| **Incidents** | `routes/Incidents.tsx` | `GET /api/v2/incidents` | `web_incidents_v2.go:handleIncidentsV2` |
| **Incident Snapshot** | `stores/incidentsV2.ts` | `GET /api/v2/incidents/{id}/snapshot` | `web_incidents_v2.go:handleIncidentSnapshot` |
| **Clusters** | `stores/cluster.ts` | `GET /api/clusters` | `web_clusters.go:handleClusters` |
| **Cluster Connect** | `components/Header.tsx` | `POST /api/clusters/connect` | `web_clusters.go:handleClusterConnect` |
| **Pods** | `routes/Pods.tsx` | `GET /api/pods` | `web_server.go` |
| **Deployments** | `routes/Deployments.tsx` | `GET /api/deployments` | `web_server.go` |
| **Services** | `routes/Services.tsx` | `GET /api/services` | `web_server.go` |
| **Context Switch** | `stores/cluster.ts` | `POST /api/contexts/switch` | `web_server.go` |
| **Intelligence Status** | `routes/Incidents.tsx` | `GET /api/v2/intelligence/status` | `web_incidents_v2.go` |

### 6.3 Adding a New Feature End-to-End

**Example: Adding "Alerts" feature**

1. **Backend Handler** (`web_alerts.go`):
```go
func (ws *WebServer) handleAlerts(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    alerts := ws.alertService.List()
    json.NewEncoder(w).Encode(map[string]interface{}{
        "alerts": alerts,
        "total":  len(alerts),
    })
}
```

2. **Route Registration** (`web_server.go`):
```go
mux.HandleFunc("/api/alerts", ws.handleAlerts)
```

3. **API Service** (`services/api.ts`):
```typescript
export interface Alert {
    id: string;
    severity: string;
    message: string;
}

export interface AlertsResponse {
    alerts: Alert[];
    total: number;
}

// Add to api object
getAlerts: async (): Promise<AlertsResponse> => {
    return fetchAPI<AlertsResponse>('/alerts');
},
```

4. **Store** (`stores/alerts.ts`):
```typescript
import { createStore } from 'solid-js/store';
import { api } from '../services/api';

const [store, setStore] = createStore({
    alerts: [] as Alert[],
    loading: false,
});

export const alertsStore = {
    getAlerts: () => store.alerts,
    isLoading: () => store.loading,
    fetch: async () => {
        setStore('loading', true);
        const { alerts } = await api.getAlerts();
        setStore('alerts', alerts);
        setStore('loading', false);
    },
};
```

5. **Page** (`routes/Alerts.tsx`):
```typescript
const Alerts: Component = () => {
    onMount(() => alertsStore.fetch());
    return (
        <div class="p-6">
            <h1>Alerts</h1>
            <For each={alertsStore.getAlerts()}>
                {(alert) => <div>{alert.message}</div>}
            </For>
        </div>
    );
};
```

---

## 7. Step-by-Step Development Flow

### MANDATORY CHECKLIST

#### Phase 1: Research (DO NOT SKIP)
- [ ] Search for existing APIs: `grep -rn "your-feature" web_*.go web_server.go`
- [ ] Search for existing components: `grep -rn "YourFeature" ui/solid/src/`
- [ ] Search for existing stores: `ls ui/solid/src/stores/ | grep -i feature`
- [ ] Read ALL related existing code

#### Phase 2: Decide
- [ ] Can existing API be extended? → Modify existing
- [ ] Can existing component be reused? → Reuse
- [ ] Must create new? → Document justification

#### Phase 3: Implement Backend (if needed)
1. [ ] Create/modify handler in `web_*.go`
2. [ ] Add route in `web_server.go` setupRoutes()
3. [ ] Run `go build -o kubegraf .`
4. [ ] Test with curl: `curl http://localhost:3003/api/your-endpoint`

#### Phase 4: Implement Frontend (if needed)
1. [ ] Add types and API call in `services/api.ts`
2. [ ] Create/modify store in `stores/`
3. [ ] Create/modify component in `components/` or `routes/`
4. [ ] Run `cd ui/solid && npm run build`

#### Phase 5: Validate
1. [ ] Run full build: `cd ui/solid && npm run build && cd ../.. && go build -o kubegraf .`
2. [ ] Restart: `lsof -ti:3003 | xargs kill -9 2>/dev/null; ./kubegraf web --port 3003`
3. [ ] Test at http://localhost:3003

---

## 8. Build, Run, and Restart Commands

### 8.1 Quick Reference

```bash
# Backend only
go build -o kubegraf .

# Frontend only
cd ui/solid && npm run build

# Full rebuild
cd ui/solid && npm run build && cd ../.. && go build -o kubegraf .

# Kill & restart
lsof -ti:3003 | xargs kill -9 2>/dev/null; sleep 1; ./kubegraf web --port 3003

# One-liner full rebuild + restart
cd ui/solid && npm run build && cd ../.. && go build -o kubegraf . && lsof -ti:3003 | xargs kill -9 2>/dev/null; sleep 1; ./kubegraf web --port 3003
```

### 8.2 Development Mode (Auto-reload)

```bash
# Frontend dev server (separate terminal)
cd ui/solid && npm run dev

# Backend with embedded frontend
./kubegraf web --port 3003
```

---

## 9. Validation & Completion Checklist

### Before Marking ANY Task Complete

```
TASK COMPLETION REQUIREMENTS:

1. [ ] No duplicate files introduced
2. [ ] Existing code reused where possible
3. [ ] go build succeeds (exit code 0)
4. [ ] npm run build succeeds (exit code 0)
5. [ ] App runs on localhost:3003
6. [ ] Feature tested and working
7. [ ] No console errors in browser
8. [ ] No regressions in existing features
```

---

## 10. Copy-Paste Code Templates

### 10.1 Backend GET Handler

```go
// web_yourfeature.go
package main

import (
    "encoding/json"
    "net/http"
)

func (ws *WebServer) handleYourFeature(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    w.Header().Set("Content-Type", "application/json")

    // Your logic here
    result := map[string]interface{}{
        "data": "your data",
    }

    json.NewEncoder(w).Encode(result)
}
```

### 10.2 Backend POST Handler

```go
func (ws *WebServer) handleYourAction(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req struct {
        Name  string `json:"name"`
        Value int    `json:"value"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "message": "Action completed",
    })
}
```

### 10.3 Frontend Store

```typescript
// stores/yourFeature.ts
import { createStore } from 'solid-js/store';
import { fetchAPI } from '../services/api';

interface YourData {
    id: string;
    name: string;
}

interface YourStore {
    items: YourData[];
    loading: boolean;
    error: string | null;
}

const [store, setStore] = createStore<YourStore>({
    items: [],
    loading: false,
    error: null,
});

export const yourFeatureStore = {
    get: () => store.items,
    isLoading: () => store.loading,
    getError: () => store.error,

    fetch: async () => {
        setStore('loading', true);
        setStore('error', null);
        try {
            const data = await fetchAPI<{ items: YourData[] }>('/your-endpoint');
            setStore('items', data.items);
        } catch (err) {
            setStore('error', err instanceof Error ? err.message : 'Failed');
        } finally {
            setStore('loading', false);
        }
    },
};
```

### 10.4 Frontend Component

```typescript
// components/YourComponent.tsx
import { Component, Show, createSignal } from 'solid-js';

interface Props {
    title: string;
    onAction: () => void;
}

const YourComponent: Component<Props> = (props) => {
    const [loading, setLoading] = createSignal(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            props.onAction();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <h3 class="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {props.title}
            </h3>
            <button
                onClick={handleClick}
                disabled={loading()}
                class="mt-2 px-4 py-2 rounded"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
                {loading() ? 'Loading...' : 'Action'}
            </button>
        </div>
    );
};

export default YourComponent;
```

### 10.5 Frontend Page

```typescript
// routes/YourPage.tsx
import { Component, onMount, Show, For } from 'solid-js';
import { yourFeatureStore } from '../stores/yourFeature';

const YourPage: Component = () => {
    onMount(() => {
        yourFeatureStore.fetch();
    });

    return (
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Your Page
                </h1>
                <button
                    onClick={() => yourFeatureStore.fetch()}
                    class="px-4 py-2 rounded"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                    Refresh
                </button>
            </div>

            <Show when={yourFeatureStore.isLoading()}>
                <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
            </Show>

            <Show when={yourFeatureStore.getError()}>
                <div style={{ color: 'var(--error-color)' }}>
                    {yourFeatureStore.getError()}
                </div>
            </Show>

            <Show when={!yourFeatureStore.isLoading() && !yourFeatureStore.getError()}>
                <div class="space-y-2">
                    <For each={yourFeatureStore.get()}>
                        {(item) => (
                            <div
                                class="p-4 rounded-lg"
                                style={{ background: 'var(--bg-secondary)' }}
                            >
                                {item.name}
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
};

export default YourPage;
```

---

## 11. Common Issues & Debugging

### 11.1 Common Issues Table

| Issue | Cause | Solution |
|-------|-------|----------|
| `Method not allowed` | Wrong HTTP method | Check if API expects GET/POST |
| `404 Not Found` | Route not registered | Add route in `web_server.go` |
| `503 Service Unavailable` | Service not initialized | Check service != nil in handler |
| `CORS error` | Missing CORS headers | Already handled in web_server.go |
| `Request timeout` | Long API call | Increase timeout in api.ts |
| `Cannot read property` | Null/undefined data | Add null checks, use optional chaining |
| `Build fails: import error` | Missing export | Check exports in source file |
| `Port already in use` | Old process running | `lsof -ti:3003 \| xargs kill -9` |
| `Changes not showing` | Cached frontend | Hard refresh (Cmd+Shift+R) |
| `Store not updating` | Wrong store method | Use setStore() not direct assignment |

### 11.2 Debugging Commands

```bash
# Check if server is running
curl -s http://localhost:3003/api/status | jq

# Test specific endpoint
curl -s http://localhost:3003/api/your-endpoint | jq

# Check for errors in response
curl -sv http://localhost:3003/api/your-endpoint 2>&1 | head -30

# Watch server logs
./kubegraf web --port 3003 2>&1 | tee server.log

# Check Go build errors
go build -o kubegraf . 2>&1

# Check npm build errors
cd ui/solid && npm run build 2>&1
```

### 11.3 Frontend Debugging

```typescript
// Add to component for debugging
console.log('Store state:', yourStore.get());
console.log('Loading:', yourStore.isLoading());
console.log('Error:', yourStore.getError());

// Check API response
const result = await fetchAPI('/your-endpoint');
console.log('API response:', result);
```

### 11.4 Backend Debugging

```go
// Add to handler for debugging
fmt.Printf("Request: %+v\n", r)
fmt.Printf("Service: %+v\n", ws.someService)
fmt.Printf("Result: %+v\n", result)

// Log errors
if err != nil {
    fmt.Printf("Error in handleYourFeature: %v\n", err)
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
}
```

---

## Quick Reference Card

### File Locations
| What | Where |
|------|-------|
| API Routes | `web_server.go:443-842` |
| API Handlers | `web_*.go` |
| Frontend API | `ui/solid/src/services/api.ts` |
| Frontend Stores | `ui/solid/src/stores/` |
| Frontend Components | `ui/solid/src/components/` |
| Frontend Pages | `ui/solid/src/routes/` |
| Incidents Engine | `pkg/incidents/` |

### Commands
| Action | Command |
|--------|---------|
| Build Backend | `go build -o kubegraf .` |
| Build Frontend | `cd ui/solid && npm run build` |
| Start Server | `./kubegraf web --port 3003` |
| Kill Server | `lsof -ti:3003 \| xargs kill -9` |
| Full Rebuild | See Section 8.1 |

### URLs
| Service | URL |
|---------|-----|
| Application | http://localhost:3003 |
| API Base | http://localhost:3003/api/ |

---

## Document Revision

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-16 | KubeGraf Team | Initial release |
| 2.0 | 2026-01-16 | KubeGraf Team | Added real code templates, debugging section, integration map |

---

**END OF DOCUMENT**
