import { c as createSignal, a as createMemo, j as createResource, k as api, G as addNotification, t as template, i as insert, d as createComponent, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, g as className, S as Show, M as Modal, N as setGlobalLoading, w as clusterStatus, O as startExecution, H as selectedNamespaces, v as delegateEvents } from './index-Bh-O-sIc.js';
import { c as createCachedResource } from './resourceCache-DXA8Kj29.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-CU5t99BZ.js';
import { Y as YAMLViewer } from './YAMLViewer-CNUTWpkV.js';
import { Y as YAMLEditor } from './YAMLEditor-Cvfm5wCJ.js';
import { D as DescribeModal } from './DescribeModal-6Ip9Wbf-.js';
import { C as ConfirmationModal } from './ConfirmationModal-CGGyzH3M.js';
import { R as RelatedResources } from './RelatedResources-C1PaEPdu.js';
import { A as ActionMenu } from './ActionMenu-BVo-8BTq.js';
import { u as useBulkSelection, B as BulkActions, S as SelectAllCheckbox, a as SelectionCheckbox, b as BulkDeleteModal } from './useBulkSelection-BCNQqaHy.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th style="padding:0 8px;text-align:center;width:40px;border:none"></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Namespace </div></th><th class=whitespace-nowrap>Completions</th><th class=whitespace-nowrap>Duration</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Age </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Status </div></th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> jobs</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$4 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Jobs</h1><p class=text-xs style=color:var(--text-secondary)>One-time task execution</p></div><div class="flex items-center gap-3"><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=13>13px</option><option value=14>14px</option><option value=15>15px</option><option value=16>16px</option><option value=17>17px</option><option value=18>18px</option><option value=19>19px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><button class=icon-btn title="Refresh Jobs"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Complete</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid #3b82f6"><span class=text-sm style=color:var(--text-secondary)>Running</span><span class="text-xl font-bold"style=color:#3b82f6></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--error-color)"><span class=text-sm style=color:var(--text-secondary)>Failed</span><span class="text-xl font-bold"style=color:var(--error-color)></span></div><div class=flex-1></div><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100</option></select></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading jobs...`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td colspan=8 class="text-center py-8"style=color:var(--text-muted)>No jobs found`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$9 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`), _tmpl$0 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$1 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Pods (<!>)</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Name</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Status</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Ready</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Restarts</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>IP</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Node</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Age</th></tr></thead><tbody>`), _tmpl$10 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Conditions</h3><div class=space-y-2>`), _tmpl$11 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Status</div><div></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Completions</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Parallelism</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Duration</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Active</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Succeeded</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Failed</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Selector</div><div class="text-sm break-all"style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$12 = /* @__PURE__ */ template(`<span>`), _tmpl$13 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"><span></span></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)>`), _tmpl$14 = /* @__PURE__ */ template(`<div class=text-xs style=color:var(--text-secondary)>Reason: `), _tmpl$15 = /* @__PURE__ */ template(`<div class="text-xs mt-1"style=color:var(--text-muted)>`), _tmpl$16 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-tertiary);border-color:var(--border-color)><div class="flex items-center justify-between mb-1"><span class="text-sm font-medium"style=color:var(--text-primary)></span><span></span></div><div class="text-xs mt-1"style=color:var(--text-muted)>Last transition: `);
const Jobs = () => {
  const [search, setSearch] = createSignal("");
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem("jobs-font-size") || "14"));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem("jobs-font-family") || "Monaco");
  const bulk = useBulkSelection();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
  const getFontFamilyCSS = (family) => {
    switch (family) {
      case "Monospace":
        return "monospace";
      case "System-ui":
        return "system-ui";
      case "Monaco":
        return "Monaco, monospace";
      case "Consolas":
        return "Consolas, monospace";
      case "Courier":
        return '"Courier New", monospace';
      default:
        return "Monaco, monospace";
    }
  };
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("jobs-font-size", size.toString());
  };
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("jobs-font-family", family);
  };
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const jobsCache = createCachedResource("jobs", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const jobs2 = await api.getJobs(namespaceParam);
      return jobs2;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const jobs = createMemo(() => jobsCache.data() || []);
  const refetch = () => jobsCache.refetch();
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getJobYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch job YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const job = selected();
    if (!job) return;
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
    startExecution({
      label: `Apply Job YAML: ${job.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: job.namespace,
      context: status.context,
      userAction: "jobs-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "jobs",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const job = selected();
    if (!job) return;
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
    startExecution({
      label: `Dry run Job YAML: ${job.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: job.namespace,
      context: status.context,
      userAction: "jobs-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "jobs",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
  };
  const parseAge = (age) => {
    if (!age) return 0;
    let total = 0;
    const days = age.match(/(\d+)d/);
    const hours = age.match(/(\d+)h/);
    const mins = age.match(/(\d+)m/);
    if (days) total += parseInt(days[1]) * 24 * 60;
    if (hours) total += parseInt(hours[1]) * 60;
    if (mins) total += parseInt(mins[1]);
    return total;
  };
  const filteredAndSorted = createMemo(() => {
    let all = jobs() || [];
    const query = search().toLowerCase();
    if (query) {
      all = all.filter((j) => j.name.toLowerCase().includes(query) || j.namespace.toLowerCase().includes(query));
    }
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "namespace":
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "age":
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return all;
  });
  const totalPages = createMemo(() => Math.ceil(filteredAndSorted().length / pageSize()));
  const paginatedJobs = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = jobs() || [];
    return {
      total: all.length,
      complete: all.filter((j) => j.status === "Complete").length,
      running: all.filter((j) => j.status === "Running" || j.status === "Active").length,
      failed: all.filter((j) => j.status === "Failed").length
    };
  });
  const handleSort = (field) => {
    if (sortField() === field) {
      setSortDirection((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };
  const SortIcon = (props) => (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling;
    createRenderEffect((_p$) => {
      var _v$ = sortField() === props.field && sortDirection() === "asc" ? "var(--accent-primary)" : "var(--text-muted)", _v$2 = sortField() === props.field && sortDirection() === "desc" ? "var(--accent-primary)" : "var(--text-muted)";
      _v$ !== _p$.e && setStyleProperty(_el$2, "color", _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$3, "color", _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
  const handleDeleteConfirm = async () => {
    const job = selected();
    if (!job) return;
    setDeleting(true);
    try {
      await api.deleteJob(job.name, job.namespace);
      addNotification(`Job ${job.name} deleted successfully`, "success");
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to delete Job:", error);
      addNotification(`Failed to delete Job: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const deleteJob = (job) => {
    setSelected(job);
    setShowDeleteConfirm(true);
  };
  return (() => {
    var _el$4 = _tmpl$5(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$5.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$21.nextSibling, _el$25 = _el$24.nextSibling, _el$26 = _el$25.nextSibling, _el$27 = _el$11.nextSibling;
    insert(_el$4, createComponent(BulkActions, {
      get selectedCount() {
        return bulk.selectedCount();
      },
      get totalCount() {
        return filteredAndSorted().length;
      },
      onSelectAll: () => bulk.selectAll(filteredAndSorted()),
      onDeselectAll: () => bulk.deselectAll(),
      onDelete: () => setShowBulkDeleteModal(true),
      resourceType: "jobs"
    }), _el$5);
    _el$0.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$1.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$10.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetch();
    };
    insert(_el$14, () => statusCounts().total);
    insert(_el$17, () => statusCounts().complete);
    insert(_el$20, () => statusCounts().running);
    insert(_el$23, () => statusCounts().failed);
    _el$25.$$input = (e) => {
      setSearch(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$26.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$27, createComponent(Show, {
      get when() {
        return !jobsCache.loading() || jobsCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$68 = _tmpl$6(), _el$69 = _el$68.firstChild; _el$69.nextSibling;
          return _el$68;
        })();
      },
      get children() {
        return [(() => {
          var _el$28 = _tmpl$2(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$33.firstChild; _el$34.firstChild; var _el$36 = _el$33.nextSibling, _el$37 = _el$36.firstChild; _el$37.firstChild; var _el$39 = _el$36.nextSibling, _el$40 = _el$39.nextSibling, _el$41 = _el$40.nextSibling, _el$42 = _el$41.firstChild; _el$42.firstChild; var _el$44 = _el$41.nextSibling, _el$45 = _el$44.firstChild; _el$45.firstChild; var _el$47 = _el$30.nextSibling;
          insert(_el$32, createComponent(SelectAllCheckbox, {
            get checked() {
              return memo(() => bulk.selectedCount() === filteredAndSorted().length)() && filteredAndSorted().length > 0;
            },
            get indeterminate() {
              return memo(() => bulk.selectedCount() > 0)() && bulk.selectedCount() < filteredAndSorted().length;
            },
            onChange: (checked) => {
              if (checked) {
                bulk.selectAll(filteredAndSorted());
              } else {
                bulk.deselectAll();
              }
            }
          }));
          _el$33.$$click = () => handleSort("name");
          insert(_el$34, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$36.$$click = () => handleSort("namespace");
          insert(_el$37, createComponent(SortIcon, {
            field: "namespace"
          }), null);
          _el$41.$$click = () => handleSort("age");
          insert(_el$42, createComponent(SortIcon, {
            field: "age"
          }), null);
          _el$44.$$click = () => handleSort("status");
          insert(_el$45, createComponent(SortIcon, {
            field: "status"
          }), null);
          insert(_el$47, createComponent(For, {
            get each() {
              return paginatedJobs();
            },
            get fallback() {
              return (() => {
                var _el$71 = _tmpl$7(); _el$71.firstChild;
                return _el$71;
              })();
            },
            children: (job) => {
              return (() => {
                var _el$73 = _tmpl$8(), _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, _el$76 = _el$75.firstChild, _el$77 = _el$75.nextSibling, _el$78 = _el$77.nextSibling, _el$79 = _el$78.nextSibling, _el$80 = _el$79.nextSibling, _el$81 = _el$80.nextSibling, _el$82 = _el$81.firstChild, _el$83 = _el$81.nextSibling;
                insert(_el$74, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(job);
                  },
                  onChange: () => bulk.toggleSelection(job)
                }));
                _el$76.$$click = () => {
                  setSelected(job);
                  setShowDetails(true);
                };
                insert(_el$76, (() => {
                  var _c$ = memo(() => job.name.length > 40);
                  return () => _c$() ? job.name.slice(0, 37) + "..." : job.name;
                })());
                insert(_el$77, () => job.namespace);
                insert(_el$78, () => job.completions);
                insert(_el$79, () => job.duration || "-");
                insert(_el$80, () => job.age);
                insert(_el$82, () => job.status);
                insert(_el$83, createComponent(ActionMenu, {
                  actions: [{
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => {
                      setSelected(job);
                      setYamlKey(`${job.name}|${job.namespace}`);
                      setShowYaml(true);
                    }
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => {
                      setSelected(job);
                      setYamlKey(`${job.name}|${job.namespace}`);
                      setShowEdit(true);
                    }
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => {
                      setSelected(job);
                      deleteJob(job);
                    },
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$1 = `${fontSize()}px`, _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = `${Math.max(24, fontSize() * 1.7)}px`, _v$12 = `${fontSize()}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${fontSize()}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${fontSize()}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `${Math.max(24, fontSize() * 1.7)}px`, _v$24 = `${fontSize()}px`, _v$25 = `${Math.max(24, fontSize() * 1.7)}px`, _v$26 = `${Math.max(24, fontSize() * 1.7)}px`, _v$27 = `badge ${job.status === "Complete" ? "badge-success" : job.status === "Failed" ? "badge-error" : "badge-warning"}`, _v$28 = `${Math.max(24, fontSize() * 1.7)}px`, _v$29 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$1 !== _p$.e && setStyleProperty(_el$75, "font-size", _p$.e = _v$1);
                  _v$10 !== _p$.t && setStyleProperty(_el$75, "height", _p$.t = _v$10);
                  _v$11 !== _p$.a && setStyleProperty(_el$75, "line-height", _p$.a = _v$11);
                  _v$12 !== _p$.o && setStyleProperty(_el$77, "font-size", _p$.o = _v$12);
                  _v$13 !== _p$.i && setStyleProperty(_el$77, "height", _p$.i = _v$13);
                  _v$14 !== _p$.n && setStyleProperty(_el$77, "line-height", _p$.n = _v$14);
                  _v$15 !== _p$.s && setStyleProperty(_el$78, "font-size", _p$.s = _v$15);
                  _v$16 !== _p$.h && setStyleProperty(_el$78, "height", _p$.h = _v$16);
                  _v$17 !== _p$.r && setStyleProperty(_el$78, "line-height", _p$.r = _v$17);
                  _v$18 !== _p$.d && setStyleProperty(_el$79, "font-size", _p$.d = _v$18);
                  _v$19 !== _p$.l && setStyleProperty(_el$79, "height", _p$.l = _v$19);
                  _v$20 !== _p$.u && setStyleProperty(_el$79, "line-height", _p$.u = _v$20);
                  _v$21 !== _p$.c && setStyleProperty(_el$80, "font-size", _p$.c = _v$21);
                  _v$22 !== _p$.w && setStyleProperty(_el$80, "height", _p$.w = _v$22);
                  _v$23 !== _p$.m && setStyleProperty(_el$80, "line-height", _p$.m = _v$23);
                  _v$24 !== _p$.f && setStyleProperty(_el$81, "font-size", _p$.f = _v$24);
                  _v$25 !== _p$.y && setStyleProperty(_el$81, "height", _p$.y = _v$25);
                  _v$26 !== _p$.g && setStyleProperty(_el$81, "line-height", _p$.g = _v$26);
                  _v$27 !== _p$.p && className(_el$82, _p$.p = _v$27);
                  _v$28 !== _p$.b && setStyleProperty(_el$83, "height", _p$.b = _v$28);
                  _v$29 !== _p$.T && setStyleProperty(_el$83, "line-height", _p$.T = _v$29);
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
                  T: void 0
                });
                return _el$73;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground();
            _v$3 !== _p$.e && setStyleProperty(_el$29, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$29, "background", _p$.t = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$28;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$48 = _tmpl$3(), _el$49 = _el$48.firstChild, _el$50 = _el$49.firstChild, _el$54 = _el$50.nextSibling, _el$51 = _el$54.nextSibling, _el$55 = _el$51.nextSibling, _el$52 = _el$55.nextSibling, _el$56 = _el$52.nextSibling; _el$56.nextSibling; var _el$57 = _el$49.nextSibling, _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$60 = _el$59.nextSibling, _el$61 = _el$60.firstChild, _el$63 = _el$61.nextSibling; _el$63.nextSibling; var _el$64 = _el$60.nextSibling, _el$65 = _el$64.nextSibling, _el$66 = _el$65.nextSibling;
            insert(_el$49, () => (currentPage() - 1) * pageSize() + 1, _el$54);
            insert(_el$49, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$55);
            insert(_el$49, () => filteredAndSorted().length, _el$56);
            _el$58.$$click = () => setCurrentPage(1);
            _el$59.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$60, currentPage, _el$63);
            insert(_el$60, totalPages, null);
            _el$64.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$65.$$click = () => setCurrentPage(totalPages());
            _el$66.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$5 = currentPage() === 1, _v$6 = currentPage() === 1, _v$7 = currentPage() === totalPages(), _v$8 = currentPage() === totalPages();
              _v$5 !== _p$.e && (_el$58.disabled = _p$.e = _v$5);
              _v$6 !== _p$.t && (_el$59.disabled = _p$.t = _v$6);
              _v$7 !== _p$.a && (_el$64.disabled = _p$.a = _v$7);
              _v$8 !== _p$.o && (_el$65.disabled = _p$.o = _v$8);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$66.value = pageSize());
            return _el$48;
          }
        })];
      }
    }));
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showYaml();
      },
      onClose: () => {
        setShowYaml(false);
        setSelected(null);
        setYamlKey(null);
      },
      get title() {
        return `YAML: ${selected()?.name || ""}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$84 = _tmpl$9(), _el$85 = _el$84.firstChild; _el$85.nextSibling;
              return _el$84;
            })();
          },
          get children() {
            return createComponent(YAMLViewer, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selected()?.name;
              }
            });
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showEdit();
      },
      onClose: () => {
        setShowEdit(false);
        setSelected(null);
        setYamlKey(null);
      },
      get title() {
        return `Edit YAML: ${selected()?.name || ""}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$87 = _tmpl$9(), _el$88 = _el$87.firstChild; _el$88.nextSibling;
              return _el$87;
            })();
          },
          get children() {
            var _el$67 = _tmpl$4();
            insert(_el$67, createComponent(YAMLEditor, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selected()?.name;
              },
              onSave: handleSaveYAML,
              onDryRun: handleDryRunYAML,
              onCancel: () => {
                setShowEdit(false);
                setSelected(null);
                setYamlKey(null);
              }
            }));
            return _el$67;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => {
        setShowDetails(false);
        setSelected(null);
      },
      get title() {
        return `Job: ${selected()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [jobDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getJobDetails(params.name, params.ns);
              });
              return (() => {
                var _el$90 = _tmpl$11(), _el$91 = _el$90.firstChild, _el$92 = _el$91.firstChild, _el$93 = _el$92.nextSibling, _el$94 = _el$93.firstChild, _el$95 = _el$94.firstChild, _el$96 = _el$95.nextSibling, _el$98 = _el$94.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.nextSibling, _el$102 = _el$98.nextSibling, _el$103 = _el$102.firstChild, _el$104 = _el$103.nextSibling, _el$106 = _el$102.nextSibling, _el$107 = _el$106.firstChild, _el$108 = _el$107.nextSibling, _el$110 = _el$106.nextSibling, _el$111 = _el$110.firstChild, _el$112 = _el$111.nextSibling, _el$114 = _el$110.nextSibling, _el$115 = _el$114.firstChild, _el$116 = _el$115.nextSibling, _el$118 = _el$114.nextSibling, _el$119 = _el$118.firstChild, _el$120 = _el$119.nextSibling, _el$122 = _el$118.nextSibling, _el$123 = _el$122.firstChild, _el$124 = _el$123.nextSibling, _el$125 = _el$122.nextSibling, _el$126 = _el$125.firstChild, _el$127 = _el$126.nextSibling, _el$128 = _el$125.nextSibling, _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling, _el$152 = _el$91.nextSibling, _el$153 = _el$152.firstChild, _el$154 = _el$153.nextSibling, _el$155 = _el$154.nextSibling, _el$156 = _el$155.nextSibling;
                insert(_el$96, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => (() => {
                    var _el$157 = _tmpl$12();
                    insert(_el$157, () => details().status || selected()?.status || "-");
                    createRenderEffect(() => className(_el$157, `badge ${details().status === "Complete" ? "badge-success" : details().status === "Failed" ? "badge-error" : "badge-warning"}`));
                    return _el$157;
                  })()
                }), null);
                insert(_el$96, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$100, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => details().completions || selected()?.completions || "-"
                }), null);
                insert(_el$100, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$104, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => details().parallelism || "-"
                }), null);
                insert(_el$104, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$108, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => details().duration || selected()?.duration || "-"
                }), null);
                insert(_el$108, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$112, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => details().active || 0
                }), null);
                insert(_el$112, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$116, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => details().succeeded || 0
                }), null);
                insert(_el$116, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$120, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => details().failed || 0
                }), null);
                insert(_el$120, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$124, () => selected()?.age || "-");
                insert(_el$127, () => selected()?.namespace);
                insert(_el$130, createComponent(Show, {
                  get when() {
                    return memo(() => !!!jobDetails.loading)() && jobDetails();
                  },
                  children: (details) => details().selector || "-"
                }), null);
                insert(_el$130, createComponent(Show, {
                  get when() {
                    return jobDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$90, createComponent(Show, {
                  get when() {
                    return jobDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "job",
                      get name() {
                        return jobDetails().name;
                      },
                      get namespace() {
                        return jobDetails().namespace;
                      },
                      get relatedData() {
                        return jobDetails();
                      }
                    });
                  }
                }), _el$152);
                insert(_el$90, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!jobDetails.loading && jobDetails()?.pods))() && jobDetails().pods.length > 0;
                  },
                  get children() {
                    var _el$132 = _tmpl$1(), _el$133 = _el$132.firstChild, _el$134 = _el$133.firstChild, _el$136 = _el$134.nextSibling; _el$136.nextSibling; var _el$137 = _el$133.nextSibling, _el$138 = _el$137.firstChild, _el$139 = _el$138.firstChild, _el$140 = _el$139.firstChild, _el$141 = _el$140.firstChild, _el$142 = _el$141.nextSibling, _el$143 = _el$142.nextSibling, _el$144 = _el$143.nextSibling, _el$145 = _el$144.nextSibling, _el$146 = _el$145.nextSibling; _el$146.nextSibling; var _el$148 = _el$139.nextSibling;
                    insert(_el$133, () => jobDetails().pods.length, _el$136);
                    insert(_el$148, createComponent(For, {
                      get each() {
                        return jobDetails().pods;
                      },
                      children: (pod) => (() => {
                        var _el$158 = _tmpl$13(), _el$159 = _el$158.firstChild, _el$160 = _el$159.nextSibling, _el$161 = _el$160.firstChild, _el$162 = _el$160.nextSibling, _el$163 = _el$162.nextSibling, _el$164 = _el$163.nextSibling, _el$165 = _el$164.nextSibling, _el$166 = _el$165.nextSibling;
                        insert(_el$159, () => pod.name);
                        insert(_el$161, () => pod.status);
                        insert(_el$162, () => pod.ready);
                        insert(_el$163, () => pod.restarts);
                        insert(_el$164, () => pod.ip || "-");
                        insert(_el$165, () => pod.node || "-");
                        insert(_el$166, () => pod.age);
                        createRenderEffect(() => className(_el$161, `badge ${pod.status === "Running" ? "badge-success" : pod.status === "Pending" ? "badge-warning" : "badge-error"}`));
                        return _el$158;
                      })()
                    }));
                    return _el$132;
                  }
                }), _el$152);
                insert(_el$90, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!jobDetails.loading && jobDetails()?.conditions))() && jobDetails().conditions.length > 0;
                  },
                  get children() {
                    var _el$149 = _tmpl$10(), _el$150 = _el$149.firstChild, _el$151 = _el$150.nextSibling;
                    insert(_el$151, createComponent(For, {
                      get each() {
                        return jobDetails().conditions;
                      },
                      children: (condition) => (() => {
                        var _el$167 = _tmpl$16(), _el$168 = _el$167.firstChild, _el$169 = _el$168.firstChild, _el$170 = _el$169.nextSibling, _el$174 = _el$168.nextSibling; _el$174.firstChild;
                        insert(_el$169, () => condition.type);
                        insert(_el$170, () => condition.status);
                        insert(_el$167, createComponent(Show, {
                          get when() {
                            return condition.reason;
                          },
                          get children() {
                            var _el$171 = _tmpl$14(); _el$171.firstChild;
                            insert(_el$171, () => condition.reason, null);
                            return _el$171;
                          }
                        }), _el$174);
                        insert(_el$167, createComponent(Show, {
                          get when() {
                            return condition.message;
                          },
                          get children() {
                            var _el$173 = _tmpl$15();
                            insert(_el$173, () => condition.message);
                            return _el$173;
                          }
                        }), _el$174);
                        insert(_el$174, () => new Date(condition.lastTransitionTime).toLocaleString(), null);
                        createRenderEffect(() => className(_el$170, `badge ${condition.status === "True" ? "badge-success" : "badge-warning"}`));
                        return _el$167;
                      })()
                    }));
                    return _el$149;
                  }
                }), _el$152);
                _el$153.$$click = () => {
                  setShowDetails(false);
                  setShowYaml(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$154.$$click = () => {
                  setShowDetails(false);
                  setShowDescribe(true);
                };
                _el$155.$$click = () => {
                  setShowDetails(false);
                  setShowEdit(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$156.$$click = (e) => {
                  e.stopPropagation();
                  deleteJob(selected());
                };
                return _el$90;
              })();
            })();
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "job",
      get name() {
        return selected()?.name || "";
      },
      get namespace() {
        return selected()?.namespace;
      }
    }), null);
    insert(_el$4, createComponent(ConfirmationModal, {
      get isOpen() {
        return showDeleteConfirm();
      },
      onClose: () => {
        if (!deleting()) {
          setShowDeleteConfirm(false);
          setShowDetails(false);
        }
      },
      title: "Delete Job",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the Job "${selected().name}"?` : "Are you sure you want to delete this Job?";
      },
      get details() {
        return memo(() => !!selected())() ? [{
          label: "Name",
          value: selected().name
        }, {
          label: "Namespace",
          value: selected().namespace
        }] : void 0;
      },
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      get loading() {
        return deleting();
      },
      onConfirm: handleDeleteConfirm,
      size: "sm"
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      resourceType: "Jobs",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      },
      onConfirm: async () => {
        const selectedJobs = bulk.getSelectedItems(filteredAndSorted());
        for (const job of selectedJobs) {
          try {
            await api.deleteJob(job.name, job.namespace);
          } catch (error) {
            console.error(`Failed to delete job ${job.namespace}/${job.name}:`, error);
            addNotification(`Failed to delete job ${job.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        bulk.deselectAll();
        refetch();
        addNotification(`Successfully deleted ${selectedJobs.length} job${selectedJobs.length !== 1 ? "s" : ""}`, "success");
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$9 = getThemeBackground(), _v$0 = `1px solid ${getThemeBorderColor()}`;
      _v$9 !== _p$.e && setStyleProperty(_el$27, "background", _p$.e = _v$9);
      _v$0 !== _p$.t && setStyleProperty(_el$27, "border", _p$.t = _v$0);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$0.value = fontSize());
    createRenderEffect(() => _el$1.value = fontFamily());
    createRenderEffect(() => _el$25.value = search());
    createRenderEffect(() => _el$26.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { Jobs as default };
//# sourceMappingURL=Jobs-DGSKCSlL.js.map
