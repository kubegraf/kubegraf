# 🎨 What You'll See in the App UI - New Features

## 🚀 After Restarting the App

### 1. **Incident Modal - New Sections at Top**

When you open any incident, you'll immediately see **two new sections** at the top:

#### **A. "Recommended First Action" Box** (Blue Highlighted)
- **Location**: Top of modal, above evidence tabs
- **Appearance**: Blue border, light blue background
- **Content**: 
  - Title: "Recommended First Action"
  - Description of what to investigate
  - Bulleted list of read-only actions:
    - "Fetch last restart logs"
    - "Describe pod to see restart reasons"
    - "Check recent events for restart triggers"
    - "Review resource usage metrics"

#### **B. "Suggested Fixes" Section** (New!)
- **Location**: Right below "Recommended First Action"
- **Appearance**: Card-based layout with up to 3 fix cards
- **Each Fix Card Shows**:
  - **Title**: e.g., "Rollback Deployment (Restart Storm)"
  - **Risk Badge**: Color-coded (🟢 Low, 🟡 Medium, 🔴 High)
  - **Confidence Badge**: e.g., "75% confidence"
  - **Description**: What the fix does
  - **Evidence Chips**: Small clickable tags like:
    - `event: abc123...`
    - `log: def456...`
    - `metric: ghi789...`
  - **Preview Button**: Blue button (primary)
  - **Apply Button**: Red button (secondary, disabled until previewed)

### 2. **Fix Preview Feature** (Interactive)

**When you click "Preview Fix"**:
- Button changes to "Previewing..." (loading state)
- A preview box appears in the fix card showing:
  - **Diff Section**: Unified diff format showing what will change
  - **Commands Section**: kubectl commands that will be executed
  - **Dry-Run Result** (if successful): Green box with checkmark showing:
    - "✓ Dry-Run Result:"
    - Actual Kubernetes API validation output
    - List of changes that would be made
  - **Dry-Run Error** (if failed): Red box with X showing:
    - "✗ Dry-Run Error:"
    - Validation error message
- Preview button changes to "Previewed" (grayed out)
- Apply button becomes **enabled** (red, clickable)

### 3. **Evidence Chips - Click to Scroll** (Interactive)

**When you click any evidence chip** (e.g., `event: abc123...`):
- Smooth scroll animation to the Evidence tab
- Evidence tab opens automatically
- The specific evidence item is highlighted with blue background
- Highlight fades after 2 seconds
- **Hover effect**: Chips change color when you hover over them

### 4. **Confirmation Dialog** (New Modal)

**When you click "Apply Fix"**:
- A modal dialog appears with:
  - **Title**: "Confirm Fix Application"
  - **Fix Name**: The title of the fix you're applying
  - **Risk Level**: Color-coded badge (High/Medium/Low)
  - **Confidence**: Percentage
  - **"Why this fix"**: Explanation text
  - **Checkbox**: "I understand this will change cluster state"
  - **For High-Risk Fixes**: Additional checkbox for acknowledgment
  - **Buttons**: Cancel (gray) and Apply Fix (red, disabled until checked)

**After confirming**:
- Apply button shows "Applying..." state
- Success message appears with execution ID
- Optional post-check runs after 5 seconds
- Snapshot and fixes reload automatically

### 5. **Feedback Buttons** (Enhanced)

**At the bottom of incident modal**:
- **✅ Worked** button (green) - Click to indicate fix worked
- **❌ Didn't Work** button (red) - Click to indicate fix didn't work
- **⚠️ Root cause incorrect** button (yellow) - Click to indicate wrong diagnosis

**What happens**:
- Button shows loading state (⏳)
- Calls learning API
- Shows message: "Learning updated locally"
- Displays summary of what changed (e.g., "Updated weights for signal.logs")

### 6. **Performance Drawer** (Settings)

**Location**: Settings → Advanced → Performance Instrumentation

**What you'll see**:
- **Performance Summary Table**:
  - Route (e.g., `/api/v2/incidents/{id}/snapshot`)
  - Method (GET, POST)
  - Request count
  - **p50, p90, p99** latencies (milliseconds)
  - Cache hit rate (%)
  - Status indicators (🟢 green if p90 < 300ms, 🟡 yellow if 300-500ms, 🔴 red if > 500ms)

- **Recent Spans Table** (for debugging):
  - Last 200 requests
  - Request ID, route, method, duration
  - Cache hit status
  - Timestamp

- **Clear Button**: Resets all metrics

## 🎯 Visual Examples

### Fix Card Appearance:
```
┌─────────────────────────────────────────────┐
│ Rollback Deployment (Restart Storm)         │
│ [HIGH] [75% confidence]                     │
│                                             │
│ Rollback deployment to previous revision   │
│ if a recent change caused the restart storm.│
│                                             │
│ [event: abc123...] [log: def456...]         │
│                                             │
│ [Preview Fix] [Apply Fix] (disabled)       │
└─────────────────────────────────────────────┘
```

### After Preview:
```
┌─────────────────────────────────────────────┐
│ ... (same as above) ...                     │
│                                             │
│ ┌─ Preview ────────────────────────────┐  │
│ │ --- a/deployment.yaml                │  │
│ │ +++ b/deployment.yaml                │  │
│ │ @@ -10,7 +10,7 @@                     │  │
│ │ -  replicas: 2                        │  │
│ │ +  replicas: 1                        │  │
│ └───────────────────────────────────────┘  │
│                                             │
│ ┌─ ✓ Dry-Run Result ───────────────────┐  │
│ │ Dry-run succeeded: Fix can be applied│  │
│ │ Changes: Rollback to revision 3      │  │
│ └───────────────────────────────────────┘  │
│                                             │
│ [Previewed] [Apply Fix] (enabled)          │
└─────────────────────────────────────────────┘
```

## 📍 Where to Find Everything

1. **Open an Incident**:
   - Navigate to **Incidents** page (left sidebar)
   - Click any incident in the list
   - **New sections appear at the top** of the modal

2. **Try Previewing a Fix**:
   - Scroll to **"Suggested Fixes"** section
   - Click **"Preview Fix"** on any fix card
   - Review the diff, commands, and dry-run result
   - Click **"Apply Fix"** if you want to proceed

3. **Click Evidence Chips**:
   - In any fix card, click an evidence chip
   - Watch it scroll to the evidence section
   - See the evidence highlighted

4. **View Performance Metrics**:
   - Click **Settings** (gear icon, top right)
   - Click **"Advanced"** section
   - Click **"Performance Instrumentation"**
   - View the metrics table

5. **Give Feedback**:
   - Scroll to bottom of incident modal
   - Click **✅ Worked**, **❌ Didn't Work**, or **⚠️ Root cause incorrect**
   - See the learning update message

## 🔄 Before vs. After

**Before**:
- Only incident details and evidence tabs
- No fix suggestions
- No preview capability
- No performance metrics visible

**Now**:
- ✅ Recommended actions at the top
- ✅ Up to 3 suggested fixes per incident
- ✅ Preview fixes with actual dry-run validation
- ✅ Evidence chips that scroll to evidence
- ✅ Performance metrics in Settings
- ✅ ML learning from feedback

## 🎨 Color Guide

- **Risk Levels**:
  - 🟢 **Low**: Green (#28a745)
  - 🟡 **Medium**: Yellow (#ffc107)
  - 🔴 **High**: Red (#dc3545)

- **Confidence**:
  - 🟢 **High (≥80%)**: Green background
  - 🟡 **Medium (50-79%)**: Yellow background
  - 🔴 **Low (<50%)**: Red background

- **Dry-Run Results**:
  - 🟢 **Success**: Green box with checkmark
  - 🔴 **Error**: Red box with X mark

