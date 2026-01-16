# Incident Learning Quick Reference

## Quick Start

### How to Use
1. **View Incident** → Go to Incidents page, click an incident
2. **Apply Fix** (optional) → Use recommended fix if needed
3. **Provide Feedback** → Click one of:
   - ✅ **Worked** - Fix/diagnosis was correct
   - ❌ **Didn't Work** - Fix didn't resolve issue
   - ⚠️ **Incorrect Cause** - Root cause was wrong
4. **Check Status** → Settings → Incident Learning → See sample size increase

### Where to Find
- **Feedback Buttons**: Incident detail modal, KnowledgeBank component
- **Learning Status**: Settings → Incident Learning section
- **Reset Learning**: Settings → Incident Learning → Reset Learning button

---

## How It Works (Simple)

### Learning Process
```
User Feedback → Update Weights → Better Diagnosis Next Time
```

1. **System proposes** root cause with confidence score
2. **You provide feedback** (✅/❌/⚠️)
3. **System learns**:
   - ✅ Worked → Strengthens correct signals
   - ❌ Didn't Work → Weakens incorrect signals
   - ⚠️ Incorrect Cause → Adjusts cause probabilities
4. **Next similar incident** → More accurate diagnosis

### What Gets Learned
- **Feature Weights**: How important each signal is (restart rate, OOM events, etc.)
- **Cause Priors**: Base probabilities for root causes
- **Pattern Matching**: Which incidents are similar

---

## KnowledgeBank Overview

### What It Stores
- **Incidents**: All detected incidents with evidence
- **Outcomes**: Your feedback on incidents
- **Weights**: Learned importance of features
- **Priors**: Base probabilities for causes
- **Fixes**: Fix execution history

### Database Location
```
~/.kubegraf/intelligence/knowledge.db
```

### Key Tables
- `incidents` - Historical incident records
- `incident_outcomes` - Your feedback (sample size comes from here)
- `feature_weights` - Learned feature importance
- `cause_priors` - Learned cause probabilities

### Operations
- **Store Incident**: When incident detected
- **Find Similar**: Match by fingerprint hash
- **Record Outcome**: When you provide feedback
- **Get Status**: Count outcomes, get weights/priors

---

## Architecture

```
IntelligenceSystem
├── KnowledgeBank (SQLite)
│   ├── incidents table
│   ├── incident_outcomes table
│   ├── feature_weights table
│   └── cause_priors table
│
├── ConfidenceLearner
│   ├── ExtractFeatures() - Get signals from incident
│   ├── RecordOutcome() - Learn from feedback
│   └── GetLearningStatus() - Get stats
│
└── LearningEngine
    ├── Pattern clustering
    └── Anomaly detection
```

---

## API Endpoints

### Submit Feedback
```bash
POST /api/v2/incidents/{id}/feedback
Body: { "outcome": "worked" | "not_worked" | "unknown" }
```

### Get Status
```bash
GET /api/v2/learning/status
Response: { "sampleSize": 5, "lastUpdated": "...", ... }
```

### Reset Learning
```bash
POST /api/v2/learning/reset
Body: { "confirm": true }
```

---

## Troubleshooting

### Sample Size = 0?
- **Cause**: No feedback provided yet OR database issue
- **Fix**: Provide feedback on an incident, check database exists

### Learning Not Working?
- Check sample size is increasing
- Verify feedback buttons are working
- Check database file exists: `~/.kubegraf/intelligence/knowledge.db`

---

## Key Concepts

| Term | Meaning |
|------|---------|
| **Feature** | A signal from incident (restart rate, OOM event, etc.) |
| **Weight** | How important a feature is (0.05 to 0.7) |
| **Prior** | Base probability for a root cause |
| **Confidence** | Calculated score = Σ(feature × weight) + prior |
| **Fingerprint** | Hash of incident characteristics (for matching) |
| **Outcome** | Your feedback: "worked", "not_worked", "unknown" |

---

For detailed information, see [INCIDENT_LEARNING_GUIDE.md](./INCIDENT_LEARNING_GUIDE.md)

