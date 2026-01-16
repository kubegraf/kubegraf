# View: `incidents`

- **Route file**: `ui/solid/src/routes/Incidents.tsx`
- **Component closure**: 9 files (TS/TSX). Controls extracted from 4 TSX files.
- **Full documentation**: See [INCIDENT_INTELLIGENCE.md](../../INCIDENT_INTELLIGENCE.md)

## Overview

The Incidents view provides real-time detection and diagnosis of Kubernetes failures including:
- OOMKilled containers
- CrashLoopBackOff pods
- Node Pressure conditions
- Job/CronJob failures
- Image pull failures
- Health probe failures

## Features

### Incident List
- Real-time incident detection with automatic refresh
- Background scanning with 30-second cache TTL
- Filters by severity, type, namespace, status

### Incident Modal (Click any incident)
When clicking an incident, a detailed modal opens with:

| Section | Description |
|---------|-------------|
| **Hot Evidence** | Restart counts, exit codes, readiness status |
| **Diagnosis** | Summary, root causes ranked by confidence |
| **Log Analysis** | Extracted insights from pod logs (for Pod incidents) |
| **Why Now** | Recent changes that may have triggered this |
| **Impact** | Affected replicas, service exposure, user-facing likelihood |
| **Recommendations** | Actionable steps with risk levels |
| **Timeline** | Chronological event history |

### Log Analysis
For Pod incidents, the system analyzes container logs to detect:
- External dependency issues (backend down, connection refused)
- Application errors (panics, exceptions)
- Memory issues (OOM indicators)
- Network problems (timeouts, DNS failures)

When `isExternalIssue: true`, the UI indicates the problem may be caused by an upstream dependency rather than this pod.

### Intelligence Panels (Toggle)
- **Auto-Remediation Panel**: Control automatic fixes
- **Learning Dashboard**: View incident patterns and trends

## Headings & copy

- `Incidents & OOM`
- `Real-time detection of OOMKilled, CrashLoopBackOff, Node Pressure, and Job Failures`

## Buttons

- `Refresh`

## Button titles

- `Actions`

## Component prop text (cards/widgets)

### `title=`
- `Actions`

## Configured labels (menus / quick access / lists)

- `All Severities`
- `All Types`
- `CrashLoopBackOff`
- `Critical`
- `CronJob Failure`
- `Job Failure`
- `Node Disk Pressure`
- `Node Memory Pressure`
- `Node Pressure`
- `OOMKilled`
- `View Events`
- `View Logs`
- `View Pod`
- `Warning`

## Controls by file

### `components/ActionMenu.tsx`
- **button titles**: `Actions`
- **jsx props**:
  - `title=`: `Actions`

### `components/IncidentFilters.tsx`
- **configured labels**: `All Severities`, `All Types`, `CrashLoopBackOff`, `Critical`, `CronJob Failure`, `Job Failure`, `Node Disk Pressure`, `Node Memory Pressure`, `Node Pressure`, `OOMKilled`, `Warning`

### `components/IncidentTable.tsx`
- **configured labels**: `View Events`, `View Logs`, `View Pod`

### `routes/Incidents.tsx`
- **headings/copy**: `Incidents & OOM`, `Real-time detection of OOMKilled, CrashLoopBackOff, Node Pressure, and Job Failures`
- **buttons**: `Refresh`

### `components/intelligence/IncidentModalV2.tsx`
- Incident detail modal with tabbed sections
- Log Analysis display with external dependency detection
- Hot evidence display
- Diagnosis with confidence scores

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v2/incidents` | List incidents with filters |
| `GET /api/v2/incidents/{id}/snapshot` | Get incident snapshot (fast path) |
| `GET /api/v2/intelligence/status` | Get monitoring status |
| `POST /api/v2/incidents/{id}/feedback` | Submit feedback for learning |

## Performance

- **Background scanning**: Incidents are scanned in the background, not on API request
- **Cache TTL**: 30 seconds - cached data returned immediately
- **Snapshot TTL**: 5 minutes - precomputed diagnosis and evidence
- **Response time**: < 100ms (cached), < 500ms (cache miss)
