import { c as createSignal, n as createEffect, k as api, ap as visibleThemes, aq as namespaces, a0 as themes, t as template, i as insert, d as createComponent, S as Show, G as addNotification, f as createRenderEffect, F as For, m as memo, e as setAttribute, h as setStyleProperty, V as settings, g as className, ar as resetSettings, as as setTheme, at as updateSetting, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">`), _tmpl$2 = /* @__PURE__ */ template(`<p class=text-xs style=color:var(--text-muted)>`), _tmpl$3 = /* @__PURE__ */ template(`<button type=button style=outline:none><span>`), _tmpl$4 = /* @__PURE__ */ template(`<select class="rounded-lg px-3 py-1.5 text-sm cursor-pointer"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center gap-2"><input type=number class="w-24 rounded-lg px-3 py-1.5 text-sm text-right"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">`), _tmpl$6 = /* @__PURE__ */ template(`<div class="card p-4 hover:border-opacity-60 transition-all"><div class="flex items-start justify-between gap-4"><div class=flex-1><div class="flex items-center gap-2 mb-1"><label class="text-sm font-medium"style=color:var(--text-primary)></label></div></div><div class=flex-shrink-0>`), _tmpl$7 = /* @__PURE__ */ template(`<option>`), _tmpl$8 = /* @__PURE__ */ template(`<span class="px-3 py-1 rounded-full text-xs font-semibold"style=background:#f59e0b20;color:#f59e0b>Update Available`), _tmpl$9 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$0 = /* @__PURE__ */ template(`<div class=space-y-4><div class="card p-6"><h3 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Application Version & Updates</h3><div class="flex items-center justify-between mb-4"><div><div class="text-sm font-medium mb-1"style=color:var(--text-primary)>KubeGraf </div><div class=text-xs style=color:var(--text-muted)>Advanced Kubernetes Visualization & Management Platform</div></div></div><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"style=background:var(--accent-primary);color:#000></button></div><div class="card p-6"><h3 class="text-lg font-semibold mb-2"style=color:var(--text-primary)>Reset All Settings</h3><p class="text-sm mb-4"style=color:var(--text-muted)>Reset all settings to their default values. This will clear all customizations and preferences.</p><button class="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"style=background:var(--error-color);color:white>Reset to Defaults</button></div><div class="card p-6"><h3 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Documentation & Links</h3><div class="grid grid-cols-2 gap-3"><a href=https://kubegraf.io target=_blank class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Website</a><a href=https://github.com/kubegraf/kubegraf target=_blank class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=currentColor viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>GitHub</a><a href=https://kubegraf.io/docs target=_blank class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>Documentation</a><a href=https://github.com/kubegraf/kubegraf/issues target=_blank class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Report Issue`), _tmpl$1 = /* @__PURE__ */ template(`<div class="max-w-5xl mx-auto"><div class=mb-8><h1 class="text-3xl font-bold mb-2 gradient-text">Settings</h1><p class=text-sm style=color:var(--text-muted)>Configure KubeGraf to match your workflow and preferences</p></div><div class=mb-8><button class="flex items-center gap-2 text-sm font-medium mb-4 hover:opacity-80 transition-opacity"style=color:var(--accent-primary)><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5l7 7-7 7"></path></svg>Advanced Settings & Information`), _tmpl$10 = /* @__PURE__ */ template(`<p class=text-sm style=color:var(--text-muted)>`), _tmpl$11 = /* @__PURE__ */ template(`<div class="flex items-center gap-2"><div class="text-lg font-semibold"style=color:var(--text-primary)> </div><button class="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"title="Edit interval"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">`), _tmpl$12 = /* @__PURE__ */ template(`<div class="flex items-center gap-2"><input type=number min=1 max=168 class="w-20 px-2 py-1 rounded text-sm border"autofocus style=background:var(--bg-primary);color:var(--text-primary);borderColor:var(--border-color)><span class=text-sm style=color:var(--text-muted)>hours</span><button class="px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"title=Save style=background:var(--accent-primary);color:#000><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 13l4 4L19 7"></path></svg></button><button class="px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"title=Cancel style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$13 = /* @__PURE__ */ template(`<div><div class="text-sm font-medium mb-1"style=color:var(--text-muted)>Last Backup</div><div class=text-sm style=color:var(--text-primary)>`), _tmpl$14 = /* @__PURE__ */ template(`<div><div class="text-sm font-medium mb-1"style=color:var(--text-muted)>Next Backup</div><div class=text-sm style=color:var(--text-primary)>`), _tmpl$15 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 gap-4 mt-4"><div><div class="text-sm font-medium mb-1"style=color:var(--text-muted)>Backup Interval</div><div class="text-xs mt-1"style=color:var(--text-muted)>Range: 1-168 hours (1 week)</div><div class="text-xs mt-1"style=color:var(--text-muted)>Backups stored in: <code class="px-1 py-0.5 rounded text-xs"style=background:var(--bg-tertiary)>~/.kubegraf/backups/</code></div></div><div><div class="text-sm font-medium mb-1"style=color:var(--text-muted)>Total Backups</div><div class="text-lg font-semibold"style=color:var(--text-primary)>`), _tmpl$16 = /* @__PURE__ */ template(`<div class="mt-4 flex gap-2"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"style=background:var(--accent-primary);color:#000></button><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"style=background:var(--error-color);color:white>Restore from Backup`), _tmpl$17 = /* @__PURE__ */ template(`<div class=mt-4><div class="text-sm font-medium mb-2"style=color:var(--text-muted)>Available Backups</div><div class="space-y-2 max-h-48 overflow-y-auto">`), _tmpl$18 = /* @__PURE__ */ template(`<div class="mb-4 p-3 rounded"style=background:var(--bg-tertiary)><div class="text-sm font-medium mb-1"style=color:var(--text-primary)>Selected Backup:</div><div class=text-xs style=color:var(--text-muted)>`), _tmpl$19 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div class="card p-6 max-w-md w-full mx-4"><h3 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Restore Database from Backup</h3><p class="text-sm mb-4"style=color:var(--text-muted)><strong class=text-red-500>WARNING:</strong> This will overwrite your current database with the selected backup. This action cannot be undone.</p><div class="flex gap-2"><button class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"style=background:var(--error-color);color:white></button><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel`), _tmpl$20 = /* @__PURE__ */ template(`<div class=space-y-4><div class="card p-4 mb-4"style="background:rgba(6, 182, 212, 0.1);border:1px solid rgba(6, 182, 212, 0.2)"><div class="flex items-start gap-3"><svg class="w-5 h-5 flex-shrink-0 mt-0.5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div class=flex-1><div class="text-sm font-medium mb-1"style=color:var(--text-primary)>What gets backed up?</div><div class="text-xs space-y-1"style=color:var(--text-muted)><p>KubeGraf stores all data locally on your device in a SQLite database. The backup includes:</p><ul class="list-disc list-inside ml-2 space-y-0.5"><li>User accounts and authentication sessions</li><li>Cloud provider credentials (encrypted)</li><li>Cluster configurations and connections</li><li>Event monitoring data and log errors</li><li>Application settings and preferences</li></ul><p class=mt-2><strong>Storage location:</strong> Backups are stored in <code class="px-1 py-0.5 rounded"style=background:var(--bg-tertiary)>~/.kubegraf/backups/</code> on your local device. All data remains on your machine - nothing is sent to external servers.</p></div></div></div></div><div class="card p-6"><div class="flex items-center justify-between mb-4"><div><h3 class="text-lg font-semibold mb-1"style=color:var(--text-primary)>Automatic Backups</h3><p class=text-sm style=color:var(--text-muted)>Automatically backup your database at regular intervals</p></div><label class="relative inline-flex items-center cursor-pointer"><input type=checkbox class="sr-only peer"><div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600">`), _tmpl$21 = /* @__PURE__ */ template(`<div class=space-y-3>`), _tmpl$22 = /* @__PURE__ */ template(`<div><div class="text-sm font-medium mb-1"style=color:var(--text-muted)>Last Updated</div><div class=text-sm style=color:var(--text-primary)>`), _tmpl$23 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 gap-4 mb-4"><div><div class="text-sm font-medium mb-1"style=color:var(--text-muted)>Sample Size</div><div class="text-lg font-semibold"style=color:var(--text-primary)> outcomes`), _tmpl$24 = /* @__PURE__ */ template(`<div class=space-y-4><div class="card p-4 mb-4"style="background:rgba(6, 182, 212, 0.1);border:1px solid rgba(6, 182, 212, 0.2)"><div class="flex items-start gap-3"><svg class="w-5 h-5 flex-shrink-0 mt-0.5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div class=flex-1><div class="text-sm font-medium mb-1"style=color:var(--text-primary)>How Incident Learning Works</div><div class="text-xs space-y-1"style=color:var(--text-muted)><p>KubeGraf learns from your feedback to improve incident diagnosis accuracy over time. All learning happens locally on your device - no data is sent to external servers.</p><ul class="list-disc list-inside ml-2 space-y-0.5"><li>When you provide feedback (✅ Worked, ❌ Didn't Work, ⚠️ Incorrect Cause), the system updates feature weights and cause priors</li><li>Confidence scores and root cause rankings improve based on your feedback</li><li>All learning data is stored in your local SQLite database</li><li>You can reset learning at any time to return to default weights</li></ul></div></div></div></div><div class="card p-6"><h3 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Learning Status</h3><div class=mt-4><h4 class="text-sm font-semibold mb-2"style=color:var(--text-primary)>Reset Learning</h4><p class="text-xs mb-4"style=color:var(--text-muted)>Reset all learned weights and priors to their default values. This will clear all learning progress and start fresh.</p><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"style=background:var(--error-color);color:white>`), _tmpl$25 = /* @__PURE__ */ template(`<div class=mb-8><button class="w-full flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"><div class="w-10 h-10 rounded-lg flex items-center justify-center"style="background:rgba(6, 182, 212, 0.1)"><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div class="flex-1 text-left"><h2 class="text-xl font-semibold"style=color:var(--text-primary)></h2></div><svg fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5l7 7-7 7">`), _tmpl$26 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-2 rounded border"style=borderColor:var(--border-color)><div class=flex-1><div class="text-sm font-medium"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)> • <!> MB</div></div><button class="px-3 py-1 text-xs rounded hover:opacity-80 transition-opacity"style=background:var(--error-color);color:white>Restore`);
const Settings = () => {
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [collapsedSections, setCollapsedSections] = createSignal(/* @__PURE__ */ new Set());
  const [version, setVersion] = createSignal("1.2.1");
  const [updateInfo, setUpdateInfo] = createSignal(null);
  const [checkingUpdate, setCheckingUpdate] = createSignal(false);
  createSignal(false);
  const [backupStatus, setBackupStatus] = createSignal(null);
  const [backupLoading, setBackupLoading] = createSignal(false);
  const [backupCreating, setBackupCreating] = createSignal(false);
  const [backupList, setBackupList] = createSignal([]);
  const [showRestoreDialog, setShowRestoreDialog] = createSignal(false);
  const [selectedBackup, setSelectedBackup] = createSignal(null);
  const [restoring, setRestoring] = createSignal(false);
  const [backupInterval, setBackupInterval] = createSignal(6);
  const [editingInterval, setEditingInterval] = createSignal(false);
  const [learningStatus, setLearningStatus] = createSignal(null);
  const [resettingLearning, setResettingLearning] = createSignal(false);
  const [perfSummaries, setPerfSummaries] = createSignal([]);
  const [loadingPerf, setLoadingPerf] = createSignal(false);
  createSignal(false);
  createEffect(async () => {
    try {
      const status = await api.getStatus();
      if (status && status.version) {
        setVersion(status.version);
      }
    } catch (err) {
      console.error("Failed to get version:", err);
    }
  });
  createEffect(async () => {
    try {
      const status = await api.database.getBackupStatus();
      setBackupStatus(status);
      if (status?.interval) {
        setBackupInterval(status.interval);
      }
      const list = await api.database.listBackups();
      setBackupList(list.backups || []);
    } catch (err) {
      console.error("Failed to get backup status:", err);
    }
  });
  createEffect(async () => {
    try {
      const status = await api.getLearningStatus();
      setLearningStatus(status);
    } catch (err) {
      console.error("Failed to get learning status:", err);
    }
  });
  const loadPerfSummaries = async () => {
    setLoadingPerf(true);
    try {
      const data = await api.getPerfSummary(15);
      setPerfSummaries(data.summaries || []);
    } catch (err) {
      const errorMessage = err?.message || "";
      const isNotEnabled = errorMessage.includes("not enabled") || errorMessage.includes("503") || errorMessage.includes("Service Unavailable");
      if (isNotEnabled) {
        console.log("Performance instrumentation not enabled (optional feature)");
        setPerfSummaries([]);
      } else {
        console.error("Failed to load performance summaries:", err);
        addNotification("Failed to load performance data", "error");
      }
    } finally {
      setLoadingPerf(false);
    }
  };
  createEffect(() => {
    if (showAdvanced()) {
      loadPerfSummaries();
      const interval = setInterval(loadPerfSummaries, 3e4);
      return () => clearInterval(interval);
    }
  });
  const handleSettingChange = (id, value) => {
    updateSetting(id, value);
    addNotification(`Setting updated: ${id}`, "success");
  };
  const handleResetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to defaults? This action cannot be undone.")) {
      resetSettings();
      setTheme("dark");
      addNotification("All settings have been reset to defaults", "success");
      setTimeout(() => location.reload(), 1e3);
    }
  };
  const toggleSection = (sectionTitle) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };
  const isSectionCollapsed = (sectionTitle) => {
    return collapsedSections().has(sectionTitle);
  };
  const sections = [{
    title: "Appearance",
    description: "Customize the look and feel of KubeGraf",
    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
    items: [{
      id: "theme",
      label: "Color Theme",
      description: "Choose your preferred color scheme",
      type: "select",
      options: visibleThemes.map((theme) => ({
        label: themes[theme].label,
        value: theme
      }))
    }, {
      id: "compactMode",
      label: "Compact Mode",
      description: "Reduce spacing and padding for a more compact view",
      type: "toggle"
    }, {
      id: "sidebarCollapsed",
      label: "Collapsed Sidebar by Default",
      description: "Start with sidebar in collapsed state",
      type: "toggle"
    }]
  }, {
    title: "General Settings",
    description: "Configure basic application behavior",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    items: [{
      id: "defaultNamespace",
      label: "Default Namespace",
      description: "Set the default namespace to load on startup",
      type: "select",
      options: [{
        label: "All Namespaces",
        value: "_all"
      }, ...namespaces().map((ns) => ({
        label: ns,
        value: ns
      }))]
    }, {
      id: "itemsPerPage",
      label: "Items Per Page",
      description: "Number of items to display per page in resource lists",
      type: "number",
      min: 10,
      max: 200,
      step: 10
    }, {
      id: "enableAutoRefresh",
      label: "Auto Refresh",
      description: "Automatically refresh resource data at regular intervals",
      type: "toggle"
    }, {
      id: "refreshInterval",
      label: "Refresh Interval (seconds)",
      description: "Time between automatic refreshes",
      type: "number",
      min: 5,
      max: 300,
      step: 5
    }]
  }, {
    title: "Notifications & Alerts",
    description: "Configure notification and alert preferences",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    items: [{
      id: "enableNotifications",
      label: "Desktop Notifications",
      description: "Show toast notifications for important events and actions",
      type: "toggle"
    }, {
      id: "enableSoundEffects",
      label: "Sound Effects",
      description: "Play sound effects for notifications and alerts",
      type: "toggle"
    }]
  }, {
    title: "Security & Diagnostics",
    description: "Enable or disable security scanning and diagnostic features",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    items: [{
      id: "enableDiagnostics",
      label: "Cluster Diagnostics",
      description: "Run automatic cluster health checks and diagnostics",
      type: "toggle",
      badge: "Core",
      badgeColor: "blue"
    }, {
      id: "enableSecurityChecks",
      label: "Security Checks",
      description: "Perform security-related diagnostic checks",
      type: "toggle",
      badge: "Security",
      badgeColor: "red"
    }, {
      id: "enableCVEVulnerabilities",
      label: "CVE Vulnerability Scanning",
      description: "Scan for known CVE vulnerabilities using NIST NVD database",
      type: "toggle",
      badge: "NIST NVD",
      badgeColor: "purple"
    }]
  }, {
    title: "Database Backup",
    description: "Configure automatic database backups and manage backup settings",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
    items: [],
    isBackupSection: true
    // Special flag for custom rendering
  }, {
    title: "AI & ML Features",
    description: "Control AI-powered features and machine learning capabilities",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    items: [{
      id: "enableAIChat",
      label: "AI Chat Assistant",
      description: "Enable AI-powered chat assistant for cluster management",
      type: "toggle",
      badge: "AI",
      badgeColor: "green"
    }, {
      id: "enableMLRecommendations",
      label: "ML Recommendations",
      description: "Get AI/ML-powered optimization recommendations",
      type: "toggle",
      badge: "ML",
      badgeColor: "green"
    }, {
      id: "enableAnomalyDetection",
      label: "Anomaly Detection",
      description: "Detect anomalies in cluster behavior using machine learning",
      type: "toggle",
      badge: "Advanced",
      badgeColor: "orange"
    }, {
      id: "showMLTimelineInBrain",
      label: "ML Timeline in Brain Panel",
      description: "Show ML timeline events in the Brain Panel",
      type: "toggle",
      badge: "Brain",
      badgeColor: "blue"
    }]
  }, {
    title: "Incident Learning",
    description: "On-device learning that improves incident confidence and root cause ranking over time",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    items: [],
    isLearningSection: true
    // Special flag for custom rendering
  }, {
    title: "Monitoring & Analysis",
    description: "Configure monitoring, cost analysis, and drift detection",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    items: [{
      id: "enableEventMonitoring",
      label: "Event Monitoring",
      description: "Monitor and track Kubernetes events in real-time",
      type: "toggle"
    }, {
      id: "enableCostAnalysis",
      label: "Cost Analysis",
      description: "Analyze and track cluster costs across cloud providers",
      type: "toggle",
      badge: "Beta",
      badgeColor: "yellow"
    }, {
      id: "enableDriftDetection",
      label: "Configuration Drift Detection",
      description: "Detect configuration drift in deployments and resources",
      type: "toggle"
    }, {
      id: "enableMetrics",
      label: "Resource Metrics",
      description: "Display CPU, memory, and other resource metrics",
      type: "toggle"
    }]
  }, {
    title: "Integrations",
    description: "Enable or disable external integrations and connectors",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    items: [{
      id: "enableMCP",
      label: "AI Agents",
      description: "Enable Model Context Protocol server for AI agent integration (Claude, Cursor, etc.)",
      type: "toggle",
      badge: "New",
      badgeColor: "cyan"
    }, {
      id: "enableConnectors",
      label: "External Connectors",
      description: "Enable integrations with external services (GitHub, Slack, PagerDuty, Webhooks)",
      type: "toggle"
    }]
  }, {
    title: "Visualization",
    description: "Configure visualization and topology features",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    items: [{
      id: "enableTopology",
      label: "Topology View",
      description: "Enable interactive topology visualization",
      type: "toggle"
    }, {
      id: "enableResourceMap",
      label: "Resource Map",
      description: "Enable resource relationship mapping",
      type: "toggle"
    }]
  }, {
    title: "Developer Tools",
    description: "Tools for developers and advanced users",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    items: [{
      id: "enableWebTerminal",
      label: "Web Terminal",
      description: "Enable built-in web terminal for kubectl commands",
      type: "toggle"
    }, {
      id: "enableLogs",
      label: "Log Viewer",
      description: "Enable advanced log viewing and streaming",
      type: "toggle"
    }]
  }, {
    title: "Sidebar Visibility",
    description: "Control which sections and menu items appear in the sidebar",
    icon: "M4 6h16M4 10h16M4 14h16M4 18h16",
    items: [{
      id: "showOverviewSection",
      label: "Show Overview Section",
      description: "Display Dashboard in sidebar",
      type: "toggle"
    }, {
      id: "showInsightsSection",
      label: "Show Insights Section",
      description: "Display AI Insights, Cost Analysis, Security, Drift Detection",
      type: "toggle"
    }, {
      id: "showDeploymentsSection",
      label: "Show Deployments Section",
      description: "Display Deploy and Rollouts",
      type: "toggle"
    }, {
      id: "showWorkloadsSection",
      label: "Show Workloads Section",
      description: "Display Pods, Deployments, StatefulSets, DaemonSets, Jobs, CronJobs",
      type: "toggle"
    }, {
      id: "showNetworkingSection",
      label: "Show Networking Section",
      description: "Display Services, Ingresses, Network Policies",
      type: "toggle"
    }, {
      id: "showConfigStorageSection",
      label: "Show Config & Storage Section",
      description: "Display ConfigMaps, Secrets, Certificates, Storage",
      type: "toggle"
    }, {
      id: "showClusterSection",
      label: "Show Cluster Section",
      description: "Display Nodes, RBAC, Events, Resource Map",
      type: "toggle"
    }, {
      id: "showIntegrationsSection",
      label: "Show Integrations Section",
      description: "Display Connectors and AI Agents menu items",
      type: "toggle",
      badge: "Important",
      badgeColor: "cyan"
    }, {
      id: "showExtensionsSection",
      label: "Show Extensions Section",
      description: "Display Plugins and Terminal",
      type: "toggle"
    }]
  }, {
    title: "Individual Menu Items",
    description: "Fine-grained control over specific sidebar menu items",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    items: [{
      id: "showConnectorsMenu",
      label: "Show Connectors Menu",
      description: "Display Connectors in Integrations section",
      type: "toggle",
      badge: "Integration",
      badgeColor: "cyan"
    }, {
      id: "showAIAgentsMenu",
      label: "Show AI Agents Menu",
      description: "Display AI Agents in Integrations section",
      type: "toggle",
      badge: "Integration",
      badgeColor: "cyan"
    }, {
      id: "showAIInsights",
      label: "Show AI Insights",
      description: "Display AI Insights in Insights section",
      type: "toggle"
    }, {
      id: "showCostAnalysisMenu",
      label: "Show Cost Analysis",
      description: "Display Cost Analysis in Insights section",
      type: "toggle"
    }, {
      id: "showSecurityInsights",
      label: "Show Security Insights",
      description: "Display Security in Insights section",
      type: "toggle"
    }, {
      id: "showDriftDetectionMenu",
      label: "Show Drift Detection",
      description: "Display Drift Detection in Insights section",
      type: "toggle"
    }, {
      id: "showPlugins",
      label: "Show Plugins",
      description: "Display Plugins in Extensions section",
      type: "toggle"
    }, {
      id: "showTerminalMenu",
      label: "Show Terminal",
      description: "Display Terminal in Extensions section",
      type: "toggle"
    }]
  }];
  const SettingItemComponent = (props) => {
    const item = props.item;
    const value = () => settings()[item.id];
    return (() => {
      var _el$ = _tmpl$6(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$8 = _el$3.nextSibling;
      insert(_el$5, () => item.label);
      insert(_el$4, createComponent(Show, {
        get when() {
          return item.badge;
        },
        get children() {
          var _el$6 = _tmpl$();
          insert(_el$6, () => item.badge);
          createRenderEffect((_p$) => {
            var _v$ = item.badgeColor === "blue" ? "#3b82f620" : item.badgeColor === "red" ? "#ef444420" : item.badgeColor === "green" ? "#22c55e20" : item.badgeColor === "purple" ? "#a855f720" : item.badgeColor === "orange" ? "#f97316 20" : item.badgeColor === "yellow" ? "#f59e0b20" : item.badgeColor === "cyan" ? "#06b6d420" : "#3b82f620", _v$2 = item.badgeColor === "blue" ? "#3b82f6" : item.badgeColor === "red" ? "#ef4444" : item.badgeColor === "green" ? "#22c55e" : item.badgeColor === "purple" ? "#a855f7" : item.badgeColor === "orange" ? "#f97316" : item.badgeColor === "yellow" ? "#f59e0b" : item.badgeColor === "cyan" ? "#06b6d4" : "#3b82f6";
            _v$ !== _p$.e && setStyleProperty(_el$6, "background", _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$6, "color", _p$.t = _v$2);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$6;
        }
      }), null);
      insert(_el$3, createComponent(Show, {
        get when() {
          return item.description;
        },
        get children() {
          var _el$7 = _tmpl$2();
          insert(_el$7, () => item.description);
          return _el$7;
        }
      }), null);
      insert(_el$8, createComponent(Show, {
        get when() {
          return item.type === "toggle";
        },
        get children() {
          var _el$9 = _tmpl$3(), _el$0 = _el$9.firstChild;
          _el$9.$$click = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSettingChange(item.id, !value());
          };
          createRenderEffect((_p$) => {
            var _v$3 = `relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${value() ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-tertiary)]"}`, _v$4 = value() ? "Enabled" : "Disabled", _v$5 = `inline-block h-4 w-4 transform rounded-full bg-white transition-transform pointer-events-none ${value() ? "translate-x-6" : "translate-x-1"}`;
            _v$3 !== _p$.e && className(_el$9, _p$.e = _v$3);
            _v$4 !== _p$.t && setAttribute(_el$9, "title", _p$.t = _v$4);
            _v$5 !== _p$.a && className(_el$0, _p$.a = _v$5);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          return _el$9;
        }
      }), null);
      insert(_el$8, createComponent(Show, {
        get when() {
          return item.type === "select";
        },
        get children() {
          var _el$1 = _tmpl$4();
          _el$1.addEventListener("change", (e) => handleSettingChange(item.id, e.currentTarget.value));
          insert(_el$1, createComponent(For, {
            get each() {
              return item.options;
            },
            children: (option) => (() => {
              var _el$12 = _tmpl$7();
              insert(_el$12, () => option.label);
              createRenderEffect(() => _el$12.value = option.value);
              return _el$12;
            })()
          }));
          createRenderEffect(() => _el$1.value = value());
          return _el$1;
        }
      }), null);
      insert(_el$8, createComponent(Show, {
        get when() {
          return item.type === "number";
        },
        get children() {
          var _el$10 = _tmpl$5(), _el$11 = _el$10.firstChild;
          _el$11.addEventListener("change", (e) => handleSettingChange(item.id, parseInt(e.currentTarget.value, 10)));
          createRenderEffect((_p$) => {
            var _v$6 = item.min, _v$7 = item.max, _v$8 = item.step;
            _v$6 !== _p$.e && setAttribute(_el$11, "min", _p$.e = _v$6);
            _v$7 !== _p$.t && setAttribute(_el$11, "max", _p$.t = _v$7);
            _v$8 !== _p$.a && setAttribute(_el$11, "step", _p$.a = _v$8);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          createRenderEffect(() => _el$11.value = value());
          return _el$10;
        }
      }), null);
      return _el$;
    })();
  };
  return (() => {
    var _el$13 = _tmpl$1(), _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild; _el$15.nextSibling; var _el$17 = _el$14.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild;
    insert(_el$13, createComponent(For, {
      each: sections,
      children: (section) => (() => {
        var _el$42 = _tmpl$25(), _el$43 = _el$42.firstChild, _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild, _el$46 = _el$45.firstChild, _el$47 = _el$44.nextSibling, _el$48 = _el$47.firstChild, _el$50 = _el$47.nextSibling;
        _el$43.$$click = () => toggleSection(section.title);
        insert(_el$48, () => section.title);
        insert(_el$47, createComponent(Show, {
          get when() {
            return section.description;
          },
          get children() {
            var _el$49 = _tmpl$10();
            insert(_el$49, () => section.description);
            return _el$49;
          }
        }), null);
        insert(_el$42, createComponent(Show, {
          get when() {
            return !isSectionCollapsed(section.title);
          },
          get children() {
            return [createComponent(Show, {
              get when() {
                return section.isBackupSection;
              },
              get children() {
                var _el$51 = _tmpl$20(), _el$52 = _el$51.firstChild, _el$53 = _el$52.firstChild, _el$54 = _el$53.firstChild, _el$55 = _el$54.nextSibling, _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling, _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$60 = _el$59.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$61.nextSibling; _el$62.nextSibling; var _el$64 = _el$52.nextSibling, _el$65 = _el$64.firstChild, _el$66 = _el$65.firstChild, _el$67 = _el$66.firstChild; _el$67.nextSibling; var _el$69 = _el$66.nextSibling, _el$70 = _el$69.firstChild;
                _el$70.addEventListener("change", async (e) => {
                  const target = e.target;
                  if (!target) return;
                  const isEnabled = target.checked;
                  setBackupLoading(true);
                  try {
                    await api.database.updateBackupConfig({
                      enabled: isEnabled,
                      interval: backupInterval()
                    });
                    const status = await api.database.getBackupStatus();
                    setBackupStatus(status);
                    addNotification(isEnabled ? "Automatic backups enabled" : "Automatic backups disabled", "success");
                  } catch (err) {
                    addNotification(`Failed to update backup settings: ${err}`, "error");
                  } finally {
                    setBackupLoading(false);
                  }
                });
                insert(_el$64, createComponent(Show, {
                  get when() {
                    return backupStatus();
                  },
                  get children() {
                    return [(() => {
                      var _el$71 = _tmpl$15(), _el$72 = _el$71.firstChild, _el$73 = _el$72.firstChild, _el$83 = _el$73.nextSibling, _el$84 = _el$83.nextSibling, _el$85 = _el$84.firstChild; _el$85.nextSibling; var _el$87 = _el$72.nextSibling, _el$88 = _el$87.firstChild, _el$89 = _el$88.nextSibling;
                      insert(_el$72, createComponent(Show, {
                        get when() {
                          return !editingInterval();
                        },
                        get children() {
                          var _el$74 = _tmpl$11(), _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$75.nextSibling;
                          insert(_el$75, backupInterval, _el$76);
                          insert(_el$75, () => backupInterval() === 1 ? "hour" : "hours", null);
                          _el$77.$$click = () => setEditingInterval(true);
                          return _el$74;
                        }
                      }), _el$83);
                      insert(_el$72, createComponent(Show, {
                        get when() {
                          return editingInterval();
                        },
                        get children() {
                          var _el$78 = _tmpl$12(), _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling, _el$81 = _el$80.nextSibling, _el$82 = _el$81.nextSibling;
                          _el$79.$$input = (e) => {
                            const value = parseInt(e.currentTarget.value);
                            if (!isNaN(value) && value >= 1 && value <= 168) {
                              setBackupInterval(value);
                            }
                          };
                          _el$81.$$click = async () => {
                            setBackupLoading(true);
                            try {
                              await api.database.updateBackupConfig({
                                enabled: backupStatus()?.enabled ?? true,
                                interval: backupInterval()
                              });
                              const status = await api.database.getBackupStatus();
                              setBackupStatus(status);
                              setEditingInterval(false);
                              addNotification(`Backup interval updated to ${backupInterval()} hours`, "success");
                            } catch (err) {
                              addNotification(`Failed to update interval: ${err}`, "error");
                            } finally {
                              setBackupLoading(false);
                            }
                          };
                          _el$82.$$click = () => {
                            setBackupInterval(backupStatus()?.interval ?? 6);
                            setEditingInterval(false);
                          };
                          createRenderEffect((_p$) => {
                            var _v$9 = backupLoading(), _v$0 = backupLoading();
                            _v$9 !== _p$.e && (_el$81.disabled = _p$.e = _v$9);
                            _v$0 !== _p$.t && (_el$82.disabled = _p$.t = _v$0);
                            return _p$;
                          }, {
                            e: void 0,
                            t: void 0
                          });
                          createRenderEffect(() => _el$79.value = backupInterval());
                          return _el$78;
                        }
                      }), _el$83);
                      insert(_el$89, () => backupStatus()?.backup_count ?? 0);
                      insert(_el$71, createComponent(Show, {
                        get when() {
                          return backupStatus()?.last_backup;
                        },
                        get children() {
                          var _el$90 = _tmpl$13(), _el$91 = _el$90.firstChild, _el$92 = _el$91.nextSibling;
                          insert(_el$92, () => new Date(backupStatus().last_backup).toLocaleString());
                          return _el$90;
                        }
                      }), null);
                      insert(_el$71, createComponent(Show, {
                        get when() {
                          return backupStatus()?.next_backup;
                        },
                        get children() {
                          var _el$93 = _tmpl$14(), _el$94 = _el$93.firstChild, _el$95 = _el$94.nextSibling;
                          insert(_el$95, () => new Date(backupStatus().next_backup).toLocaleString());
                          return _el$93;
                        }
                      }), null);
                      return _el$71;
                    })(), (() => {
                      var _el$96 = _tmpl$16(), _el$97 = _el$96.firstChild, _el$99 = _el$97.nextSibling;
                      _el$97.$$click = async () => {
                        setBackupCreating(true);
                        try {
                          const result = await api.database.createBackup();
                          addNotification("Backup created successfully", "success");
                          const status = await api.database.getBackupStatus();
                          setBackupStatus(status);
                          const list = await api.database.listBackups();
                          setBackupList(list.backups || []);
                        } catch (err) {
                          addNotification(`Failed to create backup: ${err}`, "error");
                        } finally {
                          setBackupCreating(false);
                        }
                      };
                      insert(_el$97, createComponent(Show, {
                        get when() {
                          return backupCreating();
                        },
                        get children() {
                          return _tmpl$9();
                        }
                      }), null);
                      insert(_el$97, () => backupCreating() ? "Creating..." : "Create Backup Now", null);
                      _el$99.$$click = () => {
                        const list = backupList();
                        if (list.length === 0) {
                          addNotification("No backups available to restore", "warning");
                          return;
                        }
                        setShowRestoreDialog(true);
                      };
                      createRenderEffect((_p$) => {
                        var _v$1 = backupCreating() || !backupStatus()?.enabled, _v$10 = backupList().length === 0;
                        _v$1 !== _p$.e && (_el$97.disabled = _p$.e = _v$1);
                        _v$10 !== _p$.t && (_el$99.disabled = _p$.t = _v$10);
                        return _p$;
                      }, {
                        e: void 0,
                        t: void 0
                      });
                      return _el$96;
                    })(), createComponent(Show, {
                      get when() {
                        return backupList().length > 0;
                      },
                      get children() {
                        var _el$100 = _tmpl$17(), _el$101 = _el$100.firstChild, _el$102 = _el$101.nextSibling;
                        insert(_el$102, createComponent(For, {
                          get each() {
                            return backupList();
                          },
                          children: (backup) => (() => {
                            var _el$137 = _tmpl$26(), _el$138 = _el$137.firstChild, _el$139 = _el$138.firstChild, _el$140 = _el$139.nextSibling, _el$141 = _el$140.firstChild, _el$143 = _el$141.nextSibling; _el$143.nextSibling; var _el$144 = _el$138.nextSibling;
                            insert(_el$139, () => backup.name);
                            insert(_el$140, () => new Date(backup.created_at).toLocaleString(), _el$141);
                            insert(_el$140, () => (backup.size / 1024 / 1024).toFixed(2), _el$143);
                            _el$144.$$click = () => {
                              setSelectedBackup(backup.path);
                              setShowRestoreDialog(true);
                            };
                            return _el$137;
                          })()
                        }));
                        return _el$100;
                      }
                    })];
                  }
                }), null);
                insert(_el$51, createComponent(Show, {
                  get when() {
                    return showRestoreDialog();
                  },
                  get children() {
                    var _el$103 = _tmpl$19(), _el$104 = _el$103.firstChild, _el$105 = _el$104.firstChild, _el$106 = _el$105.nextSibling, _el$110 = _el$106.nextSibling, _el$111 = _el$110.firstChild, _el$113 = _el$111.nextSibling;
                    _el$103.$$click = () => setShowRestoreDialog(false);
                    _el$104.$$click = (e) => e.stopPropagation();
                    insert(_el$104, createComponent(Show, {
                      get when() {
                        return selectedBackup();
                      },
                      get children() {
                        var _el$107 = _tmpl$18(), _el$108 = _el$107.firstChild, _el$109 = _el$108.nextSibling;
                        insert(_el$109, selectedBackup);
                        return _el$107;
                      }
                    }), _el$110);
                    _el$111.$$click = async () => {
                      const backupPath = selectedBackup() || (backupList().length > 0 ? backupList()[0].path : "");
                      if (!backupPath) {
                        addNotification("No backup selected", "error");
                        return;
                      }
                      if (!confirm("Are you absolutely sure you want to restore from this backup? This will overwrite your current database!")) {
                        return;
                      }
                      setRestoring(true);
                      try {
                        await api.database.restoreBackup(backupPath);
                        addNotification("Database restored successfully. Please restart the application.", "success");
                        setShowRestoreDialog(false);
                        setSelectedBackup(null);
                        setTimeout(() => {
                          window.location.reload();
                        }, 2e3);
                      } catch (err) {
                        addNotification(`Failed to restore backup: ${err}`, "error");
                      } finally {
                        setRestoring(false);
                      }
                    };
                    insert(_el$111, createComponent(Show, {
                      get when() {
                        return restoring();
                      },
                      get children() {
                        return _tmpl$9();
                      }
                    }), null);
                    insert(_el$111, () => restoring() ? "Restoring..." : "Confirm Restore", null);
                    _el$113.$$click = () => {
                      setShowRestoreDialog(false);
                      setSelectedBackup(null);
                    };
                    createRenderEffect((_p$) => {
                      var _v$11 = restoring() || !selectedBackup(), _v$12 = restoring();
                      _v$11 !== _p$.e && (_el$111.disabled = _p$.e = _v$11);
                      _v$12 !== _p$.t && (_el$113.disabled = _p$.t = _v$12);
                      return _p$;
                    }, {
                      e: void 0,
                      t: void 0
                    });
                    return _el$103;
                  }
                }), null);
                createRenderEffect(() => _el$70.disabled = backupLoading());
                createRenderEffect(() => _el$70.checked = backupStatus()?.enabled ?? false);
                return _el$51;
              }
            }), createComponent(Show, {
              get when() {
                return memo(() => !!!section.isBackupSection)() && !section.isLearningSection;
              },
              get children() {
                var _el$114 = _tmpl$21();
                insert(_el$114, createComponent(For, {
                  get each() {
                    return section.items;
                  },
                  children: (item) => createComponent(SettingItemComponent, {
                    item
                  })
                }));
                return _el$114;
              }
            }), createComponent(Show, {
              get when() {
                return section.isLearningSection;
              },
              get children() {
                var _el$115 = _tmpl$24(), _el$116 = _el$115.firstChild, _el$117 = _el$116.firstChild, _el$118 = _el$117.firstChild, _el$119 = _el$118.nextSibling, _el$120 = _el$119.firstChild; _el$120.nextSibling; var _el$122 = _el$116.nextSibling, _el$123 = _el$122.firstChild, _el$132 = _el$123.nextSibling, _el$133 = _el$132.firstChild, _el$134 = _el$133.nextSibling, _el$135 = _el$134.nextSibling;
                insert(_el$122, createComponent(Show, {
                  get when() {
                    return learningStatus();
                  },
                  get children() {
                    var _el$124 = _tmpl$23(), _el$125 = _el$124.firstChild, _el$126 = _el$125.firstChild, _el$127 = _el$126.nextSibling, _el$128 = _el$127.firstChild;
                    insert(_el$127, () => learningStatus()?.sampleSize ?? 0, _el$128);
                    insert(_el$124, createComponent(Show, {
                      get when() {
                        return learningStatus()?.lastUpdated;
                      },
                      get children() {
                        var _el$129 = _tmpl$22(), _el$130 = _el$129.firstChild, _el$131 = _el$130.nextSibling;
                        insert(_el$131, () => new Date(learningStatus().lastUpdated).toLocaleString());
                        return _el$129;
                      }
                    }), null);
                    return _el$124;
                  }
                }), _el$132);
                _el$135.$$click = async () => {
                  if (!confirm("Are you sure you want to reset all learning? This will clear all learned weights and priors. This action cannot be undone.")) {
                    return;
                  }
                  setResettingLearning(true);
                  try {
                    await api.resetLearning();
                    addNotification("Learning reset successfully", "success");
                    const status = await api.getLearningStatus();
                    setLearningStatus(status);
                  } catch (err) {
                    addNotification(`Failed to reset learning: ${err}`, "error");
                  } finally {
                    setResettingLearning(false);
                  }
                };
                insert(_el$135, createComponent(Show, {
                  get when() {
                    return resettingLearning();
                  },
                  get children() {
                    return _tmpl$9();
                  }
                }), null);
                insert(_el$135, () => resettingLearning() ? "Resetting..." : "Reset Learning", null);
                createRenderEffect(() => _el$135.disabled = resettingLearning());
                return _el$115;
              }
            })];
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$13 = section.icon, _v$14 = `w-5 h-5 transition-transform flex-shrink-0 ${isSectionCollapsed(section.title) ? "" : "rotate-90"}`;
          _v$13 !== _p$.e && setAttribute(_el$46, "d", _p$.e = _v$13);
          _v$14 !== _p$.t && setAttribute(_el$50, "class", _p$.t = _v$14);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$42;
      })()
    }), _el$17);
    _el$18.$$click = () => setShowAdvanced(!showAdvanced());
    insert(_el$17, createComponent(Show, {
      get when() {
        return showAdvanced();
      },
      get children() {
        var _el$20 = _tmpl$0(), _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild; _el$25.firstChild; _el$25.nextSibling; var _el$29 = _el$23.nextSibling, _el$31 = _el$21.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$33.nextSibling, _el$35 = _el$31.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling, _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling, _el$40 = _el$39.nextSibling; _el$40.nextSibling;
        insert(_el$25, version, null);
        insert(_el$23, createComponent(Show, {
          get when() {
            return memo(() => !!updateInfo())() && updateInfo().updateAvailable;
          },
          get children() {
            return _tmpl$8();
          }
        }), null);
        _el$29.$$click = async () => {
          setCheckingUpdate(true);
          try {
            const info = await api.checkForUpdates();
            setUpdateInfo(info);
            if (info.updateAvailable) {
              addNotification(`Update available: ${info.latestVersion}`, "info");
            } else {
              addNotification("You are running the latest version", "success");
            }
          } catch (err) {
            addNotification(`Failed to check for updates: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
          } finally {
            setCheckingUpdate(false);
          }
        };
        insert(_el$29, createComponent(Show, {
          get when() {
            return checkingUpdate();
          },
          get children() {
            return _tmpl$9();
          }
        }), null);
        insert(_el$29, () => checkingUpdate() ? "Checking..." : "Check for Updates", null);
        _el$34.$$click = handleResetSettings;
        createRenderEffect(() => _el$29.disabled = checkingUpdate());
        return _el$20;
      }
    }), null);
    createRenderEffect(() => setAttribute(_el$19, "class", `w-4 h-4 transition-transform ${showAdvanced() ? "rotate-90" : ""}`));
    return _el$13;
  })();
};
delegateEvents(["click", "input"]);

export { Settings as default };
//# sourceMappingURL=Settings-BwaPRY9w.js.map
