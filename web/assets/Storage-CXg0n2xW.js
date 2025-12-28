import { c as createSignal, j as createResource, P as namespace, k as api, G as addNotification, t as template, i as insert, d as createComponent, S as Show, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, q as style, M as Modal, g as className, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-NnaOo1cf.js';
import { Y as YAMLViewer } from './YAMLViewer-B3aZsnWG.js';
import { Y as YAMLEditor } from './YAMLEditor-8WjJlhy7.js';
import { C as ConfirmationModal } from './ConfirmationModal-CcBXvj0H.js';
import { R as RelatedResources } from './RelatedResources-COwjojL_.js';
import { A as ActionMenu } from './ActionMenu-BtMa9NTM.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-DuY4ZOBL.js';
import { a as getTableHeaderRowStyle, b as getTableHeaderCellStyle } from './tableCellStyles-CGbMKoA7.js';
import { u as useBulkSelection, S as SelectAllCheckbox, a as SelectionCheckbox, B as BulkActions, b as BulkDeleteModal } from './useBulkSelection-yjZBpTKC.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading PersistentVolumes...`), _tmpl$2 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><p>No PersistentVolumes found`), _tmpl$3 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name</div></th><th class=whitespace-nowrap>Capacity</th><th class=whitespace-nowrap>Access Modes</th><th class=whitespace-nowrap>Reclaim Policy</th><th class=whitespace-nowrap>Status</th><th class=whitespace-nowrap>Storage Class</th><th class=whitespace-nowrap>Claim</th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading PersistentVolumeClaims...`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><p>No PersistentVolumeClaims found`), _tmpl$7 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th class=whitespace-nowrap style="width:40px;padding:0 8px"></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name</div></th><th class=whitespace-nowrap>Namespace</th><th class=whitespace-nowrap>Status</th><th class=whitespace-nowrap>Volume</th><th class=whitespace-nowrap>Capacity</th><th class=whitespace-nowrap>Access Modes</th><th class=whitespace-nowrap>Storage Class</th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading StorageClasses...`), _tmpl$9 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><p>No StorageClasses found`), _tmpl$0 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name</div></th><th class=whitespace-nowrap>Provisioner</th><th class=whitespace-nowrap>Reclaim Policy</th><th class=whitespace-nowrap>Volume Binding Mode</th><th class=whitespace-nowrap>Allow Volume Expansion</th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$1 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$10 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4 p-6"style=minHeight:100vh;background:var(--bg-primary)><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Storage</h1><p class=text-xs style=color:var(--text-secondary)>Manage PersistentVolumes, PersistentVolumeClaims, and StorageClasses</p></div><div class="flex items-center gap-2"><select class="px-3 py-2 rounded-lg text-sm font-bold"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm font-bold"title="Font Style"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select></div></div><div class="flex gap-2 border-b"style=border-color:var(--border-color)><button>PersistentVolumes (<!>)</button><button>PersistentVolumeClaims (<!>)</button><button>StorageClasses (<!>)`), _tmpl$11 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span class="px-2 py-1 rounded text-xs font-medium"></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$12 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span class="px-2 py-1 rounded text-xs font-medium"></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$13 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$14 = /* @__PURE__ */ template(`<span class=text-green-500>Yes`), _tmpl$15 = /* @__PURE__ */ template(`<span class=text-gray-500>No`), _tmpl$16 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading YAML...`), _tmpl$17 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$18 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Capacity</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Status</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Reclaim Policy</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Storage Class</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Access Modes</div><div class=text-sm style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Claim</div><div class=text-sm style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$19 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Status</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Capacity</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Storage Class</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Volume</div><div class="text-sm break-all"style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Access Modes</div><div class=text-sm style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$20 = /* @__PURE__ */ template(`<div class=text-red-400>Error: `), _tmpl$21 = /* @__PURE__ */ template(`<pre class=whitespace-pre-wrap>`), _tmpl$22 = /* @__PURE__ */ template(`<div class="flex flex-col h-[60vh]"><div class="flex items-center justify-end gap-2 mb-2"><button class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"style=background:var(--bg-tertiary);color:var(--text-secondary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>Copy</button></div><div class="flex-1 font-mono text-sm p-4 rounded-lg overflow-auto"style="background:#0d1117;color:#c9d1d9;border:1px solid var(--border-color)">`), _tmpl$23 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-full"><div class=spinner>`);
const Storage = () => {
  const [activeTab, setActiveTab] = createSignal("pvs");
  const [selectedPV, setSelectedPV] = createSignal(null);
  const [selectedPVC, setSelectedPVC] = createSignal(null);
  const [selectedSC, setSelectedSC] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDetailsPV, setShowDetailsPV] = createSignal(false);
  const [showDetailsPVC, setShowDetailsPVC] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDeleteConfirmPV, setShowDeleteConfirmPV] = createSignal(false);
  const [showDeleteConfirmPVC, setShowDeleteConfirmPVC] = createSignal(false);
  const [deletingPV, setDeletingPV] = createSignal(false);
  const [deletingPVC, setDeletingPVC] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const bulkPVC = useBulkSelection();
  const [showBulkDeleteModalPVC, setShowBulkDeleteModalPVC] = createSignal(false);
  const getInitialFontSize = () => {
    const saved = localStorage.getItem("storage-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("storage-font-size", size.toString());
  };
  const getInitialFontFamily = () => {
    const saved = localStorage.getItem("storage-font-family");
    return saved || "Monospace";
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("storage-font-family", family);
  };
  const getFontFamilyCSS = () => {
    const family = fontFamily();
    switch (family) {
      case "Monospace":
        return '"Courier New", Monaco, monospace';
      case "System-ui":
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case "Monaco":
        return 'Monaco, "Lucida Console", monospace';
      case "Consolas":
        return 'Consolas, "Courier New", monospace';
      case "Courier":
        return 'Courier, "Courier New", monospace';
      default:
        return '"Courier New", Monaco, monospace';
    }
  };
  const [pvs, {
    refetch: refetchPVs
  }] = createResource(async () => {
    try {
      const response = await fetch("/api/storage/persistentvolumes");
      if (!response.ok) throw new Error("Failed to fetch PVs");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to fetch PVs:", err);
      return [];
    }
  });
  const [pvcs, {
    refetch: refetchPVCs
  }] = createResource(() => namespace(), async (ns) => {
    try {
      const nsParam = ns === "_all" || ns === "All Namespaces" || !ns ? "" : ns;
      const response = await fetch(`/api/storage/persistentvolumeclaims${nsParam ? `?namespace=${nsParam}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch PVCs");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to fetch PVCs:", err);
      return [];
    }
  });
  const [storageClasses, {
    refetch: refetchSC
  }] = createResource(async () => {
    try {
      const response = await fetch("/api/storage/storageclasses");
      if (!response.ok) throw new Error("Failed to fetch StorageClasses");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to fetch StorageClasses:", err);
      return [];
    }
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [type, name, ns] = key.split("|");
    if (!type || !name) return "";
    try {
      if (type === "pv") {
        const data = await api.getPVYAML(name);
        return data.yaml || "";
      } else if (type === "pvc") {
        const data = await api.getPVCYAML(name, ns || "default");
        return data.yaml || "";
      } else if (type === "sc") {
        const data = await api.getStorageClassYAML(name);
        return data.yaml || "";
      }
      return "";
    } catch (error) {
      console.error("Failed to fetch storage YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = "YAML cannot be empty";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    const status = clusterStatus();
    if (!status?.connected) {
      const msg = "Cluster is not connected. Connect to a cluster before applying YAML.";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    if (activeTab() === "pvs" && selectedPV()) {
      const pv = selectedPV();
      startExecution({
        label: `Apply PersistentVolume YAML: ${pv.name}`,
        command: "__k8s-apply-yaml",
        args: [],
        mode: "apply",
        kubernetesEquivalent: true,
        namespace: "",
        // PV is cluster-scoped
        context: status.context,
        userAction: "storage-pv-apply-yaml",
        dryRun: false,
        allowClusterWide: true,
        resource: "pv",
        action: "update",
        intent: "apply-yaml",
        yaml: trimmed
      });
      setShowEdit(false);
      setTimeout(() => refetchPVs(), 1500);
    } else if (activeTab() === "pvcs" && selectedPVC()) {
      const pvc = selectedPVC();
      startExecution({
        label: `Apply PVC YAML: ${pvc.name}`,
        command: "__k8s-apply-yaml",
        args: [],
        mode: "apply",
        kubernetesEquivalent: true,
        namespace: pvc.namespace || "default",
        context: status.context,
        userAction: "storage-pvc-apply-yaml",
        dryRun: false,
        allowClusterWide: false,
        resource: "pvc",
        action: "update",
        intent: "apply-yaml",
        yaml: trimmed
      });
      setShowEdit(false);
      setTimeout(() => refetchPVCs(), 1500);
    } else if (activeTab() === "storageclasses" && selectedSC()) {
      const sc = selectedSC();
      startExecution({
        label: `Apply StorageClass YAML: ${sc.name}`,
        command: "__k8s-apply-yaml",
        args: [],
        mode: "apply",
        kubernetesEquivalent: true,
        namespace: "",
        context: status.context,
        userAction: "storage-sc-apply-yaml",
        dryRun: false,
        allowClusterWide: true,
        resource: "storageclasses",
        action: "update",
        intent: "apply-yaml",
        yaml: trimmed
      });
      setShowEdit(false);
      setTimeout(() => refetchSC(), 1500);
    }
  };
  const handleDryRunYAML = async (yaml) => {
    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = "YAML cannot be empty";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    const status = clusterStatus();
    if (!status?.connected) {
      const msg = "Cluster is not connected. Connect to a cluster before running a dry run.";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    if (activeTab() === "pvs" && selectedPV()) {
      const pv = selectedPV();
      startExecution({
        label: `Dry run PersistentVolume YAML: ${pv.name}`,
        command: "__k8s-apply-yaml",
        args: [],
        mode: "dry-run",
        kubernetesEquivalent: true,
        namespace: "",
        // PV is cluster-scoped
        context: status.context,
        userAction: "storage-pv-apply-yaml-dry-run",
        dryRun: true,
        allowClusterWide: true,
        resource: "pv",
        action: "update",
        intent: "apply-yaml",
        yaml: trimmed
      });
    } else if (activeTab() === "pvcs" && selectedPVC()) {
      const pvc = selectedPVC();
      startExecution({
        label: `Dry run PVC YAML: ${pvc.name}`,
        command: "__k8s-apply-yaml",
        args: [],
        mode: "dry-run",
        kubernetesEquivalent: true,
        namespace: pvc.namespace || "default",
        context: status.context,
        userAction: "storage-pvc-apply-yaml-dry-run",
        dryRun: true,
        allowClusterWide: false,
        resource: "pvc",
        action: "update",
        intent: "apply-yaml",
        yaml: trimmed
      });
    } else if (activeTab() === "storageclasses" && selectedSC()) {
      const sc = selectedSC();
      startExecution({
        label: `Dry run StorageClass YAML: ${sc.name}`,
        command: "__k8s-apply-yaml",
        args: [],
        mode: "dry-run",
        kubernetesEquivalent: true,
        namespace: "",
        context: status.context,
        userAction: "storage-sc-apply-yaml-dry-run",
        dryRun: true,
        allowClusterWide: true,
        resource: "storageclasses",
        action: "update",
        intent: "apply-yaml",
        yaml: trimmed
      });
    }
  };
  const handleDeleteConfirmPV = async () => {
    const pv = selectedPV();
    if (!pv) return;
    setDeletingPV(true);
    try {
      await api.deletePV(pv.name);
      addNotification(`✅ PersistentVolume ${pv.name} deleted successfully`, "success");
      refetchPVs();
      setSelectedPV(null);
      setShowDeleteConfirmPV(false);
      setShowDetailsPV(false);
    } catch (err) {
      addNotification(`❌ Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setDeletingPV(false);
    }
  };
  const handleDeleteConfirmPVC = async () => {
    const pvc = selectedPVC();
    if (!pvc) return;
    setDeletingPVC(true);
    try {
      await api.deletePersistentVolumeClaim(pvc.namespace || "default", pvc.name);
      addNotification(`✅ PersistentVolumeClaim ${pvc.name} deleted successfully`, "success");
      refetchPVCs();
      setSelectedPVC(null);
      setShowDeleteConfirmPVC(false);
      setShowDetailsPVC(false);
    } catch (err) {
      addNotification(`❌ Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setDeletingPVC(false);
    }
  };
  const handleDelete = (type, name, ns) => {
    if (type === "pv") {
      const pv = (pvs() || []).find((p) => p.name === name);
      if (pv) {
        setSelectedPV(pv);
        setShowDeleteConfirmPV(true);
      }
    } else if (type === "pvc") {
      const pvc = (pvcs() || []).find((p) => p.name === name && p.namespace === ns);
      if (pvc) {
        setSelectedPVC(pvc);
        setShowDeleteConfirmPVC(true);
      }
    } else if (type === "sc") {
      if (!confirm(`Are you sure you want to delete StorageClass ${name}?`)) return;
      api.deleteStorageClass(name).then(() => {
        addNotification(`✅ StorageClass ${name} deleted successfully`, "success");
        refetchSC();
      }).catch((err) => {
        addNotification(`❌ Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      });
    }
  };
  const handleBulkDeletePVC = async () => {
    const itemsToDelete = bulkPVC.getSelectedItems(pvcs() || []);
    try {
      await Promise.all(itemsToDelete.map((pvc) => api.deletePersistentVolumeClaim(pvc.namespace || "default", pvc.name)));
      addNotification(`Successfully deleted ${itemsToDelete.length} PersistentVolumeClaim(s)`, "success");
      bulkPVC.deselectAll();
      refetchPVCs();
    } catch (error) {
      console.error("Failed to delete PVCs:", error);
      addNotification(`Failed to delete PVCs: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };
  return (() => {
    var _el$ = _tmpl$10(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$2.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$11 = _el$1.nextSibling; _el$11.nextSibling; var _el$12 = _el$0.nextSibling, _el$13 = _el$12.firstChild, _el$15 = _el$13.nextSibling; _el$15.nextSibling; var _el$16 = _el$12.nextSibling, _el$17 = _el$16.firstChild, _el$19 = _el$17.nextSibling; _el$19.nextSibling;
    _el$7.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$8.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$0.$$click = () => setActiveTab("pvs");
    insert(_el$0, () => pvs()?.length || 0, _el$11);
    _el$12.$$click = () => setActiveTab("pvcs");
    insert(_el$12, () => pvcs()?.length || 0, _el$15);
    _el$16.$$click = () => setActiveTab("storageclasses");
    insert(_el$16, () => storageClasses()?.length || 0, _el$19);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "pvs";
      },
      get children() {
        var _el$20 = _tmpl$4();
        insert(_el$20, createComponent(Show, {
          get when() {
            return pvs.loading;
          },
          get children() {
            var _el$21 = _tmpl$(), _el$22 = _el$21.firstChild; _el$22.nextSibling;
            return _el$21;
          }
        }), null);
        insert(_el$20, createComponent(Show, {
          get when() {
            return memo(() => !!!pvs.loading)() && (!pvs() || pvs().length === 0);
          },
          get children() {
            return _tmpl$2();
          }
        }), null);
        insert(_el$20, createComponent(Show, {
          get when() {
            return memo(() => !!(!pvs.loading && pvs()))() && pvs().length > 0;
          },
          get children() {
            var _el$25 = _tmpl$3(), _el$26 = _el$25.firstChild, _el$27 = _el$26.firstChild, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.nextSibling, _el$32 = _el$31.nextSibling, _el$33 = _el$32.nextSibling, _el$34 = _el$33.nextSibling, _el$35 = _el$34.nextSibling, _el$36 = _el$35.nextSibling, _el$37 = _el$27.nextSibling;
            insert(_el$37, createComponent(For, {
              get each() {
                return pvs();
              },
              children: (pv) => {
                return (() => {
                  var _el$74 = _tmpl$11(), _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$75.nextSibling, _el$78 = _el$77.nextSibling, _el$79 = _el$78.nextSibling, _el$80 = _el$79.nextSibling, _el$81 = _el$80.firstChild, _el$82 = _el$80.nextSibling, _el$83 = _el$82.nextSibling, _el$84 = _el$83.nextSibling;
                  _el$76.$$click = () => {
                    setSelectedPV(pv);
                    setShowDetailsPV(true);
                  };
                  insert(_el$76, () => pv.name);
                  insert(_el$77, () => pv.capacity || "N/A");
                  insert(_el$78, (() => {
                    var _c$ = memo(() => !!Array.isArray(pv.accessModes));
                    return () => _c$() ? pv.accessModes.join(", ") : pv.accessModes || "N/A";
                  })());
                  insert(_el$79, () => pv.reclaimPolicy || "N/A");
                  insert(_el$81, () => pv.status || "Unknown");
                  insert(_el$82, () => pv.storageClass || "N/A");
                  insert(_el$83, () => pv.claim || "-");
                  insert(_el$84, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelectedPV(pv);
                        setYamlKey(`pv|${pv.name}|`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelectedPV(pv);
                        setYamlKey(`pv|${pv.name}|`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => {
                        setSelectedPV(pv);
                        handleDelete("pv", pv.name);
                      },
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$46 = `${fontSize()}px`, _v$47 = `${Math.max(24, fontSize() * 1.7)}px`, _v$48 = `${Math.max(24, fontSize() * 1.7)}px`, _v$49 = `${fontSize()}px`, _v$50 = `${Math.max(24, fontSize() * 1.7)}px`, _v$51 = `${Math.max(24, fontSize() * 1.7)}px`, _v$52 = `${fontSize()}px`, _v$53 = `${Math.max(24, fontSize() * 1.7)}px`, _v$54 = `${Math.max(24, fontSize() * 1.7)}px`, _v$55 = `${fontSize()}px`, _v$56 = `${Math.max(24, fontSize() * 1.7)}px`, _v$57 = `${Math.max(24, fontSize() * 1.7)}px`, _v$58 = `${fontSize()}px`, _v$59 = `${Math.max(24, fontSize() * 1.7)}px`, _v$60 = `${Math.max(24, fontSize() * 1.7)}px`, _v$61 = pv.status === "Bound" ? "#10b98120" : pv.status === "Available" ? "#3b82f620" : "#ef444420", _v$62 = pv.status === "Bound" ? "#10b981" : pv.status === "Available" ? "#3b82f6" : "#ef4444", _v$63 = `${fontSize()}px`, _v$64 = `${Math.max(24, fontSize() * 1.7)}px`, _v$65 = `${Math.max(24, fontSize() * 1.7)}px`, _v$66 = `${fontSize()}px`, _v$67 = `${Math.max(24, fontSize() * 1.7)}px`, _v$68 = `${Math.max(24, fontSize() * 1.7)}px`, _v$69 = `${Math.max(24, fontSize() * 1.7)}px`, _v$70 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$46 !== _p$.e && setStyleProperty(_el$75, "font-size", _p$.e = _v$46);
                    _v$47 !== _p$.t && setStyleProperty(_el$75, "height", _p$.t = _v$47);
                    _v$48 !== _p$.a && setStyleProperty(_el$75, "line-height", _p$.a = _v$48);
                    _v$49 !== _p$.o && setStyleProperty(_el$77, "font-size", _p$.o = _v$49);
                    _v$50 !== _p$.i && setStyleProperty(_el$77, "height", _p$.i = _v$50);
                    _v$51 !== _p$.n && setStyleProperty(_el$77, "line-height", _p$.n = _v$51);
                    _v$52 !== _p$.s && setStyleProperty(_el$78, "font-size", _p$.s = _v$52);
                    _v$53 !== _p$.h && setStyleProperty(_el$78, "height", _p$.h = _v$53);
                    _v$54 !== _p$.r && setStyleProperty(_el$78, "line-height", _p$.r = _v$54);
                    _v$55 !== _p$.d && setStyleProperty(_el$79, "font-size", _p$.d = _v$55);
                    _v$56 !== _p$.l && setStyleProperty(_el$79, "height", _p$.l = _v$56);
                    _v$57 !== _p$.u && setStyleProperty(_el$79, "line-height", _p$.u = _v$57);
                    _v$58 !== _p$.c && setStyleProperty(_el$80, "font-size", _p$.c = _v$58);
                    _v$59 !== _p$.w && setStyleProperty(_el$80, "height", _p$.w = _v$59);
                    _v$60 !== _p$.m && setStyleProperty(_el$80, "line-height", _p$.m = _v$60);
                    _v$61 !== _p$.f && setStyleProperty(_el$81, "background", _p$.f = _v$61);
                    _v$62 !== _p$.y && setStyleProperty(_el$81, "color", _p$.y = _v$62);
                    _v$63 !== _p$.g && setStyleProperty(_el$82, "font-size", _p$.g = _v$63);
                    _v$64 !== _p$.p && setStyleProperty(_el$82, "height", _p$.p = _v$64);
                    _v$65 !== _p$.b && setStyleProperty(_el$82, "line-height", _p$.b = _v$65);
                    _v$66 !== _p$.T && setStyleProperty(_el$83, "font-size", _p$.T = _v$66);
                    _v$67 !== _p$.A && setStyleProperty(_el$83, "height", _p$.A = _v$67);
                    _v$68 !== _p$.O && setStyleProperty(_el$83, "line-height", _p$.O = _v$68);
                    _v$69 !== _p$.I && setStyleProperty(_el$84, "height", _p$.I = _v$69);
                    _v$70 !== _p$.S && setStyleProperty(_el$84, "line-height", _p$.S = _v$70);
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
                    r: void 0,
                    d: void 0,
                    l: void 0,
                    u: void 0,
                    c: void 0,
                    w: void 0,
                    m: void 0,
                    f: void 0,
                    y: void 0,
                    g: void 0,
                    p: void 0,
                    b: void 0,
                    T: void 0,
                    A: void 0,
                    O: void 0,
                    I: void 0,
                    S: void 0
                  });
                  return _el$74;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$ = getFontFamilyCSS(), _v$2 = getThemeBackground(), _v$3 = getTableHeaderRowStyle(fontSize()), _v$4 = getTableHeaderCellStyle(fontSize()), _v$5 = getTableHeaderCellStyle(fontSize()), _v$6 = getTableHeaderCellStyle(fontSize()), _v$7 = getTableHeaderCellStyle(fontSize()), _v$8 = getTableHeaderCellStyle(fontSize()), _v$9 = getTableHeaderCellStyle(fontSize()), _v$0 = getTableHeaderCellStyle(fontSize()), _v$1 = getTableHeaderCellStyle(fontSize());
              _v$ !== _p$.e && setStyleProperty(_el$26, "font-family", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$26, "background", _p$.t = _v$2);
              _p$.a = style(_el$28, _v$3, _p$.a);
              _p$.o = style(_el$29, _v$4, _p$.o);
              _p$.i = style(_el$30, _v$5, _p$.i);
              _p$.n = style(_el$31, _v$6, _p$.n);
              _p$.s = style(_el$32, _v$7, _p$.s);
              _p$.h = style(_el$33, _v$8, _p$.h);
              _p$.r = style(_el$34, _v$9, _p$.r);
              _p$.d = style(_el$35, _v$0, _p$.d);
              _p$.l = style(_el$36, _v$1, _p$.l);
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
              r: void 0,
              d: void 0,
              l: void 0
            });
            return _el$25;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$10 = getThemeBackground(), _v$11 = `1px solid ${getThemeBorderColor()}`;
          _v$10 !== _p$.e && setStyleProperty(_el$20, "background", _p$.e = _v$10);
          _v$11 !== _p$.t && setStyleProperty(_el$20, "border", _p$.t = _v$11);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$20;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "pvcs";
      },
      get children() {
        var _el$38 = _tmpl$4();
        insert(_el$38, createComponent(Show, {
          get when() {
            return pvcs.loading;
          },
          get children() {
            var _el$39 = _tmpl$5(), _el$40 = _el$39.firstChild; _el$40.nextSibling;
            return _el$39;
          }
        }), null);
        insert(_el$38, createComponent(Show, {
          get when() {
            return memo(() => !!!pvcs.loading)() && (!pvcs() || Array.isArray(pvcs()) && pvcs().length === 0);
          },
          get children() {
            return _tmpl$6();
          }
        }), null);
        insert(_el$38, createComponent(Show, {
          get when() {
            return memo(() => !!(!pvcs.loading && pvcs() && Array.isArray(pvcs())))() && pvcs().length > 0;
          },
          get children() {
            var _el$43 = _tmpl$7(), _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild, _el$46 = _el$45.firstChild, _el$47 = _el$46.firstChild, _el$48 = _el$47.nextSibling, _el$49 = _el$48.nextSibling, _el$50 = _el$49.nextSibling, _el$51 = _el$50.nextSibling, _el$52 = _el$51.nextSibling, _el$53 = _el$52.nextSibling, _el$54 = _el$53.nextSibling, _el$55 = _el$54.nextSibling, _el$56 = _el$45.nextSibling;
            insert(_el$47, createComponent(SelectAllCheckbox, {
              get checked() {
                return memo(() => bulkPVC.selectedCount() === (pvcs() || []).length)() && (pvcs() || []).length > 0;
              },
              get indeterminate() {
                return memo(() => bulkPVC.selectedCount() > 0)() && bulkPVC.selectedCount() < (pvcs() || []).length;
              },
              onChange: () => {
                if (bulkPVC.selectedCount() === (pvcs() || []).length) {
                  bulkPVC.deselectAll();
                } else {
                  bulkPVC.selectAll(pvcs() || []);
                }
              }
            }));
            insert(_el$56, createComponent(For, {
              get each() {
                return pvcs();
              },
              children: (pvc) => {
                return (() => {
                  var _el$85 = _tmpl$12(), _el$86 = _el$85.firstChild, _el$87 = _el$86.nextSibling, _el$88 = _el$87.firstChild, _el$89 = _el$87.nextSibling, _el$90 = _el$89.nextSibling, _el$91 = _el$90.firstChild, _el$92 = _el$90.nextSibling, _el$93 = _el$92.nextSibling, _el$94 = _el$93.nextSibling, _el$95 = _el$94.nextSibling, _el$96 = _el$95.nextSibling;
                  insert(_el$86, createComponent(SelectionCheckbox, {
                    get checked() {
                      return bulkPVC.isSelected(pvc);
                    },
                    onChange: () => bulkPVC.toggleSelection(pvc)
                  }));
                  _el$88.$$click = () => {
                    setSelectedPVC(pvc);
                    setShowDetailsPVC(true);
                  };
                  insert(_el$88, () => pvc.name);
                  insert(_el$89, () => pvc.namespace || "default");
                  insert(_el$91, () => pvc.status || "Unknown");
                  insert(_el$92, () => pvc.volume || "-");
                  insert(_el$93, () => pvc.capacity || "N/A");
                  insert(_el$94, (() => {
                    var _c$2 = memo(() => !!Array.isArray(pvc.accessModes));
                    return () => _c$2() ? pvc.accessModes.join(", ") : pvc.accessModes || "N/A";
                  })());
                  insert(_el$95, () => pvc.storageClass || "N/A");
                  insert(_el$96, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelectedPVC(pvc);
                        setYamlKey(`pvc|${pvc.name}|${pvc.namespace}`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelectedPVC(pvc);
                        setYamlKey(`pvc|${pvc.name}|${pvc.namespace}`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => {
                        setSelectedPVC(pvc);
                        handleDelete("pvc", pvc.name, pvc.namespace);
                      },
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$71 = `${Math.max(24, fontSize() * 1.7)}px`, _v$72 = `${Math.max(24, fontSize() * 1.7)}px`, _v$73 = `${fontSize()}px`, _v$74 = `${Math.max(24, fontSize() * 1.7)}px`, _v$75 = `${Math.max(24, fontSize() * 1.7)}px`, _v$76 = `${fontSize()}px`, _v$77 = `${Math.max(24, fontSize() * 1.7)}px`, _v$78 = `${Math.max(24, fontSize() * 1.7)}px`, _v$79 = `${fontSize()}px`, _v$80 = `${Math.max(24, fontSize() * 1.7)}px`, _v$81 = `${Math.max(24, fontSize() * 1.7)}px`, _v$82 = pvc.status === "Bound" ? "#10b98120" : "#ef444420", _v$83 = pvc.status === "Bound" ? "#10b981" : "#ef4444", _v$84 = `${fontSize()}px`, _v$85 = `${Math.max(24, fontSize() * 1.7)}px`, _v$86 = `${Math.max(24, fontSize() * 1.7)}px`, _v$87 = `${fontSize()}px`, _v$88 = `${Math.max(24, fontSize() * 1.7)}px`, _v$89 = `${Math.max(24, fontSize() * 1.7)}px`, _v$90 = `${fontSize()}px`, _v$91 = `${Math.max(24, fontSize() * 1.7)}px`, _v$92 = `${Math.max(24, fontSize() * 1.7)}px`, _v$93 = `${fontSize()}px`, _v$94 = `${Math.max(24, fontSize() * 1.7)}px`, _v$95 = `${Math.max(24, fontSize() * 1.7)}px`, _v$96 = `${Math.max(24, fontSize() * 1.7)}px`, _v$97 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$71 !== _p$.e && setStyleProperty(_el$86, "height", _p$.e = _v$71);
                    _v$72 !== _p$.t && setStyleProperty(_el$86, "line-height", _p$.t = _v$72);
                    _v$73 !== _p$.a && setStyleProperty(_el$87, "font-size", _p$.a = _v$73);
                    _v$74 !== _p$.o && setStyleProperty(_el$87, "height", _p$.o = _v$74);
                    _v$75 !== _p$.i && setStyleProperty(_el$87, "line-height", _p$.i = _v$75);
                    _v$76 !== _p$.n && setStyleProperty(_el$89, "font-size", _p$.n = _v$76);
                    _v$77 !== _p$.s && setStyleProperty(_el$89, "height", _p$.s = _v$77);
                    _v$78 !== _p$.h && setStyleProperty(_el$89, "line-height", _p$.h = _v$78);
                    _v$79 !== _p$.r && setStyleProperty(_el$90, "font-size", _p$.r = _v$79);
                    _v$80 !== _p$.d && setStyleProperty(_el$90, "height", _p$.d = _v$80);
                    _v$81 !== _p$.l && setStyleProperty(_el$90, "line-height", _p$.l = _v$81);
                    _v$82 !== _p$.u && setStyleProperty(_el$91, "background", _p$.u = _v$82);
                    _v$83 !== _p$.c && setStyleProperty(_el$91, "color", _p$.c = _v$83);
                    _v$84 !== _p$.w && setStyleProperty(_el$92, "font-size", _p$.w = _v$84);
                    _v$85 !== _p$.m && setStyleProperty(_el$92, "height", _p$.m = _v$85);
                    _v$86 !== _p$.f && setStyleProperty(_el$92, "line-height", _p$.f = _v$86);
                    _v$87 !== _p$.y && setStyleProperty(_el$93, "font-size", _p$.y = _v$87);
                    _v$88 !== _p$.g && setStyleProperty(_el$93, "height", _p$.g = _v$88);
                    _v$89 !== _p$.p && setStyleProperty(_el$93, "line-height", _p$.p = _v$89);
                    _v$90 !== _p$.b && setStyleProperty(_el$94, "font-size", _p$.b = _v$90);
                    _v$91 !== _p$.T && setStyleProperty(_el$94, "height", _p$.T = _v$91);
                    _v$92 !== _p$.A && setStyleProperty(_el$94, "line-height", _p$.A = _v$92);
                    _v$93 !== _p$.O && setStyleProperty(_el$95, "font-size", _p$.O = _v$93);
                    _v$94 !== _p$.I && setStyleProperty(_el$95, "height", _p$.I = _v$94);
                    _v$95 !== _p$.S && setStyleProperty(_el$95, "line-height", _p$.S = _v$95);
                    _v$96 !== _p$.W && setStyleProperty(_el$96, "height", _p$.W = _v$96);
                    _v$97 !== _p$.C && setStyleProperty(_el$96, "line-height", _p$.C = _v$97);
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
                    r: void 0,
                    d: void 0,
                    l: void 0,
                    u: void 0,
                    c: void 0,
                    w: void 0,
                    m: void 0,
                    f: void 0,
                    y: void 0,
                    g: void 0,
                    p: void 0,
                    b: void 0,
                    T: void 0,
                    A: void 0,
                    O: void 0,
                    I: void 0,
                    S: void 0,
                    W: void 0,
                    C: void 0
                  });
                  return _el$85;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$12 = getFontFamilyCSS(), _v$13 = getThemeBackground(), _v$14 = getTableHeaderRowStyle(fontSize()), _v$15 = {
                ...getTableHeaderCellStyle(fontSize())
              }, _v$16 = getTableHeaderCellStyle(fontSize()), _v$17 = getTableHeaderCellStyle(fontSize()), _v$18 = getTableHeaderCellStyle(fontSize()), _v$19 = getTableHeaderCellStyle(fontSize()), _v$20 = getTableHeaderCellStyle(fontSize()), _v$21 = getTableHeaderCellStyle(fontSize()), _v$22 = getTableHeaderCellStyle(fontSize()), _v$23 = getTableHeaderCellStyle(fontSize());
              _v$12 !== _p$.e && setStyleProperty(_el$44, "font-family", _p$.e = _v$12);
              _v$13 !== _p$.t && setStyleProperty(_el$44, "background", _p$.t = _v$13);
              _p$.a = style(_el$46, _v$14, _p$.a);
              _p$.o = style(_el$47, _v$15, _p$.o);
              _p$.i = style(_el$48, _v$16, _p$.i);
              _p$.n = style(_el$49, _v$17, _p$.n);
              _p$.s = style(_el$50, _v$18, _p$.s);
              _p$.h = style(_el$51, _v$19, _p$.h);
              _p$.r = style(_el$52, _v$20, _p$.r);
              _p$.d = style(_el$53, _v$21, _p$.d);
              _p$.l = style(_el$54, _v$22, _p$.l);
              _p$.u = style(_el$55, _v$23, _p$.u);
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
              r: void 0,
              d: void 0,
              l: void 0,
              u: void 0
            });
            return _el$43;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$24 = getThemeBackground(), _v$25 = `1px solid ${getThemeBorderColor()}`;
          _v$24 !== _p$.e && setStyleProperty(_el$38, "background", _p$.e = _v$24);
          _v$25 !== _p$.t && setStyleProperty(_el$38, "border", _p$.t = _v$25);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$38;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "storageclasses";
      },
      get children() {
        var _el$57 = _tmpl$4();
        insert(_el$57, createComponent(Show, {
          get when() {
            return storageClasses.loading;
          },
          get children() {
            var _el$58 = _tmpl$8(), _el$59 = _el$58.firstChild; _el$59.nextSibling;
            return _el$58;
          }
        }), null);
        insert(_el$57, createComponent(Show, {
          get when() {
            return memo(() => !!!storageClasses.loading)() && (!storageClasses() || storageClasses().length === 0);
          },
          get children() {
            return _tmpl$9();
          }
        }), null);
        insert(_el$57, createComponent(Show, {
          get when() {
            return memo(() => !!(!storageClasses.loading && storageClasses()))() && storageClasses().length > 0;
          },
          get children() {
            var _el$62 = _tmpl$0(), _el$63 = _el$62.firstChild, _el$64 = _el$63.firstChild, _el$65 = _el$64.firstChild, _el$66 = _el$65.firstChild, _el$67 = _el$66.nextSibling, _el$68 = _el$67.nextSibling, _el$69 = _el$68.nextSibling, _el$70 = _el$69.nextSibling, _el$71 = _el$70.nextSibling, _el$72 = _el$64.nextSibling;
            insert(_el$72, createComponent(For, {
              get each() {
                return storageClasses();
              },
              children: (sc) => {
                return (() => {
                  var _el$97 = _tmpl$13(), _el$98 = _el$97.firstChild, _el$99 = _el$98.nextSibling, _el$100 = _el$99.nextSibling, _el$101 = _el$100.nextSibling, _el$102 = _el$101.nextSibling, _el$103 = _el$102.nextSibling;
                  insert(_el$98, () => sc.name);
                  insert(_el$99, () => sc.provisioner || "N/A");
                  insert(_el$100, () => sc.reclaimPolicy || "N/A");
                  insert(_el$101, () => sc.volumeBindingMode || "N/A");
                  insert(_el$102, (() => {
                    var _c$3 = memo(() => !!sc.allowVolumeExpansion);
                    return () => _c$3() ? _tmpl$14() : _tmpl$15();
                  })());
                  insert(_el$103, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelectedSC(sc);
                        setYamlKey(`sc|${sc.name}|`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelectedSC(sc);
                        setYamlKey(`sc|${sc.name}|`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => handleDelete("sc", sc.name),
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$98 = `${fontSize()}px`, _v$99 = `${Math.max(24, fontSize() * 1.7)}px`, _v$100 = `${Math.max(24, fontSize() * 1.7)}px`, _v$101 = `${fontSize()}px`, _v$102 = `${Math.max(24, fontSize() * 1.7)}px`, _v$103 = `${Math.max(24, fontSize() * 1.7)}px`, _v$104 = `${fontSize()}px`, _v$105 = `${Math.max(24, fontSize() * 1.7)}px`, _v$106 = `${Math.max(24, fontSize() * 1.7)}px`, _v$107 = `${fontSize()}px`, _v$108 = `${Math.max(24, fontSize() * 1.7)}px`, _v$109 = `${Math.max(24, fontSize() * 1.7)}px`, _v$110 = `${fontSize()}px`, _v$111 = `${Math.max(24, fontSize() * 1.7)}px`, _v$112 = `${Math.max(24, fontSize() * 1.7)}px`, _v$113 = `${Math.max(24, fontSize() * 1.7)}px`, _v$114 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$98 !== _p$.e && setStyleProperty(_el$98, "font-size", _p$.e = _v$98);
                    _v$99 !== _p$.t && setStyleProperty(_el$98, "height", _p$.t = _v$99);
                    _v$100 !== _p$.a && setStyleProperty(_el$98, "line-height", _p$.a = _v$100);
                    _v$101 !== _p$.o && setStyleProperty(_el$99, "font-size", _p$.o = _v$101);
                    _v$102 !== _p$.i && setStyleProperty(_el$99, "height", _p$.i = _v$102);
                    _v$103 !== _p$.n && setStyleProperty(_el$99, "line-height", _p$.n = _v$103);
                    _v$104 !== _p$.s && setStyleProperty(_el$100, "font-size", _p$.s = _v$104);
                    _v$105 !== _p$.h && setStyleProperty(_el$100, "height", _p$.h = _v$105);
                    _v$106 !== _p$.r && setStyleProperty(_el$100, "line-height", _p$.r = _v$106);
                    _v$107 !== _p$.d && setStyleProperty(_el$101, "font-size", _p$.d = _v$107);
                    _v$108 !== _p$.l && setStyleProperty(_el$101, "height", _p$.l = _v$108);
                    _v$109 !== _p$.u && setStyleProperty(_el$101, "line-height", _p$.u = _v$109);
                    _v$110 !== _p$.c && setStyleProperty(_el$102, "font-size", _p$.c = _v$110);
                    _v$111 !== _p$.w && setStyleProperty(_el$102, "height", _p$.w = _v$111);
                    _v$112 !== _p$.m && setStyleProperty(_el$102, "line-height", _p$.m = _v$112);
                    _v$113 !== _p$.f && setStyleProperty(_el$103, "height", _p$.f = _v$113);
                    _v$114 !== _p$.y && setStyleProperty(_el$103, "line-height", _p$.y = _v$114);
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
                    r: void 0,
                    d: void 0,
                    l: void 0,
                    u: void 0,
                    c: void 0,
                    w: void 0,
                    m: void 0,
                    f: void 0,
                    y: void 0
                  });
                  return _el$97;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$26 = getFontFamilyCSS(), _v$27 = getThemeBackground(), _v$28 = getTableHeaderRowStyle(fontSize()), _v$29 = getTableHeaderCellStyle(fontSize()), _v$30 = getTableHeaderCellStyle(fontSize()), _v$31 = getTableHeaderCellStyle(fontSize()), _v$32 = getTableHeaderCellStyle(fontSize()), _v$33 = getTableHeaderCellStyle(fontSize()), _v$34 = getTableHeaderCellStyle(fontSize());
              _v$26 !== _p$.e && setStyleProperty(_el$63, "font-family", _p$.e = _v$26);
              _v$27 !== _p$.t && setStyleProperty(_el$63, "background", _p$.t = _v$27);
              _p$.a = style(_el$65, _v$28, _p$.a);
              _p$.o = style(_el$66, _v$29, _p$.o);
              _p$.i = style(_el$67, _v$30, _p$.i);
              _p$.n = style(_el$68, _v$31, _p$.n);
              _p$.s = style(_el$69, _v$32, _p$.s);
              _p$.h = style(_el$70, _v$33, _p$.h);
              _p$.r = style(_el$71, _v$34, _p$.r);
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
            return _el$62;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$35 = getThemeBackground(), _v$36 = `1px solid ${getThemeBorderColor()}`;
          _v$35 !== _p$.e && setStyleProperty(_el$57, "background", _p$.e = _v$35);
          _v$36 !== _p$.t && setStyleProperty(_el$57, "border", _p$.t = _v$36);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$57;
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showYaml();
      },
      size: "large",
      get title() {
        return `View YAML - ${activeTab() === "pvs" ? selectedPV()?.name : activeTab() === "pvcs" ? selectedPVC()?.name : selectedSC()?.name || ""}`;
      },
      onClose: () => {
        setShowYaml(false);
        setSelectedPV(null);
        setSelectedPVC(null);
        setSelectedSC(null);
        setYamlKey(null);
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$106 = _tmpl$16(), _el$107 = _el$106.firstChild; _el$107.nextSibling;
              return _el$106;
            })();
          },
          get children() {
            return createComponent(YAMLViewer, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return memo(() => activeTab() === "pvs")() ? selectedPV()?.name : memo(() => activeTab() === "pvcs")() ? selectedPVC()?.name : selectedSC()?.name;
              }
            });
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showEdit();
      },
      size: "large",
      get title() {
        return `Edit YAML - ${activeTab() === "pvs" ? selectedPV()?.name : activeTab() === "pvcs" ? selectedPVC()?.name : selectedSC()?.name || ""}`;
      },
      onClose: () => {
        setShowEdit(false);
        setSelectedPV(null);
        setSelectedPVC(null);
        setSelectedSC(null);
        setYamlKey(null);
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$109 = _tmpl$16(), _el$110 = _el$109.firstChild; _el$110.nextSibling;
              return _el$109;
            })();
          },
          get children() {
            var _el$73 = _tmpl$1();
            insert(_el$73, createComponent(YAMLEditor, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return memo(() => activeTab() === "pvs")() ? selectedPV()?.name : memo(() => activeTab() === "pvcs")() ? selectedPVC()?.name : selectedSC()?.name;
              },
              onSave: handleSaveYAML,
              onDryRun: handleDryRunYAML,
              onCancel: () => {
                setShowEdit(false);
                setSelectedPV(null);
                setSelectedPVC(null);
                setSelectedSC(null);
                setYamlKey(null);
              }
            }));
            return _el$73;
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "pvcs";
      },
      get children() {
        return [createComponent(BulkActions, {
          get selectedCount() {
            return bulkPVC.selectedCount();
          },
          get totalCount() {
            return (pvcs() || []).length;
          },
          onSelectAll: () => bulkPVC.selectAll(pvcs() || []),
          onDeselectAll: () => bulkPVC.deselectAll(),
          onDelete: () => setShowBulkDeleteModalPVC(true),
          resourceType: "PVCs"
        }), createComponent(BulkDeleteModal, {
          get isOpen() {
            return showBulkDeleteModalPVC();
          },
          onClose: () => setShowBulkDeleteModalPVC(false),
          onConfirm: handleBulkDeletePVC,
          resourceType: "PersistentVolumeClaims",
          get selectedItems() {
            return bulkPVC.getSelectedItems(pvcs() || []);
          }
        })];
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showDetailsPV();
      },
      onClose: () => {
        setShowDetailsPV(false);
        setSelectedPV(null);
      },
      get title() {
        return `PersistentVolume: ${selectedPV()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selectedPV();
          },
          get children() {
            return (() => {
              const [pvDetails] = createResource(() => selectedPV() ? selectedPV().name : null, async (name) => {
                if (!name) return null;
                return api.getPVDetails(name);
              });
              return (() => {
                var _el$112 = _tmpl$18(), _el$113 = _el$112.firstChild, _el$114 = _el$113.firstChild, _el$115 = _el$114.nextSibling, _el$116 = _el$115.firstChild, _el$117 = _el$116.firstChild, _el$118 = _el$117.nextSibling, _el$120 = _el$116.nextSibling, _el$121 = _el$120.firstChild, _el$122 = _el$121.nextSibling, _el$124 = _el$120.nextSibling, _el$125 = _el$124.firstChild, _el$126 = _el$125.nextSibling, _el$128 = _el$124.nextSibling, _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling, _el$132 = _el$128.nextSibling, _el$133 = _el$132.firstChild, _el$134 = _el$133.nextSibling, _el$136 = _el$132.nextSibling, _el$137 = _el$136.firstChild, _el$138 = _el$137.nextSibling, _el$140 = _el$136.nextSibling, _el$141 = _el$140.firstChild, _el$142 = _el$141.nextSibling, _el$143 = _el$113.nextSibling, _el$144 = _el$143.firstChild, _el$145 = _el$144.nextSibling, _el$146 = _el$145.nextSibling, _el$147 = _el$146.nextSibling;
                insert(_el$118, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvDetails.loading)() && pvDetails();
                  },
                  children: (details) => details().capacity || selectedPV()?.capacity || "-"
                }), null);
                insert(_el$118, createComponent(Show, {
                  get when() {
                    return pvDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$122, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvDetails.loading)() && pvDetails();
                  },
                  children: (details) => details().status || selectedPV()?.status || "-"
                }), null);
                insert(_el$122, createComponent(Show, {
                  get when() {
                    return pvDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$126, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvDetails.loading)() && pvDetails();
                  },
                  children: (details) => details().reclaimPolicy || selectedPV()?.reclaimPolicy || "-"
                }), null);
                insert(_el$126, createComponent(Show, {
                  get when() {
                    return pvDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$130, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvDetails.loading)() && pvDetails();
                  },
                  children: (details) => details().storageClass || selectedPV()?.storageClass || "-"
                }), null);
                insert(_el$130, createComponent(Show, {
                  get when() {
                    return pvDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$134, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvDetails.loading)() && pvDetails();
                  },
                  children: (details) => (details().accessModes || selectedPV()?.accessModes || []).join(", ") || "-"
                }), null);
                insert(_el$134, createComponent(Show, {
                  get when() {
                    return pvDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$138, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvDetails.loading)() && pvDetails();
                  },
                  children: (details) => {
                    const claim = details().claim;
                    const claimNs = details().claimNamespace;
                    return claim ? claimNs ? `${claimNs}/${claim}` : claim : selectedPV()?.claim || "-";
                  }
                }), null);
                insert(_el$138, createComponent(Show, {
                  get when() {
                    return pvDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$142, () => selectedPV()?.age || "-");
                insert(_el$112, createComponent(Show, {
                  get when() {
                    return pvDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "persistentvolume",
                      get name() {
                        return pvDetails().name;
                      },
                      namespace: "",
                      get relatedData() {
                        return pvDetails();
                      }
                    });
                  }
                }), _el$143);
                _el$144.$$click = () => {
                  setShowDetailsPV(false);
                  setSelectedPV(selectedPV());
                  setYamlKey(`pv|${selectedPV().name}|`);
                  setShowYaml(true);
                };
                _el$145.$$click = () => {
                  setShowDetailsPV(false);
                  setSelectedPV(selectedPV());
                  setShowDescribe(true);
                };
                _el$146.$$click = () => {
                  setShowDetailsPV(false);
                  setSelectedPV(selectedPV());
                  setYamlKey(`pv|${selectedPV().name}|`);
                  setShowEdit(true);
                };
                _el$147.$$click = (e) => {
                  e.stopPropagation();
                  handleDelete("pv", selectedPV().name);
                };
                return _el$112;
              })();
            })();
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showDetailsPVC();
      },
      onClose: () => {
        setShowDetailsPVC(false);
        setSelectedPVC(null);
      },
      get title() {
        return `PersistentVolumeClaim: ${selectedPVC()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selectedPVC();
          },
          get children() {
            return (() => {
              const [pvcDetails] = createResource(() => selectedPVC() ? {
                name: selectedPVC().name,
                ns: selectedPVC().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getPVCDetails(params.name, params.ns);
              });
              return (() => {
                var _el$148 = _tmpl$19(), _el$149 = _el$148.firstChild, _el$150 = _el$149.firstChild, _el$151 = _el$150.nextSibling, _el$152 = _el$151.firstChild, _el$153 = _el$152.firstChild, _el$154 = _el$153.nextSibling, _el$156 = _el$152.nextSibling, _el$157 = _el$156.firstChild, _el$158 = _el$157.nextSibling, _el$160 = _el$156.nextSibling, _el$161 = _el$160.firstChild, _el$162 = _el$161.nextSibling, _el$164 = _el$160.nextSibling, _el$165 = _el$164.firstChild, _el$166 = _el$165.nextSibling, _el$168 = _el$164.nextSibling, _el$169 = _el$168.firstChild, _el$170 = _el$169.nextSibling, _el$172 = _el$168.nextSibling, _el$173 = _el$172.firstChild, _el$174 = _el$173.nextSibling, _el$175 = _el$172.nextSibling, _el$176 = _el$175.firstChild, _el$177 = _el$176.nextSibling, _el$178 = _el$149.nextSibling, _el$179 = _el$178.firstChild, _el$180 = _el$179.nextSibling, _el$181 = _el$180.nextSibling, _el$182 = _el$181.nextSibling;
                insert(_el$154, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvcDetails.loading)() && pvcDetails();
                  },
                  children: (details) => details().status || selectedPVC()?.status || "-"
                }), null);
                insert(_el$154, createComponent(Show, {
                  get when() {
                    return pvcDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$158, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvcDetails.loading)() && pvcDetails();
                  },
                  children: (details) => details().capacity || selectedPVC()?.capacity || "-"
                }), null);
                insert(_el$158, createComponent(Show, {
                  get when() {
                    return pvcDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$162, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvcDetails.loading)() && pvcDetails();
                  },
                  children: (details) => details().storageClass || selectedPVC()?.storageClass || "-"
                }), null);
                insert(_el$162, createComponent(Show, {
                  get when() {
                    return pvcDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$166, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvcDetails.loading)() && pvcDetails();
                  },
                  children: (details) => details().volume || selectedPVC()?.volume || "-"
                }), null);
                insert(_el$166, createComponent(Show, {
                  get when() {
                    return pvcDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$170, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pvcDetails.loading)() && pvcDetails();
                  },
                  children: (details) => (details().accessModes || selectedPVC()?.accessModes || []).join(", ") || "-"
                }), null);
                insert(_el$170, createComponent(Show, {
                  get when() {
                    return pvcDetails.loading;
                  },
                  get children() {
                    return _tmpl$17();
                  }
                }), null);
                insert(_el$174, () => selectedPVC()?.age || "-");
                insert(_el$177, () => selectedPVC()?.namespace);
                insert(_el$148, createComponent(Show, {
                  get when() {
                    return pvcDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "persistentvolumeclaim",
                      get name() {
                        return pvcDetails().name;
                      },
                      get namespace() {
                        return pvcDetails().namespace;
                      },
                      get relatedData() {
                        return pvcDetails();
                      }
                    });
                  }
                }), _el$178);
                _el$179.$$click = () => {
                  setShowDetailsPVC(false);
                  setSelectedPVC(selectedPVC());
                  setYamlKey(`pvc|${selectedPVC().name}|${selectedPVC().namespace}`);
                  setShowYaml(true);
                };
                _el$180.$$click = () => {
                  setShowDetailsPVC(false);
                  setSelectedPVC(selectedPVC());
                  setShowDescribe(true);
                };
                _el$181.$$click = () => {
                  setShowDetailsPVC(false);
                  setSelectedPVC(selectedPVC());
                  setYamlKey(`pvc|${selectedPVC().name}|${selectedPVC().namespace}`);
                  setShowEdit(true);
                };
                _el$182.$$click = (e) => {
                  e.stopPropagation();
                  handleDelete("pvc", selectedPVC().name, selectedPVC().namespace);
                };
                return _el$148;
              })();
            })();
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(showDescribe() && activeTab() === "pvs"))() && selectedPV();
      },
      get children() {
        return (() => {
          const [describe] = createResource(() => selectedPV() ? selectedPV().name : null, async (name) => {
            if (!name) return null;
            const result = await api.getPVDescribe(name);
            return result.describe || "";
          });
          return createComponent(Modal, {
            get isOpen() {
              return showDescribe();
            },
            onClose: () => setShowDescribe(false),
            get title() {
              return `Describe: ${selectedPV()?.name}`;
            },
            size: "xl",
            get children() {
              var _el$183 = _tmpl$22(), _el$184 = _el$183.firstChild, _el$185 = _el$184.firstChild, _el$186 = _el$184.nextSibling;
              _el$185.$$click = async () => {
                const text = describe() || "";
                await navigator.clipboard.writeText(text);
                addNotification("Copied to clipboard", "success");
              };
              insert(_el$186, createComponent(Show, {
                get when() {
                  return !describe.loading;
                },
                get fallback() {
                  return _tmpl$23();
                },
                get children() {
                  return [createComponent(Show, {
                    get when() {
                      return describe.error;
                    },
                    get children() {
                      var _el$187 = _tmpl$20(); _el$187.firstChild;
                      insert(_el$187, () => describe.error?.message, null);
                      return _el$187;
                    }
                  }), (() => {
                    var _el$189 = _tmpl$21();
                    insert(_el$189, () => describe() || "");
                    return _el$189;
                  })()];
                }
              }));
              return _el$183;
            }
          });
        })();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(showDescribe() && activeTab() === "pvcs"))() && selectedPVC();
      },
      get children() {
        return (() => {
          const [describe] = createResource(() => selectedPVC() ? {
            name: selectedPVC().name,
            ns: selectedPVC().namespace
          } : null, async (params) => {
            if (!params) return null;
            const result = await api.getPVCDescribe(params.name, params.ns);
            return result.describe || "";
          });
          return createComponent(Modal, {
            get isOpen() {
              return showDescribe();
            },
            onClose: () => setShowDescribe(false),
            get title() {
              return `Describe: ${selectedPVC()?.name}`;
            },
            size: "xl",
            get children() {
              var _el$191 = _tmpl$22(), _el$192 = _el$191.firstChild, _el$193 = _el$192.firstChild, _el$194 = _el$192.nextSibling;
              _el$193.$$click = async () => {
                const text = describe() || "";
                await navigator.clipboard.writeText(text);
                addNotification("Copied to clipboard", "success");
              };
              insert(_el$194, createComponent(Show, {
                get when() {
                  return !describe.loading;
                },
                get fallback() {
                  return _tmpl$23();
                },
                get children() {
                  return [createComponent(Show, {
                    get when() {
                      return describe.error;
                    },
                    get children() {
                      var _el$195 = _tmpl$20(); _el$195.firstChild;
                      insert(_el$195, () => describe.error?.message, null);
                      return _el$195;
                    }
                  }), (() => {
                    var _el$197 = _tmpl$21();
                    insert(_el$197, () => describe() || "");
                    return _el$197;
                  })()];
                }
              }));
              return _el$191;
            }
          });
        })();
      }
    }), null);
    insert(_el$, createComponent(ConfirmationModal, {
      get isOpen() {
        return showDeleteConfirmPV();
      },
      onClose: () => {
        if (!deletingPV()) {
          setShowDeleteConfirmPV(false);
          setShowDetailsPV(false);
        }
      },
      title: "Delete PersistentVolume",
      get message() {
        return memo(() => !!selectedPV())() ? `Are you sure you want to delete the PersistentVolume "${selectedPV().name}"?` : "Are you sure you want to delete this PersistentVolume?";
      },
      get details() {
        return memo(() => !!selectedPV())() ? [{
          label: "Name",
          value: selectedPV().name
        }, {
          label: "Status",
          value: selectedPV().status
        }] : void 0;
      },
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      get loading() {
        return deletingPV();
      },
      onConfirm: handleDeleteConfirmPV,
      size: "sm"
    }), null);
    insert(_el$, createComponent(ConfirmationModal, {
      get isOpen() {
        return showDeleteConfirmPVC();
      },
      onClose: () => {
        if (!deletingPVC()) {
          setShowDeleteConfirmPVC(false);
          setShowDetailsPVC(false);
        }
      },
      title: "Delete PersistentVolumeClaim",
      get message() {
        return memo(() => !!selectedPVC())() ? `Are you sure you want to delete the PersistentVolumeClaim "${selectedPVC().name}"?` : "Are you sure you want to delete this PersistentVolumeClaim?";
      },
      get details() {
        return memo(() => !!selectedPVC())() ? [{
          label: "Name",
          value: selectedPVC().name
        }, {
          label: "Namespace",
          value: selectedPVC().namespace
        }] : void 0;
      },
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      get loading() {
        return deletingPVC();
      },
      onConfirm: handleDeleteConfirmPVC,
      size: "sm"
    }), null);
    createRenderEffect((_p$) => {
      var _v$37 = `px-4 py-2 font-medium transition-colors ${activeTab() === "pvs" ? "border-b-2" : ""}`, _v$38 = activeTab() === "pvs" ? "var(--accent-primary)" : "var(--text-secondary)", _v$39 = activeTab() === "pvs" ? "var(--accent-primary)" : "transparent", _v$40 = `px-4 py-2 font-medium transition-colors ${activeTab() === "pvcs" ? "border-b-2" : ""}`, _v$41 = activeTab() === "pvcs" ? "var(--accent-primary)" : "var(--text-secondary)", _v$42 = activeTab() === "pvcs" ? "var(--accent-primary)" : "transparent", _v$43 = `px-4 py-2 font-medium transition-colors ${activeTab() === "storageclasses" ? "border-b-2" : ""}`, _v$44 = activeTab() === "storageclasses" ? "var(--accent-primary)" : "var(--text-secondary)", _v$45 = activeTab() === "storageclasses" ? "var(--accent-primary)" : "transparent";
      _v$37 !== _p$.e && className(_el$0, _p$.e = _v$37);
      _v$38 !== _p$.t && setStyleProperty(_el$0, "color", _p$.t = _v$38);
      _v$39 !== _p$.a && setStyleProperty(_el$0, "border-bottom-color", _p$.a = _v$39);
      _v$40 !== _p$.o && className(_el$12, _p$.o = _v$40);
      _v$41 !== _p$.i && setStyleProperty(_el$12, "color", _p$.i = _v$41);
      _v$42 !== _p$.n && setStyleProperty(_el$12, "border-bottom-color", _p$.n = _v$42);
      _v$43 !== _p$.s && className(_el$16, _p$.s = _v$43);
      _v$44 !== _p$.h && setStyleProperty(_el$16, "color", _p$.h = _v$44);
      _v$45 !== _p$.r && setStyleProperty(_el$16, "border-bottom-color", _p$.r = _v$45);
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
    createRenderEffect(() => _el$7.value = fontSize());
    createRenderEffect(() => _el$8.value = fontFamily());
    return _el$;
  })();
};
delegateEvents(["click"]);

export { Storage as default };
//# sourceMappingURL=Storage-CXg0n2xW.js.map
