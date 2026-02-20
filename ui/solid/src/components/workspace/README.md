# Unique Incident Intelligence Workspace

A production-ready, ML-ready incident investigation UI for KubeGraf with adaptive layouts, intelligent insights, and comprehensive workflow automation.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Intelligence Engines](#intelligence-engines)
- [Workflows](#workflows)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Development](#development)

## 🎯 Overview

The Unique Incident Intelligence Workspace is a revolutionary 3-panel UI designed for efficient Kubernetes incident investigation. It features:

### Key Features

✅ **Adaptive Layouts** - Automatically switches between High Confidence (≥95%) and Investigation (<95%) modes
✅ **ML-Ready Architecture** - Weighted scoring algorithms ready for ML model integration
✅ **Intelligent Insights** - Context-aware recommendations and pattern detection
✅ **Fix Workflows** - Complete fix execution with preview, rollback, and monitoring
✅ **RCA Reports** - Comprehensive root cause analysis in multiple formats
✅ **Accessibility** - WCAG 2.1 AA compliant with full keyboard navigation
✅ **Performance** - Optimized with debouncing, memoization, and virtual lists
✅ **Error Handling** - Graceful error boundaries with user-friendly messages

### Design Principles

1. **Spatial Memory** - Consistent layout aids navigation and reduces cognitive load
2. **Confidence-First** - UI adapts based on diagnosis confidence level
3. **Action Bias** - High confidence incidents show action-first UI
4. **Investigation Support** - Low confidence incidents get full investigation tools
5. **Intelligence Integration** - AI insights presented naturally in workflow

## 🏗️ Architecture

### Three-Panel Layout

```
┌──────────────┬─────────────────────────────┬──────────────────┐
│   Context    │   Investigation Workspace   │  Intelligence    │
│  Navigator   │                             │   Assistant      │
│    (20%)     │          (60%)              │     (20%)        │
│              │                             │                  │
│  Incident    │  ┌─────────────────────┐   │  Key Insights    │
│  List with   │  │  Adaptive Content   │   │  Related         │
│  Filters     │  │  Based on           │   │  Incidents       │
│              │  │  Confidence         │   │  Quick Actions   │
│              │  └─────────────────────┘   │                  │
└──────────────┴─────────────────────────────┴──────────────────┘
```

### Component Hierarchy

```
IntelligentWorkspace (Root)
├── ContextNavigator (Left Panel)
│   ├── Search & Filters
│   ├── Incident Cards
│   └── Quick Filters
├── InvestigationWorkspace (Center Panel)
│   ├── Incident Header
│   ├── Adaptive Layout Container
│   │   ├── HighConfidenceLayout (≥95%)
│   │   │   ├── Quick Fix Card
│   │   │   ├── IncidentStory
│   │   │   └── Collapsible Sections
│   │   └── InvestigationLayout (<95%)
│   │       ├── Timeline & Events
│   │       ├── Hypothesis Testing
│   │       ├── Resource Details
│   │       ├── Logs Viewer
│   │       └── Fix Suggestions
│   └── Action Footer
└── IntelligenceAssistant (Right Panel)
    ├── Key Insights
    ├── Related Incidents
    ├── Quick Actions
    └── Cluster Health
```

## 🧩 Components

### Core Components

#### `IntelligentWorkspace`

Main container orchestrating the 3-panel layout.

```typescript
<IntelligentWorkspace
  incidents={incidents}
  isLoading={false}
  onIncidentSelect={(incident) => console.log(incident)}
  onClose={() => console.log('Close workspace')}
/>
```

**Props:**
- `incidents: Incident[]` - Array of incidents to display
- `isLoading?: boolean` - Loading state
- `onIncidentSelect?: (incident: Incident) => void` - Selection callback
- `onClose?: () => void` - Close callback

**Keyboard Shortcuts:**
- `J/K` or `↓/↑` - Navigate incidents
- `Enter` - Select incident
- `Escape` - Close workspace
- `Cmd+[` - Toggle context navigator
- `Cmd+]` - Toggle intelligence assistant
- `?` - Show help

#### `ContextNavigator`

Left panel for incident navigation and filtering.

```typescript
<ContextNavigator
  incidents={incidents}
  currentIndex={0}
  onSelectIncident={(index) => console.log(index)}
  onFilterChange={(filters) => console.log(filters)}
/>
```

**Features:**
- Debounced search (300ms delay)
- Multi-dimensional filtering (severity, pattern, namespace, status)
- Visual selection indicators
- Quick filter buttons for severity levels

#### `InvestigationWorkspace`

Center panel with adaptive layouts.

```typescript
<InvestigationWorkspace
  incident={currentIncident}
  allIncidents={incidents}
  isLoading={false}
  onPrevious={() => {}}
  onNext={() => {}}
  onResolve={() => {}}
  onDownloadRCA={() => {}}
  canNavigatePrevious={true}
  canNavigateNext={true}
  currentIndex={0}
  totalIncidents={10}
/>
```

**Adaptive Behavior:**
- Confidence ≥95%: Shows `HighConfidenceLayout`
- Confidence <95%: Shows `InvestigationLayout`

#### `HighConfidenceLayout`

Action-first layout for high-confidence incidents.

**Features:**
- Prominent Quick Fix card with success predictor
- Expected outcome preview
- Rollback plan visibility
- Collapsible diagnosis and evidence sections

#### `InvestigationLayout`

Investigation-first layout for lower confidence incidents.

**Features:**
- Timeline & Events visualization
- Hypothesis Testing section
- Resource Details grid
- Logs viewer (terminal-style)
- Ranked fix suggestions with risk badges

#### `IntelligenceAssistant`

Right panel providing intelligent insights.

**Features:**
- Context-aware insights (8 types)
- Related incidents with similarity scores
- Quick action buttons
- Cluster health monitoring

### Workflow Components

#### `FixExecutionModal`

Complete fix execution workflow with preview, execution, rollback.

```typescript
<FixExecutionModal
  incident={incident}
  fixId="fix-1"
  fixTitle="Increase Memory Limits"
  fixDescription="Update pod memory limits to prevent OOM crashes"
  onClose={() => {}}
  onSuccess={() => {}}
  onFailure={(error) => console.error(error)}
/>
```

**Execution Flow:**
1. **Preview** - Show execution plan and important notes
2. **Confirming** - User confirms execution
3. **Executing** - Step-by-step execution with progress
4. **Success** - 30-second rollback window
5. **Failed** - Error display with details

**Features:**
- Pattern-specific execution steps
- Real-time progress tracking
- Execution logs with timestamps
- Automatic rollback window (30s)
- Manual rollback trigger

#### `IncidentStory`

Human-readable narrative generation.

```typescript
<IncidentStory incident={incident} />
```

**Story Sections:**
1. What Happened - Human-friendly description
2. When It Started - Timeline information
3. Why It Happened - Root cause explanation
4. What's Affected - Impact assessment
5. How to Fix It - Resolution path

### Supporting Components

#### `SkeletonLoader`

Loading state placeholders for smooth UX.

```typescript
import {
  SkeletonIncidentCard,
  SkeletonInvestigationWorkspace,
  SkeletonIntelligenceAssistant,
  Spinner,
  PulsingLoader,
} from './SkeletonLoader';

// Usage
<SkeletonIncidentCard />
<Spinner size="medium" />
<PulsingLoader size="small" />
```

#### `WorkspaceErrorBoundary`

Error boundary with retry mechanism.

```typescript
<WorkspaceErrorBoundary componentName="MyComponent">
  <MyComponent />
</WorkspaceErrorBoundary>
```

**Features:**
- User-friendly error messages
- Retry mechanism
- Detailed error information (expandable)
- Copy error details to clipboard
- Error categorization

## 🧠 Intelligence Engines

### InsightsEngine

Generates context-aware insights from incident data.

```typescript
import { InsightsEngine } from './insightsEngine';

const insights = InsightsEngine.generateInsights(
  currentIncident,
  allIncidents
);
```

**Insight Categories:**
1. **Confidence** - Diagnosis confidence level insights
2. **Pattern** - Similar pattern detection
3. **Trend** - Incident trend analysis (24h comparison)
4. **Impact** - Cluster health impact assessment
5. **Recurrence** - Recurring incident detection
6. **Proactive** - Preventive recommendations

**Priority Levels:** Critical (100), High (75), Medium (50), Low (25)

### RelatedIncidentsEngine

Multi-factor similarity scoring algorithm.

```typescript
import { RelatedIncidentsEngine } from './relatedIncidentsEngine';

const related = RelatedIncidentsEngine.findRelatedIncidents(
  currentIncident,
  allIncidents,
  { limit: 5, threshold: 50 }
);
```

**Similarity Factors:**
- **Pattern** (40 pts) - Same failure pattern
- **Namespace** (20 pts) - Same namespace
- **Resource Kind** (15 pts) - Same resource type
- **Time Proximity** (15 pts) - Within 24 hours
- **Severity** (10 pts) - Same severity level
- **Resource Name** (10 pts bonus) - Exact resource match

**Score Ranges:**
- 80-100: High correlation
- 60-79: Medium correlation
- 40-59: Low correlation
- <40: Weak correlation

### FixSuccessPredictor

ML-ready success prediction with explainability.

```typescript
import { FixSuccessPredictor } from './fixSuccessPredictor';

const prediction = FixSuccessPredictor.predictSuccess(
  incident,
  fixId,
  allIncidents
);
```

**Prediction Factors:**
1. **Diagnosis Confidence** (35%) - Confidence in root cause
2. **Pattern Recognition** (25%) - Known vs unknown pattern
3. **Historical Success** (20%) - Past success rate
4. **Resource Health** (15%) - Current resource state
5. **Fix Complexity** (5%) - Simplicity of fix

**Risk Levels:**
- Low: probability ≥80%
- Medium: 50% ≤ probability < 80%
- High: probability < 50%

### RCAReportGenerator

Comprehensive RCA report generation.

```typescript
import { RCAReportGenerator } from './rcaReportGenerator';

const report = RCAReportGenerator.generateReport(incident);
RCAReportGenerator.downloadReport(report, 'markdown'); // or 'json', 'html'
```

**Report Sections:**
1. **Metadata** - Incident details, timestamps
2. **Executive Summary** - High-level overview
3. **Timeline** - Chronological event sequence
4. **Root Cause Analysis** - Detailed investigation
5. **Impact Assessment** - Affected resources and services
6. **Resolution Steps** - Remediation actions taken
7. **Recommendations** - Preventive measures
8. **Supporting Evidence** - Logs, events, metrics
9. **Appendix** - Technical details, configurations

**Export Formats:**
- **Markdown** - Human-readable, version-control friendly
- **JSON** - Machine-readable, programmatic access
- **HTML** - Styled, shareable reports

## 🔄 Workflows

### Fix Execution Workflow

```
Preview → Confirm → Execute → Monitor → Verify
          ↓         ↓        ↓
          Cancel    Fail     Rollback
```

**1. Preview Phase**
- Show execution plan (step-by-step)
- Display important notes
- Rollback availability confirmation

**2. Execution Phase**
- Pattern-specific steps
- Real-time progress indicators
- Execution logs

**3. Monitoring Phase**
- 30-second rollback window
- Health checks
- Stability verification

**4. Rollback** (if needed)
- Manual trigger available
- Automatic if health checks fail
- State restoration

### RCA Generation Workflow

```
Incident → Analyze → Generate → Format → Download
```

**1. Analysis**
- Extract incident data
- Identify root cause
- Calculate impact

**2. Generation**
- Create comprehensive report
- Add timeline and evidence
- Generate recommendations

**3. Export**
- Choose format (MD/JSON/HTML)
- Download file
- Save to disk

## ♿ Accessibility

### WCAG 2.1 AA Compliance

✅ **Keyboard Navigation** - Full keyboard support, no mouse required
✅ **Screen Readers** - Proper ARIA labels and live regions
✅ **Focus Management** - Focus trapping in modals, focus indicators
✅ **Color Contrast** - Minimum 4.5:1 ratio for text
✅ **Touch Targets** - Minimum 44x44px clickable areas
✅ **Reduced Motion** - Respects `prefers-reduced-motion`
✅ **High Contrast** - Supports `prefers-contrast: high`

### Accessibility Utilities

```typescript
import {
  globalFocusManager,
  globalAnnouncer,
  setupAccessibleModal,
  createKeyboardNavigation,
} from './accessibilityUtils';

// Announce to screen readers
globalAnnouncer.announce('Incident resolved', 'polite');

// Setup accessible modal
const cleanup = setupAccessibleModal(modalElement);

// Keyboard navigation
const handleKeyDown = createKeyboardNavigation({
  up: () => moveToPrevious(),
  down: () => moveToNext(),
  enter: () => selectCurrent(),
  escape: () => close(),
});
```

### Focus Management

```typescript
import { FocusManager } from './accessibilityUtils';

const focusManager = new FocusManager();

// Trap focus within element
const cleanup = focusManager.trapFocus(modalElement);

// Restore focus
focusManager.restoreFocus();
```

## ⚡ Performance

### Optimizations Implemented

1. **Debouncing** - Search input debounced (300ms)
2. **Memoization** - Expensive computations cached
3. **Virtual Lists** - Large lists rendered efficiently
4. **Code Splitting** - Lazy loading for heavy components
5. **Shallow Equality** - Prevent unnecessary re-renders

### Performance Utilities

```typescript
import {
  debounce,
  throttle,
  memoize,
  PerformanceMonitor,
  CacheManager,
} from './performanceUtils';

// Debounce expensive operations
const debouncedSearch = debounce(search, 300);

// Memoize function results
const memoizedCalc = memoize(expensiveCalculation);

// Monitor performance
const monitor = new PerformanceMonitor();
monitor.measure('calculation', () => heavyWork());
monitor.logReport(); // View performance metrics
```

### Cache Management

```typescript
import { CacheManager } from './performanceUtils';

const cache = new CacheManager({
  maxAge: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,          // 100 items
});

// Use cache
const cached = cache.get(key);
if (!cached) {
  const result = expensiveOperation();
  cache.set(key, result);
}
```

## 📖 Usage

### Basic Setup

```typescript
import { IntelligentWorkspace } from '@/components/workspace';
import type { Incident } from '@/services/api';

function MyApp() {
  const [incidents, setIncidents] = createSignal<Incident[]>([]);
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Incident Workspace
      </button>

      {isOpen() && (
        <IntelligentWorkspace
          incidents={incidents()}
          onClose={() => setIsOpen(false)}
          onIncidentSelect={(incident) => {
            console.log('Selected:', incident);
          }}
        />
      )}
    </>
  );
}
```

### With Error Boundary

```typescript
import {
  IntelligentWorkspace,
  WorkspaceErrorBoundary,
} from '@/components/workspace';

function MyApp() {
  return (
    <WorkspaceErrorBoundary componentName="IncidentWorkspace">
      <IntelligentWorkspace incidents={incidents} />
    </WorkspaceErrorBoundary>
  );
}
```

### Custom Filtering

```typescript
import { ContextNavigator } from '@/components/workspace';
import type { FilterState } from '@/components/workspace';

function MyNavigator() {
  const [filters, setFilters] = createSignal<FilterState>({
    severity: ['critical', 'high'],
    pattern: [],
    namespace: ['production'],
    status: ['open'],
    searchQuery: '',
  });

  return (
    <ContextNavigator
      incidents={incidents}
      currentIndex={0}
      onSelectIncident={(idx) => {}}
      onFilterChange={setFilters}
    />
  );
}
```

## 📚 API Reference

### Type Definitions

```typescript
interface Incident {
  id: string;
  title?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern?: string;
  status?: string;
  resource?: {
    kind: string;
    name: string;
    namespace?: string;
  };
  diagnosis?: {
    confidence: number;
    summary?: string;
    rootCause?: string;
  };
  recommendations?: Array<{
    id: string;
    title: string;
    description: string;
    confidence?: number;
    expectedOutcome?: string;
    rollbackPlan?: string;
  }>;
  events?: Array<{
    timestamp: string;
    type: string;
    reason: string;
    message: string;
  }>;
  firstSeen?: string;
  lastSeen?: string;
  occurrences?: number;
}

interface FilterState {
  severity: string[];
  pattern: string[];
  namespace: string[];
  status: string[];
  searchQuery: string;
}

interface Insight {
  id: string;
  type: 'confidence' | 'pattern' | 'trend' | 'impact' | 'recurrence' | 'proactive';
  priority: number;
  title: string;
  message: string;
  actionable: boolean;
  action?: () => void;
  icon: string;
}

interface RelatedIncident {
  incident: Incident;
  score: number;
  reasons: string[];
  correlation: 'high' | 'medium' | 'low' | 'weak';
}

interface SuccessPrediction {
  probability: number;
  confidence: number;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
  risk: 'low' | 'medium' | 'high';
  explanation: string;
}
```

## 🛠️ Development

### File Structure

```
workspace/
├── README.md                          # This file
├── index.ts                           # Main exports
├── IntelligentWorkspace.tsx          # Root component
├── ContextNavigator.tsx              # Left panel
├── InvestigationWorkspace.tsx        # Center panel
├── IntelligenceAssistant.tsx         # Right panel
├── HighConfidenceLayout.tsx          # Action-first layout
├── InvestigationLayout.tsx           # Investigation layout
├── IncidentStory.tsx                 # Narrative generation
├── FixExecutionModal.tsx             # Fix workflow
├── ErrorBoundary.tsx                 # Error handling
├── SkeletonLoader.tsx                # Loading states
├── insightsEngine.ts                 # Insights generation
├── relatedIncidentsEngine.ts         # Similarity scoring
├── fixSuccessPredictor.ts            # Success prediction
├── rcaReportGenerator.ts             # RCA generation
├── performanceUtils.ts               # Performance utilities
├── accessibilityUtils.ts             # Accessibility helpers
└── workspace.css                      # Styles (4500+ lines)
```

### Adding New Components

1. Create component file in `workspace/`
2. Add exports to `index.ts`
3. Add styles to `workspace.css`
4. Update this README

### Testing

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Contributing

1. Follow existing code patterns
2. Add TypeScript types
3. Include accessibility features
4. Add loading states
5. Wrap with error boundaries
6. Update documentation

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues, questions, or contributions:
- GitHub Issues: [kubegraf/issues](https://github.com/kubegraf/kubegraf/issues)
- Documentation: [docs/design/UNIQUE_INCIDENT_INTELLIGENCE_UI.md](../../../docs/design/UNIQUE_INCIDENT_INTELLIGENCE_UI.md)

---

**Built with ❤️ using SolidJS and TypeScript**
