import { c as createSignal, d as createComponent, t as template, i as insert, S as Show, F as For, f as createRenderEffect, h as setStyleProperty, m as memo, u as addEventListener, a4 as setExecutionStateFromResult, k as api, v as delegateEvents, a5 as setNamespace, I as setNamespaces, s as setCurrentView, G as addNotification, j as createResource, n as createEffect, o as onMount, E as onCleanup, l as currentContext, a6 as onClusterSwitch, a as createMemo } from './index-NnaOo1cf.js';
import { A as ActionMenu } from './ActionMenu-BtMa9NTM.js';

var _tmpl$$9 = /* @__PURE__ */ template(`<div style=text-align:center;padding:40px;color:var(--text-muted)>Loading preview...`), _tmpl$2$9 = /* @__PURE__ */ template(`<div style="background:#dc354520;border:1px solid #dc3545;border-radius:8px;padding:16px;color:#dc3545"><strong>Error:</strong> `), _tmpl$3$8 = /* @__PURE__ */ template(`<div style=margin-bottom:16px><h4 style=color:var(--accent-primary);font-size:13px;font-weight:700;margin-bottom:8px>Description</h4><p style=color:var(--text-primary);font-size:14px;margin:0>`), _tmpl$4$8 = /* @__PURE__ */ template(`<div style=margin-bottom:16px><h4 style=color:var(--accent-primary);font-size:13px;font-weight:700;margin-bottom:8px>Target Resource</h4><div style=background:var(--bg-secondary);padding:10px;border-radius:6px;font-family:monospace;font-size:12px;color:var(--text-primary)>/<!> (ns: <!>)`), _tmpl$5$8 = /* @__PURE__ */ template(`<div style=margin-bottom:16px><h4 style=color:var(--accent-primary);font-size:13px;font-weight:700;margin-bottom:8px>Dry Run Command</h4><pre style=background:var(--bg-secondary);padding:10px;border-radius:6px;font-family:monospace;font-size:11px;color:var(--text-primary);overflow:auto;margin:0>`), _tmpl$6$7 = /* @__PURE__ */ template(`<div style=margin-bottom:16px><h4 style=color:var(--accent-primary);font-size:13px;font-weight:700;margin-bottom:8px>Apply Command</h4><pre style=background:var(--bg-secondary);padding:10px;border-radius:6px;font-family:monospace;font-size:11px;color:var(--text-primary);overflow:auto;margin:0>`), _tmpl$7$7 = /* @__PURE__ */ template(`<span style="font-size:11px;color:var(--text-muted);background:var(--bg-secondary);padding:2px 8px;border-radius:4px">`), _tmpl$8$7 = /* @__PURE__ */ template(`<div style=margin-bottom:12px><div style=font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;font-weight:600>Result</div><p style=margin:0;color:var(--text-primary);font-size:13px;line-height:1.5>`), _tmpl$9$6 = /* @__PURE__ */ template(`<div style=margin-bottom:12px><div style=font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;font-weight:600>Changes Made</div><ul style=margin:0;padding-left:16px;font-size:12px;color:var(--text-secondary)>`), _tmpl$0$4 = /* @__PURE__ */ template(`<div style=margin-bottom:12px><div style=font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:6px>⏪ Rollback Command</div><pre style="background:var(--bg-secondary);padding:8px 10px;border-radius:4px;font-family:monospace;font-size:11px;color:var(--text-primary);overflow:auto;margin:0">`), _tmpl$1$3 = /* @__PURE__ */ template(`<div style=background:#dc354515;padding:10px;border-radius:4px;margin-top:8px><div style=font-size:11px;color:#dc3545;margin-bottom:4px;text-transform:uppercase;font-weight:600>Error Details</div><p style=margin:0;color:#dc3545;font-size:12px;font-family:monospace>`), _tmpl$10$3 = /* @__PURE__ */ template(`<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;gap:16px;font-size:11px;color:var(--text-muted)"><span>📦 </span><span>🏷️ </span><span>📁 `), _tmpl$11$3 = /* @__PURE__ */ template(`<div style=border-radius:8px;padding:16px;margin-bottom:16px><div style=display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:12px><div style=font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px> `), _tmpl$12$2 = /* @__PURE__ */ template(`<div style=background:var(--bg-secondary);padding:12px;border-radius:6px;margin-bottom:20px;font-family:monospace;font-size:12px;color:var(--text-primary)>Target: <!>/<br>Namespace: `), _tmpl$13$2 = /* @__PURE__ */ template(`<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0, 0, 0, 0.8);display:flex;align-items:center;justify-content:center;z-index:10000"><div style="background:var(--bg-card);border-radius:12px;border:2px solid var(--warning-color);padding:24px;max-width:450px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0, 0, 0, 0.4)"><div style=font-size:48px;margin-bottom:16px>⚠️</div><h3 style="margin:0 0 12px;color:var(--text-primary);font-size:18px;font-weight:700">Confirm Fix Application</h3><p style="margin:0 0 20px;color:var(--text-secondary);font-size:14px;line-height:1.5">You are about to apply a fix that will modify your Kubernetes cluster.<br><br><strong style=color:var(--warning-color)>This action cannot be undone automatically.</strong></p><div style=display:flex;gap:12px;justify-content:center><button style="padding:10px 24px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:14px">Cancel</button><button style="padding:10px 24px;border-radius:6px;border:none;background:var(--warning-color);color:#000;cursor:pointer;font-size:14px;font-weight:700">Yes, Apply Fix`), _tmpl$14$1 = /* @__PURE__ */ template(`<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0, 0, 0, 0.7);display:flex;align-items:center;justify-content:center;z-index:9999"><div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border-color);max-width:700px;width:90%;max-height:80vh;overflow:auto"><div style="padding:16px 20px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:var(--bg-card)"><div><h3 style=margin:0;color:var(--text-primary);font-size:16px;font-weight:700>🔧 Fix Preview</h3><p style="margin:4px 0 0;color:var(--text-secondary);font-size:13px"></p></div><button style="background:none;border:none;color:var(--text-secondary);font-size:24px;cursor:pointer;padding:4px 8px;line-height:1">×</button></div><div style=padding:20px></div><div style="padding:16px 20px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:12px;position:sticky;bottom:0;background:var(--bg-card)"><button style="padding:8px 16px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:13px">Close</button><button style="padding:8px 16px;border-radius:6px;font-size:13px"></button><button style="padding:8px 16px;border-radius:6px;border:none;background:var(--accent-primary);color:#000;font-size:13px;font-weight:600">`), _tmpl$15$1 = /* @__PURE__ */ template(`<div style="background:linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);border:2px solid rgba(6, 182, 212, 0.3);border-radius:12px;padding:16px;margin-bottom:16px"><div style=display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px><div><div style=font-size:11px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px>Memory Limit Change</div><div style=display:flex;align-items:center;gap:10px;flex-wrap:wrap><div style=font-size:20px;font-weight:700;color:var(--text-primary);font-family:monospace></div><div style=font-size:16px;color:var(--text-secondary)>→</div><div style=font-size:20px;font-weight:700;color:#22c55e;font-family:monospace></div></div></div><div style=display:flex;flex-direction:column;align-items:flex-end;gap:2px><div style=font-size:16px;font-weight:700;color:#22c55e;font-family:monospace>+</div><div style=font-size:11px;color:var(--text-secondary);font-weight:600>+<!>% increase`), _tmpl$16$1 = /* @__PURE__ */ template(`<li style=margin-bottom:2px>`), _tmpl$17$1 = /* @__PURE__ */ template(`<tr><td colspan=8 style=padding:40px;text-align:center><div style=display:flex;flex-direction:column;align-items:center;gap:16px><div class=spinner style=width:32px;height:32px></div><div style=color:var(--text-secondary);font-size:14px>Loading incidents...`), _tmpl$18$1 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto rounded border"style=background:var(--bg-card);border-color:var(--border-color)><table class=w-full style=border-collapse:collapse><thead><tr style="background:var(--bg-secondary);border-bottom:1px solid var(--border-color);height:40px"><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900;width:30px"></th><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900">Pattern</th><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900">Resource</th><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900">Severity</th><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900">Diagnosis</th><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900">Fixes</th><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900">Last Seen</th><th style="padding:8px 12px;text-align:left;color:var(--accent-primary);font-weight:900">Actions</th></tr></thead><tbody>`), _tmpl$19$1 = /* @__PURE__ */ template(`<tr><td colspan=8 style=padding:24px;text-align:center;color:var(--text-muted)>No incidents found`), _tmpl$20$1 = /* @__PURE__ */ template(`<span style="padding:2px 6px;border-radius:3px;font-size:10px;font-weight:700;background:#51cf6620;color:#51cf66;text-transform:uppercase">✅ Resolved`), _tmpl$21$1 = /* @__PURE__ */ template(`<div><div style=font-size:12px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px></div><div style=display:flex;align-items:center;gap:8px;margin-top:4px><span style=font-size:10px;font-weight:600> confidence`), _tmpl$22 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:column;gap:2px><span style=font-size:12px;color:var(--accent-primary);font-weight:600> fix</span><span style=font-size:10px> risk`), _tmpl$23 = /* @__PURE__ */ template(`<tr style=height:56px;cursor:pointer><td style="padding:8px 12px;color:var(--text-secondary)"><span style="display:inline-block;transition:transform 0.2s">▶</span></td><td style="padding:8px 12px;color:var(--text-primary)"><div style=display:flex;align-items:center;gap:8px><span style=font-size:18px></span><div><div style=display:flex;align-items:center;gap:6px><div style=font-weight:600;font-size:13px></div></div><div style=font-size:11px;color:var(--text-secondary)>×</div></div></div></td><td style="padding:8px 12px;color:var(--text-primary)"><div><div style=font-weight:600;font-size:13px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap></div><div style=font-size:11px;color:var(--text-secondary)> · </div></div></td><td style="padding:8px 12px"><span style="padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase"></span></td><td style="padding:8px 12px;max-width:250px"></td><td style="padding:8px 12px"></td><td style="padding:8px 12px;color:var(--text-secondary);font-size:12px"></td><td style="padding:8px 12px">`), _tmpl$24 = /* @__PURE__ */ template(`<div style=margin-bottom:12px><p style=color:var(--text-primary);font-size:13px;line-height:1.5>`), _tmpl$25 = /* @__PURE__ */ template(`<div style=margin-bottom:12px><h5 style=color:var(--text-secondary);font-size:11px;font-weight:600;margin-bottom:6px;text-transform:uppercase>Probable Causes</h5><ul style=margin:0;padding-left:16px>`), _tmpl$26 = /* @__PURE__ */ template(`<div><h5 style=color:var(--text-secondary);font-size:11px;font-weight:600;margin-bottom:6px;text-transform:uppercase>Evidence</h5><ul style=margin:0;padding-left:16px>`), _tmpl$27 = /* @__PURE__ */ template(`<button style="padding:6px 12px;background:var(--accent-primary);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:500;font-size:12px;display:flex;align-items:center;gap:6px">🚀 View Full Remediation`), _tmpl$28 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:column;gap:10px>`), _tmpl$29 = /* @__PURE__ */ template(`<div style="margin-top:20px;border-top:1px solid var(--border-color);padding-top:16px"><h4 style=color:var(--accent-primary);font-size:13px;font-weight:700;margin-bottom:12px>📅 Timeline</h4><div style=display:flex;gap:16px;overflow-x:auto;padding-bottom:8px>`), _tmpl$30 = /* @__PURE__ */ template(`<tr style="background:var(--bg-secondary);border-bottom:1px solid var(--border-color)"><td colspan=8 style="padding:16px 24px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px"><div><h4 style=color:var(--accent-primary);font-size:13px;font-weight:700;margin-bottom:12px>🔍 Diagnosis</h4></div><div><div style=display:flex;justify-content:space-between;align-items:center;margin-bottom:12px><h4 style=color:var(--accent-primary);font-size:13px;font-weight:700;margin:0>💡 Recommendations`), _tmpl$31 = /* @__PURE__ */ template(`<span style=color:var(--text-muted);font-size:12px;font-style:italic>`), _tmpl$32 = /* @__PURE__ */ template(`<span style=color:var(--text-muted);font-size:12px>-`), _tmpl$33 = /* @__PURE__ */ template(`<p style=color:var(--text-muted);font-size:13px>`), _tmpl$34 = /* @__PURE__ */ template(`<li style=color:var(--text-primary);font-size:12px;margin-bottom:4px>`), _tmpl$35 = /* @__PURE__ */ template(`<li style=color:var(--text-secondary);font-size:11px;margin-bottom:2px>`), _tmpl$36 = /* @__PURE__ */ template(`<p style=color:var(--text-muted);font-size:13px>No recommendations available`), _tmpl$37 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);padding:12px;border-radius:6px;border:1px solid var(--border-color)"><div style=display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px><span style=color:var(--text-primary);font-size:13px;font-weight:600></span><span style="padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;text-transform:uppercase"></span></div><p style=color:var(--text-secondary);font-size:12px;margin:0></p><div style=margin-top:10px><button style="padding:6px 12px;font-size:11px;border-radius:4px;border:none;color:#fff;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px">`), _tmpl$38 = /* @__PURE__ */ template(`<div style="min-width:200px;background:var(--bg-card);padding:10px;border-radius:6px;border:1px solid var(--border-color)"><div style=font-size:10px;color:var(--text-muted);margin-bottom:4px></div><div style=font-size:12px;color:var(--text-primary);font-weight:600></div><div style=font-size:11px;color:var(--text-secondary);margin-top:4px>`);
const FixPreviewModalInline = (props) => {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [preview, setPreview] = createSignal(null);
  const [applyResult, setApplyResult] = createSignal(null);
  const [applying, setApplying] = createSignal(false);
  const [showConfirmation, setShowConfirmation] = createSignal(false);
  const [dryRunStatus, setDryRunStatus] = createSignal("idle");
  const fetchPreview = async () => {
    if (!props.incidentId) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setApplyResult(null);
    setDryRunStatus("idle");
    try {
      const endpoint = props.recommendationId ? `/api/v2/incidents/${props.incidentId}/recommendations/${props.recommendationId}/preview` : `/api/v2/incidents/${props.incidentId}/fix-preview`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          incidentId: props.incidentId,
          recommendationId: props.recommendationId
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      setPreview(data);
    } catch (err) {
      setError(err.message || "Failed to load preview");
    } finally {
      setLoading(false);
    }
  };
  const handleDryRun = async () => {
    setApplying(true);
    setApplyResult(null);
    setDryRunStatus("running");
    try {
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/fix-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dryRun: true,
          incidentId: props.incidentId,
          recommendationId: props.recommendationId
        })
      });
      const data = await response.json();
      setApplyResult(data);
      setDryRunStatus(data.success ? "success" : "failed");
    } catch (err) {
      setApplyResult({
        success: false,
        error: err.message,
        dryRun: true
      });
      setDryRunStatus("failed");
    } finally {
      setApplying(false);
    }
  };
  const handleApplyClick = () => {
    setShowConfirmation(true);
  };
  const handleApplyConfirmed = async () => {
    setShowConfirmation(false);
    setApplying(true);
    setApplyResult(null);
    try {
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/fix-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dryRun: false,
          recommendationId: props.recommendationId,
          confirmed: true
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      const result = await response.json();
      const startedAt = (/* @__PURE__ */ new Date()).toISOString();
      const completedAt = (/* @__PURE__ */ new Date()).toISOString();
      setExecutionStateFromResult({
        executionId: result.executionId || `fix-apply-${Date.now()}`,
        label: props.title || "Fix Application",
        status: result.status === "applied" || result.status === "ok" ? "succeeded" : "failed",
        message: result.message || "Fix applied successfully",
        error: result.status === "failed" ? result.error || result.message : void 0,
        startedAt,
        completedAt,
        exitCode: result.status === "applied" || result.status === "ok" ? 0 : 1,
        resourcesChanged: result.changes ? {
          configured: result.changes.length,
          created: 0,
          updated: result.changes.length,
          deleted: 0
        } : null,
        lines: [{
          id: `fix-apply-${Date.now()}-msg`,
          executionId: result.executionId || `fix-apply-${Date.now()}`,
          timestamp: startedAt,
          stream: "stdout",
          text: `Applying fix: ${props.title}`,
          mode: "apply",
          sourceLabel: "kubectl-equivalent"
        }, {
          id: `fix-apply-${Date.now()}-result`,
          executionId: result.executionId || `fix-apply-${Date.now()}`,
          timestamp: completedAt,
          stream: result.status === "applied" || result.status === "ok" ? "stdout" : "stderr",
          text: result.message || (result.status === "applied" ? "Fix applied successfully" : "Fix application failed"),
          mode: "apply",
          sourceLabel: "kubectl-equivalent"
        }, {
          id: `fix-apply-${Date.now()}-final`,
          executionId: result.executionId || `fix-apply-${Date.now()}`,
          timestamp: completedAt,
          stream: "stdout",
          text: "Execution completed successfully",
          mode: "apply",
          sourceLabel: "kubectl-equivalent"
        }]
      });
      setApplyResult({
        success: result.status === "applied" || result.status === "ok",
        message: result.message,
        dryRun: false
      });
      if (result.executionId && result.postCheckPlan) {
        setTimeout(async () => {
          try {
            console.log("[FixApply] Running post-check for execution:", result.executionId, "incidentId:", props.incidentId);
            const postCheck = await api.postCheck(props.incidentId, result.executionId);
            console.log("[FixApply] Post-check completed:", postCheck);
          } catch (err) {
            console.error("[FixApply] Error running post-check:", err);
          }
        }, 15e3);
      }
    } catch (err) {
      const errorMessage = err?.message || err?.toString() || "Unknown error";
      const executionId = `fix-apply-error-${Date.now()}`;
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      setExecutionStateFromResult({
        executionId,
        label: props.title || "Fix Application",
        status: "failed",
        message: `Failed to apply fix: ${errorMessage}`,
        error: errorMessage,
        startedAt: timestamp,
        completedAt: timestamp,
        exitCode: 1,
        lines: [{
          id: `${executionId}-msg`,
          executionId,
          timestamp,
          stream: "stdout",
          text: `Applying fix: ${props.title}`,
          mode: "apply",
          sourceLabel: "kubectl-equivalent"
        }, {
          id: `${executionId}-err`,
          executionId,
          timestamp,
          stream: "stderr",
          text: `Failed to apply fix: ${errorMessage}`,
          mode: "apply",
          sourceLabel: "kubectl-equivalent"
        }]
      });
      setApplyResult({
        success: false,
        error: errorMessage,
        dryRun: false
      });
    } finally {
      setApplying(false);
    }
  };
  const handleApplyCancelled = () => {
    setShowConfirmation(false);
  };
  const onOpen = () => {
    if (props.isOpen && props.incidentId) {
      fetchPreview();
    }
  };
  let lastOpen = false;
  if (props.isOpen && !lastOpen) {
    onOpen();
  }
  lastOpen = props.isOpen;
  return createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      var _el$ = _tmpl$14$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$4.nextSibling, _el$8 = _el$3.nextSibling, _el$52 = _el$8.nextSibling, _el$53 = _el$52.firstChild, _el$54 = _el$53.nextSibling, _el$55 = _el$54.nextSibling;
      _el$.$$click = (e) => {
        if (e.target === e.currentTarget) props.onClose();
      };
      _el$2.$$click = (e) => e.stopPropagation();
      insert(_el$6, () => props.title);
      addEventListener(_el$7, "click", props.onClose, true);
      insert(_el$8, createComponent(Show, {
        get when() {
          return loading();
        },
        get children() {
          return _tmpl$$9();
        }
      }), null);
      insert(_el$8, createComponent(Show, {
        get when() {
          return error();
        },
        get children() {
          var _el$0 = _tmpl$2$9(), _el$1 = _el$0.firstChild; _el$1.nextSibling;
          insert(_el$0, error, null);
          return _el$0;
        }
      }), null);
      insert(_el$8, createComponent(Show, {
        get when() {
          return memo(() => !!(!loading() && !error()))() && preview();
        },
        get children() {
          return [createComponent(Show, {
            get when() {
              return memo(() => !!preview()?.changes)() && preview().changes.some((c) => c.path?.includes("memory") && c.oldValue && c.newValue);
            },
            children: () => {
              const memoryChange = preview().changes.find((c) => c.path?.includes("memory") && c.oldValue && c.newValue);
              if (!memoryChange) return null;
              const parseMemory = (val) => {
                if (val.endsWith("Mi")) {
                  return parseFloat(val.replace("Mi", ""));
                } else if (val.endsWith("Gi")) {
                  return parseFloat(val.replace("Gi", "")) * 1024;
                } else if (val.endsWith("Ki")) {
                  return parseFloat(val.replace("Ki", "")) / 1024;
                }
                return 0;
              };
              const oldVal = parseMemory(memoryChange.oldValue);
              const newVal = parseMemory(memoryChange.newValue);
              const increase = newVal - oldVal;
              const percentIncrease = oldVal > 0 ? Math.round(increase / oldVal * 100) : 0;
              const formatMemory = (val) => {
                if (val >= 1024) {
                  return `${(val / 1024).toFixed(1)}Gi`;
                }
                return `${Math.round(val)}Mi`;
              };
              return (() => {
                var _el$74 = _tmpl$15$1(), _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$76.firstChild, _el$78 = _el$77.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling, _el$81 = _el$80.nextSibling, _el$82 = _el$76.nextSibling, _el$83 = _el$82.firstChild; _el$83.firstChild; var _el$85 = _el$83.nextSibling, _el$86 = _el$85.firstChild, _el$88 = _el$86.nextSibling; _el$88.nextSibling;
                insert(_el$79, () => memoryChange.oldValue);
                insert(_el$81, () => memoryChange.newValue);
                insert(_el$83, () => formatMemory(increase), null);
                insert(_el$85, percentIncrease, _el$88);
                return _el$74;
              })();
            }
          }), (() => {
            var _el$11 = _tmpl$3$8(), _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling;
            insert(_el$13, () => preview()?.description || "No description");
            return _el$11;
          })(), createComponent(Show, {
            get when() {
              return preview()?.targetResource;
            },
            get children() {
              var _el$14 = _tmpl$4$8(), _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild, _el$20 = _el$17.nextSibling, _el$18 = _el$20.nextSibling, _el$21 = _el$18.nextSibling; _el$21.nextSibling;
              insert(_el$16, () => preview()?.targetResource?.kind, _el$17);
              insert(_el$16, () => preview()?.targetResource?.name, _el$20);
              insert(_el$16, () => preview()?.targetResource?.namespace, _el$21);
              return _el$14;
            }
          }), createComponent(Show, {
            get when() {
              return preview()?.dryRunCmd;
            },
            get children() {
              var _el$22 = _tmpl$5$8(), _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling;
              insert(_el$24, () => preview()?.dryRunCmd);
              return _el$22;
            }
          }), createComponent(Show, {
            get when() {
              return preview()?.applyCmd;
            },
            get children() {
              var _el$25 = _tmpl$6$7(), _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling;
              insert(_el$27, () => preview()?.applyCmd);
              return _el$25;
            }
          }), createComponent(Show, {
            get when() {
              return applyResult();
            },
            get children() {
              var _el$28 = _tmpl$11$3(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild;
              insert(_el$30, () => applyResult()?.success ? "✅" : "❌", _el$31);
              insert(_el$30, () => applyResult()?.dryRun ? "Dry Run" : "Execution", _el$31);
              insert(_el$30, () => applyResult()?.success ? "Succeeded" : "Failed", null);
              insert(_el$29, createComponent(Show, {
                get when() {
                  return applyResult()?.appliedAt;
                },
                get children() {
                  var _el$32 = _tmpl$7$7();
                  insert(_el$32, () => new Date(applyResult()?.appliedAt).toLocaleTimeString());
                  return _el$32;
                }
              }), null);
              insert(_el$28, createComponent(Show, {
                get when() {
                  return applyResult()?.message;
                },
                get children() {
                  var _el$33 = _tmpl$8$7(), _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling;
                  insert(_el$35, () => applyResult()?.message);
                  return _el$33;
                }
              }), null);
              insert(_el$28, createComponent(Show, {
                get when() {
                  return memo(() => !!applyResult()?.changes)() && applyResult()?.changes.length > 0;
                },
                get children() {
                  var _el$36 = _tmpl$9$6(), _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling;
                  insert(_el$38, createComponent(For, {
                    get each() {
                      return applyResult()?.changes;
                    },
                    children: (change) => (() => {
                      var _el$89 = _tmpl$16$1();
                      insert(_el$89, change);
                      return _el$89;
                    })()
                  }));
                  return _el$36;
                }
              }), null);
              insert(_el$28, createComponent(Show, {
                get when() {
                  return memo(() => !!applyResult()?.rollbackCmd)() && !applyResult()?.dryRun;
                },
                get children() {
                  var _el$39 = _tmpl$0$4(), _el$40 = _el$39.firstChild, _el$41 = _el$40.nextSibling;
                  insert(_el$41, () => applyResult()?.rollbackCmd);
                  return _el$39;
                }
              }), null);
              insert(_el$28, createComponent(Show, {
                get when() {
                  return applyResult()?.error;
                },
                get children() {
                  var _el$42 = _tmpl$1$3(), _el$43 = _el$42.firstChild, _el$44 = _el$43.nextSibling;
                  insert(_el$44, () => applyResult()?.error);
                  return _el$42;
                }
              }), null);
              insert(_el$28, createComponent(Show, {
                get when() {
                  return memo(() => !!preview()?.targetResource)() && !applyResult()?.dryRun;
                },
                get children() {
                  var _el$45 = _tmpl$10$3(), _el$46 = _el$45.firstChild; _el$46.firstChild; var _el$48 = _el$46.nextSibling; _el$48.firstChild; var _el$50 = _el$48.nextSibling; _el$50.firstChild;
                  insert(_el$46, () => preview()?.targetResource?.kind, null);
                  insert(_el$48, () => preview()?.targetResource?.name, null);
                  insert(_el$50, () => preview()?.targetResource?.namespace, null);
                  return _el$45;
                }
              }), null);
              createRenderEffect((_p$) => {
                var _v$ = applyResult()?.success ? "#28a74520" : "#dc354520", _v$2 = `1px solid ${applyResult()?.success ? "#28a745" : "#dc3545"}`, _v$3 = `1px solid ${applyResult()?.success ? "#28a74540" : "#dc354540"}`, _v$4 = applyResult()?.success ? "#28a745" : "#dc3545";
                _v$ !== _p$.e && setStyleProperty(_el$28, "background", _p$.e = _v$);
                _v$2 !== _p$.t && setStyleProperty(_el$28, "border", _p$.t = _v$2);
                _v$3 !== _p$.a && setStyleProperty(_el$29, "border-bottom", _p$.a = _v$3);
                _v$4 !== _p$.o && setStyleProperty(_el$30, "color", _p$.o = _v$4);
                return _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0
              });
              return _el$28;
            }
          })];
        }
      }), null);
      addEventListener(_el$53, "click", props.onClose, true);
      _el$54.$$click = handleDryRun;
      insert(_el$54, (() => {
        var _c$ = memo(() => dryRunStatus() === "running");
        return () => _c$() ? "⏳ Running..." : memo(() => dryRunStatus() === "success")() ? "✅ Dry Run OK" : dryRunStatus() === "failed" ? "❌ Dry Run Failed" : "🧪 Dry Run";
      })());
      _el$55.$$click = handleApplyClick;
      insert(_el$55, () => applying() && !applyResult()?.dryRun ? "⏳ Applying..." : "⚡ Apply Fix");
      insert(_el$, createComponent(Show, {
        get when() {
          return showConfirmation();
        },
        get children() {
          var _el$56 = _tmpl$13$2(), _el$57 = _el$56.firstChild, _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$60 = _el$59.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$61.nextSibling, _el$63 = _el$62.nextSibling; _el$63.nextSibling; var _el$71 = _el$60.nextSibling, _el$72 = _el$71.firstChild, _el$73 = _el$72.nextSibling;
          insert(_el$57, createComponent(Show, {
            get when() {
              return preview()?.targetResource;
            },
            get children() {
              var _el$65 = _tmpl$12$2(), _el$66 = _el$65.firstChild, _el$70 = _el$66.nextSibling, _el$67 = _el$70.nextSibling, _el$68 = _el$67.nextSibling; _el$68.nextSibling;
              insert(_el$65, () => preview()?.targetResource?.kind, _el$70);
              insert(_el$65, () => preview()?.targetResource?.name, _el$68);
              insert(_el$65, () => preview()?.targetResource?.namespace, null);
              return _el$65;
            }
          }), _el$71);
          _el$72.$$click = handleApplyCancelled;
          _el$73.$$click = handleApplyConfirmed;
          return _el$56;
        }
      }), null);
      createRenderEffect((_p$) => {
        var _v$5 = applying() || loading(), _v$6 = `1px solid ${dryRunStatus() === "success" ? "#28a745" : dryRunStatus() === "failed" ? "#dc3545" : "var(--accent-primary)"}`, _v$7 = dryRunStatus() === "success" ? "#28a74520" : dryRunStatus() === "failed" ? "#dc354520" : "transparent", _v$8 = dryRunStatus() === "success" ? "#28a745" : dryRunStatus() === "failed" ? "#dc3545" : "var(--accent-primary)", _v$9 = applying() ? "not-allowed" : "pointer", _v$0 = applying() ? 0.6 : 1, _v$1 = applying() || loading(), _v$10 = applying() ? "not-allowed" : "pointer", _v$11 = applying() ? 0.6 : 1;
        _v$5 !== _p$.e && (_el$54.disabled = _p$.e = _v$5);
        _v$6 !== _p$.t && setStyleProperty(_el$54, "border", _p$.t = _v$6);
        _v$7 !== _p$.a && setStyleProperty(_el$54, "background", _p$.a = _v$7);
        _v$8 !== _p$.o && setStyleProperty(_el$54, "color", _p$.o = _v$8);
        _v$9 !== _p$.i && setStyleProperty(_el$54, "cursor", _p$.i = _v$9);
        _v$0 !== _p$.n && setStyleProperty(_el$54, "opacity", _p$.n = _v$0);
        _v$1 !== _p$.s && (_el$55.disabled = _p$.s = _v$1);
        _v$10 !== _p$.h && setStyleProperty(_el$55, "cursor", _p$.h = _v$10);
        _v$11 !== _p$.r && setStyleProperty(_el$55, "opacity", _p$.r = _v$11);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0,
        s: void 0,
        h: void 0,
        r: void 0
      });
      return _el$;
    }
  });
};
const IncidentTable = (props) => {
  const [expandedRow, setExpandedRow] = createSignal(null);
  const [fixModalOpen, setFixModalOpen] = createSignal(false);
  const [fixModalIncidentId, setFixModalIncidentId] = createSignal("");
  const [fixModalRecId, setFixModalRecId] = createSignal(void 0);
  const [fixModalTitle, setFixModalTitle] = createSignal("");
  const openFixModal = (incidentId, recId, title) => {
    console.log("openFixModal called:", {
      incidentId,
      recId,
      title
    });
    setFixModalIncidentId(incidentId);
    setFixModalRecId(recId);
    setFixModalTitle(title || "Proposed Fix");
    setFixModalOpen(true);
  };
  const closeFixModal = () => {
    setFixModalOpen(false);
  };
  const getPatternIcon = (pattern) => {
    const p = pattern?.toUpperCase() || "";
    switch (p) {
      case "OOM_PRESSURE":
        return "💥";
      case "CRASHLOOP":
        return "🔄";
      case "RESTART_STORM":
        return "🌪️";
      case "NO_READY_ENDPOINTS":
        return "🔌";
      case "INTERNAL_ERRORS":
        return "🐛";
      case "IMAGE_PULL_FAILURE":
        return "📦";
      case "CONFIG_ERROR":
        return "⚙️";
      case "DNS_FAILURE":
        return "🌐";
      case "PERMISSION_DENIED":
        return "🔒";
      case "APP_CRASH":
        return "💀";
      case "TIMEOUTS":
        return "⏱️";
      case "UPSTREAM_FAILURE":
        return "⬆️";
      default:
        return "⚠️";
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "var(--error-color)";
      case "high":
        return "#ff6b6b";
      case "medium":
        return "var(--warning-color)";
      case "low":
        return "#4dabf7";
      case "info":
        return "var(--text-secondary)";
      default:
        return "var(--warning-color)";
    }
  };
  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "var(--error-color)";
      case "medium":
        return "var(--warning-color)";
      case "low":
        return "#51cf66";
      default:
        return "var(--text-secondary)";
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    const diffHours = Math.floor(diffMs / 36e5);
    const diffDays = Math.floor(diffMs / 864e5);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "#51cf66";
    if (confidence >= 0.5) return "var(--warning-color)";
    return "var(--error-color)";
  };
  const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  };
  const getPattern = (inc) => inc.pattern || inc.type || "unknown";
  const getResourceName = (inc) => inc.resource?.name || inc.resourceName || "unknown";
  const getResourceKind = (inc) => inc.resource?.kind || inc.resourceKind || "unknown";
  const getNamespace = (inc) => inc.resource?.namespace || inc.namespace || "-";
  const getOccurrences = (inc) => inc.occurrences || inc.count || 1;
  const toggleRow = (id) => {
    setExpandedRow((prev) => prev === id ? null : id);
  };
  return [(() => {
    var _el$90 = _tmpl$18$1(), _el$91 = _el$90.firstChild, _el$92 = _el$91.firstChild, _el$93 = _el$92.firstChild, _el$94 = _el$93.firstChild, _el$95 = _el$94.nextSibling, _el$96 = _el$95.nextSibling, _el$97 = _el$96.nextSibling, _el$98 = _el$97.nextSibling, _el$99 = _el$98.nextSibling, _el$100 = _el$99.nextSibling; _el$100.nextSibling; var _el$102 = _el$92.nextSibling;
    insert(_el$102, createComponent(Show, {
      get when() {
        return props.isLoading;
      },
      get children() {
        var _el$103 = _tmpl$17$1(), _el$104 = _el$103.firstChild, _el$105 = _el$104.firstChild, _el$106 = _el$105.firstChild; _el$106.nextSibling;
        return _el$103;
      }
    }), null);
    insert(_el$102, createComponent(Show, {
      get when() {
        return !props.isLoading;
      },
      get children() {
        return createComponent(For, {
          get each() {
            return props.incidents;
          },
          get fallback() {
            return (() => {
              var _el$108 = _tmpl$19$1(); _el$108.firstChild;
              return _el$108;
            })();
          },
          children: (incident) => [(() => {
            var _el$110 = _tmpl$23(), _el$111 = _el$110.firstChild, _el$112 = _el$111.firstChild, _el$113 = _el$111.nextSibling, _el$114 = _el$113.firstChild, _el$115 = _el$114.firstChild, _el$116 = _el$115.nextSibling, _el$117 = _el$116.firstChild, _el$118 = _el$117.firstChild, _el$120 = _el$117.nextSibling; _el$120.firstChild; var _el$122 = _el$113.nextSibling, _el$123 = _el$122.firstChild, _el$124 = _el$123.firstChild, _el$125 = _el$124.nextSibling, _el$126 = _el$125.firstChild, _el$127 = _el$122.nextSibling, _el$128 = _el$127.firstChild, _el$129 = _el$127.nextSibling, _el$135 = _el$129.nextSibling, _el$141 = _el$135.nextSibling, _el$142 = _el$141.nextSibling;
            _el$110.addEventListener("mouseleave", (e) => {
              e.currentTarget.style.background = expandedRow() === incident.id ? "var(--bg-secondary)" : "var(--bg-card)";
            });
            _el$110.addEventListener("mouseenter", (e) => {
              e.currentTarget.style.background = "var(--bg-secondary)";
            });
            _el$110.addEventListener("doubleclick", () => {
              if (props.onViewDetails) {
                props.onViewDetails(incident);
              }
            });
            _el$110.$$click = (e) => {
              const target = e.target;
              if (target.tagName === "BUTTON" || target.closest("button") || target.tagName === "A" || target.closest("a")) {
                return;
              }
              toggleRow(incident.id);
            };
            insert(_el$115, () => getPatternIcon(getPattern(incident)));
            insert(_el$118, () => getPattern(incident).replace(/_/g, " "));
            insert(_el$117, createComponent(Show, {
              get when() {
                return incident.status === "resolved";
              },
              get children() {
                return _tmpl$20$1();
              }
            }), null);
            insert(_el$120, () => getOccurrences(incident), null);
            insert(_el$124, () => getResourceName(incident));
            insert(_el$125, () => getResourceKind(incident), _el$126);
            insert(_el$125, () => getNamespace(incident), null);
            insert(_el$128, () => incident.severity);
            insert(_el$129, createComponent(Show, {
              get when() {
                return incident.diagnosis;
              },
              get fallback() {
                return (() => {
                  var _el$164 = _tmpl$31();
                  insert(_el$164, () => incident.description || incident.message || "No diagnosis yet");
                  return _el$164;
                })();
              },
              get children() {
                var _el$130 = _tmpl$21$1(), _el$131 = _el$130.firstChild, _el$132 = _el$131.nextSibling, _el$133 = _el$132.firstChild, _el$134 = _el$133.firstChild;
                insert(_el$131, () => incident.diagnosis.summary);
                insert(_el$133, () => formatConfidence(incident.diagnosis.confidence), _el$134);
                createRenderEffect((_$p) => setStyleProperty(_el$133, "color", getConfidenceColor(incident.diagnosis.confidence)));
                return _el$130;
              }
            }));
            insert(_el$135, createComponent(Show, {
              get when() {
                return memo(() => !!incident.recommendations)() && incident.recommendations.length > 0;
              },
              get fallback() {
                return _tmpl$32();
              },
              get children() {
                var _el$136 = _tmpl$22(), _el$137 = _el$136.firstChild, _el$138 = _el$137.firstChild, _el$139 = _el$137.nextSibling, _el$140 = _el$139.firstChild;
                insert(_el$137, () => incident.recommendations.length, _el$138);
                insert(_el$137, () => incident.recommendations.length !== 1 ? "es" : "", null);
                insert(_el$139, () => incident.recommendations[0].risk, _el$140);
                createRenderEffect((_$p) => setStyleProperty(_el$139, "color", getRiskColor(incident.recommendations[0].risk)));
                return _el$136;
              }
            }));
            insert(_el$141, () => formatDate(incident.lastSeen));
            _el$142.$$click = (e) => e.stopPropagation();
            insert(_el$142, createComponent(ActionMenu, {
              get actions() {
                return [...props.onViewDetails ? [{
                  label: "View Details",
                  icon: "info",
                  onClick: () => {
                    console.log("View Details clicked for:", incident.id);
                    props.onViewDetails(incident);
                  }
                }] : [], ...getResourceKind(incident) === "Pod" && props.onViewPod ? [{
                  label: "View Pod",
                  icon: "pod",
                  onClick: () => props.onViewPod(incident)
                }] : [], ...props.onViewLogs ? [{
                  label: "View Logs",
                  icon: "logs",
                  onClick: () => props.onViewLogs(incident)
                }] : [], ...props.onViewEvents ? [{
                  label: "View Events",
                  icon: "events",
                  onClick: () => props.onViewEvents(incident)
                }] : []];
              }
            }));
            createRenderEffect((_p$) => {
              var _v$12 = expandedRow() === incident.id ? "none" : "1px solid var(--border-color)", _v$13 = incident.status === "resolved" ? "var(--bg-secondary)" : "var(--bg-card)", _v$14 = incident.status === "resolved" ? 0.7 : 1, _v$15 = expandedRow() === incident.id ? "rotate(90deg)" : "rotate(0deg)", _v$16 = getSeverityColor(incident.severity) + "20", _v$17 = getSeverityColor(incident.severity);
              _v$12 !== _p$.e && setStyleProperty(_el$110, "border-bottom", _p$.e = _v$12);
              _v$13 !== _p$.t && setStyleProperty(_el$110, "background", _p$.t = _v$13);
              _v$14 !== _p$.a && setStyleProperty(_el$110, "opacity", _p$.a = _v$14);
              _v$15 !== _p$.o && setStyleProperty(_el$112, "transform", _p$.o = _v$15);
              _v$16 !== _p$.i && setStyleProperty(_el$128, "background", _p$.i = _v$16);
              _v$17 !== _p$.n && setStyleProperty(_el$128, "color", _p$.n = _v$17);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0,
              n: void 0
            });
            return _el$110;
          })(), createComponent(Show, {
            get when() {
              return expandedRow() === incident.id;
            },
            get children() {
              var _el$143 = _tmpl$30(), _el$144 = _el$143.firstChild, _el$145 = _el$144.firstChild, _el$146 = _el$145.firstChild; _el$146.firstChild; var _el$156 = _el$146.nextSibling, _el$157 = _el$156.firstChild; _el$157.firstChild;
              insert(_el$146, createComponent(Show, {
                get when() {
                  return incident.diagnosis;
                },
                get fallback() {
                  return (() => {
                    var _el$166 = _tmpl$33();
                    insert(_el$166, () => incident.description || incident.message || "No diagnosis available");
                    return _el$166;
                  })();
                },
                get children() {
                  return [(() => {
                    var _el$148 = _tmpl$24(), _el$149 = _el$148.firstChild;
                    insert(_el$149, () => incident.diagnosis.summary);
                    return _el$148;
                  })(), createComponent(Show, {
                    get when() {
                      return incident.diagnosis.probableCauses?.length;
                    },
                    get children() {
                      var _el$150 = _tmpl$25(), _el$151 = _el$150.firstChild, _el$152 = _el$151.nextSibling;
                      insert(_el$152, createComponent(For, {
                        get each() {
                          return incident.diagnosis.probableCauses;
                        },
                        children: (cause) => (() => {
                          var _el$167 = _tmpl$34();
                          insert(_el$167, cause);
                          return _el$167;
                        })()
                      }));
                      return _el$150;
                    }
                  }), createComponent(Show, {
                    get when() {
                      return incident.diagnosis.evidence?.length;
                    },
                    get children() {
                      var _el$153 = _tmpl$26(), _el$154 = _el$153.firstChild, _el$155 = _el$154.nextSibling;
                      insert(_el$155, createComponent(For, {
                        get each() {
                          return incident.diagnosis.evidence.slice(0, 3);
                        },
                        children: (ev) => (() => {
                          var _el$168 = _tmpl$35();
                          insert(_el$168, ev);
                          return _el$168;
                        })()
                      }));
                      return _el$153;
                    }
                  })];
                }
              }), null);
              insert(_el$157, createComponent(Show, {
                get when() {
                  return props.onViewDetails;
                },
                get children() {
                  var _el$159 = _tmpl$27();
                  _el$159.$$click = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("[IncidentTable] View Full Remediation clicked for:", incident.id);
                    props.onViewDetails(incident);
                  };
                  return _el$159;
                }
              }), null);
              insert(_el$156, createComponent(Show, {
                get when() {
                  return memo(() => !!incident.recommendations)() && incident.recommendations.length > 0;
                },
                get fallback() {
                  return _tmpl$36();
                },
                get children() {
                  var _el$160 = _tmpl$28();
                  insert(_el$160, createComponent(For, {
                    get each() {
                      return incident.recommendations.slice(0, 3);
                    },
                    children: (rec) => (() => {
                      var _el$170 = _tmpl$37(), _el$171 = _el$170.firstChild, _el$172 = _el$171.firstChild, _el$173 = _el$172.nextSibling, _el$174 = _el$171.nextSibling, _el$175 = _el$174.nextSibling, _el$176 = _el$175.firstChild;
                      insert(_el$172, () => rec.title);
                      insert(_el$173, () => rec.risk);
                      insert(_el$174, () => rec.explanation);
                      _el$176.$$click = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const actionType = rec.action?.type || "";
                        console.log("Action button clicked!", {
                          incidentId: incident.id,
                          recId: rec.id,
                          actionType
                        });
                        if (actionType === "VIEW_LOGS" && props.onViewLogs) {
                          props.onViewLogs(incident);
                        } else if (actionType === "VIEW_EVENTS" && props.onViewEvents) {
                          props.onViewEvents(incident);
                        } else if (actionType === "DESCRIBE" && props.onViewDetails) {
                          props.onViewDetails(incident);
                        } else {
                          openFixModal(incident.id, rec.id, rec.action?.label || rec.title);
                        }
                      };
                      insert(_el$176, (() => {
                        var _c$2 = memo(() => rec.action?.type === "RESTART");
                        return () => _c$2() ? "🔄" : memo(() => rec.action?.type === "SCALE")() ? "📊" : memo(() => rec.action?.type === "ROLLBACK")() ? "⏪" : memo(() => rec.action?.type === "DELETE_POD")() ? "🗑️" : memo(() => rec.action?.type === "VIEW_LOGS")() ? "📋" : memo(() => rec.action?.type === "VIEW_EVENTS")() ? "📅" : rec.action?.type === "DESCRIBE" ? "🔍" : "🔧";
                      })(), null);
                      insert(_el$176, () => rec.action?.label || rec.title, null);
                      createRenderEffect((_p$) => {
                        var _v$18 = getRiskColor(rec.risk) + "20", _v$19 = getRiskColor(rec.risk), _v$20 = rec.action?.type === "VIEW_LOGS" || rec.action?.type === "VIEW_EVENTS" || rec.action?.type === "DESCRIBE" ? "var(--accent-secondary, #6c5ce7)" : "var(--accent-primary)";
                        _v$18 !== _p$.e && setStyleProperty(_el$173, "background", _p$.e = _v$18);
                        _v$19 !== _p$.t && setStyleProperty(_el$173, "color", _p$.t = _v$19);
                        _v$20 !== _p$.a && setStyleProperty(_el$176, "background", _p$.a = _v$20);
                        return _p$;
                      }, {
                        e: void 0,
                        t: void 0,
                        a: void 0
                      });
                      return _el$170;
                    })()
                  }));
                  return _el$160;
                }
              }), null);
              insert(_el$144, createComponent(Show, {
                get when() {
                  return memo(() => !!incident.timeline)() && incident.timeline.length > 0;
                },
                get children() {
                  var _el$161 = _tmpl$29(), _el$162 = _el$161.firstChild, _el$163 = _el$162.nextSibling;
                  insert(_el$163, createComponent(For, {
                    get each() {
                      return incident.timeline.slice(0, 5);
                    },
                    children: (entry) => (() => {
                      var _el$177 = _tmpl$38(), _el$178 = _el$177.firstChild, _el$179 = _el$178.nextSibling, _el$180 = _el$179.nextSibling;
                      insert(_el$178, () => formatDate(entry.timestamp));
                      insert(_el$179, () => entry.title);
                      insert(_el$180, () => entry.description);
                      return _el$177;
                    })()
                  }));
                  return _el$161;
                }
              }), null);
              return _el$143;
            }
          })]
        });
      }
    }), null);
    return _el$90;
  })(), createComponent(FixPreviewModalInline, {
    get isOpen() {
      return fixModalOpen();
    },
    get incidentId() {
      return fixModalIncidentId();
    },
    get recommendationId() {
      return fixModalRecId();
    },
    get title() {
      return fixModalTitle();
    },
    onClose: closeFixModal
  })];
};
delegateEvents(["click"]);

var _tmpl$$8 = /* @__PURE__ */ template(`<div class="flex flex-wrap items-center gap-4 mb-4"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);min-width:180px"></select><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);min-width:150px"></select><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);min-width:150px"><option value>All Namespaces</option></select><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);min-width:150px">`), _tmpl$2$8 = /* @__PURE__ */ template(`<option>`);
const IncidentFilters = (props) => {
  const patterns = [{
    value: "",
    label: "All Patterns"
  }, {
    value: "APP_CRASH",
    label: "💀 App Crash"
  }, {
    value: "CRASHLOOP",
    label: "🔄 CrashLoop"
  }, {
    value: "OOM_PRESSURE",
    label: "💥 OOM Pressure"
  }, {
    value: "RESTART_STORM",
    label: "🌪️ Restart Storm"
  }, {
    value: "NO_READY_ENDPOINTS",
    label: "🔌 No Ready Endpoints"
  }, {
    value: "INTERNAL_ERRORS",
    label: "🐛 Internal Errors"
  }, {
    value: "UPSTREAM_FAILURE",
    label: "⬆️ Upstream Failure"
  }, {
    value: "TIMEOUTS",
    label: "⏱️ Timeouts"
  }, {
    value: "IMAGE_PULL_FAILURE",
    label: "📦 Image Pull Failure"
  }, {
    value: "CONFIG_ERROR",
    label: "⚙️ Config Error"
  }, {
    value: "DNS_FAILURE",
    label: "🌐 DNS Failure"
  }, {
    value: "PERMISSION_DENIED",
    label: "🔒 Permission Denied"
  }];
  const severities = [{
    value: "",
    label: "All Severities"
  }, {
    value: "critical",
    label: "🔴 Critical"
  }, {
    value: "high",
    label: "🟠 High"
  }, {
    value: "medium",
    label: "🟡 Medium"
  }, {
    value: "low",
    label: "🔵 Low"
  }, {
    value: "info",
    label: "⚪ Info"
  }];
  const statuses = [{
    value: "",
    label: "All Status"
  }, {
    value: "open",
    label: "🟢 Active"
  }, {
    value: "resolved",
    label: "✅ Resolved"
  }, {
    value: "investigating",
    label: "🔍 Investigating"
  }, {
    value: "remediating",
    label: "🔧 Remediating"
  }, {
    value: "suppressed",
    label: "🔇 Suppressed"
  }];
  return (() => {
    var _el$ = _tmpl$$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.nextSibling; _el$4.firstChild; var _el$6 = _el$4.nextSibling;
    _el$2.addEventListener("change", (e) => props.onPatternFilterChange(e.currentTarget.value));
    insert(_el$2, createComponent(For, {
      each: patterns,
      children: (pattern) => (() => {
        var _el$7 = _tmpl$2$8();
        insert(_el$7, () => pattern.label);
        createRenderEffect(() => _el$7.value = pattern.value);
        return _el$7;
      })()
    }));
    _el$3.addEventListener("change", (e) => props.onSeverityFilterChange(e.currentTarget.value));
    insert(_el$3, createComponent(For, {
      each: severities,
      children: (severity) => (() => {
        var _el$8 = _tmpl$2$8();
        insert(_el$8, () => severity.label);
        createRenderEffect(() => _el$8.value = severity.value);
        return _el$8;
      })()
    }));
    _el$4.addEventListener("change", (e) => props.onNamespaceFilterChange(e.currentTarget.value));
    insert(_el$4, createComponent(For, {
      get each() {
        return props.namespaces;
      },
      children: (ns) => (() => {
        var _el$9 = _tmpl$2$8();
        _el$9.value = ns;
        insert(_el$9, ns);
        return _el$9;
      })()
    }), null);
    _el$6.addEventListener("change", (e) => props.onStatusFilterChange(e.currentTarget.value));
    insert(_el$6, createComponent(For, {
      each: statuses,
      children: (status) => (() => {
        var _el$0 = _tmpl$2$8();
        insert(_el$0, () => status.label);
        createRenderEffect(() => _el$0.value = status.value);
        return _el$0;
      })()
    }));
    createRenderEffect(() => _el$2.value = props.patternFilter);
    createRenderEffect(() => _el$3.value = props.severityFilter);
    createRenderEffect(() => _el$4.value = props.namespaceFilter);
    createRenderEffect(() => _el$6.value = props.statusFilter);
    return _el$;
  })();
};

function getResourceKind(incident) {
  return incident.resource?.kind || incident.resourceKind || "Pod";
}
function getResourceName(incident) {
  return incident.resource?.name || incident.resourceName || "";
}
function getResourceNamespace(incident) {
  return incident.resource?.namespace || incident.namespace || "default";
}
function navigateToPod(incident) {
  const kind = getResourceKind(incident);
  if (kind !== "Pod") {
    addNotification("This incident is not related to a Pod", "warning");
    return;
  }
  const resourceName = getResourceName(incident);
  const parts = resourceName.split("/");
  const podName = parts[0];
  const namespace = getResourceNamespace(incident);
  setNamespace(namespace);
  setNamespaces([namespace]);
  setCurrentView("pods");
  sessionStorage.setItem("kubegraf-highlight-pod", podName);
  sessionStorage.setItem("kubegraf-pod-namespace", namespace);
  addNotification(`Navigating to pod: ${podName} in namespace ${namespace}`, "info");
}
function openPodLogs(incident, onOpenLogs) {
  const kind = getResourceKind(incident);
  if (kind !== "Pod") {
    addNotification("This incident is not related to a Pod", "warning");
    return;
  }
  const resourceName = getResourceName(incident);
  const parts = resourceName.split("/");
  const podName = parts[0];
  const namespace = getResourceNamespace(incident);
  setNamespace(namespace);
  setNamespaces([namespace]);
  setCurrentView("pods");
  sessionStorage.setItem("kubegraf-open-logs-pod", podName);
  sessionStorage.setItem("kubegraf-open-logs-namespace", namespace);
  sessionStorage.setItem("kubegraf-open-logs-flag", "true");
  addNotification(`Opening logs for pod: ${podName}`, "info");
}
function navigateToEvent(incident) {
  const resourceName = getResourceName(incident);
  const namespace = getResourceNamespace(incident);
  const resourceKind = getResourceKind(incident);
  const parts = resourceName.split("/");
  const podName = parts[0];
  setNamespace(namespace);
  setNamespaces([namespace]);
  setCurrentView("monitoredevents");
  sessionStorage.setItem("kubegraf-event-filter-resource", podName);
  sessionStorage.setItem("kubegraf-event-filter-namespace", namespace);
  sessionStorage.setItem("kubegraf-event-filter-kind", resourceKind);
  addNotification(`Viewing events for ${resourceKind}: ${podName} in namespace ${namespace}`, "info");
}

var _tmpl$$7 = /* @__PURE__ */ template(`<button style="padding:4px 12px;font-size:11px;border-radius:12px;border:none;color:#fff;cursor:pointer;font-weight:600">`), _tmpl$2$7 = /* @__PURE__ */ template(`<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;padding:12px;border-bottom:1px solid var(--border-color)"><div style=text-align:center><div style=font-size:20px;font-weight:700;color:var(--text-primary)></div><div style=font-size:10px;color:var(--text-muted)>Total</div></div><div style=text-align:center><div style=font-size:20px;font-weight:700;color:#28a745></div><div style=font-size:10px;color:var(--text-muted)>Success</div></div><div style=text-align:center><div style=font-size:20px;font-weight:700;color:#dc3545></div><div style=font-size:10px;color:var(--text-muted)>Failed</div></div><div style=text-align:center><div style=font-size:20px;font-weight:700;color:#ffc107></div><div style=font-size:10px;color:var(--text-muted)>Rolled Back`), _tmpl$3$7 = /* @__PURE__ */ template(`<div style="padding:12px;display:flex;gap:16px;font-size:11px;color:var(--text-muted);border-bottom:1px solid var(--border-color)"><span>🔄 Active: </span><span>📋 Queued: </span><span>⏳ In Cooldown: `), _tmpl$4$7 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:10px>Loading...`), _tmpl$5$7 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:10px;font-size:12px>No decisions yet`), _tmpl$6$6 = /* @__PURE__ */ template(`<div style=max-height:200px;overflow-y:auto>`), _tmpl$7$6 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)"><div style="padding:12px 16px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center"><h4 style=margin:0;color:var(--text-primary);font-size:14px;font-weight:600>🤖 Auto-Remediation</h4></div><div style=padding:12px><h5 style="margin:0 0 8px;font-size:12px;color:var(--text-secondary)">Recent Decisions`), _tmpl$8$6 = /* @__PURE__ */ template(`<div style=padding:8px;border-radius:4px;background:var(--bg-secondary);margin-bottom:6px;font-size:11px><div style=display:flex;justify-content:space-between;margin-bottom:4px><span style=font-weight:600;text-transform:uppercase></span><span style=color:var(--text-muted)></span></div><div style=color:var(--text-secondary);margin-bottom:4px></div><div style=color:var(--text-muted);display:flex;gap:8px><span>Confidence: <!>%</span><span>Success Rate: <!>%</span><span>`);
const AutoRemediationPanel = () => {
  const [toggling, setToggling] = createSignal(false);
  const [status, {
    refetch: refetchStatus
  }] = createResource(async () => {
    try {
      const response = await fetch("/api/v2/auto-remediation/status");
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch auto-remediation status:", e);
      return null;
    }
  });
  const [decisions] = createResource(async () => {
    try {
      const response = await fetch("/api/v2/auto-remediation/decisions");
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch decisions:", e);
      return [];
    }
  });
  const toggleAutoRemediation = async () => {
    setToggling(true);
    const currentlyEnabled = status()?.enabled;
    const endpoint = currentlyEnabled ? "/api/v2/auto-remediation/disable" : "/api/v2/auto-remediation/enable";
    try {
      await fetch(endpoint, {
        method: "POST"
      });
      refetchStatus();
    } catch (e) {
      console.error("Failed to toggle auto-remediation:", e);
    } finally {
      setToggling(false);
    }
  };
  const getDecisionColor = (decision) => {
    switch (decision) {
      case "execute":
        return "#28a745";
      case "skip":
        return "#6c757d";
      case "blocked":
        return "#dc3545";
      case "cooldown":
        return "#ffc107";
      default:
        return "var(--text-secondary)";
    }
  };
  const getAutonomyLabel = (level) => {
    switch (level) {
      case 0:
        return "Observe";
      case 1:
        return "Recommend";
      case 2:
        return "Propose";
      case 3:
        return "Auto-Execute";
      default:
        return "Unknown";
    }
  };
  return (() => {
    var _el$ = _tmpl$7$6(), _el$2 = _el$.firstChild; _el$2.firstChild; var _el$23 = _el$2.nextSibling; _el$23.firstChild;
    insert(_el$2, createComponent(Show, {
      get when() {
        return status();
      },
      get children() {
        var _el$4 = _tmpl$$7();
        _el$4.$$click = toggleAutoRemediation;
        insert(_el$4, () => status()?.enabled ? "● Enabled" : "○ Disabled");
        createRenderEffect((_p$) => {
          var _v$ = toggling(), _v$2 = status()?.enabled ? "#28a745" : "#6c757d", _v$3 = toggling() ? 0.6 : 1;
          _v$ !== _p$.e && (_el$4.disabled = _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$4, "background", _p$.t = _v$2);
          _v$3 !== _p$.a && setStyleProperty(_el$4, "opacity", _p$.a = _v$3);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$4;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return status();
      },
      get children() {
        return [(() => {
          var _el$5 = _tmpl$2$7(), _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild; _el$0.nextSibling; var _el$10 = _el$9.nextSibling, _el$11 = _el$10.firstChild; _el$11.nextSibling; var _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild; _el$14.nextSibling;
          insert(_el$7, () => status()?.totalExecutions || 0);
          insert(_el$0, () => status()?.successfulExecutions || 0);
          insert(_el$11, () => status()?.failedExecutions || 0);
          insert(_el$14, () => status()?.rolledBackExecutions || 0);
          return _el$5;
        })(), (() => {
          var _el$16 = _tmpl$3$7(), _el$17 = _el$16.firstChild; _el$17.firstChild; var _el$19 = _el$17.nextSibling; _el$19.firstChild; var _el$21 = _el$19.nextSibling; _el$21.firstChild;
          insert(_el$17, () => status()?.activeExecutions || 0, null);
          insert(_el$19, () => status()?.queuedIncidents || 0, null);
          insert(_el$21, () => status()?.cooldownResources || 0, null);
          return _el$16;
        })()];
      }
    }), _el$23);
    insert(_el$23, createComponent(Show, {
      get when() {
        return decisions.loading;
      },
      get children() {
        return _tmpl$4$7();
      }
    }), null);
    insert(_el$23, createComponent(Show, {
      get when() {
        return memo(() => !!!decisions.loading)() && (!decisions() || decisions()?.length === 0);
      },
      get children() {
        return _tmpl$5$7();
      }
    }), null);
    insert(_el$23, createComponent(Show, {
      get when() {
        return memo(() => !!(!decisions.loading && decisions()))() && decisions().length > 0;
      },
      get children() {
        var _el$27 = _tmpl$6$6();
        insert(_el$27, () => decisions()?.slice(0, 10).map((decision) => (() => {
          var _el$28 = _tmpl$8$6(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.nextSibling, _el$32 = _el$29.nextSibling, _el$33 = _el$32.nextSibling, _el$34 = _el$33.firstChild, _el$35 = _el$34.firstChild, _el$37 = _el$35.nextSibling; _el$37.nextSibling; var _el$38 = _el$34.nextSibling, _el$39 = _el$38.firstChild, _el$41 = _el$39.nextSibling; _el$41.nextSibling; var _el$42 = _el$38.nextSibling;
          insert(_el$30, () => decision.decision);
          insert(_el$31, () => new Date(decision.decidedAt).toLocaleTimeString());
          insert(_el$32, () => decision.reason);
          insert(_el$34, () => Math.round(decision.confidence * 100), _el$37);
          insert(_el$38, () => Math.round(decision.successRate * 100), _el$41);
          insert(_el$42, () => getAutonomyLabel(decision.autonomyLevel));
          createRenderEffect((_$p) => setStyleProperty(_el$30, "color", getDecisionColor(decision.decision)));
          return _el$28;
        })()));
        return _el$27;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$6 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>Loading clusters...`), _tmpl$2$6 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>No incident clusters learned yet`), _tmpl$3$6 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:column;gap:10px>`), _tmpl$4$6 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>Loading patterns...`), _tmpl$5$6 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>No patterns learned yet`), _tmpl$6$5 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>Loading trends...`), _tmpl$7$5 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>No trend data available`), _tmpl$8$5 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)"><div style="padding:12px 16px;border-bottom:1px solid var(--border-color)"><h4 style=margin:0;color:var(--text-primary);font-size:14px;font-weight:600>🧠 Learning Intelligence</h4></div><div style="display:flex;border-bottom:1px solid var(--border-color)"></div><div style=padding:12px;max-height:350px;overflow-y:auto>`), _tmpl$9$5 = /* @__PURE__ */ template(`<button style="flex:1;padding:10px 16px;border:none;cursor:pointer;font-size:12px;font-weight:500;text-transform:capitalize">`), _tmpl$0$3 = /* @__PURE__ */ template(`<div style=font-size:11px;color:var(--text-secondary);margin-bottom:6px>Common causes: `), _tmpl$1$2 = /* @__PURE__ */ template(`<span>Best fix: `), _tmpl$10$2 = /* @__PURE__ */ template(`<div style="background:var(--bg-secondary);padding:12px;border-radius:6px;border:1px solid var(--border-color)"><div style=display:flex;justify-content:space-between;margin-bottom:8px><span style=font-size:12px;font-weight:600;color:var(--text-primary)></span><span style="font-size:10px;padding:2px 6px;border-radius:3px;background:var(--accent-primary)20;color:var(--accent-primary);font-weight:600"> incidents</span></div><div style=display:flex;gap:12px;font-size:10px;color:var(--text-muted)><span>Success: <!>%`), _tmpl$11$2 = /* @__PURE__ */ template(`<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:#ff6b6b20;color:#ff6b6b;font-weight:600">⚠️ Anomaly`), _tmpl$12$1 = /* @__PURE__ */ template(`<div style="background:var(--bg-secondary);padding:12px;border-radius:6px;border:1px solid var(--border-color)"><div style=display:flex;justify-content:space-between;margin-bottom:6px><span style=font-size:12px;font-weight:600;color:var(--text-primary)></span><div style=display:flex;gap:6px><span style="font-size:10px;padding:2px 6px;border-radius:3px;background:var(--bg-card);color:var(--text-muted)">% conf</span></div></div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:6px></div><div style=font-size:10px;color:var(--text-muted)>Seen <!> times • Based on `), _tmpl$13$1 = /* @__PURE__ */ template(`<div style="background:var(--bg-secondary);padding:12px;border-radius:6px;border:1px solid var(--border-color)"><div style=display:flex;justify-content:space-between;margin-bottom:8px><span style=font-size:12px;font-weight:600;color:var(--text-primary)></span><span style=font-size:11px;font-weight:600> </span></div><div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;font-size:10px"><div style=text-align:center;padding:6px;background:var(--bg-card);border-radius:4px><div style=color:var(--text-muted);margin-bottom:2px>24h</div><div style=color:var(--text-primary);font-weight:600> incidents</div></div><div style=text-align:center;padding:6px;background:var(--bg-card);border-radius:4px><div style=color:var(--text-muted);margin-bottom:2px>7d</div><div style=color:var(--text-primary);font-weight:600> incidents</div></div><div style=text-align:center;padding:6px;background:var(--bg-card);border-radius:4px><div style=color:var(--text-muted);margin-bottom:2px>30d</div><div style=color:var(--text-primary);font-weight:600> incidents`);
const LearningDashboard = () => {
  const [activeTab, setActiveTab] = createSignal("clusters");
  const [clusters] = createResource(async () => {
    try {
      const response = await fetch("/api/v2/learning/clusters");
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch clusters:", e);
      return [];
    }
  });
  const [patterns] = createResource(async () => {
    try {
      const response = await fetch("/api/v2/learning/patterns?anomalies=true");
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch patterns:", e);
      return [];
    }
  });
  const [trends] = createResource(async () => {
    try {
      const response = await fetch("/api/v2/learning/trends");
      if (!response.ok) return {};
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch trends:", e);
      return {};
    }
  });
  const getTrendIcon = (trend) => {
    switch (trend) {
      case "increasing":
        return "📈";
      case "decreasing":
        return "📉";
      case "stable":
        return "➡️";
      default:
        return "❓";
    }
  };
  const getTrendColor = (trend) => {
    switch (trend) {
      case "increasing":
        return "#dc3545";
      case "decreasing":
        return "#28a745";
      case "stable":
        return "#6c757d";
      default:
        return "var(--text-secondary)";
    }
  };
  return (() => {
    var _el$ = _tmpl$8$5(), _el$2 = _el$.firstChild; _el$2.firstChild; var _el$4 = _el$2.nextSibling, _el$5 = _el$4.nextSibling;
    insert(_el$4, () => ["clusters", "patterns", "trends"].map((tab) => (() => {
      var _el$13 = _tmpl$9$5();
      _el$13.$$click = () => setActiveTab(tab);
      insert(_el$13, tab === "clusters" && "🔗 ", null);
      insert(_el$13, tab === "patterns" && "🎯 ", null);
      insert(_el$13, tab === "trends" && "📊 ", null);
      insert(_el$13, tab, null);
      createRenderEffect((_p$) => {
        var _v$ = activeTab() === tab ? "var(--bg-secondary)" : "transparent", _v$2 = activeTab() === tab ? "2px solid var(--accent-primary)" : "2px solid transparent", _v$3 = activeTab() === tab ? "var(--accent-primary)" : "var(--text-secondary)";
        _v$ !== _p$.e && setStyleProperty(_el$13, "background", _p$.e = _v$);
        _v$2 !== _p$.t && setStyleProperty(_el$13, "border-bottom", _p$.t = _v$2);
        _v$3 !== _p$.a && setStyleProperty(_el$13, "color", _p$.a = _v$3);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      });
      return _el$13;
    })()));
    insert(_el$5, createComponent(Show, {
      get when() {
        return activeTab() === "clusters";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return clusters.loading;
          },
          get children() {
            return _tmpl$$6();
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!!clusters.loading)() && (!clusters() || clusters()?.length === 0);
          },
          get children() {
            return _tmpl$2$6();
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!clusters.loading && clusters()))() && clusters().length > 0;
          },
          get children() {
            var _el$8 = _tmpl$3$6();
            insert(_el$8, createComponent(For, {
              get each() {
                return clusters();
              },
              children: (cluster) => (() => {
                var _el$14 = _tmpl$10$2(), _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$17.firstChild, _el$21 = _el$15.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.firstChild, _el$25 = _el$23.nextSibling; _el$25.nextSibling;
                insert(_el$16, () => cluster.pattern);
                insert(_el$17, () => cluster.incidentCount, _el$18);
                insert(_el$14, createComponent(Show, {
                  get when() {
                    return memo(() => !!cluster.commonCauses)() && cluster.commonCauses.length > 0;
                  },
                  get children() {
                    var _el$19 = _tmpl$0$3(); _el$19.firstChild;
                    insert(_el$19, () => cluster.commonCauses.slice(0, 2).join(", "), null);
                    return _el$19;
                  }
                }), _el$21);
                insert(_el$22, () => Math.round(cluster.successRate * 100), _el$25);
                insert(_el$21, createComponent(Show, {
                  get when() {
                    return cluster.bestRunbook;
                  },
                  get children() {
                    var _el$26 = _tmpl$1$2(); _el$26.firstChild;
                    insert(_el$26, () => cluster.bestRunbook, null);
                    return _el$26;
                  }
                }), null);
                return _el$14;
              })()
            }));
            return _el$8;
          }
        })];
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return activeTab() === "patterns";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return patterns.loading;
          },
          get children() {
            return _tmpl$4$6();
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!!patterns.loading)() && (!patterns() || patterns()?.length === 0);
          },
          get children() {
            return _tmpl$5$6();
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!patterns.loading && patterns()))() && patterns().length > 0;
          },
          get children() {
            var _el$1 = _tmpl$3$6();
            insert(_el$1, createComponent(For, {
              get each() {
                return patterns();
              },
              children: (pattern) => (() => {
                var _el$28 = _tmpl$12$1(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.nextSibling, _el$33 = _el$31.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$29.nextSibling, _el$36 = _el$35.nextSibling, _el$37 = _el$36.firstChild, _el$39 = _el$37.nextSibling; _el$39.nextSibling;
                insert(_el$30, () => pattern.name);
                insert(_el$31, createComponent(Show, {
                  get when() {
                    return pattern.isAnomaly;
                  },
                  get children() {
                    return _tmpl$11$2();
                  }
                }), _el$33);
                insert(_el$33, () => Math.round(pattern.confidence * 100), _el$34);
                insert(_el$35, () => pattern.description);
                insert(_el$36, () => pattern.occurrences, _el$39);
                insert(_el$36, () => pattern.basePattern, null);
                createRenderEffect((_$p) => setStyleProperty(_el$28, "border-left", pattern.isAnomaly ? "3px solid #ff6b6b" : "3px solid var(--accent-primary)"));
                return _el$28;
              })()
            }));
            return _el$1;
          }
        })];
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return activeTab() === "trends";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return trends.loading;
          },
          get children() {
            return _tmpl$6$5();
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!!trends.loading)() && (!trends() || Object.keys(trends() || {}).length === 0);
          },
          get children() {
            return _tmpl$7$5();
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!trends.loading && trends()))() && Object.keys(trends()).length > 0;
          },
          get children() {
            var _el$12 = _tmpl$3$6();
            insert(_el$12, createComponent(For, {
              get each() {
                return Object.entries(trends());
              },
              children: ([pattern, trend]) => (() => {
                var _el$40 = _tmpl$13$1(), _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$44 = _el$43.firstChild, _el$45 = _el$41.nextSibling, _el$46 = _el$45.firstChild, _el$47 = _el$46.firstChild, _el$48 = _el$47.nextSibling, _el$49 = _el$48.firstChild, _el$50 = _el$46.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling, _el$53 = _el$52.firstChild, _el$54 = _el$50.nextSibling, _el$55 = _el$54.firstChild, _el$56 = _el$55.nextSibling, _el$57 = _el$56.firstChild;
                insert(_el$42, pattern);
                insert(_el$43, () => getTrendIcon(trend.trend), _el$44);
                insert(_el$43, () => trend.trend, null);
                insert(_el$43, createComponent(Show, {
                  get when() {
                    return trend.changePercent !== 0;
                  },
                  get children() {
                    return [" ", "(", memo(() => trend.changePercent > 0 ? "+" : ""), memo(() => Math.round(trend.changePercent)), "%)"];
                  }
                }), null);
                insert(_el$48, () => trend.last24h.count, _el$49);
                insert(_el$52, () => trend.last7d.count, _el$53);
                insert(_el$56, () => trend.last30d.count, _el$57);
                createRenderEffect((_$p) => setStyleProperty(_el$43, "color", getTrendColor(trend.trend)));
                return _el$40;
              })()
            }));
            return _el$12;
          }
        })];
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$5 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>Loading evidence...`), _tmpl$2$5 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>No <!> evidence found`), _tmpl$3$5 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:column;gap:8px>`), _tmpl$4$5 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)"><div style="padding:12px 16px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center"><h4 style=margin:0;color:var(--text-primary);font-size:14px;font-weight:600>📦 Evidence Pack</h4></div><div style="display:flex;border-bottom:1px solid var(--border-color);overflow-x:auto"></div><div style=padding:12px;max-height:300px;overflow-y:auto>`), _tmpl$5$5 = /* @__PURE__ */ template(`<span style="background:var(--accent-primary);color:#000;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600">`), _tmpl$6$4 = /* @__PURE__ */ template(`<button style="padding:10px 16px;border:none;cursor:pointer;font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px;white-space:nowrap"><span></span><span>`), _tmpl$7$4 = /* @__PURE__ */ template(`<span style="font-size:10px;padding:2px 6px;border-radius:3px;text-transform:uppercase;font-weight:600">`), _tmpl$8$4 = /* @__PURE__ */ template(`<div style=font-size:10px;color:var(--text-muted);margin-top:6px>`), _tmpl$9$4 = /* @__PURE__ */ template(`<div style="background:var(--bg-secondary);padding:10px 12px;border-radius:6px;border:1px solid var(--border-color)"><div style=display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px><span style=font-size:12px;font-weight:600;color:var(--text-primary)></span></div><div style=font-size:11px;color:var(--text-secondary);font-family:monospace;white-space:pre-wrap;word-break:break-all;max-height:60px;overflow:hidden>`);
const EvidencePanel = (props) => {
  const [activeTab, setActiveTab] = createSignal("events");
  const [evidencePack] = createResource(() => props.incidentId, async (id) => {
    try {
      const response = await fetch(`/api/v2/incidents/${id}/evidence`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch evidence:", e);
      return null;
    }
  });
  const tabs = [{
    id: "events",
    label: "Events",
    icon: "📢"
  }, {
    id: "logs",
    label: "Logs",
    icon: "📝"
  }, {
    id: "status",
    label: "Status",
    icon: "📊"
  }, {
    id: "metrics",
    label: "Metrics",
    icon: "📈"
  }, {
    id: "changes",
    label: "Changes",
    icon: "🔄"
  }];
  const getTabData = (tabId) => {
    const pack = evidencePack();
    if (!pack) return [];
    switch (tabId) {
      case "events":
        return Array.isArray(pack.events) ? pack.events : [];
      case "logs":
        return Array.isArray(pack.logs) ? pack.logs : [];
      case "status":
        return Array.isArray(pack.statusFacts) ? pack.statusFacts : [];
      case "metrics":
        return Array.isArray(pack.metricsFacts) ? pack.metricsFacts : [];
      case "changes":
        return Array.isArray(pack.changeHistory) ? pack.changeHistory : [];
      default:
        return [];
    }
  };
  const getSeverityColor = (type) => {
    switch (type?.toLowerCase()) {
      case "warning":
        return "#ffc107";
      case "error":
        return "#dc3545";
      case "critical":
        return "#dc3545";
      default:
        return "var(--text-secondary)";
    }
  };
  const formatTimestamp = (ts) => {
    if (!ts) return "";
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleString();
    } catch {
      return "";
    }
  };
  return (() => {
    var _el$ = _tmpl$4$5(), _el$2 = _el$.firstChild; _el$2.firstChild; var _el$4 = _el$2.nextSibling, _el$5 = _el$4.nextSibling;
    insert(_el$4, createComponent(For, {
      each: tabs,
      children: (tab) => {
        const count = () => getTabData(tab.id).length;
        return (() => {
          var _el$10 = _tmpl$6$4(), _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling;
          _el$10.$$click = () => setActiveTab(tab.id);
          insert(_el$11, () => tab.icon);
          insert(_el$12, () => tab.label);
          insert(_el$10, createComponent(Show, {
            get when() {
              return count() > 0;
            },
            get children() {
              var _el$13 = _tmpl$5$5();
              insert(_el$13, count);
              return _el$13;
            }
          }), null);
          createRenderEffect((_p$) => {
            var _v$ = activeTab() === tab.id ? "var(--bg-secondary)" : "transparent", _v$2 = activeTab() === tab.id ? "2px solid var(--accent-primary)" : "2px solid transparent", _v$3 = activeTab() === tab.id ? "var(--accent-primary)" : "var(--text-secondary)";
            _v$ !== _p$.e && setStyleProperty(_el$10, "background", _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$10, "border-bottom", _p$.t = _v$2);
            _v$3 !== _p$.a && setStyleProperty(_el$10, "color", _p$.a = _v$3);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          return _el$10;
        })();
      }
    }));
    insert(_el$5, createComponent(Show, {
      get when() {
        return evidencePack.loading;
      },
      get children() {
        return _tmpl$$5();
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return memo(() => !!!evidencePack.loading)() && getTabData(activeTab()).length === 0;
      },
      get children() {
        var _el$7 = _tmpl$2$5(), _el$8 = _el$7.firstChild, _el$0 = _el$8.nextSibling; _el$0.nextSibling;
        insert(_el$7, activeTab, _el$0);
        return _el$7;
      }
    }), null);
    insert(_el$5, createComponent(Show, {
      get when() {
        return memo(() => !!!evidencePack.loading)() && getTabData(activeTab()).length > 0;
      },
      get children() {
        var _el$1 = _tmpl$3$5();
        insert(_el$1, createComponent(For, {
          get each() {
            return getTabData(activeTab());
          },
          children: (item) => (() => {
            var _el$14 = _tmpl$9$4(), _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$18 = _el$15.nextSibling;
            insert(_el$16, () => item.reason || item.key || item.type || "Evidence");
            insert(_el$15, createComponent(Show, {
              get when() {
                return item.type;
              },
              get children() {
                var _el$17 = _tmpl$7$4();
                insert(_el$17, () => item.type);
                createRenderEffect((_p$) => {
                  var _v$4 = getSeverityColor(item.type) + "20", _v$5 = getSeverityColor(item.type);
                  _v$4 !== _p$.e && setStyleProperty(_el$17, "background", _p$.e = _v$4);
                  _v$5 !== _p$.t && setStyleProperty(_el$17, "color", _p$.t = _v$5);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0
                });
                return _el$17;
              }
            }), null);
            insert(_el$18, () => item.message || item.value || "");
            insert(_el$14, createComponent(Show, {
              get when() {
                return item.time;
              },
              get children() {
                var _el$19 = _tmpl$8$4();
                insert(_el$19, () => formatTimestamp(item.time));
                return _el$19;
              }
            }), null);
            return _el$14;
          })()
        }));
        return _el$1;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$4 = /* @__PURE__ */ template(`<span style="font-size:11px;color:var(--text-muted);background:var(--bg-secondary);padding:2px 8px;border-radius:4px"> available`), _tmpl$2$4 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>Loading runbooks...`), _tmpl$3$4 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>No runbooks available for this incident pattern`), _tmpl$4$4 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:column;gap:10px>`), _tmpl$5$4 = /* @__PURE__ */ template(`<div style=color:var(--error-color);font-size:12px>❌ `), _tmpl$6$3 = /* @__PURE__ */ template(`<div style=font-size:11px;color:var(--text-secondary);margin-bottom:8px>`), _tmpl$7$3 = /* @__PURE__ */ template(`<div style=background:var(--bg-code);padding:8px;border-radius:4px;font-family:monospace;font-size:11px;color:var(--text-code);margin-bottom:8px><div style=color:var(--text-muted);margin-bottom:4px>Dry Run:`), _tmpl$8$3 = /* @__PURE__ */ template(`<div style=background:var(--bg-code);padding:8px;border-radius:4px;font-family:monospace;font-size:11px;color:var(--text-code)><div style=color:var(--text-muted);margin-bottom:4px>Apply:`), _tmpl$9$3 = /* @__PURE__ */ template(`<div style="padding:12px;border-top:1px solid var(--border-color);background:var(--bg-secondary)"><h5 style="margin:0 0 8px;font-size:12px;color:var(--text-primary)">Fix Preview`), _tmpl$0$2 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)"><div style="padding:12px 16px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center"><h4 style=margin:0;color:var(--text-primary);font-size:14px;font-weight:600>📋 Available Runbooks</h4></div><div style=padding:12px;max-height:300px;overflow-y:auto>`), _tmpl$1$1 = /* @__PURE__ */ template(`<div style=display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px>`), _tmpl$10$1 = /* @__PURE__ */ template(`<div style="padding:12px;border-radius:6px;cursor:pointer;transition:all 0.2s"><div style=display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px><div><div style=font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px></div><div style=font-size:11px;color:var(--text-secondary)></div></div><div style=display:flex;gap:6px><span style="font-size:10px;padding:2px 6px;border-radius:3px;text-transform:uppercase;font-weight:600"> risk</span></div></div><div style=display:flex;gap:12px;margin-bottom:8px;font-size:11px;color:var(--text-muted)><span>✅ <!>% success</span><span>🔄 <!> runs</span><span>🤖 </span></div><div style=display:flex;gap:8px;margin-top:8px><button style="padding:6px 12px;font-size:11px;border-radius:4px;border:1px solid var(--accent-primary);background:transparent;color:var(--accent-primary);cursor:pointer;font-weight:600">`), _tmpl$11$1 = /* @__PURE__ */ template(`<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:var(--bg-card);color:var(--text-muted)">`);
const RunbookSelector = (props) => {
  const [selectedRunbook, setSelectedRunbook] = createSignal(null);
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [previewResult, setPreviewResult] = createSignal(null);
  const [runbooks] = createResource(() => props.incidentId, async (id) => {
    try {
      const response = await fetch(`/api/v2/incidents/${id}/runbooks`);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch runbooks:", e);
      return [];
    }
  });
  const getRiskColor = (risk) => {
    switch (risk) {
      case "low":
        return "#28a745";
      case "medium":
        return "#ffc107";
      case "high":
        return "#dc3545";
      case "critical":
        return "#721c24";
      default:
        return "var(--text-secondary)";
    }
  };
  const getAutonomyLabel = (level) => {
    switch (level) {
      case 0:
        return "Observe";
      case 1:
        return "Recommend";
      case 2:
        return "Propose";
      case 3:
        return "Auto-Execute";
      default:
        return "Unknown";
    }
  };
  const handlePreview = async (runbook) => {
    setSelectedRunbook(runbook.id);
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/fix-preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          runbookId: runbook.id
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      setPreviewResult(result);
      props.onPreviewFix?.(runbook.id);
    } catch (e) {
      console.error("Failed to preview fix:", e);
      setPreviewResult({
        error: "Failed to generate preview"
      });
    } finally {
      setPreviewLoading(false);
    }
  };
  return (() => {
    var _el$ = _tmpl$0$2(), _el$2 = _el$.firstChild; _el$2.firstChild; var _el$6 = _el$2.nextSibling;
    insert(_el$2, createComponent(Show, {
      get when() {
        return runbooks();
      },
      get children() {
        var _el$4 = _tmpl$$4(), _el$5 = _el$4.firstChild;
        insert(_el$4, () => runbooks()?.length || 0, _el$5);
        return _el$4;
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return runbooks.loading;
      },
      get children() {
        return _tmpl$2$4();
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return memo(() => !!!runbooks.loading)() && (!runbooks() || runbooks()?.length === 0);
      },
      get children() {
        return _tmpl$3$4();
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return memo(() => !!(!runbooks.loading && runbooks()))() && runbooks().length > 0;
      },
      get children() {
        var _el$9 = _tmpl$4$4();
        insert(_el$9, createComponent(For, {
          get each() {
            return runbooks();
          },
          children: (runbook) => (() => {
            var _el$17 = _tmpl$10$1(), _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$18.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.firstChild, _el$29 = _el$27.nextSibling; _el$29.nextSibling; var _el$30 = _el$26.nextSibling, _el$31 = _el$30.firstChild, _el$33 = _el$31.nextSibling; _el$33.nextSibling; var _el$34 = _el$30.nextSibling; _el$34.firstChild; var _el$37 = _el$25.nextSibling, _el$38 = _el$37.firstChild;
            _el$17.$$click = () => {
              setSelectedRunbook(runbook.id);
              props.onSelectRunbook?.(runbook);
            };
            insert(_el$20, () => runbook.name);
            insert(_el$21, () => runbook.description);
            insert(_el$23, () => runbook.risk, _el$24);
            insert(_el$26, () => Math.round(runbook.successRate * 100), _el$29);
            insert(_el$30, () => runbook.executionCount, _el$33);
            insert(_el$34, () => getAutonomyLabel(runbook.autonomyLevel), null);
            insert(_el$17, createComponent(Show, {
              get when() {
                return memo(() => !!runbook.tags)() && runbook.tags.length > 0;
              },
              get children() {
                var _el$36 = _tmpl$1$1();
                insert(_el$36, createComponent(For, {
                  get each() {
                    return runbook.tags;
                  },
                  children: (tag) => (() => {
                    var _el$39 = _tmpl$11$1();
                    insert(_el$39, tag);
                    return _el$39;
                  })()
                }));
                return _el$36;
              }
            }), _el$37);
            _el$38.$$click = (e) => {
              e.stopPropagation();
              handlePreview(runbook);
            };
            insert(_el$38, () => previewLoading() && selectedRunbook() === runbook.id ? "Loading..." : "👁️ Preview");
            createRenderEffect((_p$) => {
              var _v$ = selectedRunbook() === runbook.id ? "var(--accent-primary)10" : "var(--bg-secondary)", _v$2 = selectedRunbook() === runbook.id ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)", _v$3 = getRiskColor(runbook.risk) + "20", _v$4 = getRiskColor(runbook.risk), _v$5 = previewLoading() && selectedRunbook() === runbook.id, _v$6 = previewLoading() && selectedRunbook() === runbook.id ? 0.6 : 1;
              _v$ !== _p$.e && setStyleProperty(_el$17, "background", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$17, "border", _p$.t = _v$2);
              _v$3 !== _p$.a && setStyleProperty(_el$23, "background", _p$.a = _v$3);
              _v$4 !== _p$.o && setStyleProperty(_el$23, "color", _p$.o = _v$4);
              _v$5 !== _p$.i && (_el$38.disabled = _p$.i = _v$5);
              _v$6 !== _p$.n && setStyleProperty(_el$38, "opacity", _p$.n = _v$6);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0,
              n: void 0
            });
            return _el$17;
          })()
        }));
        return _el$9;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return previewResult();
      },
      get children() {
        var _el$0 = _tmpl$9$3(); _el$0.firstChild;
        insert(_el$0, createComponent(Show, {
          get when() {
            return previewResult()?.error;
          },
          get children() {
            var _el$10 = _tmpl$5$4(); _el$10.firstChild;
            insert(_el$10, () => previewResult()?.error, null);
            return _el$10;
          }
        }), null);
        insert(_el$0, createComponent(Show, {
          get when() {
            return !previewResult()?.error;
          },
          get children() {
            return [(() => {
              var _el$12 = _tmpl$6$3();
              insert(_el$12, () => previewResult()?.description);
              return _el$12;
            })(), createComponent(Show, {
              get when() {
                return previewResult()?.dryRunCmd;
              },
              get children() {
                var _el$13 = _tmpl$7$3(); _el$13.firstChild;
                insert(_el$13, () => previewResult()?.dryRunCmd, null);
                return _el$13;
              }
            }), createComponent(Show, {
              get when() {
                return previewResult()?.applyCmd;
              },
              get children() {
                var _el$15 = _tmpl$8$3(); _el$15.firstChild;
                insert(_el$15, () => previewResult()?.applyCmd, null);
                return _el$15;
              }
            })];
          }
        }), null);
        return _el$0;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$3 = /* @__PURE__ */ template(`<span style="font-size:11px;color:var(--text-muted);background:var(--bg-secondary);padding:2px 8px;border-radius:4px"> found`), _tmpl$2$3 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>Searching for similar incidents...`), _tmpl$3$3 = /* @__PURE__ */ template(`<div style=color:var(--text-muted);text-align:center;padding:20px>No similar incidents found`), _tmpl$4$3 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:column;gap:8px>`), _tmpl$5$3 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)"><div style="padding:12px 16px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center"><h4 style=margin:0;color:var(--text-primary);font-size:14px;font-weight:600>🔗 Similar Incidents</h4></div><div style=padding:12px;max-height:200px;overflow-y:auto>`), _tmpl$6$2 = /* @__PURE__ */ template(`<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:#28a74520;color:#28a745;font-weight:600">✓ Resolved`), _tmpl$7$2 = /* @__PURE__ */ template(`<div style="font-size:11px;color:var(--text-secondary);padding-left:8px;border-left:2px solid var(--accent-primary)">💡 `), _tmpl$8$2 = /* @__PURE__ */ template(`<div style=font-size:11px;color:#28a745;margin-top:4px>✅ Fixed with: `), _tmpl$9$2 = /* @__PURE__ */ template(`<div style="background:var(--bg-secondary);padding:10px 12px;border-radius:6px;border:1px solid var(--border-color)"><div style=display:flex;justify-content:space-between;align-items:center;margin-bottom:6px><span style=font-size:12px;font-weight:600;color:var(--text-primary);font-family:monospace>...</span><div style=display:flex;gap:6px;align-items:center><span style="font-size:10px;padding:2px 6px;border-radius:3px;font-weight:600">% similar</span></div></div><div style=font-size:11px;color:var(--text-muted);margin-bottom:4px>Pattern: `);
const SimilarIncidents = (props) => {
  const [similarIncidents] = createResource(() => props.incidentId, async (id) => {
    try {
      const response = await fetch(`/api/v2/incidents/${id}/similar`);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch similar incidents:", e);
      return [];
    }
  });
  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.9) return "#28a745";
    if (similarity >= 0.7) return "#ffc107";
    return "#6c757d";
  };
  return (() => {
    var _el$ = _tmpl$5$3(), _el$2 = _el$.firstChild; _el$2.firstChild; var _el$6 = _el$2.nextSibling;
    insert(_el$2, createComponent(Show, {
      get when() {
        return similarIncidents();
      },
      get children() {
        var _el$4 = _tmpl$$3(), _el$5 = _el$4.firstChild;
        insert(_el$4, () => similarIncidents()?.length || 0, _el$5);
        return _el$4;
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return similarIncidents.loading;
      },
      get children() {
        return _tmpl$2$3();
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return memo(() => !!!similarIncidents.loading)() && (!similarIncidents() || similarIncidents()?.length === 0);
      },
      get children() {
        return _tmpl$3$3();
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return memo(() => !!(!similarIncidents.loading && similarIncidents()))() && similarIncidents().length > 0;
      },
      get children() {
        var _el$9 = _tmpl$4$3();
        insert(_el$9, createComponent(For, {
          get each() {
            return similarIncidents();
          },
          children: (incident) => (() => {
            var _el$0 = _tmpl$9$2(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$10.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$16 = _el$1.nextSibling; _el$16.firstChild;
            _el$0.$$click = () => props.onViewIncident?.(incident.incidentId);
            insert(_el$10, () => incident.incidentId.substring(0, 20), _el$11);
            insert(_el$13, () => Math.round(incident.similarity * 100), _el$14);
            insert(_el$12, createComponent(Show, {
              get when() {
                return incident.wasResolved;
              },
              get children() {
                return _tmpl$6$2();
              }
            }), null);
            insert(_el$16, () => incident.pattern, null);
            insert(_el$0, createComponent(Show, {
              get when() {
                return incident.resolution;
              },
              get children() {
                var _el$18 = _tmpl$7$2(); _el$18.firstChild;
                insert(_el$18, () => incident.resolution, null);
                return _el$18;
              }
            }), null);
            insert(_el$0, createComponent(Show, {
              get when() {
                return incident.successfulFix;
              },
              get children() {
                var _el$20 = _tmpl$8$2(); _el$20.firstChild;
                insert(_el$20, () => incident.successfulFix, null);
                return _el$20;
              }
            }), null);
            createRenderEffect((_p$) => {
              var _v$ = props.onViewIncident ? "pointer" : "default", _v$2 = getSimilarityColor(incident.similarity) + "20", _v$3 = getSimilarityColor(incident.similarity);
              _v$ !== _p$.e && setStyleProperty(_el$0, "cursor", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$13, "background", _p$.t = _v$2);
              _v$3 !== _p$.a && setStyleProperty(_el$13, "color", _p$.a = _v$3);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0
            });
            return _el$0;
          })()
        }));
        return _el$9;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$2 = /* @__PURE__ */ template(`<div style=display:flex;align-items:center;justify-content:center;padding:40px;color:var(--text-secondary)><div class=spinner style=margin-right:12px></div>Loading change history...`), _tmpl$2$2 = /* @__PURE__ */ template(`<div style="background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.3);border-radius:8px;padding:16px;color:var(--error-color)"><strong>Error:</strong> `), _tmpl$3$2 = /* @__PURE__ */ template(`<div style=background:var(--bg-secondary);border-radius:8px;padding:32px;text-align:center;color:var(--text-secondary)><div style=font-size:32px;margin-bottom:12px>📭</div><h4 style="margin:0 0 8px;color:var(--text-primary)">No Changes Detected</h4><p style=margin:0;font-size:13px>No configuration changes were detected in the hour before this incident. This might indicate the issue was caused by external factors or traffic patterns.`), _tmpl$4$2 = /* @__PURE__ */ template(`<div style=margin-bottom:16px><p style=margin:0;font-size:13px;color:var(--text-secondary)>The following changes occurred in the hour before this incident was detected. These changes might have contributed to the issue.`), _tmpl$5$2 = /* @__PURE__ */ template(`<div style=position:relative;padding-left:24px><div style=position:absolute;left:8px;top:12px;bottom:12px;width:2px;background:var(--border-color)>`), _tmpl$6$1 = /* @__PURE__ */ template(`<div style=margin-top:16px;text-align:center;font-size:11px;color:var(--text-muted)>Showing <!> change(s) from the last hour before this incident`), _tmpl$7$1 = /* @__PURE__ */ template(`<div>`), _tmpl$8$1 = /* @__PURE__ */ template(`<div style="background:var(--bg-secondary);padding:10px 12px;border-radius:6px;font-size:12px;color:var(--text-secondary);line-height:1.5">`), _tmpl$9$1 = /* @__PURE__ */ template(`<div style=margin-top:8px;font-size:11px;color:var(--text-muted)><strong>Reason:</strong> `), _tmpl$0$1 = /* @__PURE__ */ template(`<div style=position:relative;margin-bottom:16px><div style="position:absolute;left:-20px;top:4px;width:12px;height:12px;border-radius:50%;border:2px solid var(--bg-primary)"></div><div style="background:var(--bg-card);border-radius:8px;padding:16px;border:1px solid var(--border-color)"><div style=display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px><div style=display:flex;align-items:center;gap:8px><span style=font-size:16px></span><span style=font-size:13px;font-weight:600;color:var(--text-primary)> on <!>/</span></div><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;text-transform:uppercase"></span></div><div style=margin-bottom:8px><span style=font-size:11px;color:var(--text-muted);margin-right:12px>📍 </span><span style=font-size:11px;color:var(--text-muted)>🕐 `);
const ChangeTimeline = (props) => {
  const [changes, setChanges] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  createEffect(() => {
    if (props.incidentId) {
      fetchChanges(props.incidentId);
    }
  });
  const fetchChanges = async (incidentId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v2/incidents/${incidentId}/changes?lookback=60`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      const changesArray = Array.isArray(data) ? data : data.changes || [];
      const formattedChanges = changesArray.map((change) => {
        if (change.Change) {
          const ch = change.Change;
          let timestamp2 = ch.Timestamp || ch.Time || (/* @__PURE__ */ new Date()).toISOString();
          if (typeof timestamp2 === "string") {
            const parsed = new Date(timestamp2);
            if (isNaN(parsed.getTime())) {
              timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
            } else {
              timestamp2 = parsed.toISOString();
            }
          } else if (timestamp2 instanceof Date) {
            timestamp2 = timestamp2.toISOString();
          }
          return {
            Type: ch.Type || ch.ChangeType || "Change",
            Timestamp: timestamp2,
            Namespace: ch.Namespace || "",
            ResourceKind: ch.ResourceKind || ch.Kind || "",
            ResourceName: ch.ResourceName || ch.Name || "",
            ChangeType: ch.ChangeType || ch.Type || "update",
            Severity: ch.Severity || (change.RelevanceScore > 0.7 ? "warning" : "info"),
            Reason: ch.Reason || "",
            Message: ch.Message || ch.Description || ""
          };
        }
        let timestamp = change.Timestamp || change.Time || (/* @__PURE__ */ new Date()).toISOString();
        if (typeof timestamp === "string") {
          const parsed = new Date(timestamp);
          if (isNaN(parsed.getTime())) {
            timestamp = (/* @__PURE__ */ new Date()).toISOString();
          } else {
            timestamp = parsed.toISOString();
          }
        } else if (timestamp instanceof Date) {
          timestamp = timestamp.toISOString();
        }
        return {
          ...change,
          Timestamp: timestamp
        };
      });
      setChanges(formattedChanges);
    } catch (err) {
      setError(err.message || "Failed to fetch changes");
      console.error("Error fetching changes:", err);
    } finally {
      setLoading(false);
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "error":
      case "critical":
        return "#dc3545";
      case "warning":
        return "#ffc107";
      case "info":
        return "#17a2b8";
      default:
        return "var(--text-secondary)";
    }
  };
  const getChangeTypeIcon = (changeType) => {
    switch (changeType?.toLowerCase()) {
      case "create":
      case "added":
        return "➕";
      case "update":
      case "modified":
        return "✏️";
      case "delete":
      case "deleted":
        return "🗑️";
      case "scale":
        return "📊";
      case "restart":
        return "🔄";
      default:
        return "📝";
    }
  };
  return (() => {
    var _el$ = _tmpl$7$1();
    insert(_el$, createComponent(Show, {
      get when() {
        return loading();
      },
      get children() {
        var _el$2 = _tmpl$$2(); _el$2.firstChild;
        return _el$2;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$4 = _tmpl$2$2(), _el$5 = _el$4.firstChild; _el$5.nextSibling;
        insert(_el$4, error, null);
        return _el$4;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!loading() && !error()))() && changes().length === 0;
      },
      get children() {
        var _el$7 = _tmpl$3$2(), _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling; _el$9.nextSibling;
        return _el$7;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!loading())() && changes().length > 0;
      },
      get children() {
        return [(() => {
          var _el$1 = _tmpl$4$2(); _el$1.firstChild;
          return _el$1;
        })(), (() => {
          var _el$11 = _tmpl$5$2(); _el$11.firstChild;
          insert(_el$11, createComponent(For, {
            get each() {
              return changes();
            },
            children: (change, index) => (() => {
              var _el$17 = _tmpl$0$1(), _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$23.firstChild, _el$26 = _el$24.nextSibling; _el$26.nextSibling; var _el$27 = _el$21.nextSibling, _el$28 = _el$20.nextSibling, _el$29 = _el$28.firstChild; _el$29.firstChild; var _el$31 = _el$29.nextSibling; _el$31.firstChild;
              insert(_el$22, () => getChangeTypeIcon(change.ChangeType));
              insert(_el$23, () => change.ChangeType || "Change", _el$24);
              insert(_el$23, () => change.ResourceKind, _el$26);
              insert(_el$23, () => change.ResourceName, null);
              insert(_el$27, () => change.Severity || "info");
              insert(_el$29, () => change.Namespace, null);
              insert(_el$31, () => {
                try {
                  const date = new Date(change.Timestamp);
                  if (isNaN(date.getTime())) {
                    return "Invalid Date";
                  }
                  return date.toLocaleString();
                } catch (e) {
                  return "Invalid Date";
                }
              }, null);
              insert(_el$19, createComponent(Show, {
                get when() {
                  return change.Message;
                },
                get children() {
                  var _el$33 = _tmpl$8$1();
                  insert(_el$33, () => change.Message);
                  return _el$33;
                }
              }), null);
              insert(_el$19, createComponent(Show, {
                get when() {
                  return change.Reason;
                },
                get children() {
                  var _el$34 = _tmpl$9$1(), _el$35 = _el$34.firstChild; _el$35.nextSibling;
                  insert(_el$34, () => change.Reason, null);
                  return _el$34;
                }
              }), null);
              createRenderEffect((_p$) => {
                var _v$ = index() === changes().length - 1 ? "0" : "16px", _v$2 = index() === changes().length - 1 ? "none" : "1px solid var(--border-color)", _v$3 = getSeverityColor(change.Severity), _v$4 = getSeverityColor(change.Severity) + "20", _v$5 = getSeverityColor(change.Severity);
                _v$ !== _p$.e && setStyleProperty(_el$17, "padding-bottom", _p$.e = _v$);
                _v$2 !== _p$.t && setStyleProperty(_el$17, "border-bottom", _p$.t = _v$2);
                _v$3 !== _p$.a && setStyleProperty(_el$18, "background", _p$.a = _v$3);
                _v$4 !== _p$.o && setStyleProperty(_el$27, "background", _p$.o = _v$4);
                _v$5 !== _p$.i && setStyleProperty(_el$27, "color", _p$.i = _v$5);
                return _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0,
                i: void 0
              });
              return _el$17;
            })()
          }), null);
          return _el$11;
        })(), (() => {
          var _el$13 = _tmpl$6$1(), _el$14 = _el$13.firstChild, _el$16 = _el$14.nextSibling; _el$16.nextSibling;
          insert(_el$13, () => changes().length, _el$16);
          return _el$13;
        })()];
      }
    }), null);
    return _el$;
  })();
};

var _tmpl$$1 = /* @__PURE__ */ template(`<span style="padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase">`), _tmpl$2$1 = /* @__PURE__ */ template(`<div style="display:flex;justify-content:center;align-items:center;padding:60px 20px;color:var(--text-secondary)"><div class=spinner style=margin-right:12px></div>Loading incident snapshot...`), _tmpl$3$1 = /* @__PURE__ */ template(`<div style="background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.3);border-radius:8px;padding:16px;color:#dc3545;margin-bottom:20px"><strong>Error:</strong> `), _tmpl$4$1 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid var(--border-color)"><h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:var(--text-primary)">Impact</h3><div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px"><div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:4px>Affected Replicas</div><div style=font-size:16px;font-weight:600;color:var(--text-primary)></div></div><div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:4px>User-Facing</div><div style=font-size:16px;font-weight:600;color:var(--text-primary)></div></div><div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:4px>Service Exposure</div><div style=font-size:16px;font-weight:600;color:var(--text-primary)></div></div><div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:4px>Namespace</div><div style=font-size:16px;font-weight:600;color:var(--text-primary)>`), _tmpl$5$1 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid var(--border-color)"><h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:var(--text-primary)">Diagnosis</h3><p style="margin:0 0 12px;color:var(--text-primary);line-height:1.6"></p><div style=margin-bottom:12px><div style=font-size:12px;color:var(--text-secondary);margin-bottom:8px>Root Causes:</div></div><div style=display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-secondary);border-radius:4px><span style=font-size:12px;color:var(--text-secondary)>Confidence:</span><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">`), _tmpl$6 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid var(--border-color)"><h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:var(--text-primary)">Why Now</h3><p style=margin:0;color:var(--text-secondary);font-size:13px;line-height:1.5>`), _tmpl$7 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid var(--border-color)"><h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:var(--text-primary)">Restart Frequency</h3><div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px"><div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:4px>Last 5 min</div><div style=font-size:18px;font-weight:600;color:var(--text-primary)></div></div><div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:4px>Last 1 hour</div><div style=font-size:18px;font-weight:600;color:var(--text-primary)></div></div><div><div style=font-size:11px;color:var(--text-secondary);margin-bottom:4px>Last 24 hours</div><div style=font-size:18px;font-weight:600;color:var(--text-primary)>`), _tmpl$8 = /* @__PURE__ */ template(`<div style="background:var(--accent-primary)10;border-radius:8px;padding:16px;margin-bottom:20px;border:2px solid var(--accent-primary)"><h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:var(--text-primary)">Recommended First Action</h3><p style="margin:0 0 12px;color:var(--text-secondary);font-size:13px"></p><button style="padding:8px 16px;background:var(--accent-primary);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:500;font-size:13px">`), _tmpl$9 = /* @__PURE__ */ template(`<div style=display:flex;justify-content:center;align-items:center;padding:40px;color:var(--text-secondary)><div class=spinner style=margin-right:12px></div>Loading <!>...`), _tmpl$0 = /* @__PURE__ */ template(`<div style=textAlign:center;padding:40px;color:var(--text-secondary);font-size:13px>Select a tab to view evidence`), _tmpl$1 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color);overflow:hidden"><div style="display:flex;border-bottom:1px solid var(--border-color);overflow:auto"></div><div style=padding:20px;min-height:200px>`), _tmpl$10 = /* @__PURE__ */ template(`<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0, 0, 0, 0.5);z-index:9998;transition:opacity 0.2s ease"><div style="position:fixed;top:0;right:0;bottom:0;width:100%;max-width:720px;background:var(--bg-primary);box-shadow:-4px 0 24px rgba(0, 0, 0, 0.3);display:flex;flex-direction:column;z-index:9999;transition:transform 0.3s ease"><div style="padding:20px 24px;border-bottom:1px solid var(--border-color);background:var(--bg-primary);position:sticky;top:0;z-index:10"><div style=display:flex;justify-content:space-between;align-items:flex-start;gap:16px><div style=flex:1><div style=display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap><span style=font-size:24px></span><span style="padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase"></span></div><div style=color:var(--text-secondary);font-size:13px;margin-bottom:4px> / <!> / </div><div style=color:var(--text-secondary);font-size:12px> occurrences</div></div><button aria-label=Close style=background:transparent;border:none;color:var(--text-secondary);cursor:pointer;padding:4px;font-size:20px;line-height:1>×</button></div></div><div style=flex:1;overflow:auto;padding:24px></div><div style="padding:16px 24px;border-top:1px solid var(--border-color);background:var(--bg-primary);position:sticky;bottom:0;display:flex;justify-content:space-between;align-items:center;gap:12px;z-index:10"><div style=display:flex;gap:8px><button style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);cursor:pointer;font-size:12px">✅ Worked</button><button style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);cursor:pointer;font-size:12px">❌ Didn't Work</button><button style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);cursor:pointer;font-size:12px">⚠️ Incorrect Cause</button></div><button style="padding:8px 16px;color:white;border:none;border-radius:6px;font-weight:500;font-size:13px">`), _tmpl$11 = /* @__PURE__ */ template(`<div style=margin-bottom:8px;padding:8px;border-radius:4px><div style=display:flex;justify-content:space-between;align-items:center;margin-bottom:4px><span style=color:var(--text-primary)>: </span><span style=font-size:11px;color:var(--text-secondary)>%`), _tmpl$12 = /* @__PURE__ */ template(`<button style="padding:12px 16px;border:none;cursor:pointer;font-size:13px;white-space:nowrap">`), _tmpl$13 = /* @__PURE__ */ template(`<div style=textAlign:center;padding:40px;color:var(--text-secondary);font-size:13px>No logs available`), _tmpl$14 = /* @__PURE__ */ template(`<div style=max-height:400px;overflow:auto>`), _tmpl$15 = /* @__PURE__ */ template(`<div class=spinner style=margin-right:12px>`), _tmpl$16 = /* @__PURE__ */ template(`<div style=color:#dc3545>Error: `), _tmpl$17 = /* @__PURE__ */ template(`<div style=display:flex;justify-content:center;align-items:center;padding:40px;color:var(--text-secondary)>`), _tmpl$18 = /* @__PURE__ */ template(`<div style="padding:8px 12px;margin-bottom:4px;background:var(--bg-secondary);border-radius:4px;font-family:monospace;font-size:12px;color:var(--text-primary);white-space:pre-wrap;word-break:break-all"><div style=margin-bottom:4px;color:var(--text-secondary);font-size:11px></div><div>`), _tmpl$19 = /* @__PURE__ */ template(`<div style=textAlign:center;padding:40px;color:var(--text-secondary);font-size:13px>No metrics available`), _tmpl$20 = /* @__PURE__ */ template(`<div>`), _tmpl$21 = /* @__PURE__ */ template(`<div style="padding:12px;margin-bottom:8px;background:var(--bg-secondary);border-radius:6px;border:1px solid var(--border-color)"><div style=font-weight:600;color:var(--text-primary);margin-bottom:4px></div><div style=color:var(--text-secondary);font-size:12px;margin-bottom:4px></div><div style=color:var(--text-muted);font-size:11px>`);
const IncidentModalV2 = (props) => {
  const [snapshot, setSnapshot] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const [activeTab, setActiveTab] = createSignal(null);
  const [loadedTabs, setLoadedTabs] = createSignal(/* @__PURE__ */ new Set());
  const [resolving, setResolving] = createSignal(false);
  createEffect(async () => {
    if (props.isOpen && props.incident) {
      setLoading(true);
      setError(null);
      setActiveTab(null);
      setLoadedTabs(/* @__PURE__ */ new Set());
      try {
        const snap = await api.getIncidentSnapshot(props.incident.id);
        setSnapshot(snap);
        if (snap.recommendedAction) {
          setActiveTab(snap.recommendedAction.tab);
        }
      } catch (err) {
        setError(err.message || "Failed to load incident snapshot");
        console.error("Error loading snapshot:", err);
      } finally {
        setLoading(false);
      }
    }
  });
  onMount(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && props.isOpen) {
        props.onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    onCleanup(() => window.removeEventListener("keydown", handleEsc));
  });
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (!loadedTabs().has(tabId)) {
      setLoadedTabs(/* @__PURE__ */ new Set([...loadedTabs(), tabId]));
    }
  };
  const handleResolve = async () => {
    if (!props.incident) return;
    setResolving(true);
    try {
      await api.resolveIncident(props.incident.id, "Resolved by user");
      props.onClose();
    } catch (err) {
      console.error("Error resolving incident:", err);
      alert("Failed to resolve incident: " + (err.message || "Unknown error"));
    } finally {
      setResolving(false);
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "#dc3545";
      case "high":
        return "#ff6b6b";
      case "medium":
      case "warning":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "var(--text-secondary)";
    }
  };
  const getPatternIcon = (pattern) => {
    switch (pattern.toUpperCase()) {
      case "RESTART_STORM":
        return "🌪️";
      case "CRASHLOOP":
        return "💥";
      case "OOM_PRESSURE":
        return "💾";
      case "LIVENESS_FAILURE":
      case "READINESS_FAILURE":
        return "💓";
      case "PENDING_POD":
        return "⏳";
      default:
        return "⚠️";
    }
  };
  const getStatusBadge = (status) => {
    const isActive = status === "open" || status === "investigating" || status === "remediating";
    return (() => {
      var _el$ = _tmpl$$1();
      setStyleProperty(_el$, "background", isActive ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)");
      setStyleProperty(_el$, "color", isActive ? "#dc3545" : "#22c55e");
      insert(_el$, isActive ? "Active" : "Resolved");
      return _el$;
    })();
  };
  return createComponent(Show, {
    get when() {
      return memo(() => !!props.isOpen)() && props.incident;
    },
    get children() {
      var _el$2 = _tmpl$10(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$0 = _el$7.nextSibling, _el$1 = _el$0.firstChild, _el$11 = _el$1.nextSibling; _el$11.nextSibling; var _el$12 = _el$0.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$6.nextSibling, _el$15 = _el$4.nextSibling, _el$72 = _el$15.nextSibling, _el$73 = _el$72.firstChild, _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, _el$76 = _el$75.nextSibling, _el$77 = _el$73.nextSibling;
      _el$2.$$click = (e) => {
        if (e.target === e.currentTarget) {
          props.onClose();
        }
      };
      _el$3.$$click = (e) => e.stopPropagation();
      setStyleProperty(_el$3, "@media (max-width", {
        "max-width": "100%"
      });
      insert(_el$8, (() => {
        var _c$ = memo(() => !!snapshot());
        return () => _c$() ? getPatternIcon(snapshot().pattern) : "⚠️";
      })());
      insert(_el$9, () => snapshot()?.severity || props.incident?.severity || "unknown");
      insert(_el$7, (() => {
        var _c$2 = memo(() => !!snapshot());
        return () => _c$2() && getStatusBadge(snapshot().status);
      })(), null);
      insert(_el$0, () => snapshot()?.resource.namespace || props.incident?.resource?.namespace || "", _el$1);
      insert(_el$0, () => snapshot()?.resource.kind || props.incident?.resource?.kind || "", _el$11);
      insert(_el$0, () => snapshot()?.resource.name || props.incident?.resource?.name || "", null);
      insert(_el$12, () => snapshot()?.occurrences || props.incident?.occurrences || 0, _el$13);
      addEventListener(_el$14, "click", props.onClose, true);
      insert(_el$15, createComponent(Show, {
        get when() {
          return loading();
        },
        get children() {
          var _el$16 = _tmpl$2$1(); _el$16.firstChild;
          return _el$16;
        }
      }), null);
      insert(_el$15, createComponent(Show, {
        get when() {
          return error();
        },
        get children() {
          var _el$18 = _tmpl$3$1(), _el$19 = _el$18.firstChild; _el$19.nextSibling;
          insert(_el$18, error, null);
          return _el$18;
        }
      }), null);
      insert(_el$15, createComponent(Show, {
        get when() {
          return memo(() => !!(!loading() && !error()))() && snapshot();
        },
        get children() {
          return [(() => {
            var _el$21 = _tmpl$4$1(), _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling, _el$27 = _el$24.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling, _el$30 = _el$27.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$30.nextSibling, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling;
            insert(_el$26, () => snapshot().impact.affectedReplicas);
            insert(_el$29, () => snapshot().impact.userFacingLabel);
            insert(_el$32, () => snapshot().impact.serviceExposure.hasService ? "Yes" : "No");
            insert(_el$35, () => snapshot().impact.namespaceCriticality);
            return _el$21;
          })(), (() => {
            var _el$36 = _tmpl$5$1(), _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$38.nextSibling; _el$39.firstChild; var _el$41 = _el$39.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling;
            insert(_el$38, () => snapshot().diagnosisSummary);
            insert(_el$39, createComponent(For, {
              get each() {
                return snapshot().rootCauses;
              },
              children: (cause, index) => (() => {
                var _el$78 = _tmpl$11(), _el$79 = _el$78.firstChild, _el$80 = _el$79.firstChild, _el$81 = _el$80.firstChild, _el$82 = _el$80.nextSibling, _el$83 = _el$82.firstChild;
                insert(_el$80, () => index() === 0 ? "Primary" : "Secondary", _el$81);
                insert(_el$80, () => cause.cause, null);
                insert(_el$82, () => Math.round(cause.likelihood * 100), _el$83);
                createRenderEffect((_p$) => {
                  var _v$0 = index() === 0 ? "var(--bg-secondary)" : "transparent", _v$1 = index() === 0 ? "3px solid var(--accent-primary)" : "none", _v$10 = index() === 0 ? "600" : "400";
                  _v$0 !== _p$.e && setStyleProperty(_el$78, "background", _p$.e = _v$0);
                  _v$1 !== _p$.t && setStyleProperty(_el$78, "border-left", _p$.t = _v$1);
                  _v$10 !== _p$.a && setStyleProperty(_el$80, "font-weight", _p$.a = _v$10);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0
                });
                return _el$78;
              })()
            }), null);
            insert(_el$43, () => snapshot().confidenceLabel);
            createRenderEffect((_p$) => {
              var _v$ = snapshot().confidence >= 0.8 ? "rgba(34, 197, 94, 0.1)" : snapshot().confidence >= 0.5 ? "rgba(251, 191, 36, 0.1)" : "rgba(239, 68, 68, 0.1)", _v$2 = snapshot().confidence >= 0.8 ? "#22c55e" : snapshot().confidence >= 0.5 ? "#fbbf24" : "#dc3545";
              _v$ !== _p$.e && setStyleProperty(_el$43, "background", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$43, "color", _p$.t = _v$2);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$36;
          })(), (() => {
            var _el$44 = _tmpl$6(), _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling;
            insert(_el$46, () => snapshot().whyNowExplanation);
            return _el$44;
          })(), createComponent(Show, {
            get when() {
              return memo(() => !!snapshot())() && (snapshot().pattern === "RESTART_STORM" || snapshot().pattern === "CRASHLOOP");
            },
            get children() {
              var _el$47 = _tmpl$7(), _el$48 = _el$47.firstChild, _el$49 = _el$48.nextSibling, _el$50 = _el$49.firstChild, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling, _el$53 = _el$50.nextSibling, _el$54 = _el$53.firstChild, _el$55 = _el$54.nextSibling, _el$56 = _el$53.nextSibling, _el$57 = _el$56.firstChild, _el$58 = _el$57.nextSibling;
              insert(_el$52, () => snapshot().restartCounts.last5Minutes);
              insert(_el$55, () => snapshot().restartCounts.last1Hour);
              insert(_el$58, () => snapshot().restartCounts.last24Hours);
              return _el$47;
            }
          }), createComponent(Show, {
            get when() {
              return snapshot()?.recommendedAction;
            },
            get children() {
              var _el$59 = _tmpl$8(), _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling, _el$62 = _el$61.nextSibling;
              insert(_el$61, () => snapshot().recommendedAction.description);
              _el$62.$$click = () => handleTabClick(snapshot().recommendedAction.tab);
              insert(_el$62, () => snapshot().recommendedAction.title);
              return _el$59;
            }
          }), (() => {
            var _el$63 = _tmpl$1(), _el$64 = _el$63.firstChild, _el$65 = _el$64.nextSibling;
            insert(_el$64, createComponent(For, {
              each: [{
                id: "evidence",
                label: "📦 Evidence",
                icon: "📦"
              }, {
                id: "logs",
                label: "📝 Logs",
                icon: "📝"
              }, {
                id: "metrics",
                label: "📈 Metrics",
                icon: "📈"
              }, {
                id: "changes",
                label: "🔄 Changes",
                icon: "🔄"
              }, {
                id: "runbooks",
                label: "📋 Runbooks",
                icon: "📋"
              }, {
                id: "similar",
                label: "🔗 Similar",
                icon: "🔗"
              }],
              children: (tab) => (() => {
                var _el$84 = _tmpl$12();
                _el$84.$$click = () => handleTabClick(tab.id);
                insert(_el$84, () => tab.label);
                createRenderEffect((_p$) => {
                  var _v$11 = activeTab() === tab.id ? "var(--bg-secondary)" : "transparent", _v$12 = activeTab() === tab.id ? "2px solid var(--accent-primary)" : "2px solid transparent", _v$13 = activeTab() === tab.id ? "var(--accent-primary)" : "var(--text-secondary)", _v$14 = activeTab() === tab.id ? "600" : "400";
                  _v$11 !== _p$.e && setStyleProperty(_el$84, "background", _p$.e = _v$11);
                  _v$12 !== _p$.t && setStyleProperty(_el$84, "border-bottom", _p$.t = _v$12);
                  _v$13 !== _p$.a && setStyleProperty(_el$84, "color", _p$.a = _v$13);
                  _v$14 !== _p$.o && setStyleProperty(_el$84, "font-weight", _p$.o = _v$14);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0
                });
                return _el$84;
              })()
            }));
            insert(_el$65, createComponent(Show, {
              get when() {
                return memo(() => activeTab() === "evidence")() && loadedTabs().has("evidence");
              },
              get children() {
                return createComponent(EvidencePanel, {
                  get incidentId() {
                    return props.incident.id;
                  }
                });
              }
            }), null);
            insert(_el$65, createComponent(Show, {
              get when() {
                return memo(() => activeTab() === "logs")() && loadedTabs().has("logs");
              },
              get children() {
                return createComponent(LogsTab, {
                  get incidentId() {
                    return props.incident.id;
                  }
                });
              }
            }), null);
            insert(_el$65, createComponent(Show, {
              get when() {
                return memo(() => activeTab() === "metrics")() && loadedTabs().has("metrics");
              },
              get children() {
                return createComponent(MetricsTab, {
                  get incidentId() {
                    return props.incident.id;
                  }
                });
              }
            }), null);
            insert(_el$65, createComponent(Show, {
              get when() {
                return memo(() => activeTab() === "changes")() && loadedTabs().has("changes");
              },
              get children() {
                return createComponent(ChangeTimeline, {
                  get incidentId() {
                    return props.incident.id;
                  }
                });
              }
            }), null);
            insert(_el$65, createComponent(Show, {
              get when() {
                return memo(() => activeTab() === "runbooks")() && loadedTabs().has("runbooks");
              },
              get children() {
                return createComponent(RunbookSelector, {
                  get incidentId() {
                    return props.incident.id;
                  }
                });
              }
            }), null);
            insert(_el$65, createComponent(Show, {
              get when() {
                return memo(() => activeTab() === "similar")() && loadedTabs().has("similar");
              },
              get children() {
                return createComponent(SimilarIncidents, {
                  get incidentId() {
                    return props.incident.id;
                  }
                });
              }
            }), null);
            insert(_el$65, createComponent(Show, {
              get when() {
                return memo(() => !!activeTab())() && !loadedTabs().has(activeTab());
              },
              get children() {
                var _el$66 = _tmpl$9(), _el$67 = _el$66.firstChild, _el$68 = _el$67.nextSibling, _el$70 = _el$68.nextSibling; _el$70.nextSibling;
                insert(_el$66, activeTab, _el$70);
                return _el$66;
              }
            }), null);
            insert(_el$65, createComponent(Show, {
              get when() {
                return !activeTab();
              },
              get children() {
                return _tmpl$0();
              }
            }), null);
            return _el$63;
          })()];
        }
      }), null);
      _el$74.$$click = () => {
        console.log("Feedback: worked");
      };
      _el$75.$$click = () => {
        console.log("Feedback: didn't work");
      };
      _el$76.$$click = () => {
        console.log("Feedback: incorrect cause");
      };
      _el$77.$$click = handleResolve;
      insert(_el$77, () => resolving() ? "Resolving..." : "Mark Resolved");
      createRenderEffect((_p$) => {
        var _v$3 = props.isOpen ? "translateX(0)" : "translateX(100%)", _v$4 = snapshot() ? `${getSeverityColor(snapshot().severity)}20` : "var(--bg-secondary)", _v$5 = snapshot() ? getSeverityColor(snapshot().severity) : "var(--text-secondary)", _v$6 = resolving(), _v$7 = resolving() ? "var(--bg-secondary)" : "#22c55e", _v$8 = resolving() ? "not-allowed" : "pointer", _v$9 = resolving() ? 0.6 : 1;
        _v$3 !== _p$.e && setStyleProperty(_el$3, "transform", _p$.e = _v$3);
        _v$4 !== _p$.t && setStyleProperty(_el$9, "background", _p$.t = _v$4);
        _v$5 !== _p$.a && setStyleProperty(_el$9, "color", _p$.a = _v$5);
        _v$6 !== _p$.o && (_el$77.disabled = _p$.o = _v$6);
        _v$7 !== _p$.i && setStyleProperty(_el$77, "background", _p$.i = _v$7);
        _v$8 !== _p$.n && setStyleProperty(_el$77, "cursor", _p$.n = _v$8);
        _v$9 !== _p$.s && setStyleProperty(_el$77, "opacity", _p$.s = _v$9);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0,
        s: void 0
      });
      return _el$2;
    }
  });
};
const LogsTab = (props) => {
  const [logs, setLogs] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  createEffect(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentLogs(props.incidentId, 20);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  });
  return createComponent(Show, {
    get when() {
      return memo(() => !!!loading())() && !error();
    },
    get fallback() {
      return (() => {
        var _el$87 = _tmpl$17();
        insert(_el$87, createComponent(Show, {
          get when() {
            return loading();
          },
          get children() {
            return [_tmpl$15(), "Loading logs..."];
          }
        }), null);
        insert(_el$87, createComponent(Show, {
          get when() {
            return error();
          },
          get children() {
            var _el$89 = _tmpl$16(); _el$89.firstChild;
            insert(_el$89, error, null);
            return _el$89;
          }
        }), null);
        return _el$87;
      })();
    },
    get children() {
      var _el$85 = _tmpl$14();
      insert(_el$85, createComponent(Show, {
        get when() {
          return logs().length === 0;
        },
        get children() {
          return _tmpl$13();
        }
      }), null);
      insert(_el$85, createComponent(For, {
        get each() {
          return logs();
        },
        children: (log) => (() => {
          var _el$91 = _tmpl$18(), _el$92 = _el$91.firstChild, _el$93 = _el$92.nextSibling;
          insert(_el$92, (() => {
            var _c$3 = memo(() => !!log.time);
            return () => _c$3() ? new Date(log.time).toLocaleString() : "";
          })());
          insert(_el$93, () => log.value || log.message || log.content);
          return _el$91;
        })()
      }), null);
      return _el$85;
    }
  });
};
const MetricsTab = (props) => {
  const [metrics, setMetrics] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  createEffect(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentMetrics(props.incidentId);
      setMetrics(data.metrics || []);
    } catch (err) {
      setError(err.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  });
  return createComponent(Show, {
    get when() {
      return memo(() => !!!loading())() && !error();
    },
    get fallback() {
      return (() => {
        var _el$96 = _tmpl$17();
        insert(_el$96, createComponent(Show, {
          get when() {
            return loading();
          },
          get children() {
            return [_tmpl$15(), "Loading metrics..."];
          }
        }), null);
        insert(_el$96, createComponent(Show, {
          get when() {
            return error();
          },
          get children() {
            var _el$98 = _tmpl$16(); _el$98.firstChild;
            insert(_el$98, error, null);
            return _el$98;
          }
        }), null);
        return _el$96;
      })();
    },
    get children() {
      var _el$94 = _tmpl$20();
      insert(_el$94, createComponent(Show, {
        get when() {
          return metrics().length === 0;
        },
        get children() {
          return _tmpl$19();
        }
      }), null);
      insert(_el$94, createComponent(For, {
        get each() {
          return metrics();
        },
        children: (metric) => (() => {
          var _el$100 = _tmpl$21(), _el$101 = _el$100.firstChild, _el$102 = _el$101.nextSibling, _el$103 = _el$102.nextSibling;
          insert(_el$101, () => metric.type || "Metric");
          insert(_el$102, () => metric.message || metric.value);
          insert(_el$103, (() => {
            var _c$4 = memo(() => !!metric.time);
            return () => _c$4() ? new Date(metric.time).toLocaleString() : "";
          })());
          return _el$100;
        })()
      }), null);
      return _el$94;
    }
  });
};
delegateEvents(["click"]);

const [cachedIncidents, setCachedIncidents] = createSignal([]);
const [lastFetchTime, setLastFetchTime] = createSignal(0);
const [isFetching, setIsFetching] = createSignal(false);
const [cachedClusterContext, setCachedClusterContext] = createSignal("");
const CACHE_DURATION = 3e4;
function getCachedIncidents() {
  return cachedIncidents();
}
function setCachedIncidentsData(incidents, clusterContext) {
  setCachedIncidents(incidents);
  setLastFetchTime(Date.now());
  if (clusterContext) {
    setCachedClusterContext(clusterContext);
  }
}
function isCacheValid(currentCluster) {
  const now = Date.now();
  const timeValid = now - lastFetchTime() < CACHE_DURATION;
  const hasData = cachedIncidents().length > 0;
  if (currentCluster && cachedClusterContext() && currentCluster !== cachedClusterContext()) {
    return false;
  }
  return timeValid && hasData;
}
function getIsFetching() {
  return isFetching();
}
function setFetching(fetching) {
  setIsFetching(fetching);
}
function invalidateIncidentsCache() {
  setCachedIncidents([]);
  setLastFetchTime(0);
  setCachedClusterContext("");
}

class PerformanceStore {
  uiMetrics = [];
  maxUIMetrics = 200;
  // Record UI performance metric
  recordUIMetric(metric) {
    const fullMetric = {
      ...metric,
      timestamp: Date.now()
    };
    this.uiMetrics.push(fullMetric);
    if (this.uiMetrics.length > this.maxUIMetrics) {
      this.uiMetrics = this.uiMetrics.slice(-this.maxUIMetrics);
    }
    api.postPerfUI(fullMetric).catch((err) => {
      console.debug("[Perf] Failed to send UI metric:", err);
    });
  }
  // Get recent UI metrics
  getRecentUIMetrics(count = 50) {
    return this.uiMetrics.slice(-count);
  }
  // Clear UI metrics
  clearUIMetrics() {
    this.uiMetrics = [];
  }
}
const performanceStore = new PerformanceStore();
class PerformanceTracker {
  startTime;
  page;
  action;
  incidentId;
  requestId;
  constructor(page, action, incidentId, requestId) {
    this.page = page;
    this.action = action;
    this.incidentId = incidentId;
    this.requestId = requestId;
    this.startTime = performance.now();
  }
  end() {
    const ms = performance.now() - this.startTime;
    performanceStore.recordUIMetric({
      page: this.page,
      action: this.action,
      ms,
      incidentId: this.incidentId,
      requestId: this.requestId
    });
    return ms;
  }
}
function trackIncidentListLoad() {
  const tracker = new PerformanceTracker("incidents_page", "list_load");
  return () => tracker.end();
}

async function fetchCapabilities() {
  const res = await fetch("/api/capabilities");
  if (!res.ok) {
    return {
      incidentDetection: true,
      incidentDiagnosis: true,
      incidentSnapshot: true,
      fixPreview: true,
      autoRemediation: false,
      learningEngine: false,
      similarIncidents: false,
      metricsCorrelation: false,
      bulkFixes: false,
      fixApplication: false
    };
  }
  return await res.json();
}
const [capabilitiesResource] = createResource(fetchCapabilities);
const capabilities = {
  get: () => capabilitiesResource() || {
    incidentDetection: true,
    incidentDiagnosis: true,
    incidentSnapshot: true,
    fixPreview: true,
    autoRemediation: false,
    learningEngine: false,
    similarIncidents: false,
    metricsCorrelation: false,
    bulkFixes: false,
    fixApplication: false
  },
  isLoading: () => capabilitiesResource.loading,
  isAutoRemediationEnabled: () => capabilitiesResource()?.autoRemediation ?? false,
  isLearningEngineEnabled: () => capabilitiesResource()?.learningEngine ?? false,
  isSimilarIncidentsEnabled: () => capabilitiesResource()?.similarIncidents ?? false,
  isMetricsCorrelationEnabled: () => capabilitiesResource()?.metricsCorrelation ?? false,
  isBulkFixesEnabled: () => capabilitiesResource()?.bulkFixes ?? false,
  isFixApplicationEnabled: () => capabilitiesResource()?.fixApplication ?? false
};

var _tmpl$ = /* @__PURE__ */ template(`<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">`), _tmpl$2 = /* @__PURE__ */ template(`<span class="inline-block animate-spin">⟳`), _tmpl$3 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg"style="background:var(--accent-primary)15;border:1px solid var(--accent-primary)40"><div style=display:flex;align-items:center;gap:12px><span style=font-size:24px>🎉</span><div><div style=color:var(--text-primary);font-weight:600>No incidents detected</div><div style=color:var(--text-secondary);font-size:13px>The incident intelligence system is actively monitoring your cluster.`), _tmpl$4 = /* @__PURE__ */ template(`<div class="mt-6 mb-4"style=display:flex;align-items:center;gap:12px><button style="padding:10px 20px;font-size:13px;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;font-weight:600;transition:all 0.2s ease"></button><span style=color:var(--text-muted);font-size:12px>View auto-remediation status and learning insights`), _tmpl$5 = /* @__PURE__ */ template(`<div class="space-y-4 p-6"><div class="flex items-center justify-between mb-6"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Incident Intelligence</h1><p class="text-sm mt-1"style=color:var(--text-secondary)>AI-powered detection with root cause analysis and remediation recommendations</p></div><button class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"style=background:var(--accent-primary);color:#000></button></div><div class="card p-3 mb-4 flex flex-col gap-1"style=background:var(--bg-tertiary);border-color:var(--border-color)><div class="flex items-center gap-2"><span class="text-sm font-semibold"style=color:var(--text-primary)>Incident Intelligence roadmap</span><span class="text-xs px-2 py-0.5 rounded"style=background:var(--accent-primary)15;color:var(--accent-primary)>Not in v1 launch</span></div><div class="flex flex-wrap gap-2 text-xs"style=color:var(--text-secondary)><span class="px-2 py-1 rounded"style=background:var(--bg-secondary)>Security Incidents (scanner/exploit) — coming after launch</span><span class="px-2 py-1 rounded"style=background:var(--bg-secondary)>Reliability Incidents (5xx RCA) — coming after launch</span><span class="px-2 py-1 rounded"style=background:var(--bg-secondary)>No runtime traffic analysis in v1</span></div></div><div class="flex flex-wrap gap-2 mb-3"><div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35)"><span style=color:var(--error-color)>Critical</span><span class="text-base font-bold"style=color:var(--error-color)></span></div><div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"style="background:rgba(255,107,107,0.12);border:1px solid rgba(255,107,107,0.35)"><span style=color:#ff6b6b>High</span><span class="text-base font-bold"style=color:#ff6b6b></span></div><div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35)"><span style=color:var(--warning-color)>Medium/Warning</span><span class="text-base font-bold"style=color:var(--warning-color)></span></div><div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"style="background:rgba(81,207,102,0.12);border:1px solid rgba(81,207,102,0.35)"><span style=color:#51cf66>With Diagnosis</span><span class="text-base font-bold"style=color:#51cf66></span></div><div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.35)"><span style=color:var(--accent-primary)>Fixable</span><span class="text-base font-bold"style=color:var(--accent-primary)></span></div></div><div class="mt-6 p-4 rounded-lg"style=background:var(--bg-secondary)><div style=display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:12px><span>ℹ️</span><span>Click on any incident row to expand and see diagnosis, probable causes, and recommendations.`);
const IntelligencePanels = () => {
  const caps = capabilities.get();
  const showAutoRemediation = caps.autoRemediation;
  const showLearningDashboard = caps.learningEngine;
  if (!showAutoRemediation && !showLearningDashboard) {
    return null;
  }
  return (() => {
    var _el$ = _tmpl$();
    insert(_el$, createComponent(Show, {
      when: showAutoRemediation,
      get children() {
        return createComponent(AutoRemediationPanel, {});
      }
    }), null);
    insert(_el$, createComponent(Show, {
      when: showLearningDashboard,
      get children() {
        return createComponent(LearningDashboard, {});
      }
    }), null);
    return _el$;
  })();
};
const Incidents = () => {
  const [patternFilter, setPatternFilter] = createSignal("");
  const [severityFilter, setSeverityFilter] = createSignal("");
  const [namespaceFilter, setNamespaceFilter] = createSignal("");
  const [statusFilter, setStatusFilter] = createSignal("");
  const [selectedIncident, setSelectedIncident] = createSignal(null);
  const [detailModalOpen, setDetailModalOpen] = createSignal(false);
  const [showSidePanels, setShowSidePanels] = createSignal(false);
  const [localIncidents, setLocalIncidents] = createSignal(getCachedIncidents());
  const [isRefreshing, setIsRefreshing] = createSignal(false);
  const [isInitialLoad, setIsInitialLoad] = createSignal(true);
  const [namespaces, setNamespaces] = createSignal([]);
  const fetchIncidentsBackground = async () => {
    if (getIsFetching()) return;
    setFetching(true);
    setIsRefreshing(true);
    const endListLoad = trackIncidentListLoad();
    try {
      const data = await api.getIncidents(namespaceFilter() || void 0, patternFilter() || void 0, severityFilter() || void 0, statusFilter() || void 0);
      const incidents = data || [];
      setLocalIncidents(incidents);
      setCachedIncidentsData(incidents, currentContext());
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setIsRefreshing(false);
      setFetching(false);
      setIsInitialLoad(false);
      endListLoad();
    }
  };
  const fetchNamespacesBackground = async () => {
    try {
      const ns = await api.getNamespaces();
      setNamespaces(ns || []);
    } catch (e) {
      console.error("Error fetching namespaces:", e);
    }
  };
  onMount(() => {
    const ctx = currentContext();
    const cached = getCachedIncidents();
    if (cached.length > 0 && isCacheValid(ctx)) {
      setLocalIncidents(cached);
      setIsInitialLoad(false);
    } else {
      setIsInitialLoad(true);
    }
    if (!isCacheValid(ctx)) {
      fetchIncidentsBackground();
    } else {
      setTimeout(fetchIncidentsBackground, 500);
    }
    fetchNamespacesBackground();
    const unsubscribe = onClusterSwitch(() => {
      console.log("[Incidents] Cluster switched - refreshing data");
      invalidateIncidentsCache();
      setLocalIncidents([]);
      setIsInitialLoad(true);
      fetchIncidentsBackground();
      fetchNamespacesBackground();
    });
    onCleanup(unsubscribe);
  });
  const refetch = () => fetchIncidentsBackground();
  const filteredIncidents = createMemo(() => {
    const all = localIncidents() || [];
    return all.filter((inc) => {
      const pattern = inc.pattern || inc.type || "";
      const namespace = inc.resource?.namespace || inc.namespace || "";
      if (patternFilter() && pattern.toUpperCase() !== patternFilter().toUpperCase()) return false;
      if (severityFilter() && inc.severity !== severityFilter()) return false;
      if (namespaceFilter() && namespace !== namespaceFilter()) return false;
      if (statusFilter() && inc.status !== statusFilter()) return false;
      return true;
    });
  });
  const handleViewPod = (incident) => navigateToPod(incident);
  const handleViewLogs = (incident) => openPodLogs(incident);
  const handleViewEvents = (incident) => navigateToEvent(incident);
  const handleViewDetails = (incident) => {
    console.log("handleViewDetails called with incident:", incident);
    setSelectedIncident(incident);
    setDetailModalOpen(true);
    console.log("Modal state set - selectedIncident:", incident.id, "detailModalOpen:", true);
  };
  const closeDetailModal = () => {
    console.log("closeDetailModal called");
    setDetailModalOpen(false);
    setSelectedIncident(null);
  };
  const criticalCount = createMemo(() => filteredIncidents().filter((inc) => inc.severity === "critical").length);
  const highCount = createMemo(() => filteredIncidents().filter((inc) => inc.severity === "high").length);
  const warningCount = createMemo(() => filteredIncidents().filter((inc) => inc.severity === "medium" || inc.severity === "warning").length);
  const diagnosedCount = createMemo(() => filteredIncidents().filter((inc) => inc.diagnosis).length);
  const fixableCount = createMemo(() => filteredIncidents().filter((inc) => inc.recommendations && inc.recommendations.length > 0).length);
  return (() => {
    var _el$2 = _tmpl$5(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild; _el$5.nextSibling; var _el$7 = _el$4.nextSibling, _el$9 = _el$3.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild; _el$1.nextSibling; var _el$11 = _el$0.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling; _el$13.nextSibling; var _el$15 = _el$9.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling, _el$25 = _el$22.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$25.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$40 = _el$15.nextSibling; _el$40.firstChild;
    _el$7.$$click = refetch;
    insert(_el$7, createComponent(Show, {
      get when() {
        return isRefreshing();
      },
      get children() {
        return _tmpl$2();
      }
    }), null);
    insert(_el$7, () => isRefreshing() ? "Refreshing..." : "Refresh", null);
    insert(_el$18, criticalCount);
    insert(_el$21, highCount);
    insert(_el$24, warningCount);
    insert(_el$27, diagnosedCount);
    insert(_el$30, fixableCount);
    insert(_el$2, createComponent(IncidentFilters, {
      get patternFilter() {
        return patternFilter();
      },
      get severityFilter() {
        return severityFilter();
      },
      get namespaceFilter() {
        return namespaceFilter();
      },
      get statusFilter() {
        return statusFilter();
      },
      get namespaces() {
        return namespaces();
      },
      onPatternFilterChange: (val) => {
        setPatternFilter(val);
        fetchIncidentsBackground();
      },
      onSeverityFilterChange: (val) => {
        setSeverityFilter(val);
        fetchIncidentsBackground();
      },
      onNamespaceFilterChange: (val) => {
        setNamespaceFilter(val);
        fetchIncidentsBackground();
      },
      onStatusFilterChange: (val) => {
        setStatusFilter(val);
        fetchIncidentsBackground();
      }
    }), _el$40);
    insert(_el$2, createComponent(IncidentTable, {
      get incidents() {
        return filteredIncidents();
      },
      get isLoading() {
        return isInitialLoad() || isRefreshing() && localIncidents().length === 0;
      },
      onViewPod: handleViewPod,
      onViewLogs: handleViewLogs,
      onViewEvents: handleViewEvents,
      onViewDetails: handleViewDetails
    }), _el$40);
    insert(_el$2, createComponent(Show, {
      get when() {
        return memo(() => filteredIncidents().length === 0)() && !isRefreshing();
      },
      get children() {
        var _el$31 = _tmpl$3(), _el$32 = _el$31.firstChild, _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling, _el$35 = _el$34.firstChild; _el$35.nextSibling;
        return _el$31;
      }
    }), _el$40);
    insert(_el$2, createComponent(Show, {
      get when() {
        return capabilities.isAutoRemediationEnabled() || capabilities.isLearningEngineEnabled();
      },
      get children() {
        var _el$37 = _tmpl$4(), _el$38 = _el$37.firstChild; _el$38.nextSibling;
        _el$38.$$click = () => setShowSidePanels(!showSidePanels());
        insert(_el$38, () => showSidePanels() ? "🧠 Hide Intelligence Panels" : "🧠 Show Intelligence Panels");
        createRenderEffect((_p$) => {
          var _v$ = showSidePanels() ? "var(--accent-primary)20" : "var(--bg-secondary)", _v$2 = showSidePanels() ? "var(--accent-primary)" : "var(--text-secondary)", _v$3 = showSidePanels() ? "0 2px 4px rgba(0,0,0,0.1)" : "none";
          _v$ !== _p$.e && setStyleProperty(_el$38, "background", _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$38, "color", _p$.t = _v$2);
          _v$3 !== _p$.a && setStyleProperty(_el$38, "box-shadow", _p$.a = _v$3);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$37;
      }
    }), _el$40);
    insert(_el$2, createComponent(Show, {
      get when() {
        return showSidePanels();
      },
      get children() {
        return createComponent(IntelligencePanels, {});
      }
    }), _el$40);
    insert(_el$2, createComponent(IncidentModalV2, {
      get incident() {
        return selectedIncident();
      },
      get isOpen() {
        return detailModalOpen();
      },
      onClose: closeDetailModal
    }), null);
    createRenderEffect((_p$) => {
      var _v$4 = isRefreshing(), _v$5 = isRefreshing() ? 0.7 : 1;
      _v$4 !== _p$.e && (_el$7.disabled = _p$.e = _v$4);
      _v$5 !== _p$.t && setStyleProperty(_el$7, "opacity", _p$.t = _v$5);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$2;
  })();
};
delegateEvents(["click"]);

export { Incidents as default };
//# sourceMappingURL=Incidents-Dtol6SUc.js.map
