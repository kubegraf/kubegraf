# IncidentModalV2 Component Documentation

## Overview

`IncidentModalV2` is an enhanced incident detail modal component for KubeGraf's intelligent incident management system. It provides a comprehensive, right-slide panel interface for investigating and resolving Kubernetes incidents with rich contextual information, evidence, and AI-powered recommendations.

## Location

`ui/solid/src/components/intelligence/IncidentModalV2.tsx`

## Features

### 1. **Intelligent Incident Snapshot**
- Fetches comprehensive incident snapshots with full diagnostic context
- Auto-opens recommended action tabs based on AI analysis
- Displays severity, status, and pattern recognition

### 2. **Impact Analysis Panel**
- **Affected Replicas**: Number of pods/replicas impacted
- **User-Facing**: Whether the incident affects end users
- **Service Exposure**: Service availability status
- **Namespace Criticality**: Importance of the affected namespace

### 3. **AI-Powered Diagnosis**
- **Diagnosis Summary**: Human-readable explanation of the issue
- **Root Causes**: Ranked list of likely root causes with confidence levels
  - Primary and secondary causes with likelihood percentages
- **Confidence Level**: Overall diagnostic confidence (High/Medium/Low)

### 4. **Why Now Analysis**
- Temporal context explaining why the incident occurred at this specific time
- Correlates with recent cluster changes and events

### 5. **Restart Context** (for restart-related incidents)
- Restart frequency metrics over different time windows:
  - Last 5 minutes
  - Last 1 hour
  - Last 24 hours

### 6. **Recommended First Action**
- AI-suggested immediate action to investigate or resolve the incident
- Direct navigation to relevant evidence tab

### 7. **Tabbed Evidence System**
Six specialized tabs for comprehensive incident investigation:

#### 📦 Evidence Tab
- Key evidence points collected by the AI system
- Structured evidence with severity and impact indicators

#### 📝 Logs Tab
- Recent container logs related to the incident
- Timestamped log entries with syntax highlighting
- Lazy-loaded for performance

#### 📈 Metrics Tab
- Resource metrics (CPU, memory, disk, network)
- Performance indicators around the incident timeframe
- Trend analysis

#### 🔄 Changes Tab (`ChangeTimeline`)
- Timeline of recent cluster changes that may have triggered the incident
- Deployment updates, configuration changes, and scaling events

#### 📋 Runbooks Tab (`RunbookSelector`)
- Relevant runbook recommendations
- Step-by-step remediation guides
- Pattern-specific troubleshooting workflows

#### 🔗 Similar Tab (`SimilarIncidents`)
- Historical similar incidents
- Previous resolutions and learnings
- Pattern matching across incident history

### 8. **User Feedback System**
Three feedback options to improve AI diagnostics:
- ✅ **Worked**: Diagnosis and resolution were correct
- ❌ **Didn't Work**: Suggested resolution failed
- ⚠️ **Incorrect Cause**: Root cause analysis was wrong

### 9. **Incident Resolution**
- One-click incident resolution
- Marks incident as resolved in the system
- Updates incident status and history

## Component Architecture

### Props Interface

```typescript
interface IncidentModalV2Props {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}
```

### State Management

```typescript
const [snapshot, setSnapshot] = createSignal<IncidentSnapshot | null>(null);
const [loading, setLoading] = createSignal(true);
const [error, setError] = createSignal<string | null>(null);
const [activeTab, setActiveTab] = createSignal<string | null>(null);
const [loadedTabs, setLoadedTabs] = createSignal<Set<string>>(new Set());
const [resolving, setResolving] = createSignal(false);
```

### Key Methods

#### `handleTabClick(tabId: string)`
- Activates a specific evidence tab
- Implements lazy loading for tab content
- Tracks loaded tabs to avoid redundant API calls

#### `handleResolve()`
- Resolves the current incident
- Calls API to mark incident as resolved
- Closes modal on success

#### `getSeverityColor(severity: string)`
Maps severity levels to color codes:
- `critical` → #dc3545 (red)
- `high` → #ff6b6b (orange-red)
- `medium/warning` → #ffc107 (yellow)
- `low` → #28a745 (green)

#### `getPatternIcon(pattern: string)`
Returns emoji icons for incident patterns:
- `RESTART_STORM` → 🌪️
- `CRASHLOOP` → 💥
- `OOM_PRESSURE` → 💾
- `LIVENESS_FAILURE` → 💓
- `READINESS_FAILURE` → 💓
- `PENDING_POD` → ⏳

## UI/UX Design

### Layout
- **Right-side slide-in panel**: 720px max-width (100% on mobile)
- **Sticky header**: Always visible with close button
- **Scrollable content area**: Main content with smooth scrolling
- **Sticky footer**: Action buttons always accessible

### Responsive Design
- Full-width on screens < 768px
- Optimized touch interactions
- Mobile-friendly tab navigation

### Accessibility
- ESC key support for closing modal
- Keyboard navigation support
- ARIA labels for close button
- High contrast color scheme

### Performance Optimizations
1. **Lazy Tab Loading**: Content only loads when tabs are clicked
2. **Cached Tab State**: Once loaded, tabs don't reload on re-activation
3. **Conditional Rendering**: Uses SolidJS `<Show>` for efficient updates
4. **Reactive State**: Fine-grained reactivity with signals

## API Integration

### Required API Endpoints

```typescript
// Fetch full incident snapshot
api.getIncidentSnapshot(incidentId: string): Promise<IncidentSnapshot>

// Fetch incident logs
api.getIncidentLogs(incidentId: string, limit: number): Promise<{ logs: any[] }>

// Fetch incident metrics
api.getIncidentMetrics(incidentId: string): Promise<{ metrics: any[] }>

// Resolve incident
api.resolveIncident(incidentId: string, reason: string): Promise<void>
```

## Dependencies

### Component Dependencies
- `EvidencePanel.tsx` - Evidence collection display
- `CitationsPanel.tsx` - Source citations (if used)
- `RunbookSelector.tsx` - Runbook recommendations
- `SimilarIncidents.tsx` - Historical incident matching
- `ChangeTimeline.tsx` - Cluster change timeline

### External Dependencies
- `solid-js` - Core reactive framework
- `api.ts` - API service layer

## Usage Example

```tsx
import IncidentModalV2 from './components/intelligence/IncidentModalV2';

<IncidentModalV2
  incident={selectedIncident}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
/>
```

## Styling System

### CSS Variables Used
```css
--bg-primary: Main background color
--bg-secondary: Secondary background color
--bg-card: Card background color
--border-color: Border color
--text-primary: Primary text color
--text-secondary: Secondary text color
--text-muted: Muted text color
--accent-primary: Primary accent color (cyan)
```

## Future Enhancements

1. **Real-time Updates**: Live incident status updates via WebSocket
2. **Advanced Filtering**: Filter logs and metrics by severity/timeframe
3. **Export Functionality**: Export incident report as PDF
4. **Collaborative Features**: Multi-user incident investigation
5. **Remediation Automation**: One-click auto-remediation for known patterns
6. **Custom Runbook Integration**: User-defined runbooks
7. **Metrics Visualization**: Charts and graphs for metrics data

## Version History

- **v2.0.0** (2025-01-27): Initial release of enhanced incident modal
  - AI-powered diagnosis and recommendations
  - Tabbed evidence system with lazy loading
  - Feedback mechanism for continuous improvement
  - Responsive design with mobile support

## Related Components

- `IncidentDetailView.tsx` - Legacy incident detail modal (deprecated)
- `Incidents.tsx` - Main incidents page using this modal
- `ChangeIntelligence.tsx` - Change intelligence analysis

## Contributing

When modifying this component:
1. Maintain backward compatibility with `Incident` and `IncidentSnapshot` types
2. Follow SolidJS reactive patterns (signals, effects)
3. Add new tabs by extending the tab configuration array
4. Update this documentation with any new features
5. Test on both desktop and mobile viewports

## License

Copyright 2025 KubeGraf Contributors. Licensed under Apache 2.0.
