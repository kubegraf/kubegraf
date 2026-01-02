# How to Use Incident Learning & KnowledgeBank

## Quick Start Guide

### Step 1: View an Incident

1. **Navigate to Incidents Page**
   - Click on **"Incidents"** in the sidebar
   - Or use the quick switcher (Cmd+K / Ctrl+K) and type "incidents"

2. **Select an Incident**
   - Click on any incident row to open the detail modal
   - You'll see:
     - Root causes (ranked by confidence)
     - Recommended fixes
     - Evidence (logs, events, metrics)
     - Similar past incidents

---

### Step 2: Review the Diagnosis

The system shows:
- **Root Causes** - What likely caused the incident (with confidence scores)
- **Recommended Fixes** - Actions you can take
- **Similar Incidents** - Past incidents with similar patterns
- **Evidence** - Logs, events, and metrics that support the diagnosis

---

### Step 3: Apply a Fix (Optional)

1. **Review Recommended Fixes**
   - Click on the **"Runbooks"** tab in the incident modal
   - See available fixes for this type of incident

2. **Apply a Fix**
   - Click on a fix to preview it
   - Review the changes it will make
   - Apply it if appropriate

---

### Step 4: Provide Feedback

After resolving an incident, provide feedback to help the system learn:

#### Option A: Using IncidentModalV2 (Main Modal)

1. **Open Incident Modal**
   - Click on an incident in the incidents list
   - The modal opens with incident details

2. **Find Feedback Buttons**
   - Look at the bottom of the modal
   - You'll see three buttons:
     - **✅ Worked** - The fix/diagnosis was correct
     - **❌ Didn't Work** - The fix didn't resolve the issue
     - **⚠️ Incorrect Cause** - The root cause was wrong

3. **Click a Button**
   - Click the appropriate button
   - The button will show a loading state
   - Feedback is submitted to the learning system

#### Option B: Using KnowledgeBank Component

1. **Open Incident Details**
   - Click on an incident
   - Navigate to the **"Knowledge Bank"** section (if using IncidentDetailView)

2. **See Similar Incidents**
   - View past incidents with similar patterns
   - See which fixes worked before

3. **Provide Feedback**
   - Click one of the feedback buttons:
     - **✓ Fix Worked** - Green button
     - **✗ Didn't Work** - Red button
     - **Incorrect Cause** - Gray button

---

### Step 5: View Learning Status

1. **Go to Settings**
   - Click on **"Settings"** in the sidebar
   - Or use quick switcher (Cmd+K / Ctrl+K) → "settings"

2. **Find Incident Learning Section**
   - Scroll to the **"Incident Learning"** section
   - You'll see:
     - **Sample Size**: Number of feedback outcomes (starts at 0)
     - **Last Updated**: When learning was last updated
     - **Reset Learning** button

3. **Check Progress**
   - After providing feedback, refresh the page or navigate away and back
   - The **Sample Size** should increment (0 → 1 → 2, etc.)
   - **Last Updated** timestamp should update

---

## Detailed Usage Examples

### Example 1: Pod Crash Loop

1. **Incident Detected**
   - System detects: Pod `my-app-123` in CrashLoopBackOff
   - Root cause proposed: "Application Error" (confidence: 65%)

2. **Review Diagnosis**
   - System shows: High restart rate, exit code 1, error logs
   - Recommended fix: Restart pod or check application logs

3. **Apply Fix**
   - You restart the pod
   - Pod recovers

4. **Provide Feedback**
   - Click **✅ Worked**
   - System learns: Restart rate and exit codes are good indicators for this type of issue

5. **Next Time**
   - Similar incident occurs
   - System has higher confidence (67% instead of 65%)
   - "Application Error" ranked higher in root causes

### Example 2: OOM Killed Pod

1. **Incident Detected**
   - System detects: Pod killed due to OOM
   - Root cause proposed: "Resource Limits" (confidence: 70%)

2. **Review Diagnosis**
   - System shows: OOM events, memory pressure
   - Recommended fix: Increase memory limits

3. **Apply Fix**
   - You increase memory limits from 512Mi to 1Gi
   - Pod runs successfully

4. **Provide Feedback**
   - Click **✅ Worked**
   - System learns: OOM events are strong indicators for resource limit issues

5. **Next Time**
   - Similar OOM incident
   - System immediately suggests increasing memory limits
   - Higher confidence in "Resource Limits" cause

### Example 3: Wrong Diagnosis

1. **Incident Detected**
   - System proposes: "Configuration Error" (confidence: 60%)
   - But you know it's actually a network issue

2. **Provide Feedback**
   - Click **⚠️ Incorrect Cause**
   - System learns: Configuration signals were misleading for this pattern

3. **Next Time**
   - Similar incident
   - System reduces confidence in "Configuration Error" for this pattern
   - Other causes ranked higher

---

## Where to Find Features

### Feedback Buttons

**Location 1: IncidentModalV2 (Main Modal)**
- Open any incident from the incidents list
- Look at the bottom of the modal
- Three buttons: ✅ Worked, ❌ Didn't Work, ⚠️ Incorrect Cause

**Location 2: KnowledgeBank Component**
- In IncidentDetailView (if used)
- "Knowledge Bank" section
- Shows similar incidents + feedback buttons

### Learning Status

**Location: Settings Page**
- Navigate to Settings
- Scroll to "Incident Learning" section
- View:
  - Sample Size (number of outcomes)
  - Last Updated timestamp
  - Reset Learning button

### Similar Incidents

**Location: Incident Modal**
- Click on an incident
- Go to **"🔗 Similar"** tab
- See past incidents with similar patterns
- Shows which fixes worked before

---

## Tips for Best Results

1. **Provide Consistent Feedback**
   - Always provide feedback after resolving incidents
   - More feedback = better learning

2. **Be Accurate**
   - Only click "✅ Worked" if the fix actually worked
   - Use "❌ Didn't Work" if the fix didn't help
   - Use "⚠️ Incorrect Cause" if the root cause was wrong

3. **Check Learning Status Regularly**
   - Go to Settings → Incident Learning
   - Verify sample size is increasing
   - More samples = better accuracy

4. **Reset if Needed**
   - If learning seems off, you can reset
   - Settings → Incident Learning → Reset Learning
   - This clears all learned weights and starts fresh

---

## Troubleshooting

### Sample Size Still Shows 0

**Possible Causes**:
1. No feedback provided yet
2. Database not initialized
3. Feedback not being submitted

**Solutions**:
1. Provide feedback on an incident (click ✅/❌/⚠️)
2. Check browser console for errors
3. Verify backend is running
4. Check database exists: `~/.kubegraf/intelligence/knowledge.db`

### Feedback Buttons Not Working

**Check**:
1. Browser console for errors
2. Network tab - is the API call being made?
3. Backend logs - is the request received?
4. Make sure incident is selected

### Learning Not Improving

**Tips**:
1. Provide more feedback (aim for 10+ outcomes)
2. Be consistent with feedback
3. Check Settings → Learning Status to see if weights are updating
4. Reset learning if needed and start fresh

---

## Visual Guide

### Incident Modal Layout

```
┌─────────────────────────────────────┐
│  Incident: Pod Crash Loop          │
├─────────────────────────────────────┤
│  Root Causes:                       │
│  1. Application Error (65%)          │
│  2. Resource Limits (45%)           │
│                                     │
│  [📦 Evidence] [📝 Logs] [📈 Metrics]│
│                                     │
│  Recommended Fix: Restart Pod       │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │✅ Worked│ │❌ Didn't│ │⚠️ Wrong ││
│  └─────────┘ └─────────┘ └─────────┘│
└─────────────────────────────────────┘
```

### Settings Page Layout

```
┌─────────────────────────────────────┐
│  Settings → Incident Learning       │
├─────────────────────────────────────┤
│  Learning Status                    │
│                                     │
│  Sample Size: 5 outcomes            │
│  Last Updated: 02/01/2026, 14:38:53│
│                                     │
│  [Reset Learning]                   │
└─────────────────────────────────────┘
```

---

## API Usage (For Developers)

### Submit Feedback via API

```bash
curl -X POST http://localhost:3003/api/v2/incidents/{incident-id}/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "outcome": "worked",
    "appliedFixId": "fix-123",
    "appliedFixType": "restart",
    "notes": "Restart fixed the issue"
  }'
```

### Get Learning Status

```bash
curl http://localhost:3003/api/v2/learning/status
```

### Reset Learning

```bash
curl -X POST http://localhost:3003/api/v2/learning/reset \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

---

## Summary

**To Use Incident Learning**:
1. View incidents → Click on an incident
2. Review diagnosis → See root causes and fixes
3. Apply fix (optional) → Use recommended fix
4. Provide feedback → Click ✅/❌/⚠️ button
5. Check status → Settings → Incident Learning → See sample size increase

**The system learns automatically** - just provide feedback and it gets better over time!

