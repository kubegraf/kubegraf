# Incident Learning Stats Fix

## Problem
The Incident Learning feature was showing "0 outcomes" even after users provided feedback. The sample size counter was not updating.

## Root Cause
The `getConfidenceLearner()` function in `web_learning.go` was creating a **new KnowledgeBank instance** each time it was called, instead of using the **shared KnowledgeBank** from the IntelligenceSystem. This caused:

1. **Different database connections** - Each call created a new SQLite connection
2. **Potential database file mismatch** - The old code used `~/.kubegraf/incidents` while IntelligenceSystem uses `~/.kubegraf/intelligence`
3. **Outcomes stored in wrong database** - Outcomes might have been stored in a different database file than where the status query was looking

## Solution
Modified `getConfidenceLearner()` to:
1. Get the shared KnowledgeBank from IntelligenceSystem using `GetIntelligenceSystem().GetKnowledgeBank()`
2. Use the same database instance that stores incidents
3. Ensure outcomes are stored and queried from the same database

## Changes Made
- **File**: `web_learning.go`
- **Function**: `getConfidenceLearner()`
- **Change**: Now uses shared KnowledgeBank from IntelligenceSystem instead of creating a new one

## Testing
After this fix:
1. Provide feedback on an incident (✅ Worked, ❌ Didn't Work, ⚠️ Incorrect Cause)
2. Check the Learning Status in Settings
3. Sample Size should increment from 0 to 1, 2, etc.
4. Last Updated timestamp should update

## Database Location
- **IntelligenceSystem KnowledgeBank**: `~/.kubegraf/intelligence/knowledge.db`
- **Table**: `incident_outcomes` (stores all feedback outcomes)

## Related Files
- `pkg/incidents/confidence_learning.go` - ConfidenceLearner implementation
- `pkg/incidents/knowledge_bank.go` - KnowledgeBank with SQLite storage
- `pkg/incidents/intelligence_system.go` - IntelligenceSystem with shared KnowledgeBank
- `web_learning.go` - Learning API handlers

