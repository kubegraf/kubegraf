# On-Device Learning Loop - UI Features Guide

## Where to Find the New Features

### 1. Incident Feedback Buttons (Main Feature)

**Location:** Incident Details Modal

**How to Access:**
1. Navigate to **Incidents** page: `http://localhost:3003/incidents`
2. Click on any incident card or click **"View Details"** button
3. The incident details modal will open on the right side
4. **Scroll down to the bottom** of the modal
5. You'll see **3 feedback buttons** in the footer:
   - ✅ **Worked** - Click if the fix/diagnosis was correct
   - ❌ **Didn't Work** - Click if the fix didn't resolve the issue
   - ⚠️ **Incorrect Cause** - Click if the root cause was wrong

**What Happens:**
- When you click a button, it shows a loading state (⏳)
- After submission, you'll see a message like:
  - "Learning updated: weights: logs increased, events increased; 'oom' prior increased"
  - Or: "Learning updated locally"
- The message auto-dismisses after 5 seconds

### 2. Learning Status & Reset (Settings Page)

**Location:** Settings Page

**How to Access:**
1. Click on **Settings** in the navigation menu (gear icon) or go to: `http://localhost:3003/settings`
2. Scroll down to find the **"AI & ML Features"** section
3. Look for **"Incident Learning"** card

**What You'll See:**
- **Sample Size:** Number of feedback outcomes collected
- **Last Updated:** Timestamp of most recent learning update
- Information banner explaining how learning works
- **"Reset Learning"** button (red button at the bottom)

**Reset Learning:**
- Click the "Reset Learning" button
- A confirmation dialog will appear
- Click "OK" to reset all learned weights/priors to defaults
- You'll see a success notification

## How to Test from the App UI

### Test 1: Submit Feedback on an Incident

**Steps:**
1. Go to **Incidents** page: `http://localhost:3003/incidents`
2. Wait for incidents to load (or create a test incident if none exist)
3. Click **"View Details"** on any incident
4. Scroll to the bottom of the modal
5. Click **✅ Worked** button
6. **Observe:**
   - Button shows loading state (⏳)
   - Message appears: "Learning updated: weights: logs increased, events increased; 'app_crash' prior increased"
   - Message disappears after 5 seconds

**Expected Result:**
- Success message with explanation of what changed
- Learning weights/priors updated in database
- Next incident with similar patterns will use updated weights

### Test 2: Check Learning Status

**Steps:**
1. Go to **Settings** page: `http://localhost:3003/settings`
2. Scroll to **"AI & ML Features"** section
3. Find **"Incident Learning"** card
4. **Observe:**
   - Sample Size should increase after submitting feedback
   - Last Updated timestamp should change
   - Current weights and priors displayed

**Expected Result:**
- Sample Size: Shows number of feedback submissions
- Last Updated: Shows when you last submitted feedback
- Status reflects current learning state

### Test 3: Submit Multiple Feedback Types

**Steps:**
1. Go to **Incidents** page
2. Open an incident modal
3. Click **✅ Worked** - observe message
4. Open a different incident
5. Click **❌ Didn't Work** - observe different message
6. Open another incident
7. Click **⚠️ Incorrect Cause** - observe message

**Expected Results:**
- Each button produces different learning updates
- "Worked" → increases weights/priors
- "Didn't Work" → decreases weights/priors
- "Incorrect Cause" → updates priors for wrong cause

### Test 4: Verify Learning Improves Over Time

**Steps:**
1. Submit feedback on 3-5 incidents with similar patterns
2. All click **✅ Worked** for incidents with "OOM" cause
3. Go to **Settings** → **Incident Learning**
4. Check the priors - "oom" prior should be higher than others
5. Create/view a new incident with OOM pattern
6. **Observe:** The OOM cause should rank higher in root causes list

**Expected Result:**
- Learned priors affect root cause ranking
- Frequently "worked" causes rank higher
- Confidence scores adjust based on learned weights

### Test 5: Reset Learning

**Steps:**
1. Submit some feedback (to have learning data)
2. Go to **Settings** → **Incident Learning**
3. Note the current Sample Size and weights
4. Click **"Reset Learning"** button
5. Confirm in the dialog
6. **Observe:**
   - Success notification: "Learning reset successfully"
   - Sample Size resets (or stays same, but weights reset)
   - Weights return to defaults (logs=0.4, events=0.3, etc.)

**Expected Result:**
- All weights reset to defaults
- All priors reset to 0.25
- Learning starts fresh

## Visual Indicators

### In Incident Modal:
```
┌─────────────────────────────────┐
│  Incident Details               │
│  ...                            │
│  [Diagnosis]                    │
│  [Root Causes]                  │
│  [Evidence]                     │
│                                 │
│  ───────────────────────────   │
│  Footer:                        │
│  [✅ Worked] [❌ Didn't Work]   │
│  [⚠️ Incorrect Cause]            │
│  "Learning updated: ..."        │
└─────────────────────────────────┘
```

### In Settings Page:
```
┌─────────────────────────────────┐
│  AI & ML Features               │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Incident Learning          │ │
│  │                            │ │
│  │ Sample Size: 5             │ │
│  │ Last Updated: 2 min ago    │ │
│  │                            │ │
│  │ [Information banner]       │ │
│  │                            │ │
│  │ [Reset Learning] (red)    │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

## API Endpoints (For Direct Testing)

You can also test directly via API:

### 1. Submit Feedback
```bash
curl -X POST http://localhost:3003/api/v2/incidents/{incident-id}/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "outcome": "worked",
    "notes": "Fix worked perfectly"
  }'
```

### 2. Get Learning Status
```bash
curl http://localhost:3003/api/v2/learning/status
```

### 3. Reset Learning
```bash
curl -X POST http://localhost:3003/api/v2/learning/reset \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

## Troubleshooting

**If you don't see feedback buttons:**
- Make sure you're viewing an incident in the modal (not just the list)
- Scroll to the very bottom of the modal
- Check browser console for errors

**If feedback doesn't work:**
- Check browser console for API errors
- Verify server is running: `http://localhost:3003/api/status`
- Check server logs: `tail -f kubegraf.log`

**If learning status doesn't update:**
- Refresh the Settings page
- Check that feedback was successfully submitted
- Verify database exists: `~/.kubegraf/incidents/knowledge.db`

