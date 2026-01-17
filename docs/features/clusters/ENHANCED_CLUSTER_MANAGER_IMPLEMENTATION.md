# Enhanced Cluster Manager - Implementation Summary

## Overview

The Enhanced Cluster Manager is a production-ready cluster management system for KubeGraf that provides stable connection state, multi-cluster support, and clean authentication/re-authentication behavior for GKE, EKS, AKS, and other Kubernetes providers.

## Key Features

### 1. Kubeconfig Source Management
- **Default Source**: Automatically detects `~/.kube/config`
- **File Sources**: Manually add kubeconfig files
- **Inline Sources**: Paste kubeconfig YAML content (saved securely to `.kubegraf/sources/`)
- **Source Persistence**: All sources stored in SQLite database

### 2. Cluster Discovery & Catalog
- **Automatic Discovery**: Discovers all contexts from all kubeconfig sources
- **Deduplication**: Uses context name as the primary key (same context = same cluster, even from different sources)
- **Source Priority**: Prefers "default" source when same context exists in multiple sources
- **Stable Cluster IDs**: Hash-based IDs generated from context name for consistency

### 3. Health Status Tracking
- **Status States**: 
  - `UNKNOWN` - Not yet checked or not registered
  - `CONNECTING` - Health check in progress
  - `CONNECTED` - Cluster is healthy and accessible
  - `DEGRADED` - Cluster has issues but still accessible
  - `DISCONNECTED` - Network/TLS errors, cluster unreachable
  - `AUTH_ERROR` - Authentication/authorization errors (401/403)
- **Background Health Checks**: Automatic health checking every 30 seconds
- **Immediate Checks**: Triggered on cluster selection or manual reconnect
- **State Machine**: Requires 2 consecutive successes for CONNECTED, 3 failures for DISCONNECTED/AUTH_ERROR

### 4. Environment Detection
- **Heuristic-Based**: Guesses environment from context name patterns
- **Patterns**:
  - Production: `prod`, `production`
  - Staging: `staging`, `stage`, `uat`, `test`, `qa`, `preprod`, `pre-prod`
  - Development: `dev`, `development`
  - Local: `local`, `kind`, `minikube`, `k3d`
  - Unknown: No pattern match (honest labeling)
- **Note**: These are estimates based on naming conventions, not actual cluster metadata

### 5. Provider Detection
- **Automatic Detection**: Identifies provider from context name and kubeconfig path
- **Supported Providers**: GKE, EKS, AKS, Kind, Minikube, K3s/K3d, Docker Desktop, Generic

### 6. Active Cluster Management
- **Single Active Cluster**: Only one cluster can be active at a time
- **Database Persistence**: Active cluster state persisted in SQLite
- **Connection State**: Active cluster automatically connected via base ClusterService

## Architecture

### Backend Components

#### 1. Database Schema
**Tables:**
- `cluster_sources`: Stores kubeconfig source locations
  - `id`, `name`, `type` (default/file/inline), `path`, `content_path`, `created_at`, `updated_at`
- `enhanced_clusters`: Stores discovered clusters with metadata
  - `id`, `cluster_id` (stable hash), `name`, `context_name`, `source_id`, `provider`, `environment`
  - `status`, `connected`, `active`, `last_checked`, `last_error`
  - `consecutive_failures`, `consecutive_successes`, `is_default`, `created_at`, `updated_at`

**Migration**: Automatic schema migration handles existing databases

#### 2. Core Services

**`EnhancedClusterManager`** (`cluster_manager_enhanced.go`):
- Wraps `ClusterService` for backward compatibility
- Manages sources, clusters, health checking, and active cluster
- Key methods:
  - `NewEnhancedClusterManager()` - Initialization with health checker
  - `DiscoverAndAddKubeconfigSources()` - Auto-detect kubeconfig files
  - `RefreshClusterCatalog()` - Discover and update cluster catalog
  - `SelectActiveCluster()` - Set and connect to active cluster
  - `ReconnectCluster()` - Trigger immediate health check
  - `GetEnhancedClusters()` - List all clusters with health status
  - `ListClusters()` - Returns clusters enriched with health status

**`HealthChecker`** (`internal/cluster/health.go`):
- Background health checking loop (30-second intervals)
- State machine for status transitions
- Error classification (AUTH_ERROR vs DISCONNECTED)
- Cluster registration and status tracking

**Database Operations** (`internal/database/`):
- `cluster_sources.go`: Source CRUD operations
- `cluster_enhanced.go`: Enhanced cluster CRUD operations
- Automatic schema migration support

#### 3. API Endpoints

**Source Management:**
- `GET /api/cluster-sources` - List all sources
- `POST /api/cluster-sources/file` - Add file source
- `POST /api/cluster-sources/inline` - Add inline source

**Cluster Management:**
- `GET /api/clusters/enhanced` - List all enhanced clusters with status
- `GET /api/clusters/active` - Get currently active cluster
- `POST /api/clusters/select` - Select and connect to a cluster
- `POST /api/clusters/reconnect?id=<clusterId>` - Reconnect to a cluster
- `POST /api/clusters/refresh-catalog` - Refresh cluster catalog

### Frontend Components

#### 1. Stores

**`clusterEnhanced.ts`**:
- Manages enhanced cluster state, sources, and active cluster
- Functions:
  - `refreshEnhancedClusters()` - Fetch clusters from API
  - `refreshSources()` - Fetch sources from API
  - `selectCluster(clusterId)` - Select active cluster
  - `reconnectCluster(clusterId)` - Trigger reconnect
  - `addFileSource()`, `addInlineSource()` - Add sources
  - `refreshClusterCatalog()` - Trigger catalog refresh

#### 2. Components

**`ClusterManager.tsx`**:
- Main cluster management page
- Displays enhanced clusters with status, provider, environment
- Inline Select/Reconnect buttons next to cluster name
- Shows AuthErrorHelper for AUTH_ERROR clusters
- Auto-refreshes on mount

**`Header.tsx`**:
- Cluster dropdown in header
- Shows enhanced clusters with status indicators
- Removed duplicate sections and legacy contexts
- Clean single list of enhanced clusters

**`AuthErrorHelper.tsx`**:
- Provider-specific authentication instructions
- Shows retry button for AUTH_ERROR clusters
- Supports GKE, EKS, AKS with specific guidance

**`Connect.tsx`**:
- Onboarding page for first-time users
- Options: Auto-detect, Add file, Paste inline

#### 3. Routing

**State-Based Landing Flow:**
- `/connect` - If no kubeconfig sources exist
- `/clustermanager` - If sources exist but no active cluster
- `/c/:clusterId/incidents` - If active cluster exists and is healthy
- `/clustermanager` (with error) - If active cluster is unhealthy

## Implementation Details

### Cluster ID Generation
- Uses SHA256 hash of context name (first 16 chars)
- Ensures same context from different sources = same cluster ID
- Stable across restarts and source changes

### Health Check Registration
- Clusters auto-register when listed via `ListClusters()`
- Registration happens on-demand (lazy loading)
- Immediate health check triggered after registration
- Background loop checks all registered clusters every 30 seconds

### Status Updates
- Health checker updates status in-memory state
- `ListClusters()` enriches database records with health status
- Status persists in database but is overridden by health checker state
- UI polls for updates (can be enhanced with WebSockets)

### Error Classification
- **AUTH_ERROR**: HTTP 401/403, certificate errors, auth-related
- **DISCONNECTED**: Network errors, TLS errors, connection refused, timeouts
- **DEGRADED**: Partial failures (future enhancement)

### Select Cluster Flow
1. User clicks "Select" button
2. Frontend calls `POST /api/clusters/select` with `clusterId`
3. Backend:
   - Ensures cluster is registered with health checker
   - Sets cluster as active in database
   - Reads kubeconfig and writes to active path
   - Connects app via `ConnectWithKubeconfig()`
   - Updates status to CONNECTING
   - Triggers immediate health check
4. Frontend refreshes cluster list to show updated status

## UI/UX Improvements

### Cluster Manager Page
- **Inline Buttons**: Select and Reconnect buttons appear on same line as cluster name
- **Status Indicators**: Color-coded status pills (green=connected, red=disconnected, etc.)
- **Provider Badges**: Shows provider (GKE, EKS, AKS, generic, etc.)
- **Environment Badges**: Shows environment (prod, staging, dev, local, unknown)
- **Active Indicator**: Highlights active cluster
- **Error Display**: Shows last error message for failed clusters
- **Auth Helper**: Provider-specific instructions for AUTH_ERROR clusters

### Header Dropdown
- **Single List**: Only enhanced clusters (no duplicates, no legacy contexts)
- **Status Display**: Shows status and provider for each cluster
- **Active Indicator**: Checkmark for active cluster
- **Search**: Filter clusters by name
- **Manage Link**: Quick access to Cluster Manager page

## Database Schema

### cluster_sources
```sql
CREATE TABLE cluster_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'default', 'file', 'inline'
  path TEXT, -- For 'file' type
  content_path TEXT, -- For 'inline' type
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE(name, type)
);
```

### enhanced_clusters
```sql
CREATE TABLE enhanced_clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_id TEXT NOT NULL UNIQUE, -- Stable hash ID
  name TEXT NOT NULL,
  context_name TEXT NOT NULL,
  source_id INTEGER,
  provider TEXT,
  environment TEXT, -- 'prod', 'staging', 'dev', 'local', 'unknown'
  kubeconfig_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  connected BOOLEAN NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT 0,
  last_used DATETIME,
  last_checked DATETIME,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  is_default BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (source_id) REFERENCES cluster_sources(id) ON DELETE SET NULL
);
```

## Security Considerations

- **Kubeconfig Storage**: 
  - Inline sources saved to `.kubegraf/sources/` with 0600 permissions
  - No kubeconfig content logged
  - No credentials exposed in API responses
- **Database Encryption**: Uses existing database encryption (if configured)
- **Local-Only**: All kubeconfig operations are local-only, no remote storage

## Testing & Validation

### Manual Testing Checklist
- [x] Auto-detect kubeconfig sources
- [x] Add file source manually
- [x] Add inline source (paste YAML)
- [x] Discover clusters from all sources
- [x] Select cluster (becomes active)
- [x] Reconnect to disconnected cluster
- [x] Health status updates correctly
- [x] Status shows correctly in UI (not Unknown)
- [x] Buttons appear inline with cluster name
- [x] Header dropdown shows single list (no duplicates)
- [x] Environment labels are realistic (uat → staging)

### Known Limitations
- Environment labels are heuristic guesses (not actual cluster metadata)
- Health checks require cluster to be registered (happens on-demand)
- Status updates are eventually consistent (30-second polling)
- No WebSocket support yet (polling-based updates)

## Future Enhancements

1. **WebSocket Support**: Real-time status updates without polling
2. **Cluster Metadata**: Query cluster for actual environment/project info
3. **Custom Labels**: Allow users to manually set environment labels
4. **Cluster Groups**: Organize clusters by project/team
5. **Health Check Tuning**: Configurable intervals and thresholds
6. **Bulk Operations**: Select/disconnect multiple clusters
7. **Cluster Import/Export**: Share cluster configurations
8. **Provider-Specific Features**: GKE project detection, EKS account info, etc.

## Files Created/Modified

### New Files (Backend)
- `cluster_manager_enhanced.go` - Enhanced cluster manager
- `internal/cluster/health.go` - Health checker
- `internal/database/cluster_enhanced.go` - Enhanced cluster DB operations
- `internal/database/cluster_sources.go` - Source DB operations
- `web_clusters_enhanced.go` - Enhanced cluster API handlers

### New Files (Frontend)
- `ui/solid/src/stores/clusterEnhanced.ts` - Enhanced cluster store
- `ui/solid/src/components/AuthErrorHelper.tsx` - Auth error helper
- `ui/solid/src/routes/Connect.tsx` - Connect onboarding page

### Modified Files
- `internal/database/database.go` - Schema migration
- `web_server.go` - Enhanced cluster manager initialization
- `web_clusters.go` - Integration with enhanced manager
- `ui/solid/src/components/Header.tsx` - Dropdown cleanup
- `ui/solid/src/routes/ClusterManager.tsx` - Enhanced UI
- `ui/solid/src/services/api.ts` - New API methods
- `ui/solid/src/App.tsx` - Routing guards

## API Reference

### GET /api/cluster-sources
Returns all kubeconfig sources.

**Response:**
```json
{
  "sources": [
    {
      "id": 1,
      "name": "default",
      "type": "default",
      "path": "/Users/user/.kube/config",
      "createdAt": "2025-01-11T...",
      "updatedAt": "2025-01-11T..."
    }
  ]
}
```

### POST /api/cluster-sources/file
Add a kubeconfig file source.

**Request:**
```json
{
  "name": "Production Cluster",
  "path": "/path/to/kubeconfig.yaml"
}
```

### POST /api/cluster-sources/inline
Add an inline kubeconfig source.

**Request:**
```json
{
  "name": "Staging Cluster",
  "content": "apiVersion: v1\nkind: Config\n..."
}
```

### GET /api/clusters/enhanced
Get all enhanced clusters with health status.

**Response:**
```json
{
  "clusters": [
    {
      "id": 1,
      "clusterId": "3c226dda2b1f620c",
      "name": "finden-prod",
      "contextName": "finden-prod",
      "provider": "generic",
      "environment": "prod",
      "status": "CONNECTED",
      "active": true,
      "lastChecked": "2025-01-11T02:01:37Z",
      "consecutiveFailures": 0,
      "consecutiveSuccesses": 2
    }
  ],
  "active": { ... }
}
```

### POST /api/clusters/select
Select and connect to a cluster.

**Request:**
```json
{
  "clusterId": "3c226dda2b1f620c"
}
```

**Response:**
```json
{
  "success": true,
  "cluster": { ... }
}
```

### POST /api/clusters/reconnect?id=<clusterId>
Trigger immediate health check and reconnect.

**Response:**
```json
{
  "success": true,
  "status": {
    "clusterId": "3c226dda2b1f620c",
    "status": "CONNECTING",
    "lastChecked": "2025-01-11T02:01:37Z"
  }
}
```

### POST /api/clusters/refresh-catalog
Refresh the cluster catalog from all sources.

**Response:**
```json
{
  "success": true,
  "message": "Cluster catalog refreshed"
}
```

## Troubleshooting

### Clusters Show "Unknown" Status
- **Cause**: Cluster not registered with health checker
- **Fix**: Clusters auto-register when listed. Refresh the catalog or wait for next health check cycle.

### Select Button Doesn't Work
- **Cause**: Database conflict or cluster not found
- **Fix**: Ensure cluster exists in database. Check backend logs for errors.

### Duplicate Clusters in UI
- **Cause**: Multiple sources with same context
- **Fix**: Deduplication logic uses context name. Same context = same cluster. Check source priority.

### Environment Labels Incorrect
- **Cause**: Heuristic guessing based on context name
- **Fix**: Update `guessEnvironment()` function or manually edit database (future: custom labels)

## Migration Notes

### From Legacy Cluster Manager
- Enhanced Cluster Manager is backward compatible
- Legacy clusters continue to work
- Enhanced clusters are additive (doesn't break existing functionality)
- Database migration handles schema updates automatically

### Database Migration
- Automatic migration on first run
- Checks for missing columns in `clusters` table
- Drops and recreates table if schema mismatch detected
- Preserves data where possible

## Performance Considerations

- **Health Checks**: 30-second intervals, 5-second timeout per check
- **Lazy Registration**: Clusters register on-demand when listed
- **Background Processing**: Health checks run in goroutines
- **Database Queries**: Indexed on `cluster_id` and `context_name`
- **Frontend Polling**: Can be optimized with WebSockets (future)

## Conclusion

The Enhanced Cluster Manager provides a robust, production-ready solution for managing multiple Kubernetes clusters with health status tracking, source management, and clean authentication handling. It maintains backward compatibility while adding powerful new features for cluster discovery, health monitoring, and state management.
