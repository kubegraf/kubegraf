import { c as createSignal, j as createResource, k as api, G as addNotification, a as createMemo, t as template, i as insert, f as createRenderEffect, g as className, h as setStyleProperty, d as createComponent, m as memo, S as Show, F as For, v as delegateEvents } from './index-Bh-O-sIc.js';

function filterOOMEvents(incidents) {
  return incidents.filter((inc) => {
    if (inc.pattern) {
      const patternUpper = inc.pattern.toUpperCase();
      return patternUpper === "OOM_PRESSURE" || patternUpper === "OOM" || patternUpper.includes("OOM");
    }
    const type = (inc.type || "").toLowerCase();
    return type === "oom" || type === "oomkilled" || type.includes("oom");
  }).map((inc) => {
    const resourceName = inc.resource?.name || inc.resourceName || "";
    const namespace = inc.resource?.namespace || inc.namespace || "default";
    const parts = resourceName.split("/");
    const podName = parts[0] || resourceName;
    const containerName = parts.length > 1 ? parts[1] : void 0;
    return {
      id: inc.id || `${namespace}-${podName}`,
      type: "oom",
      resource: resourceName,
      namespace,
      podName,
      containerName,
      severity: inc.severity === "critical" ? "critical" : "warning",
      timestamp: inc.lastSeen || inc.firstSeen,
      message: inc.message || inc.description || `Pod ${podName} was OOM killed`,
      count: inc.occurrences || inc.count || 1,
      firstSeen: inc.firstSeen,
      lastSeen: inc.lastSeen
    };
  });
}

function filterHPAMaxEvents(incidents) {
  return incidents.filter((inc) => {
    let isHPA = false;
    if (inc.pattern) {
      isHPA = inc.pattern.includes("HPA") || inc.pattern.includes("AUTOSCALER");
    } else {
      isHPA = inc.type === "hpa_max" || inc.type === "hpa_scaled";
    }
    const message = (inc.message || inc.description || "").toLowerCase();
    isHPA = isHPA || message.includes("hpa") || message.includes("horizontal pod autoscaler");
    if (!isHPA) return false;
    const lastSeen = new Date(inc.lastSeen || inc.firstSeen).getTime();
    const firstSeen = new Date(inc.firstSeen).getTime();
    const durationMinutes = (lastSeen - firstSeen) / (60 * 1e3);
    return durationMinutes >= 5;
  }).map((inc) => {
    const resourceName = inc.resource?.name || inc.resourceName || "";
    const namespace = inc.resource?.namespace || inc.namespace || "default";
    const parts = resourceName.split("/");
    const deploymentName = parts[0] || resourceName;
    const lastSeen = new Date(inc.lastSeen || inc.firstSeen).getTime();
    const firstSeen = new Date(inc.firstSeen).getTime();
    const durationMinutes = (lastSeen - firstSeen) / (60 * 1e3);
    const message = inc.message || inc.description || "";
    const replicaMatch = message.match(/(\d+)\s*(?:replicas|pods)/i);
    const maxReplicas = replicaMatch ? parseInt(replicaMatch[1]) : 0;
    return {
      id: inc.id || `${namespace}-${deploymentName}`,
      type: "hpa_max",
      resource: resourceName,
      namespace,
      deploymentName,
      severity: inc.severity === "critical" ? "critical" : "warning",
      timestamp: inc.lastSeen || inc.firstSeen,
      message: message || `HPA for ${deploymentName} is at maximum replicas`,
      count: inc.occurrences || inc.count || 1,
      firstSeen: inc.firstSeen,
      lastSeen: inc.lastSeen,
      durationMinutes: Math.round(durationMinutes * 10) / 10,
      currentReplicas: maxReplicas,
      maxReplicas
    };
  });
}

function filterSecurityEvents(incidents) {
  return incidents.filter((inc) => {
    if (inc.pattern) {
      const pattern = inc.pattern.toUpperCase();
      if (pattern === "SECRET_MISSING" || pattern === "RBAC_DENIED" || pattern === "POLICY_VIOLATION" || pattern.includes("SECURITY")) {
        return true;
      }
    }
    const type = inc.type?.toLowerCase() || "";
    const message = (inc.message || inc.description || "").toLowerCase();
    const resourceKind = inc.resource?.kind?.toLowerCase() || inc.resourceKind?.toLowerCase() || "";
    return type === "security" || type === "security_policy" || type === "rbac_violation" || type === "network_policy" || message.includes("security") || message.includes("policy violation") || message.includes("rbac") || message.includes("unauthorized") || message.includes("forbidden") || message.includes("network policy") || resourceKind === "networkpolicy" || resourceKind === "securitypolicy";
  }).map((inc) => {
    const message = (inc.message || inc.description || "").toLowerCase();
    let securityType = "other";
    if (message.includes("policy violation") || message.includes("security policy")) {
      securityType = "policy_violation";
    } else if (message.includes("rbac") || message.includes("unauthorized") || message.includes("forbidden")) {
      securityType = "rbac_violation";
    } else if (message.includes("network policy")) {
      securityType = "network_policy";
    } else if (message.includes("pod security")) {
      securityType = "pod_security";
    }
    const resourceName = inc.resource?.name || inc.resourceName || "";
    const namespace = inc.resource?.namespace || inc.namespace || "default";
    const resourceKind = inc.resource?.kind || inc.resourceKind || "Unknown";
    return {
      id: inc.id || `${namespace}-${resourceName}`,
      type: "security",
      resource: resourceName,
      namespace,
      resourceName,
      resourceKind,
      severity: inc.severity === "critical" ? "critical" : "warning",
      timestamp: inc.lastSeen || inc.firstSeen,
      message: inc.message || inc.description || `Security issue detected for ${resourceName}`,
      count: inc.occurrences || inc.count || 1,
      firstSeen: inc.firstSeen,
      lastSeen: inc.lastSeen,
      securityType
    };
  });
}

function filterDriftEvents(incidents) {
  return incidents.filter((inc) => {
    if (inc.pattern) {
      const pattern = inc.pattern.toUpperCase();
      if (pattern.includes("DRIFT") || pattern.includes("CONFIG")) {
        return true;
      }
    }
    const type = inc.type?.toLowerCase() || "";
    const message = (inc.message || inc.description || "").toLowerCase();
    return type === "drift" || type === "configuration_drift" || type === "resource_drift" || message.includes("drift") || message.includes("configuration mismatch") || message.includes("differs from expected") || message.includes("out of sync") || message.includes("does not match");
  }).map((inc) => {
    const message = (inc.message || inc.description || "").toLowerCase();
    let driftType = "other";
    if (message.includes("configuration") || message.includes("config")) {
      driftType = "configuration";
    } else if (message.includes("resource")) {
      driftType = "resource";
    } else if (message.includes("annotation")) {
      driftType = "annotation";
    } else if (message.includes("label")) {
      driftType = "label";
    }
    const resourceName = inc.resource?.name || inc.resourceName || "";
    const namespace = inc.resource?.namespace || inc.namespace || "default";
    const resourceKind = inc.resource?.kind || inc.resourceKind || "Unknown";
    return {
      id: inc.id || `${namespace}-${resourceName}`,
      type: "drift",
      resource: resourceName,
      namespace,
      resourceName,
      resourceKind,
      severity: inc.severity === "critical" ? "critical" : "warning",
      timestamp: inc.lastSeen || inc.firstSeen,
      message: inc.message || inc.description || `Configuration drift detected for ${resourceName}`,
      count: inc.occurrences || inc.count || 1,
      firstSeen: inc.firstSeen,
      lastSeen: inc.lastSeen,
      driftType
    };
  });
}

var _tmpl$ = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$2 = /* @__PURE__ */ template(`<div class=mb-4><h3 class="text-sm font-medium mb-2 flex items-center gap-2"style=color:var(--text-primary)><span class="px-2 py-0.5 rounded text-xs border bg-red-500/10 text-red-400 border-red-500/20">OOM</span><span style=color:var(--text-secondary)> event</span></h3><div class=space-y-2>`), _tmpl$3 = /* @__PURE__ */ template(`<div class=mb-4><h3 class="text-sm font-medium mb-2 flex items-center gap-2"style=color:var(--text-primary)><span class="px-2 py-0.5 rounded text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">HPA MAX</span><span style=color:var(--text-secondary)> event</span></h3><div class=space-y-2>`), _tmpl$4 = /* @__PURE__ */ template(`<div class=mb-4><h3 class="text-sm font-medium mb-2 flex items-center gap-2"style=color:var(--text-primary)><span class="px-2 py-0.5 rounded text-xs border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">SECURITY</span><span style=color:var(--text-secondary)> event</span></h3><div class=space-y-2>`), _tmpl$5 = /* @__PURE__ */ template(`<div class=mb-4><h3 class="text-sm font-medium mb-2 flex items-center gap-2"style=color:var(--text-primary)><span class="px-2 py-0.5 rounded text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20">DRIFT</span><span style=color:var(--text-secondary)> event</span></h3><div class=space-y-2>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center rounded-lg border"style=background:var(--bg-secondary);border-color:var(--border-color)><div class="text-4xl mb-4">📊</div><h3 class="text-lg font-semibold mb-2"style=color:var(--text-primary)>No <!>Events Detected</h3><p class="text-sm mb-4"style=color:var(--text-secondary)></p><p class=text-xs style=color:var(--text-muted)>Total incidents checked: `), _tmpl$7 = /* @__PURE__ */ template(`<div class="p-8 text-center rounded-lg border"style=background:var(--bg-secondary);border-color:var(--border-color);color:var(--text-muted)>No recent actions`), _tmpl$8 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>AutoFix Engine</h1><p class="text-sm mt-1"style=color:var(--text-secondary)>Automated remediation for OOM, HPA max, security, and drift issues</p></div><label class="flex items-center gap-2 cursor-pointer"><input type=checkbox class="w-4 h-4 rounded"style=accentColor:var(--accent-primary)><span class="text-sm font-medium"style=color:var(--text-primary)>Enable AutoFix</span></label></div><div class="flex gap-2 border-b"style=border-color:var(--border-color)></div><div><h2 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>AutoFix Rules</h2><div class="grid gap-4"></div></div><div><div class="flex items-center justify-between mb-4"><h2 class="text-lg font-semibold"style=color:var(--text-primary)>Related Events</h2><div class="flex items-center gap-2"><button class="text-xs px-3 py-1 rounded"style=background:var(--bg-tertiary);color:var(--text-secondary)>Refresh</button></div></div></div><div><h2 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Recent Actions</h2><div class=space-y-2>`), _tmpl$9 = /* @__PURE__ */ template(`<button>`), _tmpl$0 = /* @__PURE__ */ template(`<div>• Maximum limit: <strong class=text-yellow-400> replicas`), _tmpl$1 = /* @__PURE__ */ template(`<div>• <strong class=text-yellow-400>No maximum limit</strong> - can scale indefinitely`), _tmpl$10 = /* @__PURE__ */ template(`<div class="space-y-1 mb-2"><div>• Adds <strong class=text-blue-400> additional replicas</strong> per trigger`), _tmpl$11 = /* @__PURE__ */ template(`<button class="text-xs px-2 py-1 rounded"style=background:var(--accent-primary);color:#000>Configure`), _tmpl$12 = /* @__PURE__ */ template(`<div class=space-y-2><div><label class="block text-xs mb-1"style=color:var(--text-secondary)>Additional Replicas per Trigger:</label><input type=number min=1 max=100 class="w-full px-2 py-1 rounded text-sm"style="background:var(--bg-primary);border:1px solid var(--border-color);color:var(--text-primary)"></div><div><label class="block text-xs mb-1"style=color:var(--text-secondary)>Maximum Replicas Limit (0 = no limit):</label><input type=number min=0 class="w-full px-2 py-1 rounded text-sm"style="background:var(--bg-primary);border:1px solid var(--border-color);color:var(--text-primary)"></div><div class="flex gap-2"><button class="text-xs px-3 py-1 rounded"style=background:var(--accent-primary);color:#000>Save</button><button class="text-xs px-3 py-1 rounded"style="background:var(--bg-primary);border:1px solid var(--border-color);color:var(--text-secondary)">Cancel`), _tmpl$13 = /* @__PURE__ */ template(`<div class="text-xs mb-2 p-3 rounded border"style=background:var(--bg-tertiary);color:var(--text-muted);border-color:var(--border-color)><div class="font-semibold mb-2"style=color:var(--text-secondary)>Scaling Configuration:`), _tmpl$14 = /* @__PURE__ */ template(`<div class="space-y-1 mb-2"><div>• Restarts pod and increases memory by <strong class=text-red-400> MiB</strong></div><div>• Deletes the pod to trigger Kubernetes recreation`), _tmpl$15 = /* @__PURE__ */ template(`<div class=space-y-2><div><label class="block text-xs mb-1"style=color:var(--text-secondary)>Memory Increase (MiB):</label><input type=number min=100 max=10000 step=100 class="w-full px-2 py-1 rounded text-sm"style="background:var(--bg-primary);border:1px solid var(--border-color);color:var(--text-primary)"></div><div class="flex gap-2"><button class="text-xs px-3 py-1 rounded"style=background:var(--accent-primary);color:#000>Save</button><button class="text-xs px-3 py-1 rounded"style="background:var(--bg-primary);border:1px solid var(--border-color);color:var(--text-secondary)">Cancel`), _tmpl$16 = /* @__PURE__ */ template(`<div class="text-xs mb-2 p-3 rounded border"style=background:var(--bg-tertiary);color:var(--text-muted);border-color:var(--border-color)><div class="font-semibold mb-2"style=color:var(--text-secondary)>Memory Configuration:`), _tmpl$17 = /* @__PURE__ */ template(`<div class="text-xs mb-2 p-2 rounded border"style=background:var(--bg-tertiary);color:var(--text-muted);border-color:var(--border-color)><div class="font-semibold mb-1"style=color:var(--text-secondary)>Default Settings:</div><div class=space-y-1><div>• Automatically applies <strong class=text-yellow-400>security policy fixes</strong></div><div>• Fixes policy violations automatically</div><div>• Applies recommended security configurations`), _tmpl$18 = /* @__PURE__ */ template(`<div class="text-xs mb-2 p-2 rounded border"style=background:var(--bg-tertiary);color:var(--text-muted);border-color:var(--border-color)><div class="font-semibold mb-1"style=color:var(--text-secondary)>Default Settings:</div><div class=space-y-1><div>• <strong class=text-purple-400>Reverts configuration</strong> to expected state</div><div>• Corrects drift from Git/declared configuration</div><div>• Restores resources to match source of truth`), _tmpl$19 = /* @__PURE__ */ template(`<span>Last: `), _tmpl$20 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border"style=background:var(--bg-secondary);border-color:var(--border-color)><div class="flex items-start justify-between"><div class=flex-1><div class="flex items-center gap-3 mb-2"><h3 class=font-medium style=color:var(--text-primary)></h3><span></span></div><p class="text-sm mb-3"style=color:var(--text-secondary)></p><div class="flex items-center gap-4 text-xs"style=color:var(--text-muted)><span>Triggered <!> times</span></div></div><label class="flex items-center gap-2 cursor-pointer ml-4"><input type=checkbox class="w-4 h-4 rounded"style=accentColor:var(--accent-primary)><span class=text-sm style=color:var(--text-secondary)>`), _tmpl$21 = /* @__PURE__ */ template(`<span class="text-xs ml-2"style=color:var(--text-muted)>/ `), _tmpl$22 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-secondary);border-color:var(--border-color)><div class="flex items-start justify-between"><div class=flex-1><div class="text-sm font-medium mb-1"style=color:var(--text-primary)></div><div class="text-xs mb-2"style=color:var(--text-secondary)></div><div class="flex items-center gap-4 text-xs"style=color:var(--text-muted)><span></span><span>Count: </span><span>Last: `), _tmpl$23 = /* @__PURE__ */ template(`<span>Max: <!> replicas`), _tmpl$24 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-secondary);border-color:var(--border-color)><div class="flex items-start justify-between"><div class=flex-1><div class="text-sm font-medium mb-1"style=color:var(--text-primary)></div><div class="text-xs mb-2"style=color:var(--text-secondary)></div><div class="flex items-center gap-4 text-xs"style=color:var(--text-muted)><span></span><span>Duration: <!> min</span><span>Last: `), _tmpl$25 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-secondary);border-color:var(--border-color)><div class="flex items-start justify-between"><div class=flex-1><div class="text-sm font-medium mb-1"style=color:var(--text-primary)> (<!>)</div><div class="text-xs mb-2"style=color:var(--text-secondary)></div><div class="flex items-center gap-4 text-xs"style=color:var(--text-muted)><span></span><span class=capitalize></span><span>Last: `), _tmpl$26 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border flex items-center justify-between"style=background:var(--bg-secondary);border-color:var(--border-color)><div class="flex items-center gap-3 flex-1"><span></span><div class=flex-1><div class="text-sm font-medium"style=color:var(--text-primary)> (<!>)</div><div class=text-xs style=color:var(--text-secondary)></div></div><div class=text-xs style=color:var(--text-muted)>`);
const AutoFix = () => {
  const [selectedType, setSelectedType] = createSignal("all");
  const [editingRule, setEditingRule] = createSignal(null);
  const [ruleSettings, setRuleSettings] = createSignal({});
  const [rules, {
    refetch: refetchRules
  }] = createResource(async () => {
    try {
      return await api.getAutoFixRules();
    } catch (error) {
      console.error("Failed to fetch auto-fix rules:", error);
      addNotification("Failed to load AutoFix rules", "error");
      return [];
    }
  });
  const [autoFixEnabledState, {
    refetch: refetchEnabled
  }] = createResource(async () => {
    try {
      return await api.getAutoFixEnabled();
    } catch (error) {
      console.error("Failed to fetch AutoFix enabled state:", error);
      return false;
    }
  });
  const [actions, {
    refetch: refetchActions
  }] = createResource(async () => {
    try {
      return await api.getAutoFixActions();
    } catch (error) {
      console.error("Failed to fetch auto-fix actions:", error);
      return [];
    }
  });
  const [incidents, {
    refetch: refetchIncidents
  }] = createResource(async () => {
    try {
      const data = await api.getIncidents();
      console.log("[AutoFix] Fetched incidents:", data?.length || 0);
      const incidentTypes = new Set(data?.map((inc) => inc.pattern || inc.type || "unknown") || []);
      console.log("[AutoFix] Incident types found:", Array.from(incidentTypes));
      const oomIncidents = data?.filter((inc) => {
        const pattern = (inc.pattern || "").toUpperCase();
        const type = (inc.type || "").toLowerCase();
        const message = (inc.message || inc.description || "").toUpperCase();
        return pattern.includes("OOM") || type.includes("oom") || message.includes("OOM") || message.includes("OUT OF MEMORY");
      }) || [];
      console.log("[AutoFix] OOM incidents found:", oomIncidents.length);
      const hpaIncidents = data?.filter((inc) => {
        const pattern = (inc.pattern || "").toUpperCase();
        const type = (inc.type || "").toLowerCase();
        const message = (inc.message || inc.description || "").toUpperCase();
        return pattern.includes("HPA") || type.includes("hpa") || message.includes("HPA") || message.includes("AUTOSCALER");
      }) || [];
      console.log("[AutoFix] HPA incidents found:", hpaIncidents.length);
      return data || [];
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
      addNotification("Failed to load incidents for AutoFix. Please check your cluster connection.", "error");
      return [];
    }
  });
  const oomEvents = createMemo(() => {
    const allIncidents = incidents() || [];
    const filtered = filterOOMEvents(allIncidents);
    console.log("[AutoFix] Filtered OOM events:", filtered.length, "from", allIncidents.length, "incidents");
    return filtered;
  });
  const hpaMaxEvents = createMemo(() => filterHPAMaxEvents(incidents() || []));
  const securityEvents = createMemo(() => filterSecurityEvents(incidents() || []));
  const driftEvents = createMemo(() => filterDriftEvents(incidents() || []));
  const filteredEvents = createMemo(() => {
    const type = selectedType();
    if (type === "all") {
      return {
        oom: oomEvents(),
        hpaMax: hpaMaxEvents(),
        security: securityEvents(),
        drift: driftEvents()
      };
    } else if (type === "oom") {
      return {
        oom: oomEvents(),
        hpaMax: [],
        security: [],
        drift: []
      };
    } else if (type === "hpa_max") {
      return {
        oom: [],
        hpaMax: hpaMaxEvents(),
        security: [],
        drift: []
      };
    } else if (type === "security") {
      return {
        oom: [],
        hpaMax: [],
        security: securityEvents(),
        drift: []
      };
    } else if (type === "drift") {
      return {
        oom: [],
        hpaMax: [],
        security: [],
        drift: driftEvents()
      };
    }
    return {
      oom: [],
      hpaMax: [],
      security: [],
      drift: []
    };
  });
  const filteredRules = () => {
    const all = rules() || [];
    if (selectedType() === "all") return all;
    return all.filter((rule) => rule.type === selectedType());
  };
  const filteredActions = () => {
    const all = actions() || [];
    if (selectedType() === "all") return all;
    return all.filter((action) => action.type === selectedType());
  };
  const toggleRule = async (ruleId) => {
    try {
      const rule = (rules() || []).find((r) => r.id === ruleId);
      if (!rule) {
        addNotification("Rule not found", "error");
        return;
      }
      const newEnabled = !rule.enabled;
      const settings = ruleSettings()[ruleId] || rule.settings;
      await api.toggleAutoFixRule(ruleId, newEnabled, settings);
      refetchRules();
      addNotification(`${rule.name} ${newEnabled ? "enabled" : "disabled"}`, "success");
    } catch (error) {
      console.error("Failed to toggle rule:", error);
      addNotification(error.message || "Failed to update rule", "error");
    }
  };
  const updateRuleSettings = async (ruleId, settings) => {
    try {
      const rule = (rules() || []).find((r) => r.id === ruleId);
      if (!rule) {
        addNotification("Rule not found", "error");
        return;
      }
      setRuleSettings({
        ...ruleSettings(),
        [ruleId]: settings
      });
      await api.toggleAutoFixRule(ruleId, rule.enabled, settings);
      refetchRules();
      setEditingRule(null);
      addNotification("Settings updated", "success");
    } catch (error) {
      console.error("Failed to update rule settings:", error);
      addNotification(error.message || "Failed to update settings", "error");
    }
  };
  const handleToggleAutoFix = async (enabled) => {
    try {
      await api.setAutoFixEnabled(enabled);
      refetchEnabled();
      addNotification(`AutoFix ${enabled ? "enabled" : "disabled"}`, "success");
    } catch (error) {
      console.error("Failed to toggle AutoFix:", error);
      addNotification(error.message || "Failed to update AutoFix state", "error");
    }
  };
  const getTypeColor = (type) => {
    switch (type) {
      case "oom":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "hpa_max":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "security":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "drift":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-400";
      case "failed":
        return "bg-red-500/10 text-red-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };
  return (() => {
    var _el$ = _tmpl$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$2.nextSibling, _el$0 = _el$9.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$0.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$16 = _el$14.firstChild, _el$50 = _el$11.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling;
    _el$7.addEventListener("change", (e) => handleToggleAutoFix(e.currentTarget.checked));
    insert(_el$9, () => ["all", "oom", "hpa_max", "security", "drift"].map((type) => (() => {
      var _el$54 = _tmpl$9();
      _el$54.$$click = () => setSelectedType(type);
      insert(_el$54, type === "all" ? "All" : type === "oom" ? "OOM" : type === "hpa_max" ? "HPA Max" : type === "security" ? "Security" : "Drift");
      createRenderEffect((_p$) => {
        var _v$ = `px-4 py-2 text-sm font-medium transition-colors ${selectedType() === type ? "border-b-2" : "opacity-60 hover:opacity-100"}`, _v$2 = selectedType() === type ? "var(--accent-primary)" : "var(--text-secondary)", _v$3 = selectedType() === type ? "var(--accent-primary)" : "transparent";
        _v$ !== _p$.e && className(_el$54, _p$.e = _v$);
        _v$2 !== _p$.t && setStyleProperty(_el$54, "color", _p$.t = _v$2);
        _v$3 !== _p$.a && setStyleProperty(_el$54, "border-color", _p$.a = _v$3);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      });
      return _el$54;
    })()));
    insert(_el$10, createComponent(For, {
      get each() {
        return filteredRules();
      },
      children: (rule) => (() => {
        var _el$55 = _tmpl$20(), _el$56 = _el$55.firstChild, _el$57 = _el$56.firstChild, _el$58 = _el$57.firstChild, _el$59 = _el$58.firstChild, _el$60 = _el$59.nextSibling, _el$61 = _el$58.nextSibling, _el$104 = _el$61.nextSibling, _el$105 = _el$104.firstChild, _el$106 = _el$105.firstChild, _el$108 = _el$106.nextSibling; _el$108.nextSibling; var _el$111 = _el$57.nextSibling, _el$112 = _el$111.firstChild, _el$113 = _el$112.nextSibling;
        insert(_el$59, () => rule.name);
        insert(_el$60, (() => {
          var _c$3 = memo(() => rule.type === "hpa_max");
          return () => _c$3() ? "HPA MAX" : rule.type.toUpperCase();
        })());
        insert(_el$61, () => rule.description);
        insert(_el$57, createComponent(Show, {
          get when() {
            return rule.type === "hpa_max";
          },
          get children() {
            var _el$62 = _tmpl$13(); _el$62.firstChild;
            insert(_el$62, createComponent(Show, {
              get when() {
                return editingRule() !== rule.id;
              },
              get children() {
                return [(() => {
                  var _el$64 = _tmpl$10(), _el$65 = _el$64.firstChild, _el$66 = _el$65.firstChild, _el$67 = _el$66.nextSibling, _el$68 = _el$67.firstChild;
                  insert(_el$67, () => rule.settings?.additionalReplicas ?? 2, _el$68);
                  insert(_el$64, createComponent(Show, {
                    get when() {
                      return (rule.settings?.maxReplicasLimit ?? 0) > 0;
                    },
                    get children() {
                      var _el$69 = _tmpl$0(), _el$70 = _el$69.firstChild, _el$71 = _el$70.nextSibling, _el$72 = _el$71.firstChild;
                      insert(_el$71, () => rule.settings?.maxReplicasLimit, _el$72);
                      return _el$69;
                    }
                  }), null);
                  insert(_el$64, createComponent(Show, {
                    get when() {
                      return (rule.settings?.maxReplicasLimit ?? 0) === 0;
                    },
                    get children() {
                      return _tmpl$1();
                    }
                  }), null);
                  return _el$64;
                })(), (() => {
                  var _el$74 = _tmpl$11();
                  _el$74.$$click = () => setEditingRule(rule.id);
                  return _el$74;
                })()];
              }
            }), null);
            insert(_el$62, createComponent(Show, {
              get when() {
                return editingRule() === rule.id;
              },
              get children() {
                var _el$75 = _tmpl$12(), _el$76 = _el$75.firstChild, _el$77 = _el$76.firstChild, _el$78 = _el$77.nextSibling, _el$79 = _el$76.nextSibling, _el$80 = _el$79.firstChild, _el$81 = _el$80.nextSibling, _el$82 = _el$79.nextSibling, _el$83 = _el$82.firstChild, _el$84 = _el$83.nextSibling;
                _el$78.$$input = (e) => {
                  const val = parseInt(e.currentTarget.value) || 2;
                  setRuleSettings({
                    ...ruleSettings(),
                    [rule.id]: {
                      ...ruleSettings()[rule.id],
                      ...rule.settings,
                      additionalReplicas: val
                    }
                  });
                };
                _el$81.$$input = (e) => {
                  const val = parseInt(e.currentTarget.value) || 0;
                  setRuleSettings({
                    ...ruleSettings(),
                    [rule.id]: {
                      ...ruleSettings()[rule.id],
                      ...rule.settings,
                      maxReplicasLimit: val
                    }
                  });
                };
                _el$83.$$click = () => updateRuleSettings(rule.id, ruleSettings()[rule.id] || rule.settings || {});
                _el$84.$$click = () => {
                  setEditingRule(null);
                  setRuleSettings({
                    ...ruleSettings(),
                    [rule.id]: rule.settings || {}
                  });
                };
                createRenderEffect(() => _el$78.value = ruleSettings()[rule.id]?.additionalReplicas ?? rule.settings?.additionalReplicas ?? 2);
                createRenderEffect(() => _el$81.value = ruleSettings()[rule.id]?.maxReplicasLimit ?? rule.settings?.maxReplicasLimit ?? 0);
                return _el$75;
              }
            }), null);
            return _el$62;
          }
        }), _el$104);
        insert(_el$57, createComponent(Show, {
          get when() {
            return rule.type === "oom";
          },
          get children() {
            var _el$85 = _tmpl$16(); _el$85.firstChild;
            insert(_el$85, createComponent(Show, {
              get when() {
                return editingRule() !== rule.id;
              },
              get children() {
                return [(() => {
                  var _el$87 = _tmpl$14(), _el$88 = _el$87.firstChild, _el$89 = _el$88.firstChild, _el$90 = _el$89.nextSibling, _el$91 = _el$90.firstChild;
                  insert(_el$90, () => rule.settings?.memoryIncreaseMiB ?? 500, _el$91);
                  return _el$87;
                })(), (() => {
                  var _el$92 = _tmpl$11();
                  _el$92.$$click = () => setEditingRule(rule.id);
                  return _el$92;
                })()];
              }
            }), null);
            insert(_el$85, createComponent(Show, {
              get when() {
                return editingRule() === rule.id;
              },
              get children() {
                var _el$93 = _tmpl$15(), _el$94 = _el$93.firstChild, _el$95 = _el$94.firstChild, _el$96 = _el$95.nextSibling, _el$97 = _el$94.nextSibling, _el$98 = _el$97.firstChild, _el$99 = _el$98.nextSibling;
                _el$96.$$input = (e) => {
                  const val = parseInt(e.currentTarget.value) || 500;
                  setRuleSettings({
                    ...ruleSettings(),
                    [rule.id]: {
                      ...ruleSettings()[rule.id],
                      ...rule.settings,
                      memoryIncreaseMiB: val
                    }
                  });
                };
                _el$98.$$click = () => updateRuleSettings(rule.id, ruleSettings()[rule.id] || rule.settings || {});
                _el$99.$$click = () => {
                  setEditingRule(null);
                  setRuleSettings({
                    ...ruleSettings(),
                    [rule.id]: rule.settings || {}
                  });
                };
                createRenderEffect(() => _el$96.value = ruleSettings()[rule.id]?.memoryIncreaseMiB ?? rule.settings?.memoryIncreaseMiB ?? 500);
                return _el$93;
              }
            }), null);
            return _el$85;
          }
        }), _el$104);
        insert(_el$57, createComponent(Show, {
          get when() {
            return rule.type === "security";
          },
          get children() {
            var _el$100 = _tmpl$17(); _el$100.firstChild;
            return _el$100;
          }
        }), _el$104);
        insert(_el$57, createComponent(Show, {
          get when() {
            return rule.type === "drift";
          },
          get children() {
            var _el$102 = _tmpl$18(); _el$102.firstChild;
            return _el$102;
          }
        }), _el$104);
        insert(_el$105, () => rule.triggerCount, _el$108);
        insert(_el$104, createComponent(Show, {
          get when() {
            return rule.lastTriggered;
          },
          get children() {
            var _el$109 = _tmpl$19(); _el$109.firstChild;
            insert(_el$109, () => new Date(rule.lastTriggered).toLocaleString(), null);
            return _el$109;
          }
        }), null);
        _el$112.addEventListener("change", () => toggleRule(rule.id));
        insert(_el$113, () => rule.enabled ? "Enabled" : "Disabled");
        createRenderEffect((_p$) => {
          var _v$4 = `px-2 py-0.5 rounded text-xs border ${getTypeColor(rule.type)}`, _v$5 = !(autoFixEnabledState() ?? false);
          _v$4 !== _p$.e && className(_el$60, _p$.e = _v$4);
          _v$5 !== _p$.t && (_el$112.disabled = _p$.t = _v$5);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        createRenderEffect(() => _el$112.checked = rule.enabled);
        return _el$55;
      })()
    }));
    insert(_el$14, createComponent(Show, {
      get when() {
        return incidents.loading;
      },
      get children() {
        return _tmpl$();
      }
    }), _el$16);
    _el$16.$$click = () => refetchIncidents();
    insert(_el$11, createComponent(Show, {
      get when() {
        return filteredEvents().oom.length > 0;
      },
      get children() {
        var _el$17 = _tmpl$2(), _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$18.nextSibling;
        insert(_el$20, () => filteredEvents().oom.length, _el$21);
        insert(_el$20, () => filteredEvents().oom.length !== 1 ? "s" : "", null);
        insert(_el$22, createComponent(For, {
          get each() {
            return filteredEvents().oom;
          },
          children: (event) => (() => {
            var _el$114 = _tmpl$22(), _el$115 = _el$114.firstChild, _el$116 = _el$115.firstChild, _el$117 = _el$116.firstChild, _el$120 = _el$117.nextSibling, _el$121 = _el$120.nextSibling, _el$122 = _el$121.firstChild, _el$123 = _el$122.nextSibling; _el$123.firstChild; var _el$125 = _el$123.nextSibling; _el$125.firstChild;
            insert(_el$117, () => event.podName, null);
            insert(_el$117, createComponent(Show, {
              get when() {
                return event.containerName;
              },
              get children() {
                var _el$118 = _tmpl$21(); _el$118.firstChild;
                insert(_el$118, () => event.containerName, null);
                return _el$118;
              }
            }), null);
            insert(_el$120, () => event.message);
            insert(_el$122, () => event.namespace);
            insert(_el$123, () => event.count, null);
            insert(_el$125, () => new Date(event.lastSeen).toLocaleString(), null);
            createRenderEffect((_$p) => setStyleProperty(_el$114, "border-left", `3px solid ${event.severity === "critical" ? "#ef4444" : "#f59e0b"}`));
            return _el$114;
          })()
        }));
        return _el$17;
      }
    }), null);
    insert(_el$11, createComponent(Show, {
      get when() {
        return filteredEvents().hpaMax.length > 0;
      },
      get children() {
        var _el$23 = _tmpl$3(), _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling, _el$27 = _el$26.firstChild, _el$28 = _el$24.nextSibling;
        insert(_el$26, () => filteredEvents().hpaMax.length, _el$27);
        insert(_el$26, () => filteredEvents().hpaMax.length !== 1 ? "s" : "", null);
        insert(_el$28, createComponent(For, {
          get each() {
            return filteredEvents().hpaMax;
          },
          children: (event) => (() => {
            var _el$127 = _tmpl$24(), _el$128 = _el$127.firstChild, _el$129 = _el$128.firstChild, _el$130 = _el$129.firstChild, _el$131 = _el$130.nextSibling, _el$132 = _el$131.nextSibling, _el$133 = _el$132.firstChild, _el$134 = _el$133.nextSibling, _el$135 = _el$134.firstChild, _el$137 = _el$135.nextSibling; _el$137.nextSibling; var _el$142 = _el$134.nextSibling; _el$142.firstChild;
            insert(_el$130, () => event.deploymentName);
            insert(_el$131, () => event.message);
            insert(_el$133, () => event.namespace);
            insert(_el$134, () => event.durationMinutes, _el$137);
            insert(_el$132, createComponent(Show, {
              get when() {
                return event.maxReplicas > 0;
              },
              get children() {
                var _el$138 = _tmpl$23(), _el$139 = _el$138.firstChild, _el$141 = _el$139.nextSibling; _el$141.nextSibling;
                insert(_el$138, () => event.maxReplicas, _el$141);
                return _el$138;
              }
            }), _el$142);
            insert(_el$142, () => new Date(event.lastSeen).toLocaleString(), null);
            createRenderEffect((_$p) => setStyleProperty(_el$127, "border-left", `3px solid ${event.severity === "critical" ? "#ef4444" : "#f59e0b"}`));
            return _el$127;
          })()
        }));
        return _el$23;
      }
    }), null);
    insert(_el$11, createComponent(Show, {
      get when() {
        return filteredEvents().security.length > 0;
      },
      get children() {
        var _el$29 = _tmpl$4(), _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$32.firstChild, _el$34 = _el$30.nextSibling;
        insert(_el$32, () => filteredEvents().security.length, _el$33);
        insert(_el$32, () => filteredEvents().security.length !== 1 ? "s" : "", null);
        insert(_el$34, createComponent(For, {
          get each() {
            return filteredEvents().security;
          },
          children: (event) => (() => {
            var _el$144 = _tmpl$25(), _el$145 = _el$144.firstChild, _el$146 = _el$145.firstChild, _el$147 = _el$146.firstChild, _el$148 = _el$147.firstChild, _el$150 = _el$148.nextSibling; _el$150.nextSibling; var _el$151 = _el$147.nextSibling, _el$152 = _el$151.nextSibling, _el$153 = _el$152.firstChild, _el$154 = _el$153.nextSibling, _el$155 = _el$154.nextSibling; _el$155.firstChild;
            insert(_el$147, () => event.resourceName, _el$148);
            insert(_el$147, () => event.resourceKind, _el$150);
            insert(_el$151, () => event.message);
            insert(_el$153, () => event.namespace);
            insert(_el$154, () => event.securityType.replace("_", " "));
            insert(_el$155, () => new Date(event.lastSeen).toLocaleString(), null);
            createRenderEffect((_$p) => setStyleProperty(_el$144, "border-left", `3px solid ${event.severity === "critical" ? "#ef4444" : "#f59e0b"}`));
            return _el$144;
          })()
        }));
        return _el$29;
      }
    }), null);
    insert(_el$11, createComponent(Show, {
      get when() {
        return filteredEvents().drift.length > 0;
      },
      get children() {
        var _el$35 = _tmpl$5(), _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$36.nextSibling;
        insert(_el$38, () => filteredEvents().drift.length, _el$39);
        insert(_el$38, () => filteredEvents().drift.length !== 1 ? "s" : "", null);
        insert(_el$40, createComponent(For, {
          get each() {
            return filteredEvents().drift;
          },
          children: (event) => (() => {
            var _el$157 = _tmpl$25(), _el$158 = _el$157.firstChild, _el$159 = _el$158.firstChild, _el$160 = _el$159.firstChild, _el$161 = _el$160.firstChild, _el$163 = _el$161.nextSibling; _el$163.nextSibling; var _el$164 = _el$160.nextSibling, _el$165 = _el$164.nextSibling, _el$166 = _el$165.firstChild, _el$167 = _el$166.nextSibling, _el$168 = _el$167.nextSibling; _el$168.firstChild;
            insert(_el$160, () => event.resourceName, _el$161);
            insert(_el$160, () => event.resourceKind, _el$163);
            insert(_el$164, () => event.message);
            insert(_el$166, () => event.namespace);
            insert(_el$167, () => event.driftType);
            insert(_el$168, () => new Date(event.lastSeen).toLocaleString(), null);
            createRenderEffect((_$p) => setStyleProperty(_el$157, "border-left", `3px solid ${event.severity === "critical" ? "#ef4444" : "#f59e0b"}`));
            return _el$157;
          })()
        }));
        return _el$35;
      }
    }), null);
    insert(_el$11, createComponent(Show, {
      get when() {
        return memo(() => !!(!incidents.loading && filteredEvents().oom.length === 0 && filteredEvents().hpaMax.length === 0 && filteredEvents().security.length === 0))() && filteredEvents().drift.length === 0;
      },
      get children() {
        var _el$41 = _tmpl$6(), _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$44 = _el$43.firstChild, _el$46 = _el$44.nextSibling; _el$46.nextSibling; var _el$47 = _el$43.nextSibling, _el$48 = _el$47.nextSibling; _el$48.firstChild;
        insert(_el$43, (() => {
          var _c$ = memo(() => selectedType() === "all");
          return () => _c$() ? "" : selectedType().toUpperCase() + " ";
        })(), _el$46);
        insert(_el$47, (() => {
          var _c$2 = memo(() => selectedType() === "all");
          return () => _c$2() ? "No OOM, HPA Max, security, or drift events found in recent incidents." : `No ${selectedType().toUpperCase()} events found in recent incidents.`;
        })());
        insert(_el$48, () => incidents()?.length || 0, null);
        return _el$41;
      }
    }), null);
    insert(_el$52, createComponent(For, {
      get each() {
        return filteredActions();
      },
      children: (action) => (() => {
        var _el$170 = _tmpl$26(), _el$171 = _el$170.firstChild, _el$172 = _el$171.firstChild, _el$173 = _el$172.nextSibling, _el$174 = _el$173.firstChild, _el$175 = _el$174.firstChild, _el$177 = _el$175.nextSibling; _el$177.nextSibling; var _el$178 = _el$174.nextSibling, _el$179 = _el$173.nextSibling;
        insert(_el$172, () => action.status.toUpperCase());
        insert(_el$174, () => action.resource, _el$175);
        insert(_el$174, () => action.namespace, _el$177);
        insert(_el$178, () => action.message);
        insert(_el$179, () => new Date(action.timestamp).toLocaleString());
        createRenderEffect(() => className(_el$172, `px-2 py-1 rounded text-xs font-medium ${getStatusColor(action.status)}`));
        return _el$170;
      })()
    }), null);
    insert(_el$52, createComponent(Show, {
      get when() {
        return filteredActions().length === 0;
      },
      get children() {
        return _tmpl$7();
      }
    }), null);
    createRenderEffect(() => _el$16.disabled = incidents.loading);
    createRenderEffect(() => _el$7.checked = autoFixEnabledState() ?? false);
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { AutoFix as default };
//# sourceMappingURL=AutoFix-vPTlr9uC.js.map
