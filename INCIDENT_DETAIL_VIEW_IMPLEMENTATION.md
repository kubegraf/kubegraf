# Incident Detail View Implementation

## Overview
Production-grade Incident Detail View for KubeGraf that explains incidents with a clear structure: **what happened → why → evidence → safe fixes**.

## Components Created

### 1. IncidentHeader
**Location**: `ui/solid/src/components/incidents/IncidentHeader.tsx`

- Shows incident title (human-readable)
- Displays affected resource(s): namespace/kind/name
- Shows severity, confidence %, status (Active/Resolved)
- First seen, last seen, occurrences
- Compact and immediately scannable

### 2. SignalSummaryPanel
**Location**: `ui/solid/src/components/incidents/SignalSummaryPanel.tsx`

- Lists all signals that triggered the incident:
  - Pod restarts (with counts for 5m/1h/24h)
  - OOMKilled events
  - Container exit codes
  - Error strings
  - Readiness failures
  - Service endpoint issues
- Each signal is clickable to reveal evidence
- Shows source attribution (Pod status, Container status, etc.)
- No charts, just facts

### 3. RootCauseExplanation
**Location**: `ui/solid/src/components/incidents/RootCauseExplanation.tsx`

- Single primary root cause (highlighted)
- Optional secondary contributing factors
- Deterministic language (not vague)
- Bullet hierarchy: primary → secondary
- Shows confidence level with color coding

### 4. TimelineReconstruction
**Location**: `ui/solid/src/components/incidents/TimelineReconstruction.tsx`

- Chronological list of events:
  - Deployments
  - Pod lifecycle changes
  - Kubernetes warnings
- Shows relative timestamps (e.g., "4 min ago")
- Reads like an incident narrative
- Visual timeline with dots and lines

### 5. LogErrorAnalysis
**Location**: `ui/solid/src/components/incidents/LogErrorAnalysis.tsx`

- Groups logs by error pattern
- Shows:
  - Error signature
  - Count (how many times it appeared)
  - Sample log line
- Expandable to see full error details
- No infinite scrolling by default

### 6. AvailabilityImpact
**Location**: `ui/solid/src/components/incidents/AvailabilityImpact.tsx`

- Shows HTTP error codes detected (503, 500, etc.)
- Shows ingress or service impacted
- Service exposure status
- User-facing likelihood
- Affected replicas count
- Shows "Unknown/Not detected yet" when data is missing

### 7. ChangeIntelligence
**Location**: `ui/solid/src/components/incidents/ChangeIntelligence.tsx`

- Shows what changed before the incident:
  - Deployments
  - ConfigMaps
  - Secrets
  - Pods
- Clearly shows "No changes detected" if empty
- Relative timestamps (e.g., "5 min before incident")

### 8. RecommendedFixes
**Location**: `ui/solid/src/components/incidents/RecommendedFixes.tsx`

- Each fix includes:
  - Title
  - Reason
  - Confidence level
  - Risk level (Low/Medium/High)
- **Enforces 80% confidence rule**: Only shows fixes if incident confidence ≥ 80%
- Preview button to see fix details
- Sorted by confidence (highest first)

### 9. FixPreviewPanel
**Location**: `ui/solid/src/components/incidents/FixPreviewPanel.tsx`

- Shows kubectl dry-run diff output
- Displays preview commands
- Requires explicit confirmation checkbox before apply
- Modal overlay with proper z-index
- Cancel and Apply buttons

### 10. KnowledgeBank
**Location**: `ui/solid/src/components/incidents/KnowledgeBank.tsx`

- Shows similar past incidents
- Shows previous fix success rates
- Similarity percentage for each incident
- Feedback buttons: "Fix Worked", "Didn't Work", "Incorrect Cause"
- Helps improve future recommendations

### 11. IncidentDetailView (Main Component)
**Location**: `ui/solid/src/components/incidents/IncidentDetailView.tsx`

- Integrates all components in **MANDATORY ORDER**:
  1. Incident Header
  2. Signal Summary Panel
  3. Root Cause Explanation
  4. Timeline Reconstruction
  5. Log Error Analysis
  6. Availability / HTTP Impact
  7. Change Intelligence
  8. Recommended Fixes
  9. Knowledge Bank
- Collapsible sections (all collapsed by default for faster initial render)
- Slide-in modal from right (max width 900px, fullscreen on mobile)
- ESC key closes modal
- Click outside closes modal
- Uses snapshot endpoint for instant load
- Lazy-loads tab-specific data (timeline, logs, changes, etc.)
- Caches data in store to avoid refetch while modal is open

## Usage

### Integration into Incidents.tsx

To use the new IncidentDetailView, update `ui/solid/src/routes/Incidents.tsx`:

```typescript
import IncidentDetailView from '../components/incidents/IncidentDetailView';

// In the component, replace IncidentModalV2 with:
<IncidentDetailView
  incident={selectedIncident()}
  isOpen={detailModalOpen()}
  onClose={closeDetailModal}
/>
```

## Design Principles

### ✅ Implemented

1. **Evidence-First**: All evidence is attributed to sources (Pod status, Kubernetes events, etc.)
2. **Deterministic Language**: No vague explanations, only concrete facts
3. **80% Confidence Rule**: Fixes only shown when confidence ≥ 80%
4. **Never Guess**: Shows "Unknown/Not detected yet" when data is missing
5. **Fast Rendering**: Snapshot-based loading, collapsible sections, lazy-loaded data
6. **No Blocking UI**: Skeleton loaders, async data loading
7. **Mobile Responsive**: Fullscreen on mobile, max width on desktop

### UX Features

- **Collapsible Sections**: All sections are collapsible to reduce initial render time
- **Skeleton Loaders**: Shows loading states for async data
- **Error Handling**: Proper error messages with retry buttons
- **Smooth Animations**: Slide-in animation, hover effects
- **Accessibility**: Keyboard navigation (ESC to close), proper ARIA labels

## API Endpoints Used

All endpoints are already implemented in the backend:

- `GET /api/v2/incidents/{id}/snapshot` - Fast snapshot (cached, TTL 5m)
- `GET /api/v2/incidents/{id}/logs?tail=100` - Logs
- `GET /api/v2/incidents/{id}/changes?lookback=3600` - Changes
- `GET /api/v2/incidents/{id}/runbooks` - Fix suggestions
- `GET /api/v2/incidents/{id}/similar` - Similar incidents
- `POST /api/v2/incidents/{id}/feedback` - User feedback

## Files Created

```
ui/solid/src/components/incidents/
├── IncidentHeader.tsx
├── SignalSummaryPanel.tsx
├── RootCauseExplanation.tsx
├── TimelineReconstruction.tsx
├── LogErrorAnalysis.tsx
├── AvailabilityImpact.tsx
├── ChangeIntelligence.tsx
├── RecommendedFixes.tsx
├── FixPreviewPanel.tsx
├── KnowledgeBank.tsx
├── IncidentDetailView.tsx
└── index.ts (exports)
```

## Next Steps

1. **Test Integration**: Replace IncidentModalV2 with IncidentDetailView in Incidents.tsx
2. **Test with Real Data**: Verify all sections render correctly with actual incident data
3. **Mobile Testing**: Test responsive behavior on mobile devices
4. **Performance Testing**: Verify fast rendering on large clusters
5. **Feedback Loop**: Test feedback submission and verify it updates knowledge bank

## Notes

- All components use inline styles for consistency with existing codebase
- Uses SolidJS reactive primitives (createSignal, createEffect)
- Integrates with existing `incidentsV2Store` for caching
- Follows the exact section order specified in requirements
- Production-ready code with proper error handling and loading states
