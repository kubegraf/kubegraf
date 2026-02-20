# KubeGraf Unique Incident Intelligence UI/UX Design
## *"Intelligence-First Incident Investigation Workspace"*

**Version:** 1.0
**Date:** 2026-02-17
**Status:** Implementation Planning
**Branch:** `feature/unique-incident-intelligence-workspace`

---

## 📋 Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Unique Value Proposition](#unique-value-proposition)
3. [Core Design Concept](#core-design-concept)
4. [Layout Structure](#layout-structure)
5. [Component Specifications](#component-specifications)
6. [Visual Design System](#visual-design-system)
7. [Unique Features](#unique-features)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Technical Architecture](#technical-architecture)

---

## 🎯 Design Philosophy

**Core Principles:**
- **Intelligence-First** - Show what the system learned, not just raw data
- **Confidence-Driven** - UI adapts based on how certain we are
- **Progressive Disclosure** - Show more details only when needed
- **Story-Based** - Humans understand narratives better than logs
- **Team-Oriented** - Collective learning, not individual insights

**What Makes Us Different:**
- ✨ Local-first, no cloud dependencies
- 🧠 AI-powered with visible learning
- 🔄 Self-improving with every incident
- 🤖 Safe auto-remediation with rollback
- 📊 Evidence-based conclusions

---

## 🚀 Unique Value Proposition

### What Sets KubeGraf Apart

| Aspect | Traditional Tools | KubeGraf Unique Approach |
|--------|------------------|--------------------------|
| **Data Display** | Raw logs/metrics | Intelligence-first narratives |
| **Confidence** | Hidden or binary | Gradient visualization (0-100%) |
| **Layout** | Static modal/sidebar | Adaptive 3-panel workspace |
| **Fixes** | Simple list | Confidence-driven layouts |
| **Learning** | Backend only | Visible, gamified progress |
| **Navigation** | Click-heavy | Spatial + keyboard-first |
| **Prediction** | None | ML-based success forecasting |
| **Mobile** | Cramped desktop view | Swipeable incident cards |

---

## 💡 Core Design Concept

### "3-Panel Intelligent Workspace"

Instead of traditional modals or drawers, we create an **immersive workspace** that adapts to context.

```
┌────────────┬──────────────────────────────────────┬─────────────────┐
│            │                                      │                 │
│  CONTEXT   │       INVESTIGATION                  │   INTELLIGENCE  │
│  NAVIGATOR │       WORKSPACE                      │   ASSISTANT     │
│            │                                      │                 │
│  20% width │       60% width                      │   20% width     │
│  Spatial   │       Adaptive                       │   Proactive     │
│  Memory    │       Layout                         │   Insights      │
│            │                                      │                 │
└────────────┴──────────────────────────────────────┴─────────────────┘
```

**Key Innovation:** The center workspace **adapts its layout** based on incident confidence level.

---

## 🎨 Layout Structure

### Full Screen Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  KUBEGRAF INCIDENT INTELLIGENCE      ⚡ Live: ON  🏥 Health: 72%  [⚙️ ✕] │
├──────────┬──────────────────────────────────────────────────┬───────────┤
│          │                                                  │           │
│ CONTEXT  │  🔴 CRITICAL • nginx-deployment-abc123          │  INTEL    │
│          │  default/Pod • First: 2h ago • Occurs: 3         │           │
│ 🔍 Filter│                                                  │ 💡 Insight│
│ ▼ All(47)│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │           │
│ 🔴 Crit(3)│  ┃  ✅ WE KNOW WHAT'S WRONG                 ┃  │ Pattern 42│
│ 🟠 High  │  ┃  Container OOMKilled (exit 137)          ┃  │ OOM Redis │
│          │  ┃  Memory limit too low (512Mi)            ┃  │ 89% match │
│ ▼ Active │  ┃                                           ┃  │           │
│          │  ┃  ████████████████░░ 95% Confidence       ┃  │ 🔗 Related│
│ ┌──────┐ │  ┃  [📊 3 signals • View Evidence]         ┃  │           │
│ │● #1  │←│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │ #234 2d   │
│ │CRASH │ │                                                  │ Fixed:+RAM│
│ │95%   │ │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │           │
│ │3 fix │ │  ┃  🔧 RECOMMENDED FIX (Auto-approved)      ┃  │ 🎯 Actions│
│ └──────┘ │  ┃  ───────────────────────────────────────┃  │           │
│          │  ┃  Increase Memory: 512Mi → 1Gi            ┃  │ ┌────────┐│
│ │○ #2  │ │  ┃  ✓ Risk: Low                            ┃  │ │⚡ Quick││
│ │OOM   │ │  ┃  ✓ Success: 98% (42 similar)            ┃  │ │Restart ││
│ │87%   │ │  ┃  ✓ Rollback: Auto                       ┃  │ │95% ✓   ││
│ └──────┘ │  ┃  ⏱ ETA: 30s                              ┃  │ │[Apply] ││
│          │  ┃                                           ┃  │ └────────┘│
│ │○ #3  │ │  ┃  [Show Details ▼]    [Apply Fix →]     ┃  │           │
│ │Image │ │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │ 📚 Learn  │
│ │92%   │ │                                                  │           │
│ └──────┘ │  💡 Enable auto-fix to handle automatically     │ 15 fixed  │
│          │                                                  │ this week!│
│ [More]   │  ───────────────────────────────────────────────│           │
│          │  [🔍 Dig] [📝 Evidence] [📊 Timeline] [📖 Story]│ Health 72%│
│          │                                                  │ ███████░░ │
├──────────┴──────────────────────────────────────────────────┴───────────┤
│  ⌨ J/K: Navigate • Enter: Select • E: Evidence • F: Fix • ?: Help      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Width | Layout Adaptation |
|------------|-------|-------------------|
| **Desktop** | >1440px | Full 3-panel (20% - 60% - 20%) |
| **Laptop** | 1024-1440px | Full 3-panel (18% - 64% - 18%) |
| **Tablet** | 768-1024px | 2-panel (30% - 70%, Intelligence drawer) |
| **Mobile** | <768px | Single panel, swipeable cards |

---

## 🧩 Component Specifications

### 1. Context Navigator (Left Panel)

**Purpose:** Spatial memory navigation with mini-map style incident list

**Features:**
- Quick filter chips (All, Critical, High, Medium)
- Mini incident cards with key info
- Visual indicators (●=current, ○=unselected)
- Confidence bars per incident
- Quick actions on hover
- Keyboard navigation (J/K)

**Implementation:**
```tsx
// Location: ui/solid/src/components/intelligence/ContextNavigator.tsx

interface ContextNavigatorProps {
  incidents: Incident[];
  currentIncidentId: string;
  onSelectIncident: (id: string) => void;
  onFilterChange: (filter: FilterState) => void;
}
```

**Card Structure:**
```tsx
<div class="incident-mini-card" data-selected={isSelected}>
  <div class="severity-badge">{severity}</div>
  <div class="pattern-icon">{icon}</div>
  <div class="incident-id">#{index}</div>
  <div class="confidence-bar">
    <div class="fill" style={{ width: `${confidence}%` }} />
  </div>
  <div class="fix-count">{fixCount} fixes</div>
</div>
```

---

### 2. Investigation Workspace (Center Panel)

**Purpose:** Adaptive layout that changes based on confidence level

#### Mode A: High Confidence Layout (≥95%)

**When:** System is very confident about diagnosis and fix

**Layout Priority:**
1. **What's Wrong** (Top, prominent box)
2. **Recommended Fix** (Large, actionable box)
3. **Evidence** (Collapsed, expandable)
4. **Timeline** (Collapsed, expandable)

```tsx
<div class="investigation-workspace mode-high-confidence">
  <IncidentHeader {...headerProps} />

  <ConfidentDiagnosisCard
    diagnosis="Container OOMKilled (exit 137)"
    confidence={95}
    signals={3}
  />

  <RecommendedFixCard
    fix={primaryFix}
    confidence={95}
    successRate={98}
    autoApproved={true}
    onApply={handleApply}
  />

  <CollapsibleSection title="Evidence" icon="📊">
    <EvidencePanel {...evidenceProps} />
  </CollapsibleSection>

  <CollapsibleSection title="Timeline" icon="⏱️">
    <TimelinePanel {...timelineProps} />
  </CollapsibleSection>
</div>
```

#### Mode B: Investigation Mode (<95%)

**When:** Multiple possible causes, needs investigation

**Layout Priority:**
1. **Investigation Needed** (Alert banner)
2. **Evidence Summary** (Expanded by default)
3. **Possible Causes** (List with probabilities)
4. **Next Steps** (Actionable recommendations)

```tsx
<div class="investigation-workspace mode-investigation">
  <IncidentHeader {...headerProps} />

  <InvestigationAlert
    confidence={72}
    message="Multiple possible causes detected"
  />

  <EvidenceSummaryCard
    strongSignals={strongSignals}
    weakSignals={weakSignals}
  />

  <PossibleCausesCard
    causes={rankedCauses}
    onInvestigate={handleInvestigate}
  />

  <NextStepsCard
    recommendations={nextSteps}
  />
</div>
```

---

### 3. Intelligence Assistant (Right Panel)

**Purpose:** Proactive, context-aware AI insights (not chatbot)

**Sections:**
1. **💡 Insights** - Pattern matching, anomalies
2. **🔗 Related** - Similar past incidents
3. **🎯 Actions** - Quick fix buttons
4. **📚 Learning** - Progress, achievements
5. **🏆 Gamification** - Team stats, health score

```tsx
<div class="intelligence-assistant">
  <InsightsPanel
    patterns={detectedPatterns}
    anomalies={anomalies}
  />

  <RelatedIncidentsPanel
    similar={similarIncidents}
    onViewIncident={handleView}
  />

  <QuickActionsPanel
    actions={recommendedActions}
    onApply={handleQuickApply}
  />

  <LearningProgressPanel
    clustersCount={clustersCount}
    patternsLearned={patternsCount}
    autoFixedThisWeek={autoFixedCount}
  />

  <ClusterHealthScore
    score={72}
    impactingIssues={issues}
  />
</div>
```

---

## 🎨 Visual Design System

### Color Palette

```css
/* Primary: Intelligence Blue (KubeGraf Identity) */
--intelligence-primary: #4F46E5;    /* Indigo 600 */
--intelligence-light: #818CF8;      /* Indigo 400 */
--intelligence-dark: #3730A3;       /* Indigo 800 */
--intelligence-glow: rgba(79, 70, 229, 0.3);

/* Confidence Gradients (Unique Feature) */
--confidence-high: linear-gradient(135deg, #10B981 0%, #059669 100%);
--confidence-medium: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
--confidence-low: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);

/* Severity Colors */
--severity-critical: #DC2626;   /* Red 600 */
--severity-high: #F59E0B;       /* Amber 500 */
--severity-medium: #FCD34D;     /* Amber 300 */
--severity-low: #60A5FA;        /* Blue 400 */
--severity-info: #10B981;       /* Green 500 */

/* Action Colors */
--action-primary: #6366F1;      /* Indigo 500 */
--action-success: #10B981;      /* Green 500 */
--action-danger: #EF4444;       /* Red 500 */
--action-neutral: #8B5CF6;      /* Purple 500 */

/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-elevated: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
--bg-intelligence: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);

/* Dark Mode */
--bg-primary-dark: #1F2937;     /* Gray 800 */
--bg-secondary-dark: #374151;   /* Gray 700 */
--bg-elevated-dark: linear-gradient(135deg, #1F2937 0%, #111827 100%);
```

### Typography

```css
/* Headers: Inter (modern, clean) */
--font-heading: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--heading-xl: 600 24px/32px var(--font-heading);
--heading-lg: 600 20px/28px var(--font-heading);
--heading-md: 600 16px/24px var(--font-heading);
--heading-sm: 600 14px/20px var(--font-heading);

/* Body: System fonts (fast, native) */
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--body-lg: 400 16px/24px var(--font-body);
--body-md: 400 14px/20px var(--font-body);
--body-sm: 400 12px/18px var(--font-body);

/* Code: JetBrains Mono (developer-friendly) */
--font-code: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
--code: 400 13px/20px var(--font-code);

/* Special: Intelligence Callouts */
--callout: 500 15px/22px var(--font-body);
```

### Spacing System

```css
/* Base unit: 4px */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

/* Component-specific */
--workspace-padding: var(--space-6);
--card-padding: var(--space-4);
--card-gap: var(--space-3);
--panel-gap: var(--space-4);
```

### Shadows & Elevation

```css
/* Elevation levels */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
             0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
             0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
             0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* Intelligence glow */
--shadow-intelligence: 0 0 20px var(--intelligence-glow);
```

### Border Radius

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-full: 9999px;
```

---

## ✨ Unique Features

### 1. Confidence Visualization

**Unique Pill Component:**

```tsx
interface ConfidencePillProps {
  confidence: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
}

// Visual representation:
// High (95%+):    ████████████████░░ 95% | HIGH CONFIDENCE
// Medium (70-94%): ████████████░░░░░░ 72% | NEEDS REVIEW
// Low (<70%):      ██████░░░░░░░░░░░░ 45% | INVESTIGATION NEEDED
```

**Gradient based on confidence:**
- 95-100%: Green gradient
- 80-94%: Blue gradient
- 70-79%: Orange gradient
- <70%: Red gradient

---

### 2. Incident Stories

**Auto-generated narrative:**

```tsx
interface IncidentStoryProps {
  incident: Incident;
  evidencePack: EvidencePack;
  diagnosis: CitedDiagnosis;
}

// Generates human-readable story:
// "At 15:42, your nginx deployment started having trouble..."
```

**Story Structure:**
1. **When** - Timeline context
2. **What** - Problem description
3. **Why** - Root cause explanation
4. **How** - Evidence supporting conclusion
5. **Solution** - Recommended fix with success rate

---

### 3. Fix Success Predictor

**ML-based prediction visualization:**

```tsx
<FixSuccessPredictor
  fix={recommendedFix}
  historicalData={{
    similarInCluster: 42,
    similarInDatabase: 187,
    successRate: 98,
  }}
  prediction={{
    successProbability: 98,
    confidence: 95,
    timeEstimate: '30s',
    riskFactors: [],
  }}
/>
```

**Visual:**
```
┌────────────────────────────────┐
│  🎯 FIX SUCCESS PREDICTION     │
│  ──────────────────────────── │
│                                │
│      ┏━━━━━━━━━━━━━━━┓        │
│      ┃   98% chance  ┃        │
│      ┃   of success  ┃        │
│      ┗━━━━━━━━━━━━━━━┛        │
│                                │
│  Based on 42 similar fixes     │
│  in YOUR cluster               │
└────────────────────────────────┘
```

---

### 4. Cluster Health Score

**Real-time health visualization:**

```tsx
<ClusterHealthScore
  score={72}
  factors={{
    criticalIncidents: { count: 3, impact: -15 },
    overMemory: { count: 12, impact: -8 },
    autoRemediationOff: { impact: -5 },
  }}
/>
```

**Visual:**
```
┌─────────────────────────────┐
│  🏥 CLUSTER HEALTH          │
│  ─────────────────────────  │
│       ╭──────────╮          │
│      ╱            ╲         │
│     │  ██████░░░  │ 72%    │
│     │    GOOD     │         │
│      ╲            ╱         │
│       ╰──────────╯          │
│                             │
│  Issues impacting:          │
│  • 3 critical (-15%)        │
│  • 12 over memory (-8%)     │
│  • Auto-fix off (-5%)       │
└─────────────────────────────┘
```

---

### 5. Progressive Fix Flow

**Inline execution with visual feedback:**

```
STEP 1: Collapsed
[🔧 Recommended Fix] [Apply →]

STEP 2: Expanded
[🔧 Details] [Preview] [Apply →]

STEP 3: Execution
⏳ Applying... ██████░░░ 60%

STEP 4: Success
✅ Success! [Download RCA] [Resolved]
```

---

## 🛠️ Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Core 3-panel layout and basic navigation

**Tasks:**
1. ✅ Create workspace container component
2. ✅ Implement Context Navigator (left panel)
3. ✅ Implement Investigation Workspace (center panel)
4. ✅ Implement Intelligence Assistant (right panel)
5. ✅ Add keyboard navigation (J/K, Enter, ESC)
6. ✅ Responsive breakpoints (desktop/tablet/mobile)

**Deliverables:**
- `IntelligentWorkspace.tsx` - Main container
- `ContextNavigator.tsx` - Left panel with incident list
- `InvestigationWorkspace.tsx` - Center adaptive panel
- `IntelligenceAssistant.tsx` - Right panel with insights
- `workspace.css` - Layout styles

**Success Criteria:**
- ✓ 3-panel layout renders correctly
- ✓ Keyboard navigation works (J/K to navigate incidents)
- ✓ Responsive on mobile (single column with swipe)
- ✓ Panel widths adjust based on screen size

---

### Phase 2: Adaptive Layouts (Week 2-3)

**Goal:** Implement confidence-driven adaptive layouts

**Tasks:**
1. ✅ Create High Confidence layout component
2. ✅ Create Investigation Mode layout component
3. ✅ Implement confidence threshold logic (95% cutoff)
4. ✅ Add confidence visualization (gradient pills)
5. ✅ Build evidence summary cards
6. ✅ Build recommended fix cards

**Deliverables:**
- `HighConfidenceLayout.tsx`
- `InvestigationModeLayout.tsx`
- `ConfidencePill.tsx`
- `EvidenceSummaryCard.tsx`
- `RecommendedFixCard.tsx`

**Success Criteria:**
- ✓ Layout switches based on confidence level
- ✓ Confidence pill shows gradient correctly
- ✓ High confidence shows fix-first layout
- ✓ Low confidence shows evidence-first layout

---

### Phase 3: Intelligence Features (Week 3-4)

**Goal:** Implement unique intelligence features

**Tasks:**
1. ✅ Implement Incident Stories generator
2. ✅ Build Fix Success Predictor
3. ✅ Create Cluster Health Score widget
4. ✅ Add Pattern Matching display
5. ✅ Implement Related Incidents panel
6. ✅ Build Quick Actions buttons

**Deliverables:**
- `IncidentStory.tsx`
- `FixSuccessPredictor.tsx`
- `ClusterHealthScore.tsx`
- `PatternMatching.tsx`
- `RelatedIncidents.tsx`
- `QuickActions.tsx`

**Success Criteria:**
- ✓ Story generates human-readable narrative
- ✓ Success predictor shows ML-based probability
- ✓ Health score updates in real-time
- ✓ Related incidents link correctly

---

### Phase 4: Fix Workflow (Week 4-5)

**Goal:** Progressive disclosure fix workflow

**Tasks:**
1. ✅ Implement collapsible fix details
2. ✅ Add preview/diff viewer
3. ✅ Create inline execution progress
4. ✅ Build success/failure feedback
5. ✅ Add rollback capability
6. ✅ Implement feedback collection

**Deliverables:**
- `ProgressiveFixCard.tsx`
- `FixPreviewPanel.tsx`
- `InlineExecutionProgress.tsx`
- `FixResultFeedback.tsx`

**Success Criteria:**
- ✓ Fix expands/collapses smoothly
- ✓ Preview shows accurate diff
- ✓ Progress updates in real-time
- ✓ Success/failure states clear
- ✓ Feedback collected after completion

---

### Phase 5: Polish & Animation (Week 5-6)

**Goal:** Animations, transitions, and final polish

**Tasks:**
1. ✅ Add intelligence pulse animation
2. ✅ Implement smooth transitions
3. ✅ Add loading skeletons
4. ✅ Improve accessibility (ARIA labels)
5. ✅ Mobile swipe gestures
6. ✅ Dark mode support

**Deliverables:**
- `animations.css`
- `LoadingSkeletons.tsx`
- `accessibility-utils.ts`
- `mobile-gestures.ts`

**Success Criteria:**
- ✓ Animations smooth (60fps)
- ✓ Loading states non-blocking
- ✓ ARIA labels complete
- ✓ Swipe gestures work on mobile
- ✓ Dark mode fully supported

---

### Phase 6: Advanced Features (Week 6-7)

**Goal:** Gamification, team intelligence, achievements

**Tasks:**
1. ✅ Implement team statistics
2. ✅ Add achievements system
3. ✅ Build learning progress dashboard
4. ✅ Create timeline scrubbing
5. ✅ Add RCA PDF export
6. ✅ Implement sharing features

**Deliverables:**
- `TeamIntelligence.tsx`
- `AchievementsPanel.tsx`
- `LearningDashboard.tsx`
- `TimelineScrubber.tsx`
- `RCAExporter.ts`

**Success Criteria:**
- ✓ Team stats show collective learning
- ✓ Achievements unlock appropriately
- ✓ Timeline scrubbing is smooth
- ✓ RCA PDF generates correctly

---

## 🏗️ Technical Architecture

### Component Hierarchy

```
IntelligentWorkspace/
├── WorkspaceHeader
│   ├── LiveMonitoringStatus
│   ├── ClusterHealthIndicator
│   └── WorkspaceControls
│
├── ThreePanelLayout
│   ├── ContextNavigator (20%)
│   │   ├── FilterChips
│   │   ├── IncidentMiniCard[]
│   │   └── LoadMoreButton
│   │
│   ├── InvestigationWorkspace (60%)
│   │   ├── IncidentHeader
│   │   ├── AdaptiveLayout
│   │   │   ├── HighConfidenceLayout (if confidence ≥ 95%)
│   │   │   │   ├── ConfidentDiagnosisCard
│   │   │   │   ├── RecommendedFixCard
│   │   │   │   ├── CollapsibleEvidence
│   │   │   │   └── CollapsibleTimeline
│   │   │   │
│   │   │   └── InvestigationModeLayout (if confidence < 95%)
│   │   │       ├── InvestigationAlert
│   │   │       ├── EvidenceSummaryCard
│   │   │       ├── PossibleCausesCard
│   │   │       └── NextStepsCard
│   │   │
│   │   └── ActionFooter
│   │
│   └── IntelligenceAssistant (20%)
│       ├── InsightsPanel
│       ├── RelatedIncidentsPanel
│       ├── QuickActionsPanel
│       ├── LearningProgressPanel
│       └── ClusterHealthScore
│
└── KeyboardShortcutsOverlay
```

### State Management

```typescript
// Workspace state
interface WorkspaceState {
  currentIncidentId: string | null;
  selectedIncidents: string[];
  filterState: FilterState;
  layoutMode: 'high-confidence' | 'investigation';
  panelVisibility: {
    contextNavigator: boolean;
    intelligenceAssistant: boolean;
  };
  expandedSections: Set<string>;
}

// Filter state
interface FilterState {
  severity: Severity[];
  pattern: FailurePattern[];
  namespace: string[];
  status: IncidentStatus[];
}

// Intelligence state
interface IntelligenceState {
  insights: Insight[];
  relatedIncidents: Incident[];
  patterns: DetectedPattern[];
  clusterHealth: HealthScore;
  learningProgress: LearningProgress;
}
```

### Data Flow

```
API Layer
    ↓
Incident Store
    ↓
Workspace Container
    ├─→ Context Navigator (read-only)
    ├─→ Investigation Workspace (read/write)
    └─→ Intelligence Assistant (read-only + actions)
```

### Performance Optimizations

1. **Lazy Loading:**
   - Load incident details only when selected
   - Load evidence/logs on first expand
   - Load related incidents in background

2. **Virtualization:**
   - Context Navigator uses virtual scrolling for 1000+ incidents
   - Timeline uses windowing for efficient rendering

3. **Caching:**
   - Cache incident stories (5 min TTL)
   - Cache success predictions (10 min TTL)
   - Cache cluster health (1 min TTL)

4. **Debouncing:**
   - Filter changes debounced (300ms)
   - Search queries debounced (500ms)
   - Scroll events throttled (16ms)

---

## 📱 Mobile Adaptation

### Swipeable Incident Cards

```
┌─────────────────────────────┐
│  🔴 #1 CRITICAL            │
│  nginx-deployment-abc123    │
│  ─────────────────────────  │
│  ✅ We know what's wrong    │
│  OOMKilled (exit 137)       │
│  ████████████████░░ 95%     │
│                             │
│  🔧 Quick Fix Available     │
│  Increase Memory → 1Gi      │
│                             │
│  [Tap: Details]  [Apply →] │
└─────────────────────────────┘

← Swipe right: Previous incident
→ Swipe left: Next incident
↑ Swipe up: Quick actions menu
```

### Mobile Gestures

- **Swipe Left/Right:** Navigate between incidents
- **Swipe Up:** Show quick actions menu
- **Long Press:** Context menu
- **Pull Down:** Refresh scan
- **Pinch Zoom:** Zoom timeline

---

## ⌨️ Keyboard Shortcuts

### Navigation
- `J` / `↓` - Next incident
- `K` / `↑` - Previous incident
- `Enter` - Select incident
- `ESC` - Close/back
- `?` - Show keyboard shortcuts help

### Actions
- `E` - Focus evidence section
- `F` - Focus fix section
- `T` - Focus timeline
- `L` - Focus logs
- `A` - Apply recommended fix (with confirmation)
- `D` - Download RCA
- `R` - Mark resolved

### Panels
- `Cmd/Ctrl + [` - Toggle context navigator
- `Cmd/Ctrl + ]` - Toggle intelligence assistant
- `Cmd/Ctrl + \` - Toggle both panels

---

## ♿ Accessibility

### ARIA Implementation

```tsx
<div
  role="region"
  aria-label="Incident Investigation Workspace"
  aria-live="polite"
>
  <nav
    role="navigation"
    aria-label="Incident list"
  >
    <button
      role="button"
      aria-selected={isSelected}
      aria-label={`Incident ${id}: ${title}, ${severity} severity, ${confidence}% confidence`}
    >
      {/* Incident mini card */}
    </button>
  </nav>

  <main role="main" aria-label="Incident details">
    {/* Investigation workspace */}
  </main>

  <aside role="complementary" aria-label="Intelligence insights">
    {/* Intelligence assistant */}
  </aside>
</div>
```

### Screen Reader Support

- Live regions for status updates
- Descriptive labels for all interactive elements
- Keyboard navigation announced correctly
- Progress bars have aria-valuenow/valuemin/valuemax

### Focus Management

- Focus trap within workspace
- Visible focus indicators
- Logical tab order
- Skip links for power users

---

## 🎯 Success Metrics

### User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to Diagnosis** | <30 seconds | Time from incident open to confidence level |
| **Time to Fix** | <2 minutes | Time from diagnosis to fix applied |
| **Keyboard Usage** | >60% | % of power users using keyboard shortcuts |
| **Mobile Engagement** | >40% | % of mobile sessions |
| **Panel Visibility** | >80% | % of sessions with Intelligence panel visible |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First Paint** | <100ms | Workspace initial render time |
| **Layout Switch** | <50ms | Time to switch between layouts |
| **Incident Load** | <200ms | Time to load incident details |
| **Smooth Animations** | 60fps | Frame rate during transitions |
| **Memory Usage** | <50MB | Additional memory for workspace |

### Learning Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Pattern Recognition** | >85% | % of incidents matched to patterns |
| **Fix Success Rate** | >95% | % of recommended fixes that work |
| **Prediction Accuracy** | >90% | ML prediction vs actual outcome |
| **Auto-fix Adoption** | >30% | % of incidents auto-remediated |

---

## 🔒 Security Considerations

1. **No External Calls:** All intelligence runs locally
2. **Data Privacy:** Incident data never leaves user's machine
3. **Safe Defaults:** Auto-remediation disabled by default
4. **Audit Trail:** All fix applications logged
5. **Rollback Capability:** Every fix has automatic rollback

---

## 📚 References

### Research Sources
- [Modal vs Drawer Best Practices](https://medium.com/@ninad.kotasthane/modal-vs-drawer-when-to-use-the-right-component-af0a76b952da)
- [Modal UX Design for SaaS 2026](https://userpilot.com/blog/modal-ux-design/)
- [Komodor Kubernetes Debugging](https://content.komodor.com/kubernetes-debugging)
- [PagerDuty Incident Workflows](https://www.pagerduty.com/resources/incident-management-response/learn/incident-management-workflows/)
- [Datadog Navigation Redesign](https://www.datadoghq.com/blog/datadog-navigation-redesign/)

### Design Inspiration
- Komodor: Timeline visualization, collaborative views
- PagerDuty: Multi-surface access, standardized workflows
- Datadog: Top-level quick access, consistent patterns
- Linear: Clean UI, keyboard-first design
- Notion: Adaptive layouts, progressive disclosure

---

## 📝 Notes

### Design Decisions

1. **Why 3-panel layout?**
   - Spatial memory: Users remember position
   - Context preservation: See list while investigating
   - Intelligence visibility: Make learning obvious

2. **Why adaptive layouts?**
   - Different confidence levels need different UX
   - High confidence → action-first
   - Low confidence → investigation-first

3. **Why no traditional tabs?**
   - All critical info visible without clicking
   - Progressive disclosure through expand/collapse
   - Faster than clicking through tabs

4. **Why 20-60-20 split?**
   - Center needs most space for details
   - Side panels provide context without overwhelming
   - Responsive: collapses to single column on mobile

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Create workspace container
- [ ] Implement Context Navigator
- [ ] Implement Investigation Workspace
- [ ] Implement Intelligence Assistant
- [ ] Add keyboard navigation
- [ ] Responsive breakpoints

### Phase 2: Adaptive Layouts
- [ ] High Confidence layout
- [ ] Investigation Mode layout
- [ ] Confidence visualization
- [ ] Evidence cards
- [ ] Fix cards

### Phase 3: Intelligence
- [ ] Incident Stories
- [ ] Fix Success Predictor
- [ ] Cluster Health Score
- [ ] Pattern Matching
- [ ] Related Incidents

### Phase 4: Fix Workflow
- [ ] Progressive disclosure
- [ ] Preview/diff viewer
- [ ] Inline execution
- [ ] Success/failure feedback
- [ ] Rollback capability

### Phase 5: Polish
- [ ] Animations
- [ ] Loading states
- [ ] Accessibility
- [ ] Mobile gestures
- [ ] Dark mode

### Phase 6: Advanced
- [ ] Team intelligence
- [ ] Achievements
- [ ] Timeline scrubbing
- [ ] RCA export
- [ ] Sharing

---

**Status:** Ready for implementation
**Next Steps:** Begin Phase 1 - Foundation
**Estimated Timeline:** 6-7 weeks for full implementation
