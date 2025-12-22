# Incident UI Maintenance & Evolution Strategy

## Current State

- **IncidentModalV2**: Tab-based UI (older, simpler)
- **IncidentDetailView**: Section-based UI (newer, more comprehensive, production-ready)
- Both exist in codebase

## Decision Framework: Edit Existing vs Create New Version

### ✅ EDIT EXISTING (Recommended for most cases)

**When to edit IncidentDetailView directly:**

1. **Bug Fixes** ✅
   - Fix rendering issues
   - Fix API integration bugs
   - Fix state management issues
   - Fix accessibility issues

2. **Minor Enhancements** ✅
   - Add new fields to existing sections
   - Improve styling/UX
   - Add loading states
   - Improve error handling
   - Performance optimizations

3. **Feature Additions** ✅
   - Add new data fields to existing sections
   - Add new buttons/actions to existing components
   - Add filtering/sorting to existing lists
   - Add tooltips/help text

4. **Accuracy Improvements** ✅
   - Enhance source attribution
   - Improve evidence formatting
   - Refine confidence calculations
   - Better "unknown" handling

5. **Backward-Compatible Changes** ✅
   - API endpoint updates (if compatible)
   - UI polish (colors, spacing, animations)
   - Accessibility improvements

### 🔄 CREATE NEW VERSION (Only for major changes)

**When to create IncidentDetailViewV2 (or IncidentModalV3):**

1. **Breaking Design Changes** ⚠️
   - Complete UI/UX redesign
   - Change from sections to tabs (or vice versa)
   - Change layout paradigm (sidebar, split view, etc.)
   - Major navigation restructure

2. **Breaking API Changes** ⚠️
   - Backend API completely changes structure
   - New data model that doesn't fit existing components
   - Requires different state management approach

3. **Parallel Development** ⚠️
   - Need to A/B test two approaches
   - Experimenting with new architecture
   - Gradual migration path needed

4. **Deprecation Strategy** ⚠️
   - Need to keep old version running while migrating users
   - Multiple versions needed temporarily

### ❌ NEVER Create New Version For

- Bug fixes
- Minor enhancements
- Feature additions (unless breaking)
- Performance optimizations
- Styling changes
- Accessibility improvements
- Code refactoring

## Recommended Approach

### Phase 1: Current State (Now)

1. **Standardize on IncidentDetailView**
   - Update Incidents.tsx to use IncidentDetailView
   - Mark IncidentModalV2 as deprecated (add comment)
   - Keep IncidentModalV2 for backward compatibility if needed

2. **Document Component Structure**
   - Each section is a separate component (modular)
   - Easy to update individual sections
   - No need for new versions for section updates

### Phase 2: Ongoing Maintenance

**File Structure (Current - Good!):**
```
components/incidents/
├── IncidentDetailView.tsx       # Main container
├── IncidentHeader.tsx           # Section 1
├── SignalSummaryPanel.tsx       # Section 2
├── RootCauseExplanation.tsx     # Section 3
├── TimelineReconstruction.tsx   # Section 4
├── LogErrorAnalysis.tsx         # Section 5
├── MetricsAnalysis.tsx          # Section 5b
├── AvailabilityImpact.tsx       # Section 6
├── ChangeIntelligence.tsx       # Section 7
├── RecommendedFixes.tsx         # Section 8
├── KnowledgeBank.tsx            # Section 9
├── CitationsPanel.tsx           # Section 10
├── FixPreviewPanel.tsx          # Modal overlay
└── index.ts                     # Exports
```

**Maintenance Strategy:**
- ✅ Edit individual component files directly
- ✅ Add new sections as new component files
- ✅ Update IncidentDetailView.tsx to include new sections
- ✅ Keep components focused and single-purpose

### Phase 3: Future Major Changes (If Needed)

**If you need a completely new approach:**

1. **Create IncidentDetailViewV2.tsx** (only if major redesign)
2. **Keep IncidentDetailView.tsx** for stability
3. **Feature flag to switch between versions:**
   ```typescript
   const useNewDetailView = () => {
     // Feature flag logic
     return localStorage.getItem('useV2DetailView') === 'true';
   };
   
   {useNewDetailView() ? <IncidentDetailViewV2 /> : <IncidentDetailView />}
   ```
4. **Gradual migration**:
   - Test with subset of users
   - Gather feedback
   - Once stable, remove old version

## Best Practices

### ✅ DO:

1. **Edit existing components** for 90% of changes
2. **Keep components modular** - update one section at a time
3. **Version control** - use git branches for experimental changes
4. **Feature flags** - for major changes that need testing
5. **Backward compatibility** - don't break existing functionality
6. **Incremental improvements** - small, frequent updates

### ❌ DON'T:

1. **Don't create new versions** for minor changes
2. **Don't duplicate code** - reuse components
3. **Don't break existing features** - always test
4. **Don't accumulate technical debt** - refactor as you go
5. **Don't create "IncidentDetailViewV3"** unless truly needed

## Component Update Examples

### ✅ Good: Edit Existing (Most Common)

```typescript
// Want to add timestamp to SignalSummaryPanel?
// → Edit SignalSummaryPanel.tsx directly

// Want to improve MetricsAnalysis display?
// → Edit MetricsAnalysis.tsx directly

// Want to add new button to RecommendedFixes?
// → Edit RecommendedFixes.tsx directly
```

### ⚠️ Consider New Version (Rare)

```typescript
// Want to completely change from sections to tabs?
// → Consider IncidentDetailViewV2.tsx

// Want to change from modal to full-page view?
// → Consider IncidentDetailViewV2.tsx

// Want to experiment with ML-powered insights?
// → Consider IncidentDetailViewV2.tsx (experimental)
```

## Migration Path

If you do create a new version:

1. **Create new file**: `IncidentDetailViewV2.tsx`
2. **Add feature flag**: Allow switching between versions
3. **Test thoroughly**: Before replacing old version
4. **Gradual rollout**: Enable for subset of users first
5. **Monitor feedback**: Ensure no regressions
6. **Full migration**: Replace old version once stable
7. **Cleanup**: Remove old version and feature flag

## Recommendation for Your Use Case

**For KubeGraf incidents, I recommend:**

1. **Standardize on IncidentDetailView** (current best version)
2. **Edit components directly** for all future changes
3. **Only create new version** if you need to completely redesign (unlikely)
4. **Keep components modular** (you already have this!)
5. **Use git branches** for experimental features
6. **Use feature flags** only if A/B testing needed

## Summary

**Default Action: Edit IncidentDetailView components directly** ✅

**Create new version only if:**
- Complete redesign needed
- Breaking API changes
- Need parallel versions for migration
- Experimenting with new architecture

**Your current structure is excellent for ongoing maintenance!**
- Modular components
- Clear separation of concerns
- Easy to update individual sections
- No version proliferation needed
