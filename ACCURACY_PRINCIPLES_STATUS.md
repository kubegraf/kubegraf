# Accuracy Principles Implementation Status

## ✅ FULLY IMPLEMENTED

### 1. Evidence-First Approach ✅
- **EvidencePack** with structured sources (event, log, status, metric, change, probe)
- **EvidencePackBuilder** processes real Kubernetes signals
- **Hot evidence** displayed in UI:
  - Restart counts (5m/1h/24h)
  - Last exit code
  - Last error string
  - Readiness status
  - Recent change summary
- Evidence items have `Source` field (EvidenceSource enum)

**Location**: `pkg/incidents/evidence.go`, `pkg/incidents/snapshot.go`

### 2. Deterministic Logic Before AI ✅
- **PatternMatcher** - Rule-based pattern matching (no ML)
- **SymptomDetector** - Deterministic symptom detection from signals
- **DiagnosisGenerator** - Template-based diagnosis generation
- AI learning is **optional enhancement** for ranking, not primary engine

**Location**: `pkg/incidents/matcher.go`, `pkg/incidents/symptoms.go`, `pkg/incidents/diagnosis.go`

### 3. Confidence Scoring ✅
- Confidence displayed in UI: `confidenceLabel (confidence%)`
- Confidence calculated from pattern matches (0.0-1.0)
- ConfidenceLabel computed: High (≥80%), Medium (≥50%), Low (<50%)

**Location**: `pkg/incidents/snapshot.go:ComputeConfidenceLabel()`, UI shows in modal

### 4. "I Don't Know" Support ✅
- **PatternUnknown** exists for unclassified failures
- **generateUnknownDiagnosis()** creates low-confidence diagnosis
- UI shows "No diagnosis available" when diagnosis is missing
- Shows "Unknown/Not detected yet" for missing impact fields

**Location**: `pkg/incidents/diagnosis.go:generateUnknownDiagnosis()`

### 5. MVP Signals Only ✅
All 6 MVP signals are detected:
- ✅ CrashLoopBackOff
- ✅ OOMKilled (exit code 137)
- ✅ ImagePullBackOff / ErrImagePull
- ✅ Restart storm (high restart counts)
- ✅ Pending pod (unschedulable)
- ✅ Service has 0 endpoints

**Location**: `web_incidents_v2.go:scanAndIngestIncidents()`

### 6. Never Guess Impact ✅
- Impact fields show "Unknown" or "Not detected yet" when empty
- ServiceExposure: "Not detected yet" if empty
- AffectedReplicas: "Unknown" if 0 or missing
- UserFacingLikelihood: "Unknown" unless explicitly calculated

**Location**: UI in `IncidentModalV2.tsx` Impact Panel

---

## ❌ MISSING / NEEDS ENHANCEMENT

### 1. Source Tags in UI ❌
**Status**: Evidence has Source field but NOT displayed

**Current**: Hot evidence shown as bullets without source attribution
**Needed**: Show "Source: Pod status" or "Source: Kubernetes event" for each evidence item

**Example**:
```
Hot Evidence:
• Restart counts: 5m=3, 1h=5, 24h=12 [Source: Pod status]
• Last exit code: 137 [Source: Container status]
• Last error: OOMKilled [Source: Container status]
```

**Action Required**: 
- Update UI to display evidence source tags
- Could enhance snapshot to include source info in hot evidence

### 2. 80% Confidence Rule for Fixes ❌
**Status**: Not enforced in UI

**Current**: 
- RecommendedAction is always shown (read-only, safe)
- Fixes/runbooks come from separate endpoint (not in snapshot)
- No confidence check before showing fixes

**Needed**: 
- If snapshot.confidence < 0.8 → show diagnosis only, hide fix suggestions
- If snapshot.confidence ≥ 0.8 → show fix suggestions

**Action Required**:
- Add confidence check in UI before displaying runbooks/fixes
- Or filter fixes server-side based on incident confidence

### 3. More Explicit Evidence Formatting ⚠️
**Status**: Basic formatting, could be more explicit

**Current**: "Last exit code: 137"
**Better**: "Container exited with code 137 (OOMKilled) at 14:32 UTC"

**Action Required**:
- Enhance hot evidence formatting to include timestamps and explicit interpretations
- Format exit codes with their meanings (137 = OOMKilled)

### 4. Cross-Layer Assumptions ⚠️
**Status**: Need to verify we don't make assumptions

**Current**: System shows evidence from same resource
**Risk**: Could assume "Ingress down because app crashed"

**Action Required**:
- Review diagnosis generation to ensure we never assume cross-layer causality
- Show separate facts, let users connect dots
- Verify we don't generate "X because Y" when Y is in different layer

---

## 📝 RECOMMENDATIONS

### Priority 1 (Critical for Trust):
1. **Add Source Tags to UI** - Shows users where evidence comes from
2. **Enforce 80% Confidence Rule** - Prevents showing fixes when confidence is low

### Priority 2 (Nice to Have):
3. **Enhance Evidence Formatting** - More explicit, includes timestamps
4. **Verify No Cross-Layer Assumptions** - Audit diagnosis generation

---

## Summary

**Overall**: ~85% implemented ✅

**Core Accuracy Principles**: ✅ All implemented
- Evidence-first ✅
- Deterministic logic ✅  
- Confidence scoring ✅
- "I Don't Know" support ✅
- MVP signals only ✅

**UI Polish for Trust**: ⚠️ Partially implemented
- Source tags ❌
- 80% rule enforcement ❌
- Evidence formatting ⚠️

The foundation is solid and follows accuracy principles. The missing pieces are primarily UI enhancements to make evidence sources and confidence-based filtering more visible to users.
