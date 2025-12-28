import { c as createSignal, j as createResource, k as api, G as addNotification, a as createMemo, J as searchQuery, t as template, i as insert, d as createComponent, K as setSearchQuery, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, S as Show, M as Modal, g as className, H as selectedNamespaces, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-NnaOo1cf.js';
import { c as createCachedResource } from './resourceCache-DgXvRxiF.js';
import { Y as YAMLViewer } from './YAMLViewer-B3aZsnWG.js';
import { Y as YAMLEditor } from './YAMLEditor-8WjJlhy7.js';
import { D as DescribeModal } from './DescribeModal-CnmW-EF9.js';
import { C as ConfirmationModal } from './ConfirmationModal-CcBXvj0H.js';
import { R as RelatedResources } from './RelatedResources-COwjojL_.js';
import { A as ActionMenu } from './ActionMenu-BtMa9NTM.js';
import { S as SecurityRecommendations } from './SecurityRecommendations-_HeSUK_x.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto rounded border"style=background:var(--bg-card);border-color:var(--border-color)><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Name </th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Namespace </th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Allowed Disruptions </th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Current / Desired</th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Age </th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mt-4"><div style=color:var(--text-secondary)>Showing <!> to <!> of <!> PDBs</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded"style="color:var(--text-primary);border:1px solid var(--border-color)">Previous</button><span style=color:var(--text-secondary)>Page <!> of </span><button class="px-3 py-1 rounded"style="color:var(--text-primary);border:1px solid var(--border-color)">Next`), _tmpl$3 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4 p-6"><div class="flex items-center justify-between mb-4"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Pod Disruption Budgets</h1><p class="text-xs mt-1"style=color:var(--text-secondary)>Manage pod availability during voluntary disruptions</p></div><div class="flex items-center gap-2"><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--accent-primary);color:#000>Refresh</button></div></div><div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><div class="card p-4"style="border-left:4px solid var(--accent-primary)"><div class=text-sm style=color:var(--text-secondary)>Total</div><div class="text-2xl font-bold mt-1"style=color:var(--accent-primary)></div></div><div class="card p-4"style="border-left:4px solid var(--success-color)"><div class=text-sm style=color:var(--text-secondary)>Healthy</div><div class="text-2xl font-bold mt-1"style=color:var(--success-color)></div></div><div class="card p-4"style="border-left:4px solid var(--warning-color)"><div class=text-sm style=color:var(--text-secondary)>Unhealthy</div><div class="text-2xl font-bold mt-1"style=color:var(--warning-color)></div></div></div><div class="flex items-center gap-4 mb-4"><input type=text placeholder="Search PDBs..."class="flex-1 px-4 py-2 rounded-lg text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><option value=10>10 per page</option><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option></select><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading PDBs...`), _tmpl$6 = /* @__PURE__ */ template(`<tr><td colspan=6 class="px-3 py-8 text-center"style=color:var(--text-muted)>No PDBs found`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"> / </td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$8 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`), _tmpl$9 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$0 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Pods (<!>)</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Name</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Status</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Ready</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Restarts</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>IP</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Node</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Age</th></tr></thead><tbody>`), _tmpl$1 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Min Available</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Max Unavailable</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Allowed Disruptions</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Current / Desired</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Selector</div><div class="text-sm break-all"style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$10 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"><span></span></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)>`);
const PDB = () => {
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
    const saved = localStorage.getItem("pdb-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const updateFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem("pdb-font-size", size.toString());
  };
  const pdbsResource = createCachedResource("pdbs", async () => {
    const ns = selectedNamespaces().length === 1 ? selectedNamespaces()[0] : void 0;
    return await api.getPDBs(ns);
  }, {
    ttl: 5e3
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getPDBYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch PDB YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const filteredPDBs = createMemo(() => {
    const all = pdbsResource.data() || [];
    const query = searchQuery().toLowerCase();
    if (!query) return all;
    return all.filter((pdb) => pdb.name.toLowerCase().includes(query) || pdb.namespace.toLowerCase().includes(query));
  });
  const sortedPDBs = createMemo(() => {
    const filtered = filteredPDBs();
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortField()];
      let bVal = b[sortField()];
      if (sortField() === "age") {
        aVal = new Date(a.age).getTime();
        bVal = new Date(b.age).getTime();
      } else if (sortField() === "allowedDisruptions") {
        aVal = a.allowedDisruptions || 0;
        bVal = b.allowedDisruptions || 0;
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
  const totalPages = createMemo(() => Math.ceil((filteredPDBs().length || 0) / pageSize()));
  const handleSort = (field) => {
    if (sortField() === field) {
      setSortDirection(sortDirection() === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const handleViewYAML = async (pdb) => {
    setSelected(pdb);
    setYamlKey(`${pdb.name}|${pdb.namespace}`);
    setShowYaml(true);
  };
  const handleEdit = async (pdb) => {
    setSelected(pdb);
    setYamlKey(`${pdb.name}|${pdb.namespace}`);
    setShowEdit(true);
  };
  const handleDescribe = async (pdb) => {
    setSelected(pdb);
    setShowDescribe(true);
  };
  const handleDeleteConfirm = async () => {
    const pdb = selected();
    if (!pdb) return;
    setDeleting(true);
    try {
      await api.deletePDB(pdb.name, pdb.namespace);
      addNotification(`PDB "${pdb.name}" deleted successfully`, "success");
      pdbsResource.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      addNotification(`Failed to delete PDB: ${error.message}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const handleDelete = (pdb) => {
    setSelected(pdb);
    setShowDeleteConfirm(true);
  };
  const handleSaveYAML = async (yaml) => {
    const pdb = selected();
    if (!pdb) return;
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
      label: `Apply PDB YAML: ${pdb.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: pdb.namespace,
      context: status.context,
      userAction: "pdb-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "pdb",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => pdbsResource.refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const pdb = selected();
    if (!pdb) return;
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
      label: `Dry run PDB YAML: ${pdb.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: pdb.namespace,
      context: status.context,
      userAction: "pdb-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "pdb",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
  };
  const statusSummary = createMemo(() => {
    const all = filteredPDBs();
    return {
      total: all.length,
      healthy: all.filter((p) => p.currentHealthy >= p.desiredHealthy).length,
      unhealthy: all.filter((p) => p.currentHealthy < p.desiredHealthy).length
    };
  });
  return (() => {
    var _el$ = _tmpl$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$2.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$9.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$8.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.nextSibling;
    _el$7.$$click = () => refetch();
    insert(_el$, createComponent(SecurityRecommendations, {
      resourceType: "PDB"
    }), _el$8);
    insert(_el$1, () => statusSummary().total);
    insert(_el$12, () => statusSummary().healthy);
    insert(_el$15, () => statusSummary().unhealthy);
    _el$17.$$input = (e) => setSearchQuery(e.currentTarget.value);
    _el$18.addEventListener("change", (e) => {
      setPageSize(Number(e.currentTarget.value));
      setCurrentPage(1);
    });
    _el$19.addEventListener("change", (e) => updateFontSize(Number(e.currentTarget.value)));
    insert(_el$, createComponent(Show, {
      get when() {
        return !pdbsResource.loading();
      },
      get fallback() {
        return (() => {
          var _el$52 = _tmpl$5(), _el$53 = _el$52.firstChild; _el$53.nextSibling;
          return _el$52;
        })();
      },
      get children() {
        return [(() => {
          var _el$20 = _tmpl$(), _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild; _el$24.firstChild; var _el$26 = _el$24.nextSibling; _el$26.firstChild; var _el$28 = _el$26.nextSibling; _el$28.firstChild; var _el$30 = _el$28.nextSibling, _el$31 = _el$30.nextSibling; _el$31.firstChild; var _el$33 = _el$31.nextSibling, _el$34 = _el$22.nextSibling;
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
          _el$28.$$click = () => handleSort("allowedDisruptions");
          insert(_el$28, (() => {
            var _c$3 = memo(() => sortField() === "allowedDisruptions");
            return () => _c$3() && (sortDirection() === "asc" ? "↑" : "↓");
          })(), null);
          _el$31.$$click = () => handleSort("age");
          insert(_el$31, (() => {
            var _c$4 = memo(() => sortField() === "age");
            return () => _c$4() && (sortDirection() === "asc" ? "↑" : "↓");
          })(), null);
          insert(_el$34, createComponent(For, {
            get each() {
              return sortedPDBs();
            },
            get fallback() {
              return (() => {
                var _el$55 = _tmpl$6(); _el$55.firstChild;
                return _el$55;
              })();
            },
            children: (pdb) => {
              return (() => {
                var _el$57 = _tmpl$7(), _el$58 = _el$57.firstChild, _el$59 = _el$58.firstChild, _el$60 = _el$58.nextSibling, _el$61 = _el$60.nextSibling, _el$62 = _el$61.nextSibling, _el$63 = _el$62.firstChild, _el$64 = _el$62.nextSibling, _el$65 = _el$64.nextSibling;
                _el$59.$$click = () => {
                  setSelected(pdb);
                  setShowDetails(true);
                };
                insert(_el$59, () => pdb.name);
                insert(_el$60, () => pdb.namespace);
                insert(_el$61, () => pdb.allowedDisruptions);
                insert(_el$62, () => pdb.currentHealthy, _el$63);
                insert(_el$62, () => pdb.desiredHealthy, null);
                insert(_el$64, () => pdb.age);
                insert(_el$65, createComponent(ActionMenu, {
                  actions: [{
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => handleViewYAML(pdb)
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => handleEdit(pdb)
                  }, {
                    label: "Describe",
                    icon: "describe",
                    onClick: () => handleDescribe(pdb)
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => {
                      setSelected(pdb);
                      handleDelete(pdb);
                    },
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$12 = `${fontSize()}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${fontSize()}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${fontSize()}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `${Math.max(24, fontSize() * 1.7)}px`, _v$24 = `${fontSize()}px`, _v$25 = `${Math.max(24, fontSize() * 1.7)}px`, _v$26 = `${Math.max(24, fontSize() * 1.7)}px`, _v$27 = `${Math.max(24, fontSize() * 1.7)}px`, _v$28 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$12 !== _p$.e && setStyleProperty(_el$58, "font-size", _p$.e = _v$12);
                  _v$13 !== _p$.t && setStyleProperty(_el$58, "height", _p$.t = _v$13);
                  _v$14 !== _p$.a && setStyleProperty(_el$58, "line-height", _p$.a = _v$14);
                  _v$15 !== _p$.o && setStyleProperty(_el$60, "font-size", _p$.o = _v$15);
                  _v$16 !== _p$.i && setStyleProperty(_el$60, "height", _p$.i = _v$16);
                  _v$17 !== _p$.n && setStyleProperty(_el$60, "line-height", _p$.n = _v$17);
                  _v$18 !== _p$.s && setStyleProperty(_el$61, "font-size", _p$.s = _v$18);
                  _v$19 !== _p$.h && setStyleProperty(_el$61, "height", _p$.h = _v$19);
                  _v$20 !== _p$.r && setStyleProperty(_el$61, "line-height", _p$.r = _v$20);
                  _v$21 !== _p$.d && setStyleProperty(_el$62, "font-size", _p$.d = _v$21);
                  _v$22 !== _p$.l && setStyleProperty(_el$62, "height", _p$.l = _v$22);
                  _v$23 !== _p$.u && setStyleProperty(_el$62, "line-height", _p$.u = _v$23);
                  _v$24 !== _p$.c && setStyleProperty(_el$64, "font-size", _p$.c = _v$24);
                  _v$25 !== _p$.w && setStyleProperty(_el$64, "height", _p$.w = _v$25);
                  _v$26 !== _p$.m && setStyleProperty(_el$64, "line-height", _p$.m = _v$26);
                  _v$27 !== _p$.f && setStyleProperty(_el$65, "height", _p$.f = _v$27);
                  _v$28 !== _p$.y && setStyleProperty(_el$65, "line-height", _p$.y = _v$28);
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
                return _el$57;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$ = `${Math.max(24, fontSize() * 1.7)}px`, _v$2 = `${fontSize()}px`, _v$3 = `${Math.max(24, fontSize() * 1.7)}px`, _v$4 = `${fontSize()}px`, _v$5 = `${fontSize()}px`, _v$6 = `${fontSize()}px`, _v$7 = `${fontSize()}px`, _v$8 = `${fontSize()}px`, _v$9 = `${fontSize()}px`;
            _v$ !== _p$.e && setStyleProperty(_el$23, "height", _p$.e = _v$);
            _v$2 !== _p$.t && setStyleProperty(_el$23, "font-size", _p$.t = _v$2);
            _v$3 !== _p$.a && setStyleProperty(_el$23, "line-height", _p$.a = _v$3);
            _v$4 !== _p$.o && setStyleProperty(_el$24, "font-size", _p$.o = _v$4);
            _v$5 !== _p$.i && setStyleProperty(_el$26, "font-size", _p$.i = _v$5);
            _v$6 !== _p$.n && setStyleProperty(_el$28, "font-size", _p$.n = _v$6);
            _v$7 !== _p$.s && setStyleProperty(_el$30, "font-size", _p$.s = _v$7);
            _v$8 !== _p$.h && setStyleProperty(_el$31, "font-size", _p$.h = _v$8);
            _v$9 !== _p$.r && setStyleProperty(_el$33, "font-size", _p$.r = _v$9);
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
          return _el$20;
        })(), (() => {
          var _el$35 = _tmpl$2(), _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$41 = _el$37.nextSibling, _el$38 = _el$41.nextSibling, _el$42 = _el$38.nextSibling, _el$39 = _el$42.nextSibling, _el$43 = _el$39.nextSibling; _el$43.nextSibling; var _el$44 = _el$36.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$46.firstChild, _el$49 = _el$47.nextSibling; _el$49.nextSibling; var _el$50 = _el$46.nextSibling;
          insert(_el$36, () => (currentPage() - 1) * pageSize() + 1, _el$41);
          insert(_el$36, () => Math.min(currentPage() * pageSize(), filteredPDBs().length), _el$42);
          insert(_el$36, () => filteredPDBs().length, _el$43);
          _el$45.$$click = () => setCurrentPage(Math.max(1, currentPage() - 1));
          insert(_el$46, currentPage, _el$49);
          insert(_el$46, totalPages, null);
          _el$50.$$click = () => setCurrentPage(Math.min(totalPages(), currentPage() + 1));
          createRenderEffect((_p$) => {
            var _v$0 = currentPage() === 1, _v$1 = currentPage() === 1 ? "var(--bg-tertiary)" : "var(--bg-secondary)", _v$10 = currentPage() === totalPages(), _v$11 = currentPage() === totalPages() ? "var(--bg-tertiary)" : "var(--bg-secondary)";
            _v$0 !== _p$.e && (_el$45.disabled = _p$.e = _v$0);
            _v$1 !== _p$.t && setStyleProperty(_el$45, "background", _p$.t = _v$1);
            _v$10 !== _p$.a && (_el$50.disabled = _p$.a = _v$10);
            _v$11 !== _p$.o && setStyleProperty(_el$50, "background", _p$.o = _v$11);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0
          });
          return _el$35;
        })()];
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
              var _el$66 = _tmpl$8(), _el$67 = _el$66.firstChild; _el$67.nextSibling;
              return _el$66;
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
              var _el$69 = _tmpl$8(), _el$70 = _el$69.firstChild; _el$70.nextSibling;
              return _el$69;
            })();
          },
          get children() {
            var _el$51 = _tmpl$3();
            insert(_el$51, createComponent(YAMLEditor, {
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
            return _el$51;
          }
        });
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
        return `PDB: ${selected()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [pdbDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getPDBDetails(params.name, params.ns);
              });
              return (() => {
                var _el$72 = _tmpl$1(), _el$73 = _el$72.firstChild, _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, _el$76 = _el$75.firstChild, _el$77 = _el$76.firstChild, _el$78 = _el$77.nextSibling, _el$80 = _el$76.nextSibling, _el$81 = _el$80.firstChild, _el$82 = _el$81.nextSibling, _el$84 = _el$80.nextSibling, _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling, _el$88 = _el$84.nextSibling, _el$89 = _el$88.firstChild, _el$90 = _el$89.nextSibling, _el$92 = _el$88.nextSibling, _el$93 = _el$92.firstChild, _el$94 = _el$93.nextSibling, _el$95 = _el$92.nextSibling, _el$96 = _el$95.firstChild, _el$97 = _el$96.nextSibling, _el$98 = _el$95.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.nextSibling, _el$119 = _el$73.nextSibling, _el$120 = _el$119.firstChild, _el$121 = _el$120.nextSibling, _el$122 = _el$121.nextSibling, _el$123 = _el$122.nextSibling;
                insert(_el$78, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pdbDetails.loading)() && pdbDetails();
                  },
                  children: (details) => details().minAvailable || "-"
                }), null);
                insert(_el$78, createComponent(Show, {
                  get when() {
                    return pdbDetails.loading;
                  },
                  get children() {
                    return _tmpl$9();
                  }
                }), null);
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pdbDetails.loading)() && pdbDetails();
                  },
                  children: (details) => details().maxUnavailable || "-"
                }), null);
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return pdbDetails.loading;
                  },
                  get children() {
                    return _tmpl$9();
                  }
                }), null);
                insert(_el$86, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pdbDetails.loading)() && pdbDetails();
                  },
                  children: (details) => details().allowedDisruptions || selected()?.allowedDisruptions || 0
                }), null);
                insert(_el$86, createComponent(Show, {
                  get when() {
                    return pdbDetails.loading;
                  },
                  get children() {
                    return _tmpl$9();
                  }
                }), null);
                insert(_el$90, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pdbDetails.loading)() && pdbDetails();
                  },
                  children: (details) => `${details().currentHealthy || selected()?.currentHealthy || 0} / ${details().desiredHealthy || selected()?.desiredHealthy || 0}`
                }), null);
                insert(_el$90, createComponent(Show, {
                  get when() {
                    return pdbDetails.loading;
                  },
                  get children() {
                    return _tmpl$9();
                  }
                }), null);
                insert(_el$94, () => selected()?.age || "-");
                insert(_el$97, () => selected()?.namespace);
                insert(_el$100, createComponent(Show, {
                  get when() {
                    return memo(() => !!!pdbDetails.loading)() && pdbDetails();
                  },
                  children: (details) => details().selector || "-"
                }), null);
                insert(_el$100, createComponent(Show, {
                  get when() {
                    return pdbDetails.loading;
                  },
                  get children() {
                    return _tmpl$9();
                  }
                }), null);
                insert(_el$72, createComponent(Show, {
                  get when() {
                    return pdbDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "pdb",
                      get name() {
                        return pdbDetails().name;
                      },
                      get namespace() {
                        return pdbDetails().namespace;
                      },
                      get relatedData() {
                        return pdbDetails();
                      }
                    });
                  }
                }), _el$119);
                insert(_el$72, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!pdbDetails.loading && pdbDetails()?.pods))() && pdbDetails().pods.length > 0;
                  },
                  get children() {
                    var _el$102 = _tmpl$0(), _el$103 = _el$102.firstChild, _el$104 = _el$103.firstChild, _el$106 = _el$104.nextSibling; _el$106.nextSibling; var _el$107 = _el$103.nextSibling, _el$108 = _el$107.firstChild, _el$109 = _el$108.firstChild, _el$110 = _el$109.firstChild, _el$111 = _el$110.firstChild, _el$112 = _el$111.nextSibling, _el$113 = _el$112.nextSibling, _el$114 = _el$113.nextSibling, _el$115 = _el$114.nextSibling, _el$116 = _el$115.nextSibling; _el$116.nextSibling; var _el$118 = _el$109.nextSibling;
                    insert(_el$103, () => pdbDetails().pods.length, _el$106);
                    insert(_el$118, createComponent(For, {
                      get each() {
                        return pdbDetails().pods;
                      },
                      children: (pod) => (() => {
                        var _el$124 = _tmpl$10(), _el$125 = _el$124.firstChild, _el$126 = _el$125.nextSibling, _el$127 = _el$126.firstChild, _el$128 = _el$126.nextSibling, _el$129 = _el$128.nextSibling, _el$130 = _el$129.nextSibling, _el$131 = _el$130.nextSibling, _el$132 = _el$131.nextSibling;
                        insert(_el$125, () => pod.name);
                        insert(_el$127, () => pod.status);
                        insert(_el$128, () => pod.ready);
                        insert(_el$129, () => pod.restarts);
                        insert(_el$130, () => pod.ip || "-");
                        insert(_el$131, () => pod.node || "-");
                        insert(_el$132, () => pod.age);
                        createRenderEffect(() => className(_el$127, `badge ${pod.status === "Running" ? "badge-success" : pod.status === "Pending" ? "badge-warning" : "badge-error"}`));
                        return _el$124;
                      })()
                    }));
                    return _el$102;
                  }
                }), _el$119);
                _el$120.$$click = () => {
                  setShowDetails(false);
                  handleViewYAML(selected());
                };
                _el$121.$$click = () => {
                  setShowDetails(false);
                  handleDescribe(selected());
                };
                _el$122.$$click = () => {
                  setShowDetails(false);
                  handleEdit(selected());
                };
                _el$123.$$click = (e) => {
                  e.stopPropagation();
                  handleDelete(selected());
                };
                return _el$72;
              })();
            })();
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
            return api.getPDBDescribe;
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
      title: "Delete PDB",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the PDB "${selected().name}"?` : "Are you sure you want to delete this PDB?";
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

export { PDB as default };
//# sourceMappingURL=PDB-AkY0ze9h.js.map
