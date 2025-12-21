# Incident Modal v2 Implementation Status

## ✅ Completed Backend Components

### 1. Incident Snapshot System (`pkg/incidents/snapshot.go`)
- ✅ `IncidentSnapshot` struct with all required fields
- ✅ Hot evidence fields (RestartCounts, LastExitCode, LastErrorString, ReadinessStatus, RecentChangeSummary)
- ✅ Diagnosis fields (DiagnosisSummary, RootCauses, Confidence, ConfidenceLabel)
- ✅ Impact fields (AffectedReplicas, ServiceExposure, UserFacingLikelihood, NamespaceCriticality)
- ✅ "Why Now" explanation field
- ✅ RecommendedAction for primary CTA
- ✅ `ComputeIncidentFingerprint` function
- ✅ `ComputeConfidenceLabel` and `ComputeUserFacingLabel` helpers

### 2. Snapshot Cache (`pkg/incidents/snapshot_cache.go`)
- ✅ LRU cache implementation with TTL support
- ✅ Thread-safe with read/write locks
- ✅ Automatic eviction when cache is full
- ✅ Expiration checking

### 3. Hot Evidence Builder (`pkg/incidents/hot_evidence_builder.go`)
- ✅ Extracts restart counts by time window (5min, 1h, 24h)
- ✅ Extracts last exit code and error string
- ✅ Extracts readiness status
- ✅ Extracts recent change summary

### 4. Snapshot Builder (`pkg/incidents/snapshot.go`)
- ✅ Builds complete snapshot from incident + hot evidence
- ✅ Confidence scoring (uses diagnosis confidence if available, fallback 0.5)
- ✅ Impact calculation (basic implementation with namespace criticality)
- ✅ Recommended action selection based on pattern
- ✅ Fallback diagnosis generation

### 5. API Endpoints (`web_incidents_v2.go`)
- ✅ `GET /api/v2/incidents/{id}/snapshot` - Fast hot-path endpoint
- ✅ `GET /api/v2/incidents/{id}/logs` - Cold evidence (lazy loaded)
- ✅ `GET /api/v2/incidents/{id}/metrics` - Cold evidence (lazy loaded)
- ✅ `GET /api/v2/incidents/{id}/changes` - Cold evidence (delegates to existing handler)
- ✅ `GET /api/v2/incidents/{id}/runbooks` - Already exists (cold evidence)
- ✅ `GET /api/v2/incidents/{id}/similar` - Already exists (cold evidence)
- ✅ `GET /api/v2/incidents/{id}/evidence` - Already exists (can be used for evidence tab)
- ✅ `GET /api/v2/incidents/{id}/citations` - Already exists (cold evidence)

### 6. Performance
- ✅ Snapshot cache with 5-minute TTL
- ✅ Performance logging (warns if snapshot generation > 100ms)
- ✅ All endpoints use existing incident cache to avoid N+1 queries

## 🔄 Partially Complete

### 1. Impact Calculation
- ✅ Basic structure in place
- ⚠️ Service/Ingress detection not implemented (returns empty ServiceExposure)
- ⚠️ Affected replicas defaults to 1 (needs logic to count from deployment/statefulset)
- ✅ Namespace criticality mapping (configurable)
- ✅ User-facing likelihood calculation (based on service exposure)

### 2. Confidence Scoring
- ✅ Uses existing diagnosis confidence when available
- ⚠️ Evidence-weighted calculation not implemented (weights defined but not used)
- ✅ Fallback to 0.5 (medium) when no diagnosis exists

## ❌ Remaining Frontend Work

### 1. Incident Modal v2 Component
Create `ui/solid/src/components/IncidentModalV2.tsx` with:

#### Structure:
- Right-side slide-in modal (max-width: 720px, fullscreen on mobile)
- ESC key + close button handling
- Sticky header + footer

#### Sections (in order):
1. **Header** (always visible)
   - Pattern icon
   - Severity badge
   - Resource path (namespace/kind/name)
   - Occurrence count
   - Active/Resolved status

2. **Impact Panel** (NEW)
   - Affected replicas
   - Service exposure
   - User-facing likelihood
   - Namespace criticality

3. **Diagnosis** (always loaded)
   - Short summary sentence
   - Ranked root causes (1 primary, others secondary)
   - Confidence label (Low/Medium/High)

4. **Why Now** (NEW)
   - Single-line change explanation
   - Fallback: "No recent changes detected"

5. **Recommended First Action** (NEW)
   - Exactly ONE primary CTA
   - Read-only, low risk
   - Clicking opens relevant tab automatically

6. **Evidence Tabs** (lazy loaded)
   - Evidence
   - Logs
   - Metrics
   - Changes
   - Runbooks
   - Similar
   - Rules:
     - Do NOT fetch on modal open
     - Fetch only on first click
     - Cache per incident
     - Show spinner only inside tab

7. **Footer** (sticky)
   - Mark Resolved button
   - Feedback buttons (worked / didn't / incorrect cause)

### 2. Integration Points
- Replace existing incident detail modal with new component
- Use snapshot API for instant load
- Implement lazy loading for tabs
- Add prefetch logic (optional, can be done later)

### 3. Restart Context Display
- Show restart counts with time windows:
  - Last 5 minutes
  - Last 1 hour
  - Last 24 hours

## 📝 Implementation Notes

### Backend API Contract

#### Snapshot Endpoint
```
GET /api/v2/incidents/{id}/snapshot
Response: IncidentSnapshot
Performance: < 100ms target
```

#### Cold Evidence Endpoints
All lazy-loaded, called only when tab is opened:
- `GET /api/v2/incidents/{id}/logs?tail=20`
- `GET /api/v2/incidents/{id}/metrics`
- `GET /api/v2/incidents/{id}/changes?lookback=60`
- `GET /api/v2/incidents/{id}/runbooks`
- `GET /api/v2/incidents/{id}/similar`
- `GET /api/v2/incidents/{id}/evidence`

### Frontend Implementation Checklist

1. [ ] Create `IncidentModalV2.tsx` component
2. [ ] Implement right-side slide-in animation
3. [ ] Add snapshot API integration (`/api/v2/incidents/{id}/snapshot`)
4. [ ] Render header section from snapshot
5. [ ] Render impact panel from snapshot
6. [ ] Render diagnosis section from snapshot
7. [ ] Render "Why Now" section from snapshot
8. [ ] Render recommended action button
9. [ ] Implement lazy-loaded tabs (Evidence, Logs, Metrics, Changes, Runbooks, Similar)
10. [ ] Add restart context display with time windows
11. [ ] Implement footer actions (Mark Resolved, Feedback)
12. [ ] Add ESC key handling
13. [ ] Test with various incident patterns (RESTART_STORM, CRASHLOOP, OOM, etc.)

## 🚀 Next Steps

1. Create the frontend modal component following the structure above
2. Integrate with existing incident list/detail flows
3. Test end-to-end with real incidents
4. (Optional) Enhance impact calculation to detect Services/Ingresses
5. (Optional) Implement evidence-weighted confidence scoring

## 📚 Key Files

### Backend
- `pkg/incidents/snapshot.go` - Snapshot struct and builder
- `pkg/incidents/snapshot_cache.go` - LRU cache implementation
- `pkg/incidents/hot_evidence_builder.go` - Hot evidence extraction
- `web_incidents_v2.go` - API endpoints

### Frontend (to be created)
- `ui/solid/src/components/IncidentModalV2.tsx` - Main modal component
- `ui/solid/src/services/api.ts` - API calls (add `getIncidentSnapshot`)

