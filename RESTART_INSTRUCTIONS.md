# Restart Instructions

## ✅ Build Complete

Both frontend and backend have been rebuilt:

1. **Frontend (Solid.js)**: Built to `ui/solid/dist/`
2. **Frontend copied**: `ui/solid/dist/` → `web/dist/`
3. **Backend (Go)**: Built to `./kubegraf`

## 🚀 How to Restart

### Option 1: Stop and Restart (Recommended)

```bash
# Stop the current kubegraf process (if running)
# Find the process:
ps aux | grep kubegraf

# Kill it (replace PID with actual process ID):
kill <PID>

# Or if running in foreground, press Ctrl+C

# Start the new build:
./kubegraf
```

### Option 2: Restart with Port Check

```bash
# Kill any process on port 3003 (default KubeGraf port)
lsof -ti:3003 | xargs kill -9

# Start the new build:
./kubegraf
```

### Option 3: Development Mode (Separate Frontend/Backend)

If you want to run frontend and backend separately:

**Terminal 1 (Backend)**:
```bash
./kubegraf
```

**Terminal 2 (Frontend)**:
```bash
cd ui/solid
npm run dev
```

Then access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3003

## 🎯 What You'll See After Restart

### New Features in Incident Modal:

1. **"Recommended First Action"** section at the top
   - Blue highlighted box
   - Lists read-only investigation steps

2. **"Suggested Fixes"** section
   - Up to 3 fix cards
   - Each with risk badge, confidence, evidence chips
   - Preview and Apply buttons

3. **Fix Preview**
   - Click "Preview Fix" to see:
     - Diff showing what will change
     - kubectl commands
     - Actual dry-run validation results

4. **Evidence Chips**
   - Click any evidence chip to scroll to that evidence
   - Smooth scroll with highlighting

5. **Confirmation Dialog**
   - Appears when clicking "Apply Fix"
   - Requires checkbox confirmation
   - Shows risk level and confidence

6. **Feedback Buttons**
   - ✅ Worked
   - ❌ Didn't Work  
   - ⚠️ Root cause incorrect
   - Updates ML learning system

### New Features in Settings:

7. **Performance Drawer**
   - Settings → Advanced → Performance Instrumentation
   - Shows p50/p90/p99 latencies
   - Cache hit rates
   - Recent request spans

## 🔍 Testing the New Features

1. **Open an Incident**:
   - Go to Incidents page
   - Click any incident
   - Look for "Recommended First Action" and "Suggested Fixes" sections

2. **Preview a Fix**:
   - Click "Preview Fix" on any fix card
   - Review the diff and commands
   - Check dry-run validation result

3. **View Performance**:
   - Go to Settings → Advanced
   - Click "Performance Instrumentation"
   - View metrics table

4. **Give Feedback**:
   - At bottom of incident modal
   - Click any feedback button
   - See "Learning updated locally" message

## 📝 Notes

- The Go binary embeds `web/dist/` at build time
- If you make UI changes, rebuild frontend and copy to `web/dist/`, then rebuild Go
- Performance metrics are in-memory only (cleared on restart)
- ML learning data persists in SQLite (Knowledge Bank)

