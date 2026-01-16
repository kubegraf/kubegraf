# Performance Instrumentation Implementation

## Overview

This document describes the end-to-end latency instrumentation system implemented for the Incident system in KubeGraf. The system measures and displays performance metrics for incident-related operations, helping identify performance regressions and improvements.

## Features Implemented

### Backend (Go)

1. **Instrumentation Package** (`pkg/instrumentation/`)
   - `types.go`: Core data structures (PerformanceSpan, PerformanceSummary, RequestContext)
   - `store.go`: Ring buffer store for performance metrics (stores last 1000 spans)
   - `middleware.go`: HTTP middleware for automatic performance tracking

2. **Performance Middleware**
   - Automatically instruments all `/api/v2/incidents*` endpoints
   - Tracks:
     - Handler total time
     - Upstream Kubernetes API calls (count and total time)
     - Database operation time
     - Cache hit/miss status
     - Incident pattern and cluster context
   - Generates unique request IDs and includes them in response headers (`X-KubeGraf-Request-ID`)

3. **Performance APIs**
   - `GET /api/v2/perf/summary`: Returns p50/p90/p99 percentiles per route (default 15-minute window)
   - `GET /api/v2/perf/recent`: Returns last N spans (default 200) for debugging
   - `POST /api/v2/perf/clear`: Clears performance data (dev-only or with confirmation)
   - `POST /api/v2/perf/ui`: Accepts UI performance metrics (local only)

### Frontend (Solid.js)

1. **Performance Store** (`ui/solid/src/stores/performance.ts`)
   - Tracks UI performance metrics locally
   - Helper functions for tracking:
     - Modal open to paint
     - Snapshot fetch
     - Tab first load / cached load
     - Incident list load

2. **UI Instrumentation**
   - **IncidentModalV2**: Tracks modal open, snapshot fetch, and tab loads
   - **Incidents Page**: Tracks incident list load time

3. **Performance Drawer** (Settings → Advanced)
   - Displays live p50/p90/p99 metrics for incident endpoints
   - Shows cache hit rates
   - Highlights regressions (p90 > 300ms threshold)
   - Includes explanation of percentiles
   - Auto-refreshes every 30 seconds when open

## Target SLOs

- **Incident list**: p90 < 300ms
- **Snapshot**: p90 < 150ms
- **Logs first load**: p90 < 500ms
- **Cached loads**: p90 < 50ms
- **Modal open to paint**: < 150ms

## Configuration

Performance instrumentation can be disabled by setting the environment variable:
```bash
KUBEGRAF_DISABLE_PERF=true
```

## Usage

### Viewing Performance Metrics

1. Navigate to **Settings** → **Advanced Settings & Information**
2. Scroll to **Performance Instrumentation** section
3. View live metrics for all incident endpoints
4. Metrics auto-refresh every 30 seconds

### Understanding Percentiles

- **P50 (Median)**: 50% of requests complete within this time
- **P90**: 90% of requests complete within this time (target: < 300ms for list, < 150ms for snapshot)
- **P99**: 99% of requests complete within this time

### API Usage

```bash
# Get performance summary (15-minute window)
curl http://localhost:3003/api/v2/perf/summary

# Get recent spans
curl http://localhost:3003/api/v2/perf/recent?count=100

# Clear performance data (requires confirmation)
curl -X POST http://localhost:3003/api/v2/perf/clear \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

## Architecture

### Request Flow

1. Request arrives at `/api/v2/incidents*` endpoint
2. Middleware creates `RequestContext` with unique request ID
3. Handler executes (can record K8s calls and DB ops via context)
4. Middleware records `PerformanceSpan` to store
5. Response includes `X-KubeGraf-Request-ID` header

### Data Storage

- In-memory ring buffer (last 1000 spans)
- Grouped by route+method for summary calculations
- Time-windowed queries (default 15 minutes)
- No persistent storage (cleared on restart)

## Files Changed

### Backend
- `pkg/instrumentation/types.go` (new)
- `pkg/instrumentation/store.go` (new)
- `pkg/instrumentation/middleware.go` (new)
- `web_perf.go` (new)
- `web_server.go` (modified: added perfStore, middleware registration)
- `web_incidents_v2.go` (modified: added performance context tracking)

### Frontend
- `ui/solid/src/stores/performance.ts` (new)
- `ui/solid/src/services/api.ts` (modified: added perf API functions)
- `ui/solid/src/components/intelligence/IncidentModalV2.tsx` (modified: added performance tracking)
- `ui/solid/src/routes/Incidents.tsx` (modified: added list load tracking)
- `ui/solid/src/routes/Settings.tsx` (modified: added Performance drawer)

## Testing

1. **Backend**: Run the Go application and verify endpoints respond
2. **Frontend**: 
   - Open Incidents page → Click an incident → Open modal
   - Navigate to Settings → Advanced → Performance Instrumentation
   - Verify metrics appear after accessing incident endpoints
3. **Performance**: 
   - Access multiple incidents
   - Check that p90 values are within SLO targets
   - Verify cache hit rates improve on repeated access

## Constraints

- ✅ Local-only, no external telemetry
- ✅ No heavy dependencies (uses standard library + ring buffer)
- ✅ Safe in production (can be disabled via config flag)
- ✅ Lightweight (in-memory only, bounded storage)

## Future Enhancements

- Persistent storage option (SQLite)
- Export metrics to Prometheus format
- Alerting on SLO violations
- Historical trend analysis
- Per-cluster performance tracking

