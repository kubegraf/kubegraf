import { c as createSignal, j as createResource, G as addNotification, P as namespace, t as template, i as insert, d as createComponent, S as Show, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, M as Modal, g as className, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-B8I71-mz.js';
import { Y as YAMLViewer } from './YAMLViewer-BH5fzWmG.js';
import { Y as YAMLEditor } from './YAMLEditor-DeL5BHL5.js';
import { A as ActionMenu } from './ActionMenu-F4cRW3cz.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading Roles...`), _tmpl$2 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><p>No Roles found`), _tmpl$3 = /* @__PURE__ */ template(`<div class=w-full style="background:var(--bg-primary);margin:0;padding:0;border:1px solid var(--border-color);border-radius:4px"><div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Name</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Namespace</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Rules</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Age</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading RoleBindings...`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><p>No RoleBindings found`), _tmpl$7 = /* @__PURE__ */ template(`<div class=w-full style="background:var(--bg-primary);margin:0;padding:0;border:1px solid var(--border-color);border-radius:4px"><div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Name</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Namespace</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Role Ref</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Subjects</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Age</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading ClusterRoles...`), _tmpl$9 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><p>No ClusterRoles found`), _tmpl$0 = /* @__PURE__ */ template(`<div class=w-full style="background:var(--bg-primary);margin:0;padding:0;border:1px solid var(--border-color);border-radius:4px"><div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Name</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Rules</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Age</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$1 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading ClusterRoleBindings...`), _tmpl$10 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><p>No ClusterRoleBindings found`), _tmpl$11 = /* @__PURE__ */ template(`<div class=w-full style="background:var(--bg-primary);margin:0;padding:0;border:1px solid var(--border-color);border-radius:4px"><div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Name</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Role Ref</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Subjects</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Age</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$12 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$13 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>RBAC</h1><p style=color:var(--text-secondary)>Manage Roles, RoleBindings, ClusterRoles, and ClusterRoleBindings</p></div><div class="flex items-center gap-3"><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select></div></div><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-3xl font-bold"style=color:var(--text-primary)>RBAC</h1><p style=color:var(--text-secondary)>Manage Roles, RoleBindings, ClusterRoles, and ClusterRoleBindings</p></div></div><div class="flex gap-2 border-b"style=border-color:var(--border-color)><button>Roles (<!>)</button><button>RoleBindings (<!>)</button><button>ClusterRoles (<!>)</button><button>ClusterRoleBindings (<!>)`), _tmpl$14 = /* @__PURE__ */ template(`<tr><td colspan=5 class="text-center py-8"style=color:var(--text-muted)>No roles found`), _tmpl$15 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$16 = /* @__PURE__ */ template(`<tr><td colspan=6 class="text-center py-8"style=color:var(--text-muted)>No role bindings found`), _tmpl$17 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$18 = /* @__PURE__ */ template(`<tr><td colspan=4 class="text-center py-8"style=color:var(--text-muted)>No cluster roles found`), _tmpl$19 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$20 = /* @__PURE__ */ template(`<tr><td colspan=5 class="text-center py-8"style=color:var(--text-muted)>No cluster role bindings found`), _tmpl$21 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`);
const RBAC = () => {
  const [activeTab, setActiveTab] = createSignal("roles");
  const [selectedRole, setSelectedRole] = createSignal(null);
  const [selectedRB, setSelectedRB] = createSignal(null);
  const [selectedCR, setSelectedCR] = createSignal(null);
  const [selectedCRB, setSelectedCRB] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const getInitialFontSize = () => {
    const saved = localStorage.getItem("rbac-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("rbac-font-size", size.toString());
  };
  const getInitialFontFamily = () => {
    const saved = localStorage.getItem("rbac-font-family");
    return saved || "Monaco";
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("rbac-font-family", family);
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
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [type, name, ns] = key.split("|");
    if (!type || !name) return "";
    try {
      let url = "";
      if (type === "role") {
        url = `/api/rbac/role/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(ns || "")}`;
      } else if (type === "rolebinding") {
        url = `/api/rbac/rolebinding/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(ns || "")}`;
      } else if (type === "clusterrole") {
        url = `/api/rbac/clusterrole/yaml?name=${encodeURIComponent(name)}`;
      } else if (type === "clusterrolebinding") {
        url = `/api/rbac/clusterrolebinding/yaml?name=${encodeURIComponent(name)}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to fetch YAML"
        }));
        throw new Error(errorData.error || "Failed to fetch YAML");
      }
      const data = await response.json();
      return data.yaml || "";
    } catch (err) {
      console.error("Failed to fetch RBAC YAML:", err);
      addNotification(`Failed to load YAML: ${err.message}`, "error");
      return "";
    }
  });
  const [roles] = createResource(() => namespace(), async (ns) => {
    try {
      const nsParam = ns === "_all" ? void 0 : ns;
      const response = await fetch(`/api/rbac/roles${nsParam ? `?namespace=${nsParam}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch Roles");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to fetch Roles:", err);
      return [];
    }
  });
  const [roleBindings] = createResource(() => namespace(), async (ns) => {
    try {
      const nsParam = ns === "_all" ? void 0 : ns;
      const response = await fetch(`/api/rbac/rolebindings${nsParam ? `?namespace=${nsParam}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch RoleBindings");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to fetch RoleBindings:", err);
      return [];
    }
  });
  const [clusterRoles] = createResource(async () => {
    try {
      const response = await fetch("/api/rbac/clusterroles");
      if (!response.ok) throw new Error("Failed to fetch ClusterRoles");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to fetch ClusterRoles:", err);
      return [];
    }
  });
  const [clusterRoleBindings] = createResource(async () => {
    try {
      const response = await fetch("/api/rbac/clusterrolebindings");
      if (!response.ok) throw new Error("Failed to fetch ClusterRoleBindings");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to fetch ClusterRoleBindings:", err);
      return [];
    }
  });
  const handleDelete = async (type, name, namespace2) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }
    try {
      let url = "";
      if (type === "role") {
        url = `/api/rbac/role/delete?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace2 || "")}`;
      } else if (type === "rb" || type === "rolebinding") {
        url = `/api/rbac/rolebinding/delete?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace2 || "")}`;
      } else if (type === "cr" || type === "clusterrole") {
        url = `/api/rbac/clusterrole/delete?name=${encodeURIComponent(name)}`;
      } else if (type === "crb" || type === "clusterrolebinding") {
        url = `/api/rbac/clusterrolebinding/delete?name=${encodeURIComponent(name)}`;
      }
      const response = await fetch(url, {
        method: "POST"
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Delete failed");
      }
      addNotification(`Successfully deleted ${name}`, "success");
      if (type === "role") roles.refetch();
      else if (type === "rb" || type === "rolebinding") roleBindings.refetch();
      else if (type === "cr" || type === "clusterrole") clusterRoles.refetch();
      else if (type === "crb" || type === "clusterrolebinding") clusterRoleBindings.refetch();
    } catch (err) {
      addNotification(`Failed to delete: ${err.message}`, "error");
    }
  };
  const handleSaveYAML = async (yaml) => {
    const currentResource = activeTab() === "roles" ? selectedRole() : activeTab() === "rolebindings" ? selectedRB() : activeTab() === "clusterroles" ? selectedCR() : selectedCRB();
    if (!currentResource) return;
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
    const type = activeTab() === "roles" ? "role" : activeTab() === "rolebindings" ? "rolebinding" : activeTab() === "clusterroles" ? "clusterrole" : "clusterrolebinding";
    const isNamespaced = type === "role" || type === "rolebinding";
    const ns = isNamespaced ? currentResource.namespace || namespace() : "";
    const resource = type === "role" ? "roles" : type === "rolebinding" ? "rolebindings" : type === "clusterrole" ? "clusterroles" : "clusterrolebindings";
    startExecution({
      label: `Apply ${type} YAML: ${currentResource.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: ns || "",
      context: status.context,
      userAction: `rbac-${type}-apply-yaml`,
      dryRun: false,
      allowClusterWide: !isNamespaced,
      resource,
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    if (type === "role") roles.refetch();
    else if (type === "rolebinding") roleBindings.refetch();
    else if (type === "clusterrole") clusterRoles.refetch();
    else if (type === "clusterrolebinding") clusterRoleBindings.refetch();
  };
  const handleDryRunYAML = async (yaml) => {
    const currentResource = activeTab() === "roles" ? selectedRole() : activeTab() === "rolebindings" ? selectedRB() : activeTab() === "clusterroles" ? selectedCR() : selectedCRB();
    if (!currentResource) return;
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
    const type = activeTab() === "roles" ? "role" : activeTab() === "rolebindings" ? "rolebinding" : activeTab() === "clusterroles" ? "clusterrole" : "clusterrolebinding";
    const isNamespaced = type === "role" || type === "rolebinding";
    const ns = isNamespaced ? currentResource.namespace || namespace() : "";
    const resource = type === "role" ? "roles" : type === "rolebinding" ? "rolebindings" : type === "clusterrole" ? "clusterroles" : "clusterrolebindings";
    startExecution({
      label: `Dry run ${type} YAML: ${currentResource.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: ns || "",
      context: status.context,
      userAction: `rbac-${type}-apply-yaml-dry-run`,
      dryRun: true,
      allowClusterWide: !isNamespaced,
      resource,
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
  };
  return (() => {
    var _el$ = _tmpl$13(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$2.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild; _el$1.nextSibling; var _el$11 = _el$9.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$15 = _el$13.nextSibling; _el$15.nextSibling; var _el$16 = _el$12.nextSibling, _el$17 = _el$16.firstChild, _el$19 = _el$17.nextSibling; _el$19.nextSibling; var _el$20 = _el$16.nextSibling, _el$21 = _el$20.firstChild, _el$23 = _el$21.nextSibling; _el$23.nextSibling; var _el$24 = _el$20.nextSibling, _el$25 = _el$24.firstChild, _el$27 = _el$25.nextSibling; _el$27.nextSibling;
    _el$7.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$8.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$12.$$click = () => setActiveTab("roles");
    insert(_el$12, () => roles()?.length || 0, _el$15);
    _el$16.$$click = () => setActiveTab("rolebindings");
    insert(_el$16, () => roleBindings()?.length || 0, _el$19);
    _el$20.$$click = () => setActiveTab("clusterroles");
    insert(_el$20, () => clusterRoles()?.length || 0, _el$23);
    _el$24.$$click = () => setActiveTab("clusterrolebindings");
    insert(_el$24, () => clusterRoleBindings()?.length || 0, _el$27);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "roles";
      },
      get children() {
        var _el$28 = _tmpl$4();
        insert(_el$28, createComponent(Show, {
          get when() {
            return roles.loading;
          },
          get children() {
            var _el$29 = _tmpl$(), _el$30 = _el$29.firstChild; _el$30.nextSibling;
            return _el$29;
          }
        }), null);
        insert(_el$28, createComponent(Show, {
          get when() {
            return memo(() => !!!roles.loading)() && (!roles() || roles().length === 0);
          },
          get children() {
            return _tmpl$2();
          }
        }), null);
        insert(_el$28, createComponent(Show, {
          get when() {
            return memo(() => !!(!roles.loading && roles()))() && roles().length > 0;
          },
          get children() {
            var _el$33 = _tmpl$3(), _el$34 = _el$33.firstChild, _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling, _el$40 = _el$39.nextSibling, _el$41 = _el$40.nextSibling, _el$42 = _el$41.nextSibling, _el$43 = _el$36.nextSibling;
            insert(_el$43, createComponent(For, {
              get each() {
                return roles();
              },
              get fallback() {
                return (() => {
                  var _el$93 = _tmpl$14(); _el$93.firstChild;
                  return _el$93;
                })();
              },
              children: (role) => {
                return (() => {
                  var _el$95 = _tmpl$15(), _el$96 = _el$95.firstChild, _el$97 = _el$96.nextSibling, _el$98 = _el$97.nextSibling, _el$99 = _el$98.nextSibling, _el$100 = _el$99.nextSibling;
                  insert(_el$96, () => role.name);
                  insert(_el$97, () => role.namespace || "default");
                  insert(_el$98, () => role.rules || 0);
                  insert(_el$99, () => role.age || "N/A");
                  insert(_el$100, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelectedRole(role);
                        setYamlKey(`role|${role.name}|${role.namespace || ""}`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelectedRole(role);
                        setYamlKey(`role|${role.name}|${role.namespace || ""}`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => handleDelete("role", role.name, role.namespace),
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$51 = `${fontSize()}px`, _v$52 = `${Math.max(24, fontSize() * 1.7)}px`, _v$53 = `${Math.max(24, fontSize() * 1.7)}px`, _v$54 = `${fontSize()}px`, _v$55 = `${Math.max(24, fontSize() * 1.7)}px`, _v$56 = `${Math.max(24, fontSize() * 1.7)}px`, _v$57 = `${fontSize()}px`, _v$58 = `${Math.max(24, fontSize() * 1.7)}px`, _v$59 = `${Math.max(24, fontSize() * 1.7)}px`, _v$60 = `${fontSize()}px`, _v$61 = `${Math.max(24, fontSize() * 1.7)}px`, _v$62 = `${Math.max(24, fontSize() * 1.7)}px`, _v$63 = `${Math.max(24, fontSize() * 1.7)}px`, _v$64 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$51 !== _p$.e && setStyleProperty(_el$96, "font-size", _p$.e = _v$51);
                    _v$52 !== _p$.t && setStyleProperty(_el$96, "height", _p$.t = _v$52);
                    _v$53 !== _p$.a && setStyleProperty(_el$96, "line-height", _p$.a = _v$53);
                    _v$54 !== _p$.o && setStyleProperty(_el$97, "font-size", _p$.o = _v$54);
                    _v$55 !== _p$.i && setStyleProperty(_el$97, "height", _p$.i = _v$55);
                    _v$56 !== _p$.n && setStyleProperty(_el$97, "line-height", _p$.n = _v$56);
                    _v$57 !== _p$.s && setStyleProperty(_el$98, "font-size", _p$.s = _v$57);
                    _v$58 !== _p$.h && setStyleProperty(_el$98, "height", _p$.h = _v$58);
                    _v$59 !== _p$.r && setStyleProperty(_el$98, "line-height", _p$.r = _v$59);
                    _v$60 !== _p$.d && setStyleProperty(_el$99, "font-size", _p$.d = _v$60);
                    _v$61 !== _p$.l && setStyleProperty(_el$99, "height", _p$.l = _v$61);
                    _v$62 !== _p$.u && setStyleProperty(_el$99, "line-height", _p$.u = _v$62);
                    _v$63 !== _p$.c && setStyleProperty(_el$100, "height", _p$.c = _v$63);
                    _v$64 !== _p$.w && setStyleProperty(_el$100, "line-height", _p$.w = _v$64);
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
                    w: void 0
                  });
                  return _el$95;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$ = getFontFamilyCSS(), _v$2 = `${Math.max(24, fontSize() * 1.7)}px`, _v$3 = getFontFamilyCSS(), _v$4 = `${fontSize()}px`, _v$5 = `${Math.max(24, fontSize() * 1.7)}px`, _v$6 = `${fontSize()}px`, _v$7 = `${fontSize()}px`, _v$8 = `${fontSize()}px`, _v$9 = `${fontSize()}px`, _v$0 = `${fontSize()}px`;
              _v$ !== _p$.e && setStyleProperty(_el$35, "font-family", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$37, "height", _p$.t = _v$2);
              _v$3 !== _p$.a && setStyleProperty(_el$37, "font-family", _p$.a = _v$3);
              _v$4 !== _p$.o && setStyleProperty(_el$37, "font-size", _p$.o = _v$4);
              _v$5 !== _p$.i && setStyleProperty(_el$37, "line-height", _p$.i = _v$5);
              _v$6 !== _p$.n && setStyleProperty(_el$38, "font-size", _p$.n = _v$6);
              _v$7 !== _p$.s && setStyleProperty(_el$39, "font-size", _p$.s = _v$7);
              _v$8 !== _p$.h && setStyleProperty(_el$40, "font-size", _p$.h = _v$8);
              _v$9 !== _p$.r && setStyleProperty(_el$41, "font-size", _p$.r = _v$9);
              _v$0 !== _p$.d && setStyleProperty(_el$42, "font-size", _p$.d = _v$0);
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
              d: void 0
            });
            return _el$33;
          }
        }), null);
        return _el$28;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "rolebindings";
      },
      get children() {
        var _el$44 = _tmpl$4();
        insert(_el$44, createComponent(Show, {
          get when() {
            return roleBindings.loading;
          },
          get children() {
            var _el$45 = _tmpl$5(), _el$46 = _el$45.firstChild; _el$46.nextSibling;
            return _el$45;
          }
        }), null);
        insert(_el$44, createComponent(Show, {
          get when() {
            return memo(() => !!!roleBindings.loading)() && (!roleBindings() || roleBindings().length === 0);
          },
          get children() {
            return _tmpl$6();
          }
        }), null);
        insert(_el$44, createComponent(Show, {
          get when() {
            return memo(() => !!(!roleBindings.loading && roleBindings()))() && roleBindings().length > 0;
          },
          get children() {
            var _el$49 = _tmpl$7(), _el$50 = _el$49.firstChild, _el$51 = _el$50.firstChild, _el$52 = _el$51.firstChild, _el$53 = _el$52.firstChild, _el$54 = _el$53.firstChild, _el$55 = _el$54.nextSibling, _el$56 = _el$55.nextSibling, _el$57 = _el$56.nextSibling, _el$58 = _el$57.nextSibling, _el$59 = _el$58.nextSibling, _el$60 = _el$52.nextSibling;
            insert(_el$60, createComponent(For, {
              get each() {
                return roleBindings();
              },
              get fallback() {
                return (() => {
                  var _el$101 = _tmpl$16(); _el$101.firstChild;
                  return _el$101;
                })();
              },
              children: (rb) => {
                return (() => {
                  var _el$103 = _tmpl$17(), _el$104 = _el$103.firstChild, _el$105 = _el$104.nextSibling, _el$106 = _el$105.nextSibling, _el$107 = _el$106.nextSibling, _el$108 = _el$107.nextSibling, _el$109 = _el$108.nextSibling;
                  insert(_el$104, () => rb.name);
                  insert(_el$105, () => rb.namespace || "default");
                  insert(_el$106, () => rb.roleRef || "N/A");
                  insert(_el$107, () => rb.subjects || 0);
                  insert(_el$108, () => rb.age || "N/A");
                  insert(_el$109, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelectedRB(rb);
                        setYamlKey(`rolebinding|${rb.name}|${rb.namespace || ""}`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelectedRB(rb);
                        setYamlKey(`rolebinding|${rb.name}|${rb.namespace || ""}`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => handleDelete("rb", rb.name, rb.namespace),
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$65 = `${fontSize()}px`, _v$66 = `${Math.max(24, fontSize() * 1.7)}px`, _v$67 = `${Math.max(24, fontSize() * 1.7)}px`, _v$68 = `${fontSize()}px`, _v$69 = `${Math.max(24, fontSize() * 1.7)}px`, _v$70 = `${Math.max(24, fontSize() * 1.7)}px`, _v$71 = `${fontSize()}px`, _v$72 = `${Math.max(24, fontSize() * 1.7)}px`, _v$73 = `${Math.max(24, fontSize() * 1.7)}px`, _v$74 = `${fontSize()}px`, _v$75 = `${Math.max(24, fontSize() * 1.7)}px`, _v$76 = `${Math.max(24, fontSize() * 1.7)}px`, _v$77 = `${fontSize()}px`, _v$78 = `${Math.max(24, fontSize() * 1.7)}px`, _v$79 = `${Math.max(24, fontSize() * 1.7)}px`, _v$80 = `${Math.max(24, fontSize() * 1.7)}px`, _v$81 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$65 !== _p$.e && setStyleProperty(_el$104, "font-size", _p$.e = _v$65);
                    _v$66 !== _p$.t && setStyleProperty(_el$104, "height", _p$.t = _v$66);
                    _v$67 !== _p$.a && setStyleProperty(_el$104, "line-height", _p$.a = _v$67);
                    _v$68 !== _p$.o && setStyleProperty(_el$105, "font-size", _p$.o = _v$68);
                    _v$69 !== _p$.i && setStyleProperty(_el$105, "height", _p$.i = _v$69);
                    _v$70 !== _p$.n && setStyleProperty(_el$105, "line-height", _p$.n = _v$70);
                    _v$71 !== _p$.s && setStyleProperty(_el$106, "font-size", _p$.s = _v$71);
                    _v$72 !== _p$.h && setStyleProperty(_el$106, "height", _p$.h = _v$72);
                    _v$73 !== _p$.r && setStyleProperty(_el$106, "line-height", _p$.r = _v$73);
                    _v$74 !== _p$.d && setStyleProperty(_el$107, "font-size", _p$.d = _v$74);
                    _v$75 !== _p$.l && setStyleProperty(_el$107, "height", _p$.l = _v$75);
                    _v$76 !== _p$.u && setStyleProperty(_el$107, "line-height", _p$.u = _v$76);
                    _v$77 !== _p$.c && setStyleProperty(_el$108, "font-size", _p$.c = _v$77);
                    _v$78 !== _p$.w && setStyleProperty(_el$108, "height", _p$.w = _v$78);
                    _v$79 !== _p$.m && setStyleProperty(_el$108, "line-height", _p$.m = _v$79);
                    _v$80 !== _p$.f && setStyleProperty(_el$109, "height", _p$.f = _v$80);
                    _v$81 !== _p$.y && setStyleProperty(_el$109, "line-height", _p$.y = _v$81);
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
                  return _el$103;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$1 = getFontFamilyCSS(), _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = getFontFamilyCSS(), _v$12 = `${fontSize()}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${fontSize()}px`, _v$15 = `${fontSize()}px`, _v$16 = `${fontSize()}px`, _v$17 = `${fontSize()}px`, _v$18 = `${fontSize()}px`, _v$19 = `${fontSize()}px`;
              _v$1 !== _p$.e && setStyleProperty(_el$51, "font-family", _p$.e = _v$1);
              _v$10 !== _p$.t && setStyleProperty(_el$53, "height", _p$.t = _v$10);
              _v$11 !== _p$.a && setStyleProperty(_el$53, "font-family", _p$.a = _v$11);
              _v$12 !== _p$.o && setStyleProperty(_el$53, "font-size", _p$.o = _v$12);
              _v$13 !== _p$.i && setStyleProperty(_el$53, "line-height", _p$.i = _v$13);
              _v$14 !== _p$.n && setStyleProperty(_el$54, "font-size", _p$.n = _v$14);
              _v$15 !== _p$.s && setStyleProperty(_el$55, "font-size", _p$.s = _v$15);
              _v$16 !== _p$.h && setStyleProperty(_el$56, "font-size", _p$.h = _v$16);
              _v$17 !== _p$.r && setStyleProperty(_el$57, "font-size", _p$.r = _v$17);
              _v$18 !== _p$.d && setStyleProperty(_el$58, "font-size", _p$.d = _v$18);
              _v$19 !== _p$.l && setStyleProperty(_el$59, "font-size", _p$.l = _v$19);
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
            return _el$49;
          }
        }), null);
        return _el$44;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "clusterroles";
      },
      get children() {
        var _el$61 = _tmpl$4();
        insert(_el$61, createComponent(Show, {
          get when() {
            return clusterRoles.loading;
          },
          get children() {
            var _el$62 = _tmpl$8(), _el$63 = _el$62.firstChild; _el$63.nextSibling;
            return _el$62;
          }
        }), null);
        insert(_el$61, createComponent(Show, {
          get when() {
            return memo(() => !!!clusterRoles.loading)() && (!clusterRoles() || clusterRoles().length === 0);
          },
          get children() {
            return _tmpl$9();
          }
        }), null);
        insert(_el$61, createComponent(Show, {
          get when() {
            return memo(() => !!(!clusterRoles.loading && clusterRoles()))() && clusterRoles().length > 0;
          },
          get children() {
            var _el$66 = _tmpl$0(), _el$67 = _el$66.firstChild, _el$68 = _el$67.firstChild, _el$69 = _el$68.firstChild, _el$70 = _el$69.firstChild, _el$71 = _el$70.firstChild, _el$72 = _el$71.nextSibling, _el$73 = _el$72.nextSibling, _el$74 = _el$73.nextSibling, _el$75 = _el$69.nextSibling;
            insert(_el$75, createComponent(For, {
              get each() {
                return clusterRoles();
              },
              get fallback() {
                return (() => {
                  var _el$110 = _tmpl$18(); _el$110.firstChild;
                  return _el$110;
                })();
              },
              children: (cr) => {
                return (() => {
                  var _el$112 = _tmpl$19(), _el$113 = _el$112.firstChild, _el$114 = _el$113.nextSibling, _el$115 = _el$114.nextSibling, _el$116 = _el$115.nextSibling;
                  insert(_el$113, () => cr.name);
                  insert(_el$114, () => cr.rules || 0);
                  insert(_el$115, () => cr.age || "N/A");
                  insert(_el$116, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelectedCR(cr);
                        setYamlKey(`clusterrole|${cr.name}|`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelectedCR(cr);
                        setYamlKey(`clusterrole|${cr.name}|`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => handleDelete("cr", cr.name),
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$82 = `${fontSize()}px`, _v$83 = `${Math.max(24, fontSize() * 1.7)}px`, _v$84 = `${Math.max(24, fontSize() * 1.7)}px`, _v$85 = `${fontSize()}px`, _v$86 = `${Math.max(24, fontSize() * 1.7)}px`, _v$87 = `${Math.max(24, fontSize() * 1.7)}px`, _v$88 = `${fontSize()}px`, _v$89 = `${Math.max(24, fontSize() * 1.7)}px`, _v$90 = `${Math.max(24, fontSize() * 1.7)}px`, _v$91 = `${Math.max(24, fontSize() * 1.7)}px`, _v$92 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$82 !== _p$.e && setStyleProperty(_el$113, "font-size", _p$.e = _v$82);
                    _v$83 !== _p$.t && setStyleProperty(_el$113, "height", _p$.t = _v$83);
                    _v$84 !== _p$.a && setStyleProperty(_el$113, "line-height", _p$.a = _v$84);
                    _v$85 !== _p$.o && setStyleProperty(_el$114, "font-size", _p$.o = _v$85);
                    _v$86 !== _p$.i && setStyleProperty(_el$114, "height", _p$.i = _v$86);
                    _v$87 !== _p$.n && setStyleProperty(_el$114, "line-height", _p$.n = _v$87);
                    _v$88 !== _p$.s && setStyleProperty(_el$115, "font-size", _p$.s = _v$88);
                    _v$89 !== _p$.h && setStyleProperty(_el$115, "height", _p$.h = _v$89);
                    _v$90 !== _p$.r && setStyleProperty(_el$115, "line-height", _p$.r = _v$90);
                    _v$91 !== _p$.d && setStyleProperty(_el$116, "height", _p$.d = _v$91);
                    _v$92 !== _p$.l && setStyleProperty(_el$116, "line-height", _p$.l = _v$92);
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
                  return _el$112;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$20 = getFontFamilyCSS(), _v$21 = `${Math.max(24, fontSize() * 1.7)}px`, _v$22 = getFontFamilyCSS(), _v$23 = `${fontSize()}px`, _v$24 = `${Math.max(24, fontSize() * 1.7)}px`, _v$25 = `${fontSize()}px`, _v$26 = `${fontSize()}px`, _v$27 = `${fontSize()}px`, _v$28 = `${fontSize()}px`;
              _v$20 !== _p$.e && setStyleProperty(_el$68, "font-family", _p$.e = _v$20);
              _v$21 !== _p$.t && setStyleProperty(_el$70, "height", _p$.t = _v$21);
              _v$22 !== _p$.a && setStyleProperty(_el$70, "font-family", _p$.a = _v$22);
              _v$23 !== _p$.o && setStyleProperty(_el$70, "font-size", _p$.o = _v$23);
              _v$24 !== _p$.i && setStyleProperty(_el$70, "line-height", _p$.i = _v$24);
              _v$25 !== _p$.n && setStyleProperty(_el$71, "font-size", _p$.n = _v$25);
              _v$26 !== _p$.s && setStyleProperty(_el$72, "font-size", _p$.s = _v$26);
              _v$27 !== _p$.h && setStyleProperty(_el$73, "font-size", _p$.h = _v$27);
              _v$28 !== _p$.r && setStyleProperty(_el$74, "font-size", _p$.r = _v$28);
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
            return _el$66;
          }
        }), null);
        return _el$61;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "clusterrolebindings";
      },
      get children() {
        var _el$76 = _tmpl$4();
        insert(_el$76, createComponent(Show, {
          get when() {
            return clusterRoleBindings.loading;
          },
          get children() {
            var _el$77 = _tmpl$1(), _el$78 = _el$77.firstChild; _el$78.nextSibling;
            return _el$77;
          }
        }), null);
        insert(_el$76, createComponent(Show, {
          get when() {
            return memo(() => !!!clusterRoleBindings.loading)() && (!clusterRoleBindings() || clusterRoleBindings().length === 0);
          },
          get children() {
            return _tmpl$10();
          }
        }), null);
        insert(_el$76, createComponent(Show, {
          get when() {
            return memo(() => !!(!clusterRoleBindings.loading && clusterRoleBindings()))() && clusterRoleBindings().length > 0;
          },
          get children() {
            var _el$81 = _tmpl$11(), _el$82 = _el$81.firstChild, _el$83 = _el$82.firstChild, _el$84 = _el$83.firstChild, _el$85 = _el$84.firstChild, _el$86 = _el$85.firstChild, _el$87 = _el$86.nextSibling, _el$88 = _el$87.nextSibling, _el$89 = _el$88.nextSibling, _el$90 = _el$89.nextSibling, _el$91 = _el$84.nextSibling;
            insert(_el$91, createComponent(For, {
              get each() {
                return clusterRoleBindings();
              },
              get fallback() {
                return (() => {
                  var _el$117 = _tmpl$20(); _el$117.firstChild;
                  return _el$117;
                })();
              },
              children: (crb) => {
                return (() => {
                  var _el$119 = _tmpl$15(), _el$120 = _el$119.firstChild, _el$121 = _el$120.nextSibling, _el$122 = _el$121.nextSibling, _el$123 = _el$122.nextSibling, _el$124 = _el$123.nextSibling;
                  insert(_el$120, () => crb.name);
                  insert(_el$121, () => crb.roleRef || "N/A");
                  insert(_el$122, () => crb.subjects || 0);
                  insert(_el$123, () => crb.age || "N/A");
                  insert(_el$124, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelectedCRB(crb);
                        setYamlKey(`clusterrolebinding|${crb.name}|`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelectedCRB(crb);
                        setYamlKey(`clusterrolebinding|${crb.name}|`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => handleDelete("crb", crb.name),
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$93 = `${fontSize()}px`, _v$94 = `${Math.max(24, fontSize() * 1.7)}px`, _v$95 = `${Math.max(24, fontSize() * 1.7)}px`, _v$96 = `${fontSize()}px`, _v$97 = `${Math.max(24, fontSize() * 1.7)}px`, _v$98 = `${Math.max(24, fontSize() * 1.7)}px`, _v$99 = `${fontSize()}px`, _v$100 = `${Math.max(24, fontSize() * 1.7)}px`, _v$101 = `${Math.max(24, fontSize() * 1.7)}px`, _v$102 = `${fontSize()}px`, _v$103 = `${Math.max(24, fontSize() * 1.7)}px`, _v$104 = `${Math.max(24, fontSize() * 1.7)}px`, _v$105 = `${Math.max(24, fontSize() * 1.7)}px`, _v$106 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$93 !== _p$.e && setStyleProperty(_el$120, "font-size", _p$.e = _v$93);
                    _v$94 !== _p$.t && setStyleProperty(_el$120, "height", _p$.t = _v$94);
                    _v$95 !== _p$.a && setStyleProperty(_el$120, "line-height", _p$.a = _v$95);
                    _v$96 !== _p$.o && setStyleProperty(_el$121, "font-size", _p$.o = _v$96);
                    _v$97 !== _p$.i && setStyleProperty(_el$121, "height", _p$.i = _v$97);
                    _v$98 !== _p$.n && setStyleProperty(_el$121, "line-height", _p$.n = _v$98);
                    _v$99 !== _p$.s && setStyleProperty(_el$122, "font-size", _p$.s = _v$99);
                    _v$100 !== _p$.h && setStyleProperty(_el$122, "height", _p$.h = _v$100);
                    _v$101 !== _p$.r && setStyleProperty(_el$122, "line-height", _p$.r = _v$101);
                    _v$102 !== _p$.d && setStyleProperty(_el$123, "font-size", _p$.d = _v$102);
                    _v$103 !== _p$.l && setStyleProperty(_el$123, "height", _p$.l = _v$103);
                    _v$104 !== _p$.u && setStyleProperty(_el$123, "line-height", _p$.u = _v$104);
                    _v$105 !== _p$.c && setStyleProperty(_el$124, "height", _p$.c = _v$105);
                    _v$106 !== _p$.w && setStyleProperty(_el$124, "line-height", _p$.w = _v$106);
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
                    w: void 0
                  });
                  return _el$119;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$29 = getFontFamilyCSS(), _v$30 = `${Math.max(24, fontSize() * 1.7)}px`, _v$31 = getFontFamilyCSS(), _v$32 = `${fontSize()}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `${fontSize()}px`, _v$35 = `${fontSize()}px`, _v$36 = `${fontSize()}px`, _v$37 = `${fontSize()}px`, _v$38 = `${fontSize()}px`;
              _v$29 !== _p$.e && setStyleProperty(_el$83, "font-family", _p$.e = _v$29);
              _v$30 !== _p$.t && setStyleProperty(_el$85, "height", _p$.t = _v$30);
              _v$31 !== _p$.a && setStyleProperty(_el$85, "font-family", _p$.a = _v$31);
              _v$32 !== _p$.o && setStyleProperty(_el$85, "font-size", _p$.o = _v$32);
              _v$33 !== _p$.i && setStyleProperty(_el$85, "line-height", _p$.i = _v$33);
              _v$34 !== _p$.n && setStyleProperty(_el$86, "font-size", _p$.n = _v$34);
              _v$35 !== _p$.s && setStyleProperty(_el$87, "font-size", _p$.s = _v$35);
              _v$36 !== _p$.h && setStyleProperty(_el$88, "font-size", _p$.h = _v$36);
              _v$37 !== _p$.r && setStyleProperty(_el$89, "font-size", _p$.r = _v$37);
              _v$38 !== _p$.d && setStyleProperty(_el$90, "font-size", _p$.d = _v$38);
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
              d: void 0
            });
            return _el$81;
          }
        }), null);
        return _el$76;
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showYaml();
      },
      size: "xl",
      get title() {
        return `YAML: ${activeTab() === "roles" ? selectedRole()?.name : activeTab() === "rolebindings" ? selectedRB()?.name : activeTab() === "clusterroles" ? selectedCR()?.name : selectedCRB()?.name || ""}`;
      },
      onClose: () => {
        setShowYaml(false);
        setSelectedRole(null);
        setSelectedRB(null);
        setSelectedCR(null);
        setSelectedCRB(null);
        setYamlKey(null);
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$125 = _tmpl$21(), _el$126 = _el$125.firstChild; _el$126.nextSibling;
              return _el$125;
            })();
          },
          get children() {
            return createComponent(YAMLViewer, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return memo(() => activeTab() === "roles")() ? selectedRole()?.name : memo(() => activeTab() === "rolebindings")() ? selectedRB()?.name : memo(() => activeTab() === "clusterroles")() ? selectedCR()?.name : selectedCRB()?.name;
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
      size: "xl",
      get title() {
        return `Edit YAML: ${activeTab() === "roles" ? selectedRole()?.name : activeTab() === "rolebindings" ? selectedRB()?.name : activeTab() === "clusterroles" ? selectedCR()?.name : selectedCRB()?.name || ""}`;
      },
      onClose: () => {
        setShowEdit(false);
        setSelectedRole(null);
        setSelectedRB(null);
        setSelectedCR(null);
        setSelectedCRB(null);
        setYamlKey(null);
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$128 = _tmpl$21(), _el$129 = _el$128.firstChild; _el$129.nextSibling;
              return _el$128;
            })();
          },
          get children() {
            var _el$92 = _tmpl$12();
            insert(_el$92, createComponent(YAMLEditor, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return memo(() => activeTab() === "roles")() ? selectedRole()?.name : memo(() => activeTab() === "rolebindings")() ? selectedRB()?.name : memo(() => activeTab() === "clusterroles")() ? selectedCR()?.name : selectedCRB()?.name;
              },
              onSave: handleSaveYAML,
              onDryRun: handleDryRunYAML,
              onCancel: () => {
                setShowEdit(false);
                setSelectedRole(null);
                setSelectedRB(null);
                setSelectedCR(null);
                setSelectedCRB(null);
                setYamlKey(null);
              }
            }));
            return _el$92;
          }
        });
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$39 = `px-4 py-2 font-medium transition-colors ${activeTab() === "roles" ? "border-b-2" : ""}`, _v$40 = activeTab() === "roles" ? "var(--accent-primary)" : "var(--text-secondary)", _v$41 = activeTab() === "roles" ? "var(--accent-primary)" : "transparent", _v$42 = `px-4 py-2 font-medium transition-colors ${activeTab() === "rolebindings" ? "border-b-2" : ""}`, _v$43 = activeTab() === "rolebindings" ? "var(--accent-primary)" : "var(--text-secondary)", _v$44 = activeTab() === "rolebindings" ? "var(--accent-primary)" : "transparent", _v$45 = `px-4 py-2 font-medium transition-colors ${activeTab() === "clusterroles" ? "border-b-2" : ""}`, _v$46 = activeTab() === "clusterroles" ? "var(--accent-primary)" : "var(--text-secondary)", _v$47 = activeTab() === "clusterroles" ? "var(--accent-primary)" : "transparent", _v$48 = `px-4 py-2 font-medium transition-colors ${activeTab() === "clusterrolebindings" ? "border-b-2" : ""}`, _v$49 = activeTab() === "clusterrolebindings" ? "var(--accent-primary)" : "var(--text-secondary)", _v$50 = activeTab() === "clusterrolebindings" ? "var(--accent-primary)" : "transparent";
      _v$39 !== _p$.e && className(_el$12, _p$.e = _v$39);
      _v$40 !== _p$.t && setStyleProperty(_el$12, "color", _p$.t = _v$40);
      _v$41 !== _p$.a && setStyleProperty(_el$12, "border-bottom-color", _p$.a = _v$41);
      _v$42 !== _p$.o && className(_el$16, _p$.o = _v$42);
      _v$43 !== _p$.i && setStyleProperty(_el$16, "color", _p$.i = _v$43);
      _v$44 !== _p$.n && setStyleProperty(_el$16, "border-bottom-color", _p$.n = _v$44);
      _v$45 !== _p$.s && className(_el$20, _p$.s = _v$45);
      _v$46 !== _p$.h && setStyleProperty(_el$20, "color", _p$.h = _v$46);
      _v$47 !== _p$.r && setStyleProperty(_el$20, "border-bottom-color", _p$.r = _v$47);
      _v$48 !== _p$.d && className(_el$24, _p$.d = _v$48);
      _v$49 !== _p$.l && setStyleProperty(_el$24, "color", _p$.l = _v$49);
      _v$50 !== _p$.u && setStyleProperty(_el$24, "border-bottom-color", _p$.u = _v$50);
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
    createRenderEffect(() => _el$7.value = fontSize());
    createRenderEffect(() => _el$8.value = fontFamily());
    return _el$;
  })();
};
delegateEvents(["click"]);

export { RBAC as default };
//# sourceMappingURL=RBAC-L4u8A-A_.js.map
