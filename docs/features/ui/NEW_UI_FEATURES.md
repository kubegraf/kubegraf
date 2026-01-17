# New UI Features You'll See in the App

## 🎯 New Features in Incident Modal

### 1. **Recommended First Action** (New Section)
- **Location**: Top of incident modal, above evidence tabs
- **What you'll see**: 
  - A highlighted box with blue border
  - Title: "Recommended First Action"
  - Description of what to investigate first
  - List of read-only actions (e.g., "Fetch last restart logs", "Check Kubernetes events")
- **Example**: For RESTART_STORM incidents, you'll see actions like:
  - Fetch last restart logs
  - Describe pod to see restart reasons
  - Check recent events for restart triggers
  - Review resource usage metrics

### 2. **Suggested Fixes Section** (New Section)
- **Location**: Below "Recommended First Action", above evidence tabs
- **What you'll see**:
  - Section title: "Suggested Fixes"
  - Up to 3 fix cards, each showing:
    - **Title**: e.g., "Rollback Deployment (Restart Storm)"
    - **Risk Badge**: Color-coded (🟢 Low, 🟡 Medium, 🔴 High)
    - **Confidence**: Percentage badge (e.g., "75% confidence")
    - **Description**: What the fix does
    - **Evidence Chips**: Clickable tags showing evidence types (event, log, change, metric)
    - **Preview Button**: Blue primary button to preview the fix
    - **Apply Button**: Red secondary button (disabled until previewed)

### 3. **Fix Preview** (New Feature)
- **When**: After clicking "Preview Fix" button
- **What you'll see**:
  - A preview box appears in the fix card showing:
    - **Diff**: Unified diff format showing what will change
    - **Commands**: kubectl commands that will be executed
    - **Dry-Run Result**: Green box showing actual Kubernetes validation result (if successful)
    - **Dry-Run Error**: Red box showing validation errors (if any)
  - Preview button changes to "Previewed" state
  - Apply button becomes enabled

### 4. **Evidence Chips with Click-to-Scroll** (Enhanced)
- **Location**: In each fix card
- **What you'll see**:
  - Small clickable chips showing evidence type and ID
  - Hover effect: Chips highlight when you hover
- **What happens when clicked**:
  - Opens the Evidence tab
  - Scrolls to the specific evidence item
  - Highlights the evidence element for 2 seconds (blue background)

### 5. **Confirmation Dialog** (New Feature)
- **When**: After clicking "Apply Fix" button
- **What you'll see**:
  - Modal dialog with:
    - Fix title and description
    - Risk level (color-coded)
    - Confidence percentage
    - "Why this fix" explanation
    - Checkbox: "I understand this will change cluster state"
    - For high-risk fixes: Additional checkbox for acknowledgment
    - Cancel and Apply buttons
  - Apply button is disabled until checkbox is checked

### 6. **Feedback Buttons** (Enhanced)
- **Location**: Footer of incident modal
- **What you'll see**:
  - ✅ **Worked** button - Green
  - ❌ **Didn't Work** button - Red
  - ⚠️ **Root cause incorrect** button - Yellow
- **What happens**: 
  - Clicking updates the ML learning system
  - Shows "Learning updated locally" message
  - Displays summary of what changed (e.g., "Updated weights for signal.logs")

### 7. **Performance Drawer** (New Feature)
- **Location**: Settings → Advanced → Performance Instrumentation
- **What you'll see**:
  - Performance metrics table showing:
    - Route (e.g., `/api/v2/incidents/{id}/snapshot`)
    - Method (GET, POST)
    - Request count
    - p50, p90, p99 latencies (in milliseconds)
    - Cache hit rate (percentage)
    - Status indicators (green/yellow/red based on SLO thresholds)
  - Recent spans table (last 200 requests) for debugging
  - Clear button to reset metrics

## 🎨 Visual Changes

### Color Coding
- **Risk Levels**:
  - Low: Green badge (#28a745)
  - Medium: Yellow badge (#ffc107)
  - High: Red badge (#dc3545)

- **Confidence**:
  - High (≥80%): Green background
  - Medium (50-79%): Yellow background
  - Low (<50%): Red background

- **Dry-Run Results**:
  - Success: Green box with checkmark
  - Error: Red box with X mark

### Interactive Elements
- **Hover Effects**: Evidence chips highlight on hover
- **Button States**: 
  - Preview: Changes from blue to gray when previewed
  - Apply: Disabled (gray) until previewed, then red when enabled
- **Smooth Scrolling**: When clicking evidence chips, smooth scroll animation

## 📍 Where to Find Everything

1. **Open an Incident**: 
   - Go to Incidents page
   - Click on any incident
   - Modal opens with new sections at the top

2. **Try a Fix**:
   - Scroll to "Suggested Fixes" section
   - Click "Preview Fix" on any fix card
   - Review the preview (diff, commands, dry-run result)
   - Click "Apply Fix" (if you want to apply it)
   - Confirm in the dialog

3. **View Performance**:
   - Go to Settings (gear icon)
   - Click "Advanced" section
   - Click "Performance Instrumentation"
   - View metrics and recent spans

4. **Give Feedback**:
   - At the bottom of incident modal
   - Click ✅ Worked, ❌ Didn't Work, or ⚠️ Root cause incorrect
   - See learning update message

## 🚀 What's New vs. Before

**Before**: 
- Only incident details and evidence tabs
- No fix suggestions
- No preview capability
- No performance metrics

**Now**:
- ✅ Recommended actions at the top
- ✅ Up to 3 suggested fixes per incident
- ✅ Preview fixes before applying
- ✅ Actual dry-run validation
- ✅ Evidence chips that scroll to evidence
- ✅ Performance metrics in Settings
- ✅ ML learning from feedback

