import { Component, Show, createSignal, createEffect, For, onMount, onCleanup } from 'solid-js';
import { Incident, IncidentSnapshot, api, type RemediationPlan, type FixPlan, type FixPreviewResponseV2 } from '../../services/api';
import { trackModalOpen, trackSnapshotFetch, trackTabLoad } from '../../stores/performance';
import { setExecutionStateFromResult, executionLines, setLines } from '../../stores/executionPanel';
import EvidencePanel from './EvidencePanel';
import CitationsPanel from './CitationsPanel';
import RunbookSelector from './RunbookSelector';
import SimilarIncidents from './SimilarIncidents';
import ChangeTimeline from './ChangeTimeline';

interface IncidentModalV2Props {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

const IncidentModalV2: Component<IncidentModalV2Props> = (props) => {
  const [snapshot, setSnapshot] = createSignal<IncidentSnapshot | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<string | null>(null);
  const [loadedTabs, setLoadedTabs] = createSignal<Set<string>>(new Set());
  const [resolving, setResolving] = createSignal(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = createSignal<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = createSignal<string | null>(null);
  // Store the fixId that was clicked for apply (to preserve it across dialog)
  const [fixIdToApply, setFixIdToApply] = createSignal<string | null>(null);

  // Track modal open to paint
  let modalOpenTracker: (() => void) | null = null;
  createEffect(() => {
    if (props.isOpen && props.incident) {
      // Start tracking modal open
      modalOpenTracker = trackModalOpen(props.incident.id);
      // End tracking when modal is painted (next frame)
      requestAnimationFrame(() => {
        if (modalOpenTracker) {
          modalOpenTracker();
          modalOpenTracker = null;
        }
      });
    }
  });

  // Fetch snapshot when modal opens
  createEffect(async () => {
    if (props.isOpen && props.incident) {
      console.log('[IncidentModalV2] Modal opened for incident:', props.incident.id);
      setLoading(true);
      setError(null);
      setActiveTab(null);
      setLoadedTabs(new Set());
      setRemediationPlan(null); // Reset remediation plan
      
      // Track snapshot fetch
      const requestId = crypto.randomUUID();
      const endSnapshotFetch = trackSnapshotFetch(props.incident.id, requestId);
      
      try {
        console.log('[IncidentModalV2] Loading snapshot for:', props.incident.id);
        const snap = await api.getIncidentSnapshot(props.incident.id);
        console.log('[IncidentModalV2] Snapshot loaded:', snap);
        setSnapshot(snap);
        
        // Auto-open recommended action tab if available
        if (snap.recommendedAction) {
          setActiveTab(snap.recommendedAction.tab);
        }
        
        // Load remediation plan (fixes) - do this in parallel, don't wait
        if (props.incident && props.incident.id) {
          console.log('[IncidentModalV2] Loading remediation plan for:', props.incident.id);
          loadRemediationPlan(props.incident.id).catch(err => {
            console.error('[IncidentModalV2] Failed to load remediation plan:', err);
          });
        } else {
          console.warn('[IncidentModalV2] Cannot load remediation plan - incident or incident.id is null');
        }
      } catch (err: any) {
        console.error('[IncidentModalV2] Error loading snapshot:', err);
        setError(err.message || 'Failed to load incident snapshot');
      } finally {
        setLoading(false);
        endSnapshotFetch();
      }
    } else {
      // Reset when modal closes
      console.log('[IncidentModalV2] Modal closed, resetting state');
      setRemediationPlan(null);
      setSnapshot(null);
    }
  });

  // Remediation engine state
  const [remediationPlan, setRemediationPlan] = createSignal<RemediationPlan | null>(null);
  const [loadingFixes, setLoadingFixes] = createSignal(false);
  const [previewingFix, setPreviewingFix] = createSignal<string | null>(null);
  const [fixPreview, setFixPreview] = createSignal<FixPreviewResponseV2 | null>(null);
  const [applyingFix, setApplyingFix] = createSignal<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);
  const [confirmCheckbox, setConfirmCheckbox] = createSignal(false);
  // Store incident data when dialog opens to preserve it
  const [storedIncident, setStoredIncident] = createSignal<Incident | null>(null);

  // Load remediation plan with timeout
  const loadRemediationPlan = async (incidentId: string) => {
    console.log('[Remediation] Starting loadRemediationPlan for:', incidentId);
    setLoadingFixes(true);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('[Remediation] TIMEOUT - API call took too long, clearing loading state');
      setLoadingFixes(false);
      setRemediationPlan(null);
    }, 30000); // 30 second timeout
    
    try {
      console.log('[Remediation] Calling API getIncidentFixes for:', incidentId);
      const plan = await api.getIncidentFixes(incidentId);
      clearTimeout(timeoutId);
      console.log('[Remediation] API returned plan:', plan);
      console.log('[Remediation] Plan has recommendedAction:', !!plan?.recommendedAction);
      console.log('[Remediation] Plan has fixPlans:', plan?.fixPlans?.length || 0);
      setRemediationPlan(plan);
      console.log('[Remediation] State updated - remediationPlan signal:', remediationPlan());
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[Remediation] ERROR loading remediation plan:', err);
      console.error('[Remediation] Error message:', err.message);
      console.error('[Remediation] Error stack:', err.stack);
      console.error('[Remediation] Error name:', err.name);
      // Set plan to null on error so UI doesn't show stale data
      setRemediationPlan(null);
    } finally {
      clearTimeout(timeoutId);
      console.log('[Remediation] Finally block - setting loadingFixes to false');
      setLoadingFixes(false);
      console.log('[Remediation] Loading complete - loadingFixes signal:', loadingFixes());
    }
  };

  // Preview a fix
  const handlePreviewFix = async (fixId: string) => {
    if (!props.incident) return;
    setPreviewingFix(fixId);
    setFixPreview(null);
    try {
      console.log('[FixPreview] Previewing fix:', fixId, 'for incident:', props.incident.id);
      const preview = await api.previewFix(props.incident.id, fixId);
      console.log('[FixPreview] Preview response:', preview);
      console.log('[FixPreview] Preview fixId:', preview?.fixId, 'Expected fixId:', fixId);
      setFixPreview(preview);
    } catch (err: any) {
      console.error('Error previewing fix:', err);
      alert(`Failed to preview fix: ${err.message}`);
    } finally {
      setPreviewingFix(null);
    }
  };

  // Apply a fix
  const handleApplyFix = async (fixId: string) => {
    if (!props.incident) return;
    
    console.log('[FixApply] Attempting to apply fix:', fixId);
    console.log('[FixApply] Current preview:', fixPreview());
    console.log('[FixApply] Preview fixId:', fixPreview()?.fixId, 'Expected fixId:', fixId);
    
    // Check if preview is available
    if (!fixPreview()) {
      console.warn('[FixApply] No preview available, requesting preview first');
      alert('Please preview the fix first before applying.');
      return;
    }
    
    // Check if fixId matches (with some flexibility for ID format differences)
    const previewFixId = fixPreview()!.fixId;
    if (previewFixId !== fixId && !previewFixId.includes(fixId) && !fixId.includes(previewFixId)) {
      console.warn('[FixApply] FixId mismatch. Preview fixId:', previewFixId, 'Expected:', fixId);
      // Still allow if preview exists - the backend will validate
      console.log('[FixApply] Allowing apply despite ID mismatch - backend will validate');
    }

    // Store the fixId that was clicked (use the original fixId, not the preview's fixId)
    setFixIdToApply(fixId);
    console.log('[FixApply] Stored fixId for apply:', fixId);

    // Store incident data before showing dialog to preserve it
    if (props.incident) {
      setStoredIncident(props.incident);
      console.log('[FixApply] Stored incident data:', props.incident.id);
    }
    
    // Show confirmation dialog
    console.log('[FixApply] Setting showConfirmDialog to true');
    setShowConfirmDialog(true);
    setConfirmCheckbox(false);
    console.log('[FixApply] Dialog state set, showConfirmDialog should be:', true);
  };

  // Confirm and apply fix
  const confirmApplyFix = async (confirmed?: boolean) => {
    console.log('[FixApply] confirmApplyFix called, confirmed:', confirmed, 'checkbox:', confirmCheckbox());
    console.log('[FixApply] props.incident:', props.incident ? props.incident.id : 'null');
    console.log('[FixApply] storedIncident:', storedIncident() ? storedIncident()!.id : 'null');
    console.log('[FixApply] fixPreview():', fixPreview() ? fixPreview()!.fixId : 'null');
    
    // Use stored incident if props.incident is null
    const incidentToUse = props.incident || storedIncident();
    if (!incidentToUse) {
      console.error('[FixApply] Missing incident (both props and stored)');
      alert('Error: Missing incident data. Please refresh the page and try again.');
      return;
    }
    
    if (!fixPreview()) {
      console.error('[FixApply] Missing preview data');
      console.log('[FixApply] Attempting to reload preview...');
      // Try to reload the preview if it's missing
      const currentFixId = remediationPlan()?.fixPlans?.find(fp => 
        fp.id === applyingFix() || 
        (applyingFix() && fp.id.includes(applyingFix()!))
      )?.id;
      
      if (currentFixId) {
        console.log('[FixApply] Found fix plan ID, reloading preview:', currentFixId);
        try {
          await handlePreviewFix(currentFixId);
          // Wait a moment for the preview to load
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!fixPreview()) {
            alert('Error: Failed to reload preview data. Please preview the fix again.');
            return;
          }
        } catch (err) {
          console.error('[FixApply] Failed to reload preview:', err);
          alert('Error: Failed to reload preview data. Please preview the fix again.');
          return;
        }
      } else {
        alert('Error: Missing preview data. Please preview the fix first before applying.');
        return;
      }
    }
    // If confirmed parameter is true, proceed. Otherwise check checkbox state.
    if (confirmed !== true && !confirmCheckbox()) {
      console.warn('[FixApply] Confirmation not provided and checkbox not checked');
      alert('Please confirm that you understand this will change cluster state.');
      return;
    }
    console.log('[FixApply] Confirmation passed, proceeding with fix application');

    // Use the stored fixId (from when user clicked Apply), fallback to preview's fixId
    const fixId = fixIdToApply() || fixPreview()?.fixId;
    console.log('[FixApply] Using fixId for apply:', fixId, '(stored:', fixIdToApply(), ', preview:', fixPreview()?.fixId, ')');
    
    if (!fixId) {
      throw new Error('Fix ID is missing. Please preview the fix again.');
    }
    
    setShowConfirmDialog(false);
    setApplyingFix(fixId);
    try {
      if (!fixId) {
        throw new Error('Fix ID is missing. Please preview the fix again.');
      }
      
      if (!incidentToUse || !incidentToUse.id) {
        console.error('[FixApply] incidentToUse is null or missing id:', { incidentToUse, propsIncident: props.incident, storedIncident: storedIncident() });
        throw new Error('Incident data is missing. Please refresh the page and try again.');
      }
      
      // Include resource info for fallback lookup
      // Try multiple ways to get resource info (v1 vs v2 format)
      const resourceInfo = {
        resourceNamespace: incidentToUse.resource?.namespace || incidentToUse.namespace || '',
        resourceKind: incidentToUse.resource?.kind || incidentToUse.resourceKind || 'Pod',
        resourceName: incidentToUse.resource?.name || incidentToUse.resourceName || '',
      };
      
      console.log('[FixApply] Extracted resource info:', {
        fromResource: incidentToUse.resource,
        fromLegacy: { namespace: incidentToUse.namespace, resourceKind: incidentToUse.resourceKind, resourceName: incidentToUse.resourceName },
        final: resourceInfo
      });
      
      console.log('[FixApply] Calling api.applyFix with:', {
        incidentId: incidentToUse.id,
        fixId: fixId,
        confirmed: true,
        resourceInfo: resourceInfo,
        incidentToUse: incidentToUse,
        propsIncident: props.incident,
        storedIncident: storedIncident()
      });
      
      let result;
      try {
        // Include resource info in the request body for fallback lookup
        result = await api.applyFix(incidentToUse.id, fixId, true, resourceInfo);
        console.log('[FixApply] API call completed, response:', result);
      } catch (apiError: any) {
        console.error('[FixApply] API call failed:', apiError);
        const errorMessage = apiError?.message || apiError?.toString() || 'Unknown error';
        throw new Error(`Failed to call apply fix API: ${errorMessage}`);
      }
      
      console.log('[FixApply] Fix applied successfully:', result);
      
      if (result && result.executionId) {
        // Get the fix preview to show details in execution summary
        const preview = fixPreview();
        const fixTitle = preview?.title || fixId || 'Fix Applied';
        
        // Show execution summary in bottom right panel
        const startedAt = new Date().toISOString();
        const completedAt = new Date().toISOString();
        
        // Parse changes from result if available
        let resourcesChanged = null;
        if (result.changes && Array.isArray(result.changes)) {
          // Try to parse resource changes from the message/changes
          const configured = result.changes.length;
          resourcesChanged = {
            created: 0,
            configured: configured,
            unchanged: 0,
            deleted: 0,
          };
        }
        
        setExecutionStateFromResult({
          executionId: result.executionId,
          label: fixTitle,
          status: result.status === 'applied' ? 'succeeded' : 'failed',
          message: result.message || 'Fix applied successfully',
          startedAt: startedAt,
          completedAt: completedAt,
          exitCode: result.status === 'applied' ? 0 : 1,
          resourcesChanged: resourcesChanged,
          lines: [
            {
              id: `${result.executionId}-0`,
              timestamp: startedAt,
              stream: 'stdout',
              text: `Applying fix: ${fixTitle}`,
            },
            {
              id: `${result.executionId}-1`,
              timestamp: completedAt,
              stream: 'stdout',
              text: result.message || 'Fix applied successfully',
            },
            ...(result.changes && Array.isArray(result.changes) ? result.changes.map((change: string, idx: number) => ({
              id: `${result.executionId}-${idx + 2}`,
              timestamp: completedAt,
              stream: 'stdout',
              text: typeof change === 'string' ? change : JSON.stringify(change),
            })) : []),
            {
              id: `${result.executionId}-final`,
              timestamp: completedAt,
              stream: 'stdout',
              text: 'Execution completed successfully',
            },
          ],
        });
        
        // Optionally run post-check after a delay (wait longer for pod to be recreated)
        // For pod restarts, wait 15 seconds to allow pod recreation
        const postCheckDelay = fixPreview()?.title?.toLowerCase().includes('restart') ? 15000 : 5000;
        setTimeout(async () => {
          try {
            console.log('[FixApply] Running post-check for execution:', result.executionId);
            const postCheck = await api.postCheck(incidentToUse.id, result.executionId);
            const currentLines = executionLines();
            const timestamp = new Date().toISOString();
            if (postCheck.improved) {
              // Add post-check result to execution panel
              setLines([
                ...currentLines,
                {
                  id: `${result.executionId}-postcheck-${currentLines.length}`,
                  timestamp: timestamp,
                  stream: 'stdout',
                  text: 'Post-check: Incident appears to be resolved!',
                },
              ]);
            } else {
              setLines([
                ...currentLines,
                {
                  id: `${result.executionId}-postcheck-${currentLines.length}`,
                  timestamp: timestamp,
                  stream: 'stderr',
                  text: 'Post-check warning: Some checks indicate the fix may not have fully resolved the issue.',
                },
              ]);
            }
          } catch (err) {
            console.error('[FixApply] Error running post-check:', err);
          }
        }, 5000);
      } else {
        console.warn('[FixApply] Fix result missing executionId:', result);
        // Show error in execution panel
        setExecutionStateFromResult({
          executionId: `fix-${Date.now()}`,
          label: 'Fix Apply',
          status: 'failed',
          message: 'Fix applied but no execution ID returned. Please check the server logs.',
          error: 'No execution ID in response',
        });
      }
      
      // Reload snapshot and fixes (only if incident is still available)
      if (incidentToUse && incidentToUse.id) {
        console.log('[FixApply] Reloading snapshot and remediation plan');
        try {
          const snap = await api.getIncidentSnapshot(incidentToUse.id);
          setSnapshot(snap);
          loadRemediationPlan(incidentToUse.id);
        } catch (err) {
          console.warn('[FixApply] Failed to reload snapshot after fix apply:', err);
          // Don't show error - this is just a refresh attempt
        }
      } else {
        console.log('[FixApply] Skipping snapshot reload - incident not available');
      }
      setFixPreview(null);
    } catch (err: any) {
      console.error('[FixApply] Error applying fix:', err);
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      
      // Show error in execution panel
      const preview = fixPreview();
      const fixTitle = preview?.title || fixIdToApply || 'Fix Apply';
      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      
      setExecutionStateFromResult({
        executionId: `fix-error-${Date.now()}`,
        label: fixTitle,
        status: 'failed',
        message: 'Fix application failed',
        startedAt: startedAt,
        completedAt: completedAt,
        exitCode: 1,
        error: errorMessage,
        lines: [
          {
            id: `fix-error-${Date.now()}-0`,
            timestamp: startedAt,
            stream: 'stdout',
            text: `Applying fix: ${fixTitle}`,
          },
          {
            id: `fix-error-${Date.now()}-1`,
            timestamp: completedAt,
            stream: 'stderr',
            text: errorMessage,
          },
          {
            id: `fix-error-${Date.now()}-2`,
            timestamp: completedAt,
            stream: 'stdout',
            text: 'Execution failed',
          },
        ],
      });
    } finally {
      setApplyingFix(null);
      setStoredIncident(null); // Clear stored incident after apply completes
    }
  };

  // Handle ESC key
  onMount(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.isOpen) {
        props.onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    onCleanup(() => window.removeEventListener('keydown', handleEsc));
  });

  const handleTabClick = (tabId: string) => {
    const wasCached = loadedTabs().has(tabId);
    setActiveTab(tabId);
    if (!wasCached) {
      setLoadedTabs(new Set([...loadedTabs(), tabId]));
      // Track tab first load
      const requestId = crypto.randomUUID();
      const endTabLoad = trackTabLoad(tabId, props.incident?.id, requestId, false);
      // End tracking after a short delay to allow tab content to load
      setTimeout(() => endTabLoad(), 100);
    } else {
      // Track cached tab load
      const requestId = crypto.randomUUID();
      const endTabLoad = trackTabLoad(tabId, props.incident?.id, requestId, true);
      setTimeout(() => endTabLoad(), 50);
    }
  };

  const handleResolve = async () => {
    if (!props.incident) return;
    setResolving(true);
    try {
      await api.resolveIncident(props.incident.id, 'Resolved by user');
      props.onClose();
    } catch (err: any) {
      console.error('Error resolving incident:', err);
      alert('Failed to resolve incident: ' + (err.message || 'Unknown error'));
    } finally {
      setResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#ff6b6b';
      case 'medium': case 'warning': return '#ffc107';
      case 'low': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  const getPatternIcon = (pattern: string) => {
    switch (pattern.toUpperCase()) {
      case 'RESTART_STORM': return '🌪️';
      case 'CRASHLOOP': return '💥';
      case 'OOM_PRESSURE': return '💾';
      case 'LIVENESS_FAILURE': case 'READINESS_FAILURE': return '💓';
      case 'PENDING_POD': return '⏳';
      default: return '⚠️';
    }
  };

  const getStatusBadge = (status: string) => {
    const isActive = status === 'open' || status === 'investigating' || status === 'remediating';
    return (
      <span style={{
        padding: '4px 8px',
        'border-radius': '4px',
        'font-size': '11px',
        'font-weight': '600',
        background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        color: isActive ? '#dc3545' : '#22c55e',
        'text-transform': 'uppercase'
      }}>
        {isActive ? 'Active' : 'Resolved'}
      </span>
    );
  };

  // Use snapshot() directly in JSX for reactivity

  return (
    <>
      <Show when={props.isOpen && props.incident}>
        {/* Backdrop */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            'z-index': 9998,
            transition: 'opacity 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              props.onClose();
            }
          }}
        >
        {/* Modal - Right-side slide-in */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            'max-width': '720px',
            background: 'var(--bg-primary)',
            'box-shadow': '-4px 0 24px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            'flex-direction': 'column',
            'z-index': 9999,
            transform: props.isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease',
            '@media (max-width: 768px)': {
              'max-width': '100%',
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div style={{
            padding: '20px 24px',
            'border-bottom': '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            position: 'sticky',
            top: 0,
            'z-index': 10,
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '8px', 'flex-wrap': 'wrap' }}>
                  <span style={{ 'font-size': '24px' }}>{snapshot() ? getPatternIcon(snapshot()!.pattern) : '⚠️'}</span>
                  <span style={{
                    padding: '4px 10px',
                    'border-radius': '4px',
                    'font-size': '11px',
                    'font-weight': '600',
                    background: snapshot() ? `${getSeverityColor(snapshot()!.severity)}20` : 'var(--bg-secondary)',
                    color: snapshot() ? getSeverityColor(snapshot()!.severity) : 'var(--text-secondary)',
                    'text-transform': 'uppercase'
                  }}>
                    {snapshot()?.severity || props.incident?.severity || 'unknown'}
                  </span>
                  {snapshot() && getStatusBadge(snapshot()!.status)}
                </div>
                <div style={{ color: 'var(--text-secondary)', 'font-size': '13px', 'margin-bottom': '4px' }}>
                  {snapshot()?.resource.namespace || props.incident?.resource?.namespace || ''} / {snapshot()?.resource.kind || props.incident?.resource?.kind || ''} / {snapshot()?.resource.name || props.incident?.resource?.name || ''}
                </div>
                <div style={{ color: 'var(--text-secondary)', 'font-size': '12px' }}>
                  {snapshot()?.occurrences || props.incident?.occurrences || 0} occurrences
                </div>
              </div>
              <button
                onClick={props.onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  'font-size': '20px',
                  'line-height': 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}>
            {/* Debug box - ALWAYS VISIBLE (outside all Show conditions) */}
            <div style={{
              background: 'rgba(255, 193, 7, 0.3)',
              'border-radius': '8px',
              padding: '16px',
              'margin-bottom': '20px',
              border: '3px solid rgba(255, 193, 7, 0.8)',
              'font-size': '13px',
              color: 'var(--text-primary)',
              'font-weight': '600',
              position: 'relative',
              'z-index': 1000
            }}>
              🔍 DEBUG STATE (Always Visible):
              <div style={{ 'margin-top': '12px', 'font-size': '12px', 'font-weight': '400' }}>
                loading = {loading() ? 'YES ⏳' : 'NO ✅'}<br/>
                error = {error() ? error() : 'NONE ✅'}<br/>
                snapshot = {snapshot() ? 'LOADED ✅' : 'NULL ❌'}<br/>
                remediationPlan = {remediationPlan() ? 'LOADED ✅' : 'NULL ❌'}<br/>
                loadingFixes = {loadingFixes() ? 'YES ⏳' : 'NO ✅'}<br/>
                hasRecommendedAction = {remediationPlan()?.recommendedAction ? 'YES ✅' : 'NO ❌'}<br/>
                fixPlansCount = {remediationPlan()?.fixPlans?.length || 0}<br/>
                incidentId = {props.incident?.id || 'N/A'}
              </div>
              <button
                onClick={() => {
                  console.log('[DEBUG] Manual trigger - reloading remediation plan');
                  if (props.incident && props.incident.id) {
                    // Clear previous preview when reloading
                    setFixPreview(null);
                    setPreviewingFix(null);
                    loadRemediationPlan(props.incident.id);
                  } else {
                    console.error('[DEBUG] Cannot reload - incident or id is null');
                  }
                }}
                disabled={loadingFixes()}
                style={{
                  'margin-top': '12px',
                  padding: '8px 16px',
                  background: loadingFixes() ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                  color: loadingFixes() ? 'var(--text-secondary)' : 'white',
                  border: 'none',
                  'border-radius': '6px',
                  cursor: loadingFixes() ? 'not-allowed' : 'pointer',
                  'font-size': '12px',
                  'font-weight': '600',
                  opacity: loadingFixes() ? 0.6 : 1,
                  display: 'flex',
                  'align-items': 'center',
                  gap: '8px'
                }}
              >
                {loadingFixes() ? (
                  <>
                    <div class="spinner" style={{ width: '12px', height: '12px' }} />
                    Reloading...
                  </>
                ) : (
                  '🔄 Reload Fixes'
                )}
              </button>
            </div>

            <Show when={loading()}>
              <div style={{ 
                display: 'flex', 
                'justify-content': 'center', 
                'align-items': 'center', 
                padding: '60px 20px',
                color: 'var(--text-secondary)'
              }}>
                <div class="spinner" style={{ 'margin-right': '12px' }} />
                Loading incident snapshot...
              </div>
            </Show>

            <Show when={error()}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                'border-radius': '8px',
                padding: '16px',
                color: '#dc3545',
                'margin-bottom': '20px'
              }}>
                <strong>Error:</strong> {error()}
              </div>
            </Show>

            <Show when={!loading() && !error() && snapshot()}>
              {/* Impact Panel */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{ 
                  margin: '0 0 12px', 
                  'font-size': '14px', 
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>
                  Impact
                </h3>
                <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Affected Replicas</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.affectedReplicas}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>User-Facing</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.userFacingLabel}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Service Exposure</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.serviceExposure.hasService ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Namespace</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.namespaceCriticality}
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{ 
                  margin: '0 0 12px', 
                  'font-size': '14px', 
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>
                  Diagnosis
                </h3>
                <p style={{ 
                  margin: '0 0 12px', 
                  color: 'var(--text-primary)',
                  'line-height': '1.6'
                }}>
                  {snapshot()!.diagnosisSummary}
                </p>
                <div style={{ 'margin-bottom': '12px' }}>
                  <div style={{ 'font-size': '12px', color: 'var(--text-secondary)', 'margin-bottom': '8px' }}>
                    Root Causes:
                  </div>
                  <For each={snapshot()!.rootCauses}>
                    {(cause, index) => (
                      <div style={{ 
                        'margin-bottom': '8px',
                        padding: '8px',
                        background: index() === 0 ? 'var(--bg-secondary)' : 'transparent',
                        'border-radius': '4px',
                        'border-left': index() === 0 ? '3px solid var(--accent-primary)' : 'none'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'margin-bottom': '4px'
                        }}>
                          <span style={{ 
                            color: 'var(--text-primary)',
                            'font-weight': index() === 0 ? '600' : '400'
                          }}>
                            {index() === 0 ? 'Primary' : 'Secondary'}: {cause.cause}
                          </span>
                          <span style={{ 
                            'font-size': '11px', 
                            color: 'var(--text-secondary)'
                          }}>
                            {Math.round(cause.likelihood * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
                <div style={{ 
                  display: 'flex', 
                  'align-items': 'center', 
                  gap: '8px',
                  padding: '8px',
                  background: 'var(--bg-secondary)',
                  'border-radius': '4px'
                }}>
                  <span style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>Confidence:</span>
                  <span style={{
                    padding: '2px 8px',
                    'border-radius': '4px',
                    'font-size': '11px',
                    'font-weight': '600',
                    background: snapshot()!.confidence >= 0.8 ? 'rgba(34, 197, 94, 0.1)' : 
                               snapshot()!.confidence >= 0.5 ? 'rgba(251, 191, 36, 0.1)' : 
                               'rgba(239, 68, 68, 0.1)',
                    color: snapshot()!.confidence >= 0.8 ? '#22c55e' : 
                           snapshot()!.confidence >= 0.5 ? '#fbbf24' : 
                           '#dc3545'
                  }}>
                    {snapshot()!.confidenceLabel}
                  </span>
                </div>
              </div>

              {/* Why Now */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{ 
                  margin: '0 0 8px', 
                  'font-size': '14px', 
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>
                  Why Now
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: 'var(--text-secondary)',
                  'font-size': '13px',
                  'line-height': '1.5'
                }}>
                  {snapshot()!.whyNowExplanation}
                </p>
              </div>

              {/* Restart Context (if applicable) */}
              <Show when={snapshot() && (snapshot()!.pattern === 'RESTART_STORM' || snapshot()!.pattern === 'CRASHLOOP')}>
                <div style={{
                  background: 'var(--bg-card)',
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '20px',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 12px', 
                    'font-size': '14px', 
                    'font-weight': '600',
                    color: 'var(--text-primary)'
                  }}>
                    Restart Frequency
                  </h3>
                  <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Last 5 min</div>
                      <div style={{ 'font-size': '18px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {snapshot()!.restartCounts.last5Minutes}
                      </div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Last 1 hour</div>
                      <div style={{ 'font-size': '18px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {snapshot()!.restartCounts.last1Hour}
                      </div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Last 24 hours</div>
                      <div style={{ 'font-size': '18px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {snapshot()!.restartCounts.last24Hours}
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Loading state for fixes */}
              <Show when={loadingFixes()}>
                <div style={{
                  background: 'var(--bg-card)',
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '20px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                  'font-size': '13px'
                }}>
                  <div class="spinner" style={{ width: '16px', height: '16px' }} />
                  Loading remediation plan...
                </div>
              </Show>

              {/* Recommended First Action (from Remediation Engine) */}
              <Show when={!loadingFixes() && remediationPlan()?.recommendedAction} fallback={
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  'border-radius': '4px',
                  padding: '8px',
                  'margin-bottom': '12px',
                  'font-size': '11px',
                  color: '#dc3545',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  ⚠️ Recommended Action NOT showing: loadingFixes={loadingFixes() ? 'true' : 'false'}, hasPlan={remediationPlan() ? 'yes' : 'no'}, hasAction={remediationPlan()?.recommendedAction ? 'yes' : 'no'}
                </div>
              }>
                <div style={{
                  background: 'var(--accent-primary)10',
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '20px',
                  border: '2px solid var(--accent-primary)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 8px', 
                    'font-size': '14px', 
                    'font-weight': '600',
                    color: 'var(--text-primary)'
                  }}>
                    Recommended First Action
                  </h3>
                  <p style={{ 
                    margin: '0 0 12px', 
                    color: 'var(--text-secondary)',
                    'font-size': '13px'
                  }}>
                    {remediationPlan()!.recommendedAction!.description}
                  </p>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                    <For each={remediationPlan()!.recommendedAction!.actions || []}>
                      {(action) => (
                        <div style={{ 
                          padding: '8px 12px',
                          background: 'var(--bg-secondary)',
                          'border-radius': '4px',
                          'font-size': '12px',
                          color: 'var(--text-secondary)'
                        }}>
                          • {action}
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Fallback to snapshot recommended action if remediation plan not loaded */}
              <Show when={!remediationPlan()?.recommendedAction && snapshot()?.recommendedAction}>
                <div style={{
                  background: 'var(--accent-primary)10',
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '20px',
                  border: '2px solid var(--accent-primary)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 8px', 
                    'font-size': '14px', 
                    'font-weight': '600',
                    color: 'var(--text-primary)'
                  }}>
                    Recommended First Action
                  </h3>
                  <p style={{ 
                    margin: '0 0 12px', 
                    color: 'var(--text-secondary)',
                    'font-size': '13px'
                  }}>
                    {snapshot()!.recommendedAction!.description}
                  </p>
                  <button
                    onClick={() => handleTabClick(snapshot()!.recommendedAction!.tab)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      'border-radius': '6px',
                      cursor: 'pointer',
                      'font-weight': '500',
                      'font-size': '13px'
                    }}
                  >
                    {snapshot()!.recommendedAction!.title}
                  </button>
                </div>
              </Show>

              {/* Suggested Fixes Section */}
              <Show when={!loadingFixes() && remediationPlan()?.fixPlans && remediationPlan()!.fixPlans.length > 0}>
                <div style={{
                  background: 'var(--bg-card)',
                  'border-radius': '8px',
                  border: '1px solid var(--border-color)',
                  padding: '16px',
                  'margin-bottom': '20px'
                }}>
                  <h3 style={{ 
                    margin: '0 0 16px', 
                    'font-size': '16px', 
                    'font-weight': '600',
                    color: 'var(--text-primary)'
                  }}>
                    Suggested Fixes
                  </h3>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
                    <For each={remediationPlan()!.fixPlans}>
                      {(fix) => (
                        <FixCard 
                          fix={fix}
                          onPreview={() => handlePreviewFix(fix.id)}
                          onApply={() => handleApplyFix(fix.id)}
                          previewing={previewingFix() === fix.id}
                          applying={applyingFix() === fix.id}
                          preview={fixPreview() && (fixPreview()!.fixId === fix.id || fixPreview()!.fixId.includes(fix.id) || fix.id.includes(fixPreview()!.fixId)) ? fixPreview() : null}
                        />
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Show message if no fixes available */}
              <Show when={!loadingFixes() && remediationPlan() && (!remediationPlan()!.fixPlans || remediationPlan()!.fixPlans.length === 0)}>
                <div style={{
                  background: 'var(--bg-card)',
                  'border-radius': '8px',
                  border: '1px solid var(--border-color)',
                  padding: '16px',
                  'margin-bottom': '20px',
                  color: 'var(--text-secondary)',
                  'font-size': '13px',
                  'text-align': 'center'
                }}>
                  No suggested fixes available for this incident pattern.
                </div>
              </Show>

              {/* Evidence Tabs */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  'border-bottom': '1px solid var(--border-color)',
                  overflow: 'auto'
                }}>
                  <For each={[
                    { id: 'evidence', label: '📦 Evidence', icon: '📦' },
                    { id: 'logs', label: '📝 Logs', icon: '📝' },
                    { id: 'metrics', label: '📈 Metrics', icon: '📈' },
                    { id: 'changes', label: '🔄 Changes', icon: '🔄' },
                    { id: 'runbooks', label: '📋 Runbooks', icon: '📋' },
                    { id: 'similar', label: '🔗 Similar', icon: '🔗' },
                  ]}>
                    {(tab) => (
                      <button
                        onClick={() => handleTabClick(tab.id)}
                        style={{
                          padding: '12px 16px',
                          background: activeTab() === tab.id ? 'var(--bg-secondary)' : 'transparent',
                          border: 'none',
                          'border-bottom': activeTab() === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          color: activeTab() === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          'font-size': '13px',
                          'font-weight': activeTab() === tab.id ? '600' : '400',
                          'white-space': 'nowrap'
                        }}
                      >
                        {tab.label}
                      </button>
                    )}
                  </For>
                </div>
                <div style={{ padding: '20px', 'min-height': '200px' }}>
                  <Show when={activeTab() === 'evidence' && loadedTabs().has('evidence')}>
                    <EvidencePanel incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'logs' && loadedTabs().has('logs')}>
                    <LogsTab incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'metrics' && loadedTabs().has('metrics')}>
                    <MetricsTab incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'changes' && loadedTabs().has('changes')}>
                    <ChangeTimeline incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'runbooks' && loadedTabs().has('runbooks')}>
                    <RunbookSelector incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'similar' && loadedTabs().has('similar')}>
                    <SimilarIncidents incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() && !loadedTabs().has(activeTab()!)}>
                    <div style={{ 
                      display: 'flex', 
                      'justify-content': 'center', 
                      'align-items': 'center', 
                      padding: '40px',
                      color: 'var(--text-secondary)'
                    }}>
                      <div class="spinner" style={{ 'margin-right': '12px' }} />
                      Loading {activeTab()}...
                    </div>
                  </Show>
                  <Show when={!activeTab()}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--text-secondary)',
                      'font-size': '13px'
                    }}>
                      Select a tab to view evidence
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          {/* Sticky Footer */}
          <div style={{
            padding: '16px 24px',
            'border-top': '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            gap: '12px',
            'z-index': 10,
          }}>
            <div style={{ display: 'flex', gap: '8px', 'flex-direction': 'column', 'align-items': 'flex-start' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    if (!props.incident) return;
                    setFeedbackSubmitting('worked');
                    setFeedbackMessage(null);
                    try {
                      const result = await api.submitIncidentFeedback(props.incident.id, 'worked');
                      setFeedbackMessage(result.summary || result.message || 'Learning updated locally');
                      setTimeout(() => setFeedbackMessage(null), 5000);
                    } catch (err: any) {
                      setFeedbackMessage('Failed to submit feedback: ' + (err.message || 'Unknown error'));
                      setTimeout(() => setFeedbackMessage(null), 5000);
                    } finally {
                      setFeedbackSubmitting(null);
                    }
                  }}
                  disabled={feedbackSubmitting() !== null}
                  style={{
                    padding: '8px 12px',
                    background: feedbackSubmitting() === 'worked' ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    'border-radius': '6px',
                    color: 'var(--text-primary)',
                    cursor: feedbackSubmitting() === 'worked' ? 'wait' : 'pointer',
                    'font-size': '12px',
                    opacity: feedbackSubmitting() && feedbackSubmitting() !== 'worked' ? 0.5 : 1
                  }}
                >
                  {feedbackSubmitting() === 'worked' ? '⏳' : '✅'} Worked
                </button>
                <button
                  onClick={async () => {
                    if (!props.incident) return;
                    setFeedbackSubmitting('not_worked');
                    setFeedbackMessage(null);
                    try {
                      const result = await api.submitIncidentFeedback(props.incident.id, 'not_worked');
                      setFeedbackMessage(result.summary || result.message || 'Learning updated locally');
                      setTimeout(() => setFeedbackMessage(null), 5000);
                    } catch (err: any) {
                      setFeedbackMessage('Failed to submit feedback: ' + (err.message || 'Unknown error'));
                      setTimeout(() => setFeedbackMessage(null), 5000);
                    } finally {
                      setFeedbackSubmitting(null);
                    }
                  }}
                  disabled={feedbackSubmitting() !== null}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    'border-radius': '6px',
                    color: 'var(--text-primary)',
                    cursor: feedbackSubmitting() === 'not_worked' ? 'wait' : 'pointer',
                    'font-size': '12px',
                    opacity: feedbackSubmitting() && feedbackSubmitting() !== 'not_worked' ? 0.5 : 1
                  }}
                >
                  {feedbackSubmitting() === 'not_worked' ? '⏳' : '❌'} Didn't Work
                </button>
                <button
                  onClick={async () => {
                    if (!props.incident) return;
                    setFeedbackSubmitting('incorrect');
                    setFeedbackMessage(null);
                    try {
                      const result = await api.submitIncidentFeedback(props.incident.id, 'unknown', undefined, undefined, 'Root cause was incorrect');
                      setFeedbackMessage(result.summary || result.message || 'Learning updated locally');
                      setTimeout(() => setFeedbackMessage(null), 5000);
                    } catch (err: any) {
                      setFeedbackMessage('Failed to submit feedback: ' + (err.message || 'Unknown error'));
                      setTimeout(() => setFeedbackMessage(null), 5000);
                    } finally {
                      setFeedbackSubmitting(null);
                    }
                  }}
                  disabled={feedbackSubmitting() !== null}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    'border-radius': '6px',
                    color: 'var(--text-primary)',
                    cursor: feedbackSubmitting() === 'incorrect' ? 'wait' : 'pointer',
                    'font-size': '12px',
                    opacity: feedbackSubmitting() && feedbackSubmitting() !== 'incorrect' ? 0.5 : 1
                  }}
                >
                  {feedbackSubmitting() === 'incorrect' ? '⏳' : '⚠️'} Incorrect Cause
                </button>
              </div>
              <Show when={feedbackMessage()}>
                <div style={{
                  'font-size': '11px',
                  color: 'var(--text-secondary)',
                  'margin-top': '4px'
                }}>
                  {feedbackMessage()}
                </div>
              </Show>
            </div>
            <button
              onClick={handleResolve}
              disabled={resolving()}
              style={{
                padding: '8px 16px',
                background: resolving() ? 'var(--bg-secondary)' : '#22c55e',
                color: 'white',
                border: 'none',
                'border-radius': '6px',
                cursor: resolving() ? 'not-allowed' : 'pointer',
                'font-weight': '500',
                'font-size': '13px',
                opacity: resolving() ? 0.6 : 1
              }}
            >
              {resolving() ? 'Resolving...' : 'Mark Resolved'}
            </button>
          </div>
        </div>
      </div>
      </Show>

      {/* Confirmation Dialog - Rendered outside modal Show block to ensure visibility */}
      {showConfirmDialog() && fixPreview() && (
        <ConfirmDialog
          isOpen={showConfirmDialog()}
          fix={fixPreview()}
          confirmed={confirmCheckbox()}
          onConfirm={confirmApplyFix}
          onCancel={() => {
            console.log('[ConfirmDialog] Cancel clicked');
            setShowConfirmDialog(false);
            setConfirmCheckbox(false);
            setStoredIncident(null); // Clear stored incident when canceling
          }}
          onCheckboxChange={setConfirmCheckbox}
        />
      )}
    </>
  );
};

// Fix Card Component
const FixCard: Component<{
  fix: FixPlan;
  onPreview: () => void;
  onApply: () => void;
  previewing: boolean;
  applying: boolean;
  preview: FixPreviewResponseV2 | null;
}> = (props) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  const getRiskBg = (risk: string) => {
    switch (risk) {
      case 'high': return '#dc354520';
      case 'medium': return '#ffc10720';
      case 'low': return '#28a74520';
      default: return 'var(--bg-secondary)';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      'border-radius': '6px',
      border: '1px solid var(--border-color)',
      padding: '16px',
      display: 'flex',
      'flex-direction': 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '8px' }}>
            <h4 style={{ 
              margin: 0, 
              'font-size': '14px', 
              'font-weight': '600',
              color: 'var(--text-primary)'
            }}>
              {props.fix.title}
            </h4>
            <span style={{
              padding: '2px 8px',
              'border-radius': '4px',
              'font-size': '11px',
              'font-weight': '600',
              background: getRiskBg(props.fix.risk),
              color: getRiskColor(props.fix.risk)
            }}>
              {props.fix.risk.toUpperCase()}
            </span>
            <span style={{
              padding: '2px 8px',
              'border-radius': '4px',
              'font-size': '11px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}>
              {Math.round(props.fix.confidence * 100)}% confidence
            </span>
          </div>
          <p style={{ 
            margin: '0 0 8px', 
            color: 'var(--text-secondary)',
            'font-size': '13px'
          }}>
            {props.fix.description}
          </p>
          <Show when={props.fix.evidenceRefs != null && Array.isArray(props.fix.evidenceRefs) && props.fix.evidenceRefs.length > 0}>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '6px', 'margin-bottom': '8px' }}>
              <For each={props.fix.evidenceRefs || []}>
                {(evidence) => (
                  <span 
                    style={{
                      padding: '4px 8px',
                      'border-radius': '4px',
                      'font-size': '11px',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={evidence.snippet}
                    onClick={() => {
                      // Scroll to evidence section
                      const evidenceTab = document.querySelector('[data-tab-id="evidence"]');
                      if (evidenceTab) {
                        evidenceTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Also trigger click to open evidence tab if not already active
                        (evidenceTab as HTMLElement).click();
                        // Small delay to ensure tab is open, then scroll to specific evidence
                        setTimeout(() => {
                          const evidenceElement = document.querySelector(`[data-evidence-id="${evidence.refId}"]`);
                          if (evidenceElement) {
                            evidenceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Highlight the evidence element briefly
                            (evidenceElement as HTMLElement).style.transition = 'background-color 0.3s';
                            (evidenceElement as HTMLElement).style.backgroundColor = 'var(--accent-primary)20';
                            setTimeout(() => {
                              (evidenceElement as HTMLElement).style.backgroundColor = '';
                            }, 2000);
                          }
                        }, 300);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)30';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {evidence.kind}: {evidence.refId.substring(0, 8)}...
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
      
      <Show when={props.preview}>
        <div style={{
          background: 'var(--bg-tertiary)',
          'border-radius': '4px',
          padding: '12px',
          'margin-top': '8px'
        }}>
          <h5 style={{ margin: '0 0 8px', 'font-size': '12px', 'font-weight': '600', color: 'var(--text-primary)' }}>
            Preview
          </h5>
          <pre style={{
            margin: '0 0 8px',
            padding: '8px',
            background: 'var(--bg-primary)',
            'border-radius': '4px',
            'font-size': '11px',
            overflow: 'auto',
            'max-height': '200px',
            color: 'var(--text-primary)'
          }}>
            {props.preview!.diff}
          </pre>
          <Show when={props.preview!.kubectlCommands.length > 0}>
            <div style={{ 'margin-top': '8px' }}>
              <strong style={{ 'font-size': '11px', color: 'var(--text-primary)' }}>Commands:</strong>
              <For each={props.preview!.kubectlCommands}>
                {(cmd) => (
                  <code style={{
                    display: 'block',
                    padding: '4px 8px',
                    'margin-top': '4px',
                    background: 'var(--bg-primary)',
                    'border-radius': '4px',
                    'font-size': '11px',
                    color: 'var(--text-primary)'
                  }}>
                    {cmd}
                  </code>
                )}
              </For>
            </div>
          </Show>
          <Show when={props.preview!.dryRunOutput}>
            <div style={{ 'margin-top': '8px', padding: '8px', background: 'rgba(34, 197, 94, 0.1)', 'border-radius': '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <strong style={{ 'font-size': '11px', color: '#22c55e' }}>✓ Dry-Run Result:</strong>
              <pre style={{
                margin: '4px 0 0',
                padding: '4px',
                background: 'var(--bg-primary)',
                'border-radius': '4px',
                'font-size': '11px',
                color: 'var(--text-primary)',
                'white-space': 'pre-wrap'
              }}>
                {props.preview!.dryRunOutput}
              </pre>
            </div>
          </Show>
          <Show when={props.preview!.dryRunError}>
            <div style={{ 'margin-top': '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <strong style={{ 'font-size': '11px', color: '#dc3545' }}>✗ Dry-Run Error:</strong>
              <pre style={{
                margin: '4px 0 0',
                padding: '4px',
                background: 'var(--bg-primary)',
                'border-radius': '4px',
                'font-size': '11px',
                color: '#dc3545',
                'white-space': 'pre-wrap'
              }}>
                {props.preview!.dryRunError}
              </pre>
            </div>
          </Show>
        </div>
      </Show>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={props.onPreview}
          disabled={props.previewing}
          style={{
            padding: '8px 16px',
            background: props.preview ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
            color: props.preview ? 'var(--text-secondary)' : 'white',
            border: 'none',
            'border-radius': '6px',
            cursor: props.previewing ? 'not-allowed' : 'pointer',
            'font-weight': '500',
            'font-size': '13px',
            opacity: props.previewing ? 0.6 : 1
          }}
        >
          {props.previewing ? 'Previewing...' : props.preview ? 'Previewed' : 'Preview Fix'}
        </button>
        <button
          onClick={() => {
            console.log('[FixCard] Apply button clicked, preview:', props.preview ? 'exists' : 'null', 'applying:', props.applying);
            props.onApply();
          }}
          disabled={!props.preview || props.applying}
          style={{
            padding: '8px 16px',
            background: props.preview && !props.applying ? 'var(--error-color)' : 'var(--bg-tertiary)',
            color: props.preview && !props.applying ? 'white' : 'var(--text-secondary)',
            border: 'none',
            'border-radius': '6px',
            cursor: (!props.preview || props.applying) ? 'not-allowed' : 'pointer',
            'font-weight': '500',
            'font-size': '13px',
            opacity: (!props.preview || props.applying) ? 0.6 : 1
          }}
        >
          {props.applying ? 'Applying...' : 'Apply Fix'}
        </button>
      </div>
    </div>
  );
};

// Confirmation Dialog Component
const ConfirmDialog: Component<{
  isOpen: boolean;
  fix: FixPreviewResponseV2 | null;
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
  onCancel: () => void;
  onCheckboxChange: (checked: boolean) => void;
}> = (props) => {
  if (!props.isOpen || !props.fix) {
    console.log('[ConfirmDialog] Not rendering - isOpen:', props.isOpen, 'fix:', props.fix ? 'exists' : 'null');
    return null;
  }
  console.log('[ConfirmDialog] Rendering dialog for fix:', props.fix.fixId);
  console.log('[ConfirmDialog] Dialog will render with z-index 99999');

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  const getRiskBg = (risk: string) => {
    switch (risk) {
      case 'high': return '#dc354520';
      case 'medium': return '#ffc10720';
      case 'low': return '#28a74520';
      default: return 'var(--bg-secondary)';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      zIndex: 999999,
      pointerEvents: 'auto',
      overflow: 'auto'
    }}
    onClick={props.onCancel}
    >
      <div style={{
        background: 'var(--bg-card)',
        'border-radius': '8px',
        padding: '24px',
        'max-width': '500px',
        width: '90%',
        border: '2px solid var(--accent-primary)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        zIndex: 1000000,
        margin: '20px'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', 'font-size': '18px', 'font-weight': '600', color: 'var(--text-primary)' }}>
          Confirm Fix Application
        </h3>
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', 'font-size': '14px' }}>
          You are about to apply: <strong>{props.fix.title}</strong>
        </p>
        <div style={{
          padding: '12px',
          background: getRiskBg(props.fix.risk),
          'border-radius': '4px',
          'margin-bottom': '16px'
        }}>
          <p style={{ margin: '0 0 8px', 'font-size': '13px', color: 'var(--text-primary)' }}>
            <strong>Risk Level:</strong> <span style={{ color: getRiskColor(props.fix.risk) }}>{props.fix.risk.toUpperCase()}</span>
          </p>
          <p style={{ margin: '0 0 8px', 'font-size': '13px', color: 'var(--text-primary)' }}>
            <strong>Confidence:</strong> {Math.round(props.fix.confidence * 100)}%
          </p>
          <p style={{ margin: 0, 'font-size': '12px', color: 'var(--text-secondary)' }}>
            {props.fix.whyThisFix}
          </p>
        </div>
        <label style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          'margin-bottom': '16px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={props.confirmed}
            onChange={(e) => props.onCheckboxChange(e.currentTarget.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ 'font-size': '13px', color: 'var(--text-primary)' }}>
            I understand this will change cluster state
          </span>
        </label>
        <Show when={props.fix.risk === 'high'}>
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '8px',
            'margin-bottom': '16px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={props.confirmed}
              onChange={(e) => props.onCheckboxChange(e.currentTarget.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ 'font-size': '13px', color: 'var(--text-primary)' }}>
              I acknowledge this is a high-risk operation
            </span>
          </label>
        </Show>
        <div style={{ display: 'flex', gap: '8px', 'justify-content': 'flex-end' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('[ConfirmDialog] Cancel button clicked');
              props.onCancel();
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              'border-radius': '6px',
              cursor: 'pointer',
              'font-size': '13px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('[ConfirmDialog] Apply Fix button clicked, confirmed:', props.confirmed);
              if (props.confirmed) {
                props.onConfirm(true);
              } else {
                console.warn('[ConfirmDialog] Button clicked but checkbox not confirmed');
              }
            }}
            disabled={!props.confirmed}
            style={{
              padding: '8px 16px',
              background: props.confirmed ? 'var(--error-color)' : 'var(--bg-tertiary)',
              color: props.confirmed ? 'white' : 'var(--text-secondary)',
              border: 'none',
              'border-radius': '6px',
              cursor: props.confirmed ? 'pointer' : 'not-allowed',
              'font-size': '13px',
              opacity: props.confirmed ? 1 : 0.6
            }}
          >
            Apply Fix
          </button>
        </div>
      </div>
    </div>
  );
};

// Logs Tab Component (lazy-loaded)
const LogsTab: Component<{ incidentId: string }> = (props) => {
  const [logs, setLogs] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentLogs(props.incidentId, 20);
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Show when={!loading() && !error()} fallback={
      <div style={{ 
        display: 'flex', 
        'justify-content': 'center', 
        'align-items': 'center', 
        padding: '40px',
        color: 'var(--text-secondary)'
      }}>
        <Show when={loading()}>
          <div class="spinner" style={{ 'margin-right': '12px' }} />
          Loading logs...
        </Show>
        <Show when={error()}>
          <div style={{ color: '#dc3545' }}>Error: {error()}</div>
        </Show>
      </div>
    }>
      <div style={{ 'max-height': '400px', overflow: 'auto' }}>
        <Show when={logs().length === 0}>
          <div style={{ 
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)',
            'font-size': '13px'
          }}>
            No logs available
          </div>
        </Show>
        <For each={logs()}>
          {(log) => (
            <div style={{
              padding: '8px 12px',
              'margin-bottom': '4px',
              background: 'var(--bg-secondary)',
              'border-radius': '4px',
              'font-family': 'monospace',
              'font-size': '12px',
              color: 'var(--text-primary)',
              'white-space': 'pre-wrap',
              'word-break': 'break-all'
            }}>
              <div style={{ 'margin-bottom': '4px', color: 'var(--text-secondary)', 'font-size': '11px' }}>
                {log.time ? new Date(log.time).toLocaleString() : ''}
              </div>
              <div>{log.value || log.message || log.content}</div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

// Metrics Tab Component (lazy-loaded)
const MetricsTab: Component<{ incidentId: string }> = (props) => {
  const [metrics, setMetrics] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentMetrics(props.incidentId);
      setMetrics(data.metrics || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Show when={!loading() && !error()} fallback={
      <div style={{ 
        display: 'flex', 
        'justify-content': 'center', 
        'align-items': 'center', 
        padding: '40px',
        color: 'var(--text-secondary)'
      }}>
        <Show when={loading()}>
          <div class="spinner" style={{ 'margin-right': '12px' }} />
          Loading metrics...
        </Show>
        <Show when={error()}>
          <div style={{ color: '#dc3545' }}>Error: {error()}</div>
        </Show>
      </div>
    }>
      <div>
        <Show when={metrics().length === 0}>
          <div style={{ 
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)',
            'font-size': '13px'
          }}>
            No metrics available
          </div>
        </Show>
        <For each={metrics()}>
          {(metric) => (
            <div style={{
              padding: '12px',
              'margin-bottom': '8px',
              background: 'var(--bg-secondary)',
              'border-radius': '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ 
                'font-weight': '600', 
                color: 'var(--text-primary)',
                'margin-bottom': '4px'
              }}>
                {metric.type || 'Metric'}
              </div>
              <div style={{ 
                color: 'var(--text-secondary)', 
                'font-size': '12px',
                'margin-bottom': '4px'
              }}>
                {metric.message || metric.value}
              </div>
              <div style={{ 
                color: 'var(--text-muted)', 
                'font-size': '11px'
              }}>
                {metric.time ? new Date(metric.time).toLocaleString() : ''}
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

export default IncidentModalV2;

