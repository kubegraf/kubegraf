import { c as createSignal, j as createResource, k as api, G as addNotification, a as createMemo, J as searchQuery, t as template, i as insert, d as createComponent, K as setSearchQuery, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, S as Show, g as className, M as Modal, H as selectedNamespaces, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-B8I71-mz.js';
import { c as createCachedResource } from './resourceCache-P2tk5pf3.js';
import { Y as YAMLViewer } from './YAMLViewer-BH5fzWmG.js';
import { Y as YAMLEditor } from './YAMLEditor-DeL5BHL5.js';
import { D as DescribeModal } from './DescribeModal-BOrOE6vF.js';
import { C as ConfirmationModal } from './ConfirmationModal-BOUoNqd5.js';
import { R as RelatedResources } from './RelatedResources-rUnE1-tT.js';
import { A as ActionMenu } from './ActionMenu-F4cRW3cz.js';
import { S as SecurityRecommendations } from './SecurityRecommendations-CTifCKbv.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto rounded border"style=background:var(--bg-card);border-color:var(--border-color)><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Name </th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Namespace </th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Target</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Replicas</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Min / Max</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Metrics</th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Age </th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mt-4"><div style=color:var(--text-secondary)>Showing <!> to <!> of <!> HPAs</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded"style="color:var(--text-primary);border:1px solid var(--border-color)">Previous</button><span style=color:var(--text-secondary)>Page <!> of </span><button class="px-3 py-1 rounded"style="color:var(--text-primary);border:1px solid var(--border-color)">Next`), _tmpl$3 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4 p-6"><div class="flex items-center justify-between mb-4"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Horizontal Pod Autoscalers</h1><p class="text-xs mt-1"style=color:var(--text-secondary)>Automatically scale workloads based on CPU, memory, or custom metrics</p></div><div class="flex items-center gap-2"><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--accent-primary);color:#000>Refresh</button></div></div><div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"><div class="card px-3 py-1.5 rounded border"style="border-left:2px solid var(--accent-primary);border-color:var(--border-color)"><div class=text-xs style=color:var(--text-secondary)>Total</div><div class="text-sm font-bold mt-0.5"style=color:var(--accent-primary)></div></div><div class="card px-3 py-1.5 rounded border"style="border-left:2px solid var(--success-color);border-color:var(--border-color)"><div class=text-xs style=color:var(--text-secondary)>Active</div><div class="text-sm font-bold mt-0.5"style=color:var(--success-color)></div></div><div class="card px-3 py-1.5 rounded border"style="border-left:2px solid var(--warning-color);border-color:var(--border-color)"><div class=text-xs style=color:var(--text-secondary)>Scaling</div><div class="text-sm font-bold mt-0.5"style=color:var(--warning-color)></div></div></div><div class="flex items-center gap-4 mb-4"><input type=text placeholder="Search HPAs..."class="flex-1 px-4 py-2 rounded-lg text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><option value=10>10 per page</option><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option></select><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading HPAs...`), _tmpl$6 = /* @__PURE__ */ template(`<tr><td colspan=8 class="px-3 py-8 text-center"style=color:var(--text-muted)>No HPAs found`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"> / </td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"> / </td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$8 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$9 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Metrics</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Type</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Resource</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Target</th></tr></thead><tbody>`), _tmpl$0 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Current Metrics</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Type</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Resource</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Current</th></tr></thead><tbody>`), _tmpl$1 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Conditions</h3><div class=space-y-2>`), _tmpl$10 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Target</div><div class=text-sm style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Min Replicas</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Max Replicas</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Current Replicas</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Desired Replicas</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$11 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)>`), _tmpl$12 = /* @__PURE__ */ template(`<div class=text-xs style=color:var(--text-secondary)>Reason: `), _tmpl$13 = /* @__PURE__ */ template(`<div class="text-xs mt-1"style=color:var(--text-muted)>`), _tmpl$14 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-tertiary);border-color:var(--border-color)><div class="flex items-center justify-between mb-1"><span class="text-sm font-medium"style=color:var(--text-primary)></span><span></span></div><div class="text-xs mt-1"style=color:var(--text-muted)>Last transition: `), _tmpl$15 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`);
const HPA = () => {
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
  const getInitialFontSize = () => {
    const saved = localStorage.getItem("hpa-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const updateFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem("hpa-font-size", size.toString());
  };
  const hpasResource = createCachedResource("hpas", async () => {
    const ns = selectedNamespaces().length === 1 ? selectedNamespaces()[0] : void 0;
    return await api.getHPAs(ns);
  }, {
    ttl: 5e3
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getHPAYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch HPA YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const filteredHPAs = createMemo(() => {
    const all = hpasResource.data() || [];
    const query = searchQuery().toLowerCase();
    if (!query) return all;
    return all.filter((hpa) => hpa.name.toLowerCase().includes(query) || hpa.namespace.toLowerCase().includes(query) || hpa.targetRef.toLowerCase().includes(query));
  });
  const sortedHPAs = createMemo(() => {
    const filtered = filteredHPAs();
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortField()];
      let bVal = b[sortField()];
      if (sortField() === "age") {
        aVal = new Date(a.age).getTime();
        bVal = new Date(b.age).getTime();
      } else if (sortField() === "currentReplicas") {
        aVal = a.currentReplicas || 0;
        bVal = b.currentReplicas || 0;
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }
      if (aVal < bVal) return sortDirection() === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection() === "asc" ? 1 : -1;
      return 0;
    });
    const start = (currentPage() - 1) * pageSize();
    return sorted.slice(start, start + pageSize());
  });
  const totalPages = createMemo(() => Math.ceil((filteredHPAs().length || 0) / pageSize()));
  const handleSort = (field) => {
    if (sortField() === field) {
      setSortDirection(sortDirection() === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const handleViewYAML = async (hpa) => {
    setSelected(hpa);
    setYamlKey(`${hpa.name}|${hpa.namespace}`);
    setShowYaml(true);
  };
  const handleEdit = async (hpa) => {
    setSelected(hpa);
    setYamlKey(`${hpa.name}|${hpa.namespace}`);
    setShowEdit(true);
  };
  const handleDescribe = async (hpa) => {
    setSelected(hpa);
    setShowDescribe(true);
  };
  const handleDeleteConfirm = async () => {
    const hpa = selected();
    if (!hpa) return;
    setDeleting(true);
    try {
      await api.deleteHPA(hpa.name, hpa.namespace);
      addNotification(`HPA "${hpa.name}" deleted successfully`, "success");
      hpasResource.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      addNotification(`Failed to delete HPA: ${error.message}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const handleDelete = (hpa) => {
    setSelected(hpa);
    setShowDeleteConfirm(true);
  };
  const handleSaveYAML = async (yaml) => {
    const hpa = selected();
    if (!hpa) return;
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
      label: `Apply HPA YAML: ${hpa.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: hpa.namespace,
      context: status.context,
      userAction: "hpa-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "hpa",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => hpasResource.refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const hpa = selected();
    if (!hpa) return;
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
      label: `Dry run HPA YAML: ${hpa.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: hpa.namespace,
      context: status.context,
      userAction: "hpa-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "hpa",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
  };
  const statusSummary = createMemo(() => {
    const all = filteredHPAs();
    return {
      total: all.length,
      active: all.filter((h) => h.currentReplicas > 0).length,
      scaling: all.filter((h) => h.currentReplicas !== h.desiredReplicas).length
    };
  });
  return (() => {
    var _el$ = _tmpl$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$2.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$9.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$8.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.nextSibling;
    _el$7.$$click = () => refetch();
    insert(_el$, createComponent(SecurityRecommendations, {
      resourceType: "HPA"
    }), _el$8);
    insert(_el$1, () => statusSummary().total);
    insert(_el$12, () => statusSummary().active);
    insert(_el$15, () => statusSummary().scaling);
    _el$17.$$input = (e) => setSearchQuery(e.currentTarget.value);
    _el$18.addEventListener("change", (e) => {
      setPageSize(Number(e.currentTarget.value));
      setCurrentPage(1);
    });
    _el$19.addEventListener("change", (e) => updateFontSize(Number(e.currentTarget.value)));
    insert(_el$, createComponent(Show, {
      get when() {
        return !hpasResource.loading();
      },
      get fallback() {
        return (() => {
          var _el$53 = _tmpl$5(), _el$54 = _el$53.firstChild; _el$54.nextSibling;
          return _el$53;
        })();
      },
      get children() {
        return [(() => {
          var _el$20 = _tmpl$(), _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild; _el$24.firstChild; var _el$26 = _el$24.nextSibling; _el$26.firstChild; var _el$28 = _el$26.nextSibling, _el$29 = _el$28.nextSibling, _el$30 = _el$29.nextSibling, _el$31 = _el$30.nextSibling, _el$32 = _el$31.nextSibling; _el$32.firstChild; var _el$34 = _el$32.nextSibling, _el$35 = _el$22.nextSibling;
          _el$24.$$click = () => handleSort("name");
          insert(_el$24, (() => {
            var _c$ = memo(() => sortField() === "name");
            return () => _c$() && (sortDirection() === "asc" ? "↑" : "↓");
          })(), null);
          _el$26.$$click = () => handleSort("namespace");
          insert(_el$26, (() => {
            var _c$2 = memo(() => sortField() === "namespace");
            return () => _c$2() && (sortDirection() === "asc" ? "↑" : "↓");
          })(), null);
          _el$32.$$click = () => handleSort("age");
          insert(_el$32, (() => {
            var _c$3 = memo(() => sortField() === "age");
            return () => _c$3() && (sortDirection() === "asc" ? "↑" : "↓");
          })(), null);
          insert(_el$35, createComponent(For, {
            get each() {
              return sortedHPAs();
            },
            get fallback() {
              return (() => {
                var _el$56 = _tmpl$6(); _el$56.firstChild;
                return _el$56;
              })();
            },
            children: (hpa) => {
              return (() => {
                var _el$58 = _tmpl$7(), _el$59 = _el$58.firstChild, _el$60 = _el$59.firstChild, _el$61 = _el$59.nextSibling, _el$62 = _el$61.nextSibling, _el$63 = _el$62.nextSibling, _el$64 = _el$63.firstChild, _el$65 = _el$63.nextSibling, _el$66 = _el$65.firstChild, _el$67 = _el$65.nextSibling, _el$68 = _el$67.nextSibling, _el$69 = _el$68.nextSibling;
                _el$60.$$click = () => {
                  setSelected(hpa);
                  setShowDetails(true);
                };
                insert(_el$60, () => hpa.name);
                insert(_el$61, () => hpa.namespace);
                insert(_el$62, () => hpa.targetRef);
                insert(_el$63, () => hpa.currentReplicas, _el$64);
                insert(_el$63, () => hpa.desiredReplicas, null);
                insert(_el$65, () => hpa.minReplicas, _el$66);
                insert(_el$65, () => hpa.maxReplicas, null);
                insert(_el$67, (() => {
                  var _c$4 = memo(() => hpa.cpuUtilization !== void 0);
                  return () => _c$4() && `CPU: ${hpa.cpuUtilization}%`;
                })(), null);
                insert(_el$67, () => hpa.cpuUtilization !== void 0 && hpa.memoryUtilization !== void 0 && ", ", null);
                insert(_el$67, (() => {
                  var _c$5 = memo(() => hpa.memoryUtilization !== void 0);
                  return () => _c$5() && `Mem: ${hpa.memoryUtilization}%`;
                })(), null);
                insert(_el$67, () => !hpa.cpuUtilization && !hpa.memoryUtilization && "-", null);
                insert(_el$68, () => hpa.age);
                insert(_el$69, createComponent(ActionMenu, {
                  actions: [{
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => handleViewYAML(hpa)
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => handleEdit(hpa)
                  }, {
                    label: "Describe",
                    icon: "describe",
                    onClick: () => handleDescribe(hpa)
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => {
                      setSelected(hpa);
                      handleDelete(hpa);
                    },
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$14 = `${fontSize()}px`, _v$15 = `${Math.max(24, fontSize() * 1.7)}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${fontSize()}px`, _v$18 = `${Math.max(24, fontSize() * 1.7)}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${fontSize()}px`, _v$21 = `${Math.max(24, fontSize() * 1.7)}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `${fontSize()}px`, _v$24 = `${Math.max(24, fontSize() * 1.7)}px`, _v$25 = `${Math.max(24, fontSize() * 1.7)}px`, _v$26 = `${fontSize()}px`, _v$27 = `${Math.max(24, fontSize() * 1.7)}px`, _v$28 = `${Math.max(24, fontSize() * 1.7)}px`, _v$29 = `${fontSize()}px`, _v$30 = `${Math.max(24, fontSize() * 1.7)}px`, _v$31 = `${Math.max(24, fontSize() * 1.7)}px`, _v$32 = `${fontSize()}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `${Math.max(24, fontSize() * 1.7)}px`, _v$35 = `${Math.max(24, fontSize() * 1.7)}px`, _v$36 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$14 !== _p$.e && setStyleProperty(_el$59, "font-size", _p$.e = _v$14);
                  _v$15 !== _p$.t && setStyleProperty(_el$59, "height", _p$.t = _v$15);
                  _v$16 !== _p$.a && setStyleProperty(_el$59, "line-height", _p$.a = _v$16);
                  _v$17 !== _p$.o && setStyleProperty(_el$61, "font-size", _p$.o = _v$17);
                  _v$18 !== _p$.i && setStyleProperty(_el$61, "height", _p$.i = _v$18);
                  _v$19 !== _p$.n && setStyleProperty(_el$61, "line-height", _p$.n = _v$19);
                  _v$20 !== _p$.s && setStyleProperty(_el$62, "font-size", _p$.s = _v$20);
                  _v$21 !== _p$.h && setStyleProperty(_el$62, "height", _p$.h = _v$21);
                  _v$22 !== _p$.r && setStyleProperty(_el$62, "line-height", _p$.r = _v$22);
                  _v$23 !== _p$.d && setStyleProperty(_el$63, "font-size", _p$.d = _v$23);
                  _v$24 !== _p$.l && setStyleProperty(_el$63, "height", _p$.l = _v$24);
                  _v$25 !== _p$.u && setStyleProperty(_el$63, "line-height", _p$.u = _v$25);
                  _v$26 !== _p$.c && setStyleProperty(_el$65, "font-size", _p$.c = _v$26);
                  _v$27 !== _p$.w && setStyleProperty(_el$65, "height", _p$.w = _v$27);
                  _v$28 !== _p$.m && setStyleProperty(_el$65, "line-height", _p$.m = _v$28);
                  _v$29 !== _p$.f && setStyleProperty(_el$67, "font-size", _p$.f = _v$29);
                  _v$30 !== _p$.y && setStyleProperty(_el$67, "height", _p$.y = _v$30);
                  _v$31 !== _p$.g && setStyleProperty(_el$67, "line-height", _p$.g = _v$31);
                  _v$32 !== _p$.p && setStyleProperty(_el$68, "font-size", _p$.p = _v$32);
                  _v$33 !== _p$.b && setStyleProperty(_el$68, "height", _p$.b = _v$33);
                  _v$34 !== _p$.T && setStyleProperty(_el$68, "line-height", _p$.T = _v$34);
                  _v$35 !== _p$.A && setStyleProperty(_el$69, "height", _p$.A = _v$35);
                  _v$36 !== _p$.O && setStyleProperty(_el$69, "line-height", _p$.O = _v$36);
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
                  O: void 0
                });
                return _el$58;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$ = `${Math.max(24, fontSize() * 1.7)}px`, _v$2 = `${fontSize()}px`, _v$3 = `${Math.max(24, fontSize() * 1.7)}px`, _v$4 = `${fontSize()}px`, _v$5 = `${fontSize()}px`, _v$6 = `${fontSize()}px`, _v$7 = `${fontSize()}px`, _v$8 = `${fontSize()}px`, _v$9 = `${fontSize()}px`, _v$0 = `${fontSize()}px`, _v$1 = `${fontSize()}px`;
            _v$ !== _p$.e && setStyleProperty(_el$23, "height", _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$23, "font-size", _p$.t = _v$2);
            _v$3 !== _p$.a && setStyleProperty(_el$23, "line-height", _p$.a = _v$3);
            _v$4 !== _p$.o && setStyleProperty(_el$24, "font-size", _p$.o = _v$4);
            _v$5 !== _p$.i && setStyleProperty(_el$26, "font-size", _p$.i = _v$5);
            _v$6 !== _p$.n && setStyleProperty(_el$28, "font-size", _p$.n = _v$6);
            _v$7 !== _p$.s && setStyleProperty(_el$29, "font-size", _p$.s = _v$7);
            _v$8 !== _p$.h && setStyleProperty(_el$30, "font-size", _p$.h = _v$8);
            _v$9 !== _p$.r && setStyleProperty(_el$31, "font-size", _p$.r = _v$9);
            _v$0 !== _p$.d && setStyleProperty(_el$32, "font-size", _p$.d = _v$0);
            _v$1 !== _p$.l && setStyleProperty(_el$34, "font-size", _p$.l = _v$1);
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
          return _el$20;
        })(), (() => {
          var _el$36 = _tmpl$2(), _el$37 = _el$36.firstChild, _el$38 = _el$37.firstChild, _el$42 = _el$38.nextSibling, _el$39 = _el$42.nextSibling, _el$43 = _el$39.nextSibling, _el$40 = _el$43.nextSibling, _el$44 = _el$40.nextSibling; _el$44.nextSibling; var _el$45 = _el$37.nextSibling, _el$46 = _el$45.firstChild, _el$47 = _el$46.nextSibling, _el$48 = _el$47.firstChild, _el$50 = _el$48.nextSibling; _el$50.nextSibling; var _el$51 = _el$47.nextSibling;
          insert(_el$37, () => (currentPage() - 1) * pageSize() + 1, _el$42);
          insert(_el$37, () => Math.min(currentPage() * pageSize(), filteredHPAs().length), _el$43);
          insert(_el$37, () => filteredHPAs().length, _el$44);
          _el$46.$$click = () => setCurrentPage(Math.max(1, currentPage() - 1));
          insert(_el$47, currentPage, _el$50);
          insert(_el$47, totalPages, null);
          _el$51.$$click = () => setCurrentPage(Math.min(totalPages(), currentPage() + 1));
          createRenderEffect((_p$) => {
            var _v$10 = currentPage() === 1, _v$11 = currentPage() === 1 ? "var(--bg-tertiary)" : "var(--bg-secondary)", _v$12 = currentPage() === totalPages(), _v$13 = currentPage() === totalPages() ? "var(--bg-tertiary)" : "var(--bg-secondary)";
            _v$10 !== _p$.e && (_el$46.disabled = _p$.e = _v$10);
            _v$11 !== _p$.t && setStyleProperty(_el$46, "background", _p$.t = _v$11);
            _v$12 !== _p$.a && (_el$51.disabled = _p$.a = _v$12);
            _v$13 !== _p$.o && setStyleProperty(_el$51, "background", _p$.o = _v$13);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0
          });
          return _el$36;
        })()];
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => {
        setShowDetails(false);
        setSelected(null);
      },
      get title() {
        return `HPA: ${selected()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [hpaDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getHPADetails(params.name, params.ns);
              });
              return (() => {
                var _el$70 = _tmpl$10(), _el$71 = _el$70.firstChild, _el$72 = _el$71.firstChild, _el$73 = _el$72.nextSibling, _el$74 = _el$73.firstChild, _el$75 = _el$74.firstChild, _el$76 = _el$75.nextSibling, _el$78 = _el$74.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling, _el$82 = _el$78.nextSibling, _el$83 = _el$82.firstChild, _el$84 = _el$83.nextSibling, _el$86 = _el$82.nextSibling, _el$87 = _el$86.firstChild, _el$88 = _el$87.nextSibling, _el$90 = _el$86.nextSibling, _el$91 = _el$90.firstChild, _el$92 = _el$91.nextSibling, _el$94 = _el$90.nextSibling, _el$95 = _el$94.firstChild, _el$96 = _el$95.nextSibling, _el$97 = _el$94.nextSibling, _el$98 = _el$97.firstChild, _el$99 = _el$98.nextSibling, _el$123 = _el$71.nextSibling, _el$124 = _el$123.firstChild, _el$125 = _el$124.nextSibling, _el$126 = _el$125.nextSibling, _el$127 = _el$126.nextSibling;
                insert(_el$76, createComponent(Show, {
                  get when() {
                    return memo(() => !!!hpaDetails.loading)() && hpaDetails();
                  },
                  children: (details) => details().targetRef || selected()?.targetRef || "-"
                }), null);
                insert(_el$76, createComponent(Show, {
                  get when() {
                    return hpaDetails.loading;
                  },
                  get children() {
                    return _tmpl$8();
                  }
                }), null);
                insert(_el$80, createComponent(Show, {
                  get when() {
                    return memo(() => !!!hpaDetails.loading)() && hpaDetails();
                  },
                  children: (details) => details().minReplicas || selected()?.minReplicas || "-"
                }), null);
                insert(_el$80, createComponent(Show, {
                  get when() {
                    return hpaDetails.loading;
                  },
                  get children() {
                    return _tmpl$8();
                  }
                }), null);
                insert(_el$84, createComponent(Show, {
                  get when() {
                    return memo(() => !!!hpaDetails.loading)() && hpaDetails();
                  },
                  children: (details) => details().maxReplicas || selected()?.maxReplicas || "-"
                }), null);
                insert(_el$84, createComponent(Show, {
                  get when() {
                    return hpaDetails.loading;
                  },
                  get children() {
                    return _tmpl$8();
                  }
                }), null);
                insert(_el$88, createComponent(Show, {
                  get when() {
                    return memo(() => !!!hpaDetails.loading)() && hpaDetails();
                  },
                  children: (details) => details().currentReplicas || selected()?.currentReplicas || "-"
                }), null);
                insert(_el$88, createComponent(Show, {
                  get when() {
                    return hpaDetails.loading;
                  },
                  get children() {
                    return _tmpl$8();
                  }
                }), null);
                insert(_el$92, createComponent(Show, {
                  get when() {
                    return memo(() => !!!hpaDetails.loading)() && hpaDetails();
                  },
                  children: (details) => details().desiredReplicas || selected()?.desiredReplicas || "-"
                }), null);
                insert(_el$92, createComponent(Show, {
                  get when() {
                    return hpaDetails.loading;
                  },
                  get children() {
                    return _tmpl$8();
                  }
                }), null);
                insert(_el$96, () => selected()?.age || "-");
                insert(_el$99, () => selected()?.namespace);
                insert(_el$70, createComponent(Show, {
                  get when() {
                    return hpaDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "hpa",
                      get name() {
                        return hpaDetails().name;
                      },
                      get namespace() {
                        return hpaDetails().namespace;
                      },
                      get relatedData() {
                        return hpaDetails();
                      }
                    });
                  }
                }), _el$123);
                insert(_el$70, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!hpaDetails.loading && hpaDetails()?.metrics && Array.isArray(hpaDetails().metrics)))() && hpaDetails().metrics.length > 0;
                  },
                  get children() {
                    var _el$100 = _tmpl$9(), _el$101 = _el$100.firstChild, _el$102 = _el$101.nextSibling, _el$103 = _el$102.firstChild, _el$104 = _el$103.firstChild, _el$105 = _el$104.firstChild, _el$106 = _el$105.firstChild, _el$107 = _el$106.nextSibling; _el$107.nextSibling; var _el$109 = _el$104.nextSibling;
                    insert(_el$109, createComponent(For, {
                      get each() {
                        return hpaDetails().metrics;
                      },
                      children: (metric) => (() => {
                        var _el$128 = _tmpl$11(), _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling, _el$131 = _el$130.nextSibling;
                        insert(_el$129, () => metric.type);
                        insert(_el$130, () => metric.resource?.name || "-");
                        insert(_el$131, (() => {
                          var _c$6 = memo(() => !!metric.targetUtilization);
                          return () => _c$6() ? `${metric.targetUtilization}%` : "-";
                        })());
                        return _el$128;
                      })()
                    }));
                    return _el$100;
                  }
                }), _el$123);
                insert(_el$70, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!hpaDetails.loading && hpaDetails()?.currentMetrics && Array.isArray(hpaDetails().currentMetrics)))() && hpaDetails().currentMetrics.length > 0;
                  },
                  get children() {
                    var _el$110 = _tmpl$0(), _el$111 = _el$110.firstChild, _el$112 = _el$111.nextSibling, _el$113 = _el$112.firstChild, _el$114 = _el$113.firstChild, _el$115 = _el$114.firstChild, _el$116 = _el$115.firstChild, _el$117 = _el$116.nextSibling; _el$117.nextSibling; var _el$119 = _el$114.nextSibling;
                    insert(_el$119, createComponent(For, {
                      get each() {
                        return hpaDetails().currentMetrics;
                      },
                      children: (metric) => (() => {
                        var _el$132 = _tmpl$11(), _el$133 = _el$132.firstChild, _el$134 = _el$133.nextSibling, _el$135 = _el$134.nextSibling;
                        insert(_el$133, () => metric.type);
                        insert(_el$134, () => metric.resource?.name || "-");
                        insert(_el$135, (() => {
                          var _c$7 = memo(() => !!metric.currentUtilization);
                          return () => _c$7() ? `${metric.currentUtilization}%` : metric.currentValue || "-";
                        })());
                        return _el$132;
                      })()
                    }));
                    return _el$110;
                  }
                }), _el$123);
                insert(_el$70, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!hpaDetails.loading && hpaDetails()?.conditions && Array.isArray(hpaDetails().conditions)))() && hpaDetails().conditions.length > 0;
                  },
                  get children() {
                    var _el$120 = _tmpl$1(), _el$121 = _el$120.firstChild, _el$122 = _el$121.nextSibling;
                    insert(_el$122, createComponent(For, {
                      get each() {
                        return hpaDetails().conditions;
                      },
                      children: (condition) => (() => {
                        var _el$136 = _tmpl$14(), _el$137 = _el$136.firstChild, _el$138 = _el$137.firstChild, _el$139 = _el$138.nextSibling, _el$143 = _el$137.nextSibling; _el$143.firstChild;
                        insert(_el$138, () => condition.type);
                        insert(_el$139, () => condition.status);
                        insert(_el$136, createComponent(Show, {
                          get when() {
                            return condition.reason;
                          },
                          get children() {
                            var _el$140 = _tmpl$12(); _el$140.firstChild;
                            insert(_el$140, () => condition.reason, null);
                            return _el$140;
                          }
                        }), _el$143);
                        insert(_el$136, createComponent(Show, {
                          get when() {
                            return condition.message;
                          },
                          get children() {
                            var _el$142 = _tmpl$13();
                            insert(_el$142, () => condition.message);
                            return _el$142;
                          }
                        }), _el$143);
                        insert(_el$143, () => new Date(condition.lastTransitionTime).toLocaleString(), null);
                        createRenderEffect(() => className(_el$139, `badge ${condition.status === "True" ? "badge-success" : "badge-warning"}`));
                        return _el$136;
                      })()
                    }));
                    return _el$120;
                  }
                }), _el$123);
                _el$124.$$click = () => {
                  setShowDetails(false);
                  handleViewYAML(selected());
                };
                _el$125.$$click = () => {
                  setShowDetails(false);
                  handleDescribe(selected());
                };
                _el$126.$$click = () => {
                  setShowDetails(false);
                  handleEdit(selected());
                };
                _el$127.$$click = (e) => {
                  e.stopPropagation();
                  handleDelete(selected());
                };
                return _el$70;
              })();
            })();
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Modal, {
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
              var _el$145 = _tmpl$15(), _el$146 = _el$145.firstChild; _el$146.nextSibling;
              return _el$145;
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
    insert(_el$, createComponent(Modal, {
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
              var _el$148 = _tmpl$15(), _el$149 = _el$148.firstChild; _el$149.nextSibling;
              return _el$148;
            })();
          },
          get children() {
            var _el$52 = _tmpl$3();
            insert(_el$52, createComponent(YAMLEditor, {
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
            return _el$52;
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!showDescribe())() && selected();
      },
      get children() {
        return createComponent(DescribeModal, {
          get resourceName() {
            return selected().name;
          },
          get resourceNamespace() {
            return selected().namespace;
          },
          get getDescribe() {
            return api.getHPADescribe;
          },
          onClose: () => setShowDescribe(false)
        });
      }
    }), null);
    insert(_el$, createComponent(ConfirmationModal, {
      get isOpen() {
        return showDeleteConfirm();
      },
      onClose: () => {
        if (!deleting()) {
          setShowDeleteConfirm(false);
          setShowDetails(false);
        }
      },
      title: "Delete HPA",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the HPA "${selected().name}"?` : "Are you sure you want to delete this HPA?";
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
    createRenderEffect(() => _el$17.value = searchQuery());
    createRenderEffect(() => _el$18.value = pageSize());
    createRenderEffect(() => _el$19.value = fontSize());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { HPA as default };
//# sourceMappingURL=HPA-DH0OriQq.js.map
