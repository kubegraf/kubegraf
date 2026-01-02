# Incident Learning & KnowledgeBank Guide

## Table of Contents
1. [Overview](#overview)
2. [How to Use Incident Learning](#how-to-use-incident-learning)
3. [How Incident Learning Works](#how-incident-learning-works)
4. [How KnowledgeBank Works](#how-knowledgebank-works)
5. [Architecture & Data Flow](#architecture--data-flow)
6. [Database Schema](#database-schema)

---

## Overview

**Incident Learning** is an on-device machine learning system that improves incident diagnosis accuracy over time by learning from your feedback. All learning happens locally - no data is sent to external servers.

**KnowledgeBank** is the SQLite-based storage system that persists:
- Incident records and patterns
- User feedback and outcomes
- Feature weights and cause priors (for learning)
- Fix execution history
- Similar incident matching data

---

## How to Use Incident Learning

### Step 1: View an Incident
1. Navigate to **Incidents** page
2. Click on any incident to view details
3. The system shows:
   - **Root Causes** (ranked by confidence)
   - **Recommended Fixes**
   - **Similar Past Incidents** (from KnowledgeBank)

### Step 2: Apply a Fix (Optional)
1. Review the recommended fixes
2. Apply a fix if needed
3. The system tracks which fix was applied

### Step 3: Provide Feedback
After resolving an incident, provide feedback using one of three buttons:

- **✅ Worked** - The fix/diagnosis was correct
  - Increases confidence in the proposed root cause
  - Strengthens feature weights that supported this diagnosis
  - Improves ranking for similar incidents in the future

- **❌ Didn't Work** - The fix didn't resolve the issue
  - Decreases confidence in the proposed root cause
  - Weakens feature weights that led to incorrect diagnosis
  - Helps avoid similar mistakes

- **⚠️ Incorrect Cause** - The root cause was wrong
  - Adjusts cause priors (base probabilities)
  - Updates feature weights to avoid this pattern
  - Improves future root cause ranking

### Step 4: View Learning Status
1. Go to **Settings** → **Incident Learning** section
2. View:
   - **Sample Size**: Number of feedback outcomes collected
   - **Last Updated**: When learning was last updated
   - **Feature Weights**: Which signals are most important
   - **Cause Priors**: Base probabilities for different root causes

### Step 5: Reset Learning (Optional)
If you want to start fresh:
1. Click **Reset Learning** button
2. All learned weights and priors return to defaults
3. All learning progress is cleared

---

## How Incident Learning Works

### Learning Algorithm

The system uses a **gradient descent-like approach** to learn from feedback:

#### 1. Feature Extraction
When an incident occurs, the system extracts features:
- `has_exit_code_nonzero` - Container exited with non-zero code
- `oom_event_present` - Out of memory events detected
- `probe_failure_event_present` - Health check failures
- `image_pull_error_present` - Image pull errors
- `restart_rate_5m/1h/24h` - Container restart rates
- `recent_change_present` - Recent configuration changes
- `log_error_signature_present` - Error patterns in logs
- `resource_pressure_hint` - CPU/memory pressure indicators

#### 2. Confidence Scoring
The system calculates confidence using:
```
confidence = Σ(feature_value × feature_weight) + cause_prior
```

Where:
- **Feature weights** determine how important each signal is
- **Cause priors** are base probabilities for root causes
- Higher confidence = more likely to be the root cause

#### 3. Learning from Feedback

When you provide feedback, the system updates:

**Feature Weights** (if outcome = "worked"):
```go
new_weight = old_weight + learning_rate × (1 - old_weight)
```
- Strengthens weights for features that supported correct diagnosis

**Feature Weights** (if outcome = "not_worked" or "incorrect_cause"):
```go
new_weight = old_weight - learning_rate × old_weight
```
- Weakens weights for features that led to incorrect diagnosis

**Cause Priors**:
```go
// If worked: increase prior
new_prior = old_prior + learning_rate × (1 - old_prior)

// If didn't work: decrease prior
new_prior = old_prior - learning_rate × old_prior
```

#### 4. Learning Parameters
- **Learning Rate**: 0.02 (2% adjustment per feedback)
- **Min Weight**: 0.05 (minimum feature importance)
- **Max Weight**: 0.7 (maximum feature importance)
- **Min Prior**: 0.05 (minimum cause probability)

### Example Learning Flow

1. **Incident Detected**: Pod crash loop
   - Features: `restart_rate_5m=1.0`, `oom_event_present=0`, `exit_code_nonzero=1`
   - Proposed cause: "Application Error" (confidence: 0.65)

2. **User Applies Fix**: Restart pod
   - Fix works, user clicks "✅ Worked"

3. **System Learns**:
   - Increases weight for `restart_rate_5m` (was 0.3 → now 0.31)
   - Increases weight for `exit_code_nonzero` (was 0.25 → now 0.26)
   - Increases prior for "Application Error" (was 0.15 → now 0.15)

4. **Next Similar Incident**:
   - Same features → Higher confidence (0.67 instead of 0.65)
   - "Application Error" ranked higher in root causes

---

## How KnowledgeBank Works

### Purpose
KnowledgeBank is a **local SQLite database** that stores:
- Historical incident data
- Learning outcomes and feedback
- Feature weights and cause priors
- Fix execution records
- Pattern statistics

### Database Location
```
~/.kubegraf/intelligence/knowledge.db
```

### Key Components

#### 1. Incident Storage
**Table**: `incidents`
- Stores all detected incidents
- Includes fingerprint, pattern, severity, evidence
- Used for finding similar incidents

**Fields**:
- `id` - Unique incident ID
- `fingerprint` - Hash of incident characteristics (for matching)
- `pattern` - Failure pattern type (e.g., "CrashLoop", "OOM")
- `severity` - Critical, High, Medium, Low
- `evidence_pack_json` - Logs, events, metrics
- `diagnosis_json` - Root cause analysis

#### 2. Outcome Storage
**Table**: `incident_outcomes`
- Stores user feedback on incidents
- Used to calculate learning statistics

**Fields**:
- `fingerprint` - Links to incident
- `incident_id` - Incident ID
- `outcome` - "worked", "not_worked", or "unknown"
- `proposed_primary_cause` - What the system suggested
- `proposed_confidence` - Confidence score
- `applied_fix_id` - Which fix was applied
- `notes` - Optional user notes

#### 3. Feature Weights
**Table**: `feature_weights`
- Stores learned importance of each feature
- Updated after each feedback

**Fields**:
- `key` - Feature name (e.g., "restart_rate_5m")
- `weight` - Importance value (0.05 to 0.7)
- `updated_ts` - Last update timestamp

#### 4. Cause Priors
**Table**: `cause_priors`
- Stores base probabilities for root causes
- Updated based on feedback

**Fields**:
- `cause_key` - Root cause name (e.g., "Application Error")
- `prior` - Base probability (0.05 to 1.0)
- `updated_ts` - Last update timestamp

#### 5. Fingerprint Statistics
**Table**: `incident_fingerprint_stats`
- Tracks how often each pattern occurs
- Used for pattern matching

**Fields**:
- `fingerprint` - Incident fingerprint
- `pattern` - Failure pattern
- `seen_count` - Number of occurrences
- `last_seen_ts` - Most recent occurrence

### KnowledgeBank Operations

#### Storing an Incident
```go
kb.StoreIncident(incident, evidencePack, diagnosis)
```
- Creates or updates incident record
- Updates fingerprint statistics
- Stores evidence and diagnosis

#### Finding Similar Incidents
```go
similar := kb.FindSimilarIncidents(fingerprint, limit)
```
- Matches by fingerprint hash
- Returns most similar incidents
- Used in UI to show "Similar Past Incidents"

#### Recording Feedback
```go
learner.RecordOutcome(outcome, incident, snapshot, evidencePack)
```
- Stores outcome in `incident_outcomes` table
- Updates feature weights
- Updates cause priors
- Increments sample size counter

#### Getting Learning Status
```go
status := learner.GetLearningStatus()
```
- Counts outcomes: `SELECT COUNT(*) FROM incident_outcomes`
- Gets last update: `SELECT MAX(ts) FROM incident_outcomes`
- Retrieves feature weights and cause priors

---

## Architecture & Data Flow

### Component Relationships

```
┌─────────────────┐
│  Intelligence   │
│    System       │
└────────┬────────┘
         │
         ├─── KnowledgeBank (SQLite)
         │    └─── Stores: incidents, outcomes, weights, priors
         │
         ├─── ConfidenceLearner
         │    └─── Uses KnowledgeBank for storage
         │    └─── Updates weights/priors from feedback
         │
         └─── LearningEngine
              └─── Pattern clustering
              └─── Anomaly detection
```

### Data Flow: Feedback → Learning

1. **User Provides Feedback**
   ```
   UI → POST /api/v2/incidents/{id}/feedback
        { outcome: "worked", appliedFixId: "fix-123" }
   ```

2. **Backend Receives Feedback**
   ```
   web_learning.go → handleIncidentFeedbackLearning()
   ```

3. **Create Outcome Record**
   ```
   outcome := &IncidentOutcome{
       Fingerprint: incident.Fingerprint,
       Outcome: "worked",
       ProposedPrimaryCause: snapshot.RootCauses[0].Cause,
       ProposedConfidence: snapshot.Confidence,
   }
   ```

4. **Record Outcome**
   ```
   learner.RecordOutcome(outcome, incident, snapshot, evidencePack)
   ```

5. **Update Database**
   ```
   - INSERT INTO incident_outcomes (...)
   - UPDATE feature_weights SET weight = ... WHERE key = ...
   - UPDATE cause_priors SET prior = ... WHERE cause_key = ...
   ```

6. **Return Updated Status**
   ```
   status := learner.GetLearningStatus()
   → { sampleSize: 5, lastUpdated: "2026-01-02T14:38:53Z" }
   ```

### Data Flow: Incident → Diagnosis

1. **Incident Detected**
   ```
   Manager → New Incident
   ```

2. **Extract Features**
   ```
   ConfidenceLearner.ExtractFeatures(incident, snapshot, evidencePack)
   → FeatureVector { restart_rate_5m: 1.0, oom_event: 0, ... }
   ```

3. **Calculate Confidence**
   ```
   confidence = Σ(feature × weight) + cause_prior
   → 0.65 (65% confidence)
   ```

4. **Rank Root Causes**
   ```
   RootCauses sorted by confidence
   → [0] Application Error (0.65)
   → [1] Resource Limits (0.45)
   → [2] Configuration Error (0.30)
   ```

5. **Store in KnowledgeBank**
   ```
   kb.StoreIncident(incident, evidencePack, diagnosis)
   ```

---

## Database Schema

### Main Tables

#### `incidents`
```sql
CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    pattern TEXT NOT NULL,
    severity TEXT NOT NULL,
    resource_json TEXT NOT NULL,
    evidence_pack_json TEXT,
    diagnosis_json TEXT,
    first_seen DATETIME NOT NULL,
    last_seen DATETIME NOT NULL,
    resolved_at DATETIME,
    ...
);
```

#### `incident_outcomes`
```sql
CREATE TABLE incident_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL,
    incident_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    proposed_primary_cause TEXT,
    proposed_confidence REAL,
    outcome TEXT CHECK(outcome IN ('worked','not_worked','unknown')),
    applied_fix_id TEXT,
    notes TEXT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id)
);
```

#### `feature_weights`
```sql
CREATE TABLE feature_weights (
    key TEXT PRIMARY KEY,
    weight REAL NOT NULL,
    updated_ts INTEGER NOT NULL
);
```

#### `cause_priors`
```sql
CREATE TABLE cause_priors (
    cause_key TEXT PRIMARY KEY,
    prior REAL NOT NULL,
    updated_ts INTEGER NOT NULL
);
```

### Indexes
- `idx_outcomes_fingerprint` - Fast lookup by fingerprint
- `idx_outcomes_incident` - Fast lookup by incident ID
- `idx_outcomes_ts` - Fast time-based queries

---

## Troubleshooting

### Why is Sample Size 0?

**Possible Causes**:
1. No feedback provided yet - Provide feedback on an incident
2. Database connection issue - Check `~/.kubegraf/intelligence/knowledge.db` exists
3. Different database instances - Fixed in latest version (uses shared KnowledgeBank)

**Solution**: 
- Provide feedback on an incident (✅ Worked, ❌ Didn't Work, ⚠️ Incorrect Cause)
- Check Settings → Incident Learning to see if sample size updates
- Verify database file exists: `ls ~/.kubegraf/intelligence/knowledge.db`

### Learning Not Improving?

**Check**:
1. Sample size is increasing (you're providing feedback)
2. Feature weights are updating (check Settings)
3. Similar incidents are being matched (check KnowledgeBank component)

**Tips**:
- Provide consistent feedback
- More samples = better learning (aim for 10+ outcomes)
- Reset learning if you want to start fresh

---

## API Endpoints

### Submit Feedback
```bash
POST /api/v2/incidents/{id}/feedback
{
  "outcome": "worked" | "not_worked" | "unknown",
  "appliedFixId": "fix-123",
  "appliedFixType": "restart",
  "notes": "Optional notes"
}
```

### Get Learning Status
```bash
GET /api/v2/learning/status
→ {
  "sampleSize": 5,
  "lastUpdated": "2026-01-02T14:38:53Z",
  "featureWeights": [...],
  "causePriors": [...]
}
```

### Reset Learning
```bash
POST /api/v2/learning/reset
{
  "confirm": true
}
```

---

## Summary

- **Incident Learning**: On-device ML that improves diagnosis from feedback
- **KnowledgeBank**: SQLite database storing incidents, outcomes, and learned weights
- **How to Use**: Provide feedback (✅/❌/⚠️) after resolving incidents
- **How it Works**: Updates feature weights and cause priors based on feedback
- **Storage**: All data stored locally in `~/.kubegraf/intelligence/knowledge.db`

The system learns continuously - the more feedback you provide, the better it gets at diagnosing incidents!

