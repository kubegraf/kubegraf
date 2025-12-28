import { c as createSignal, j as createResource, k as api, P as namespace, G as addNotification, a as createMemo, t as template, i as insert, d as createComponent, F as For, m as memo, f as createRenderEffect, q as style, g as className, h as setStyleProperty, S as Show, M as Modal, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-NnaOo1cf.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-DuY4ZOBL.js';
import { Y as YAMLViewer } from './YAMLViewer-B3aZsnWG.js';
import { Y as YAMLEditor } from './YAMLEditor-8WjJlhy7.js';
import { D as DescribeModal } from './DescribeModal-CnmW-EF9.js';
import { A as ActionMenu } from './ActionMenu-BtMa9NTM.js';
import { g as getTableCellStyle, S as STANDARD_TEXT_COLOR } from './tableCellStyles-CGbMKoA7.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>&#9650;</span><span>&#9660;`), _tmpl$2 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Namespace </div></th><th class=whitespace-nowrap>Secret</th><th class=whitespace-nowrap>Issuer</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Status </div></th><th class=whitespace-nowrap>Expires</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> certificates</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$4 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Certificates</h1><p class=text-xs style=color:var(--text-secondary)>TLS certificates managed by cert-manager</p></div><div class="flex items-center gap-3"><button class=icon-btn title="Refresh Certificates"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Ready</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--warning-color)"><span class=text-sm style=color:var(--text-secondary)>Pending</span><span class="text-xl font-bold"style=color:var(--warning-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--error-color)"><span class=text-sm style=color:var(--text-secondary)>Failed</span><span class="text-xl font-bold"style=color:var(--error-color)></span></div><div class=flex-1></div><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100</option></select></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading certificates...`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td colspan=8 class="text-center py-8"style=color:var(--text-muted)>No certificates found. Make sure cert-manager is installed.`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td></td><td><code class="px-2 py-1 rounded text-xs"style=background:var(--bg-tertiary)></code></td><td></td><td><span></span></td><td></td><td></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$9 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`);
const Certificates = () => {
  const [search, setSearch] = createSignal("");
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const [fontSize] = createSignal(parseInt(localStorage.getItem("certificates-font-size") || "14"));
  const [fontFamily] = createSignal(localStorage.getItem("certificates-font-family") || "Monaco");
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
  const [certificates, {
    refetch
  }] = createResource(namespace, api.getCertificates);
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getCertificateYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch certificate YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const cert = selected();
    if (!cert) return;
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
      label: `Apply Certificate YAML: ${cert.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: cert.namespace,
      context: status.context,
      userAction: "certificates-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "certificates",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const cert = selected();
    if (!cert) return;
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
      label: `Dry run Certificate YAML: ${cert.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: cert.namespace,
      context: status.context,
      userAction: "certificates-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "certificates",
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
    let all = certificates() || [];
    const query = search().toLowerCase();
    if (query) {
      all = all.filter((c) => c.name.toLowerCase().includes(query) || c.namespace.toLowerCase().includes(query) || c.issuer?.toLowerCase().includes(query) || c.dnsNames?.some((d) => d.toLowerCase().includes(query)));
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
  const paginatedCertificates = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = certificates() || [];
    return {
      total: all.length,
      ready: all.filter((c) => c.status === "Ready" || c.status === "True").length,
      pending: all.filter((c) => c.status === "Pending" || c.status === "Unknown").length,
      failed: all.filter((c) => c.status === "Failed" || c.status === "False").length
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
  const deleteCertificate = async (cert) => {
    if (!confirm(`Are you sure you want to delete certificate ${cert.name}?`)) return;
    try {
      await api.deleteCertificate(cert.name, cert.namespace);
      addNotification(`Certificate ${cert.name} deleted successfully`, "success");
      refetch();
    } catch (error) {
      console.error("Failed to delete certificate:", error);
      addNotification(`Failed to delete certificate: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };
  const getStatusBadgeClass = (status) => {
    if (status === "Ready" || status === "True") return "badge-success";
    if (status === "Failed" || status === "False") return "badge-error";
    return "badge-warning";
  };
  return (() => {
    var _el$4 = _tmpl$5(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$5.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$13.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling, _el$25 = _el$1.nextSibling;
    _el$0.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetch();
    };
    insert(_el$12, () => statusCounts().total);
    insert(_el$15, () => statusCounts().ready);
    insert(_el$18, () => statusCounts().pending);
    insert(_el$21, () => statusCounts().failed);
    _el$23.$$input = (e) => {
      setSearch(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$24.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$25, createComponent(Show, {
      get when() {
        return !certificates.loading;
      },
      get fallback() {
        return (() => {
          var _el$66 = _tmpl$6(), _el$67 = _el$66.firstChild; _el$67.nextSibling;
          return _el$66;
        })();
      },
      get children() {
        return [(() => {
          var _el$26 = _tmpl$2(), _el$27 = _el$26.firstChild, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild; _el$31.firstChild; var _el$33 = _el$30.nextSibling, _el$34 = _el$33.firstChild; _el$34.firstChild; var _el$36 = _el$33.nextSibling, _el$37 = _el$36.nextSibling, _el$38 = _el$37.nextSibling, _el$39 = _el$38.firstChild; _el$39.firstChild; var _el$41 = _el$38.nextSibling, _el$42 = _el$41.nextSibling, _el$43 = _el$42.firstChild; _el$43.firstChild; var _el$45 = _el$28.nextSibling;
          _el$30.$$click = () => handleSort("name");
          insert(_el$31, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$33.$$click = () => handleSort("namespace");
          insert(_el$34, createComponent(SortIcon, {
            field: "namespace"
          }), null);
          _el$38.$$click = () => handleSort("status");
          insert(_el$39, createComponent(SortIcon, {
            field: "status"
          }), null);
          _el$42.$$click = () => handleSort("age");
          insert(_el$43, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$45, createComponent(For, {
            get each() {
              return paginatedCertificates();
            },
            get fallback() {
              return (() => {
                var _el$69 = _tmpl$7(); _el$69.firstChild;
                return _el$69;
              })();
            },
            children: (cert) => {
              const textColor = STANDARD_TEXT_COLOR;
              return (() => {
                var _el$71 = _tmpl$8(), _el$72 = _el$71.firstChild, _el$73 = _el$72.firstChild, _el$74 = _el$72.nextSibling, _el$75 = _el$74.nextSibling, _el$76 = _el$75.firstChild, _el$77 = _el$75.nextSibling, _el$78 = _el$77.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$78.nextSibling, _el$81 = _el$80.nextSibling, _el$82 = _el$81.nextSibling;
                _el$73.$$click = () => {
                  setSelected(cert);
                  setShowDescribe(true);
                };
                insert(_el$73, (() => {
                  var _c$ = memo(() => cert.name.length > 40);
                  return () => _c$() ? cert.name.slice(0, 37) + "..." : cert.name;
                })());
                insert(_el$74, () => cert.namespace);
                insert(_el$76, () => cert.secretName || "-");
                insert(_el$77, () => cert.issuer || "-");
                insert(_el$79, () => cert.status);
                insert(_el$80, () => cert.notAfter || "-");
                insert(_el$81, () => cert.age);
                insert(_el$82, createComponent(ActionMenu, {
                  actions: [{
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => {
                      setSelected(cert);
                      setYamlKey(`${cert.name}|${cert.namespace}`);
                      setShowYaml(true);
                    }
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => {
                      setSelected(cert);
                      setYamlKey(`${cert.name}|${cert.namespace}`);
                      setShowEdit(true);
                    }
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => deleteCertificate(cert),
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$1 = getTableCellStyle(fontSize(), textColor), _v$10 = getTableCellStyle(fontSize(), textColor), _v$11 = getTableCellStyle(fontSize(), textColor), _v$12 = getTableCellStyle(fontSize(), textColor), _v$13 = getTableCellStyle(fontSize(), textColor), _v$14 = `badge ${getStatusBadgeClass(cert.status)}`, _v$15 = getTableCellStyle(fontSize(), textColor), _v$16 = getTableCellStyle(fontSize(), textColor), _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _p$.e = style(_el$72, _v$1, _p$.e);
                  _p$.t = style(_el$74, _v$10, _p$.t);
                  _p$.a = style(_el$75, _v$11, _p$.a);
                  _p$.o = style(_el$77, _v$12, _p$.o);
                  _p$.i = style(_el$78, _v$13, _p$.i);
                  _v$14 !== _p$.n && className(_el$79, _p$.n = _v$14);
                  _p$.s = style(_el$80, _v$15, _p$.s);
                  _p$.h = style(_el$81, _v$16, _p$.h);
                  _v$17 !== _p$.r && setStyleProperty(_el$82, "height", _p$.r = _v$17);
                  _v$18 !== _p$.d && setStyleProperty(_el$82, "line-height", _p$.d = _v$18);
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
                return _el$71;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground();
            _v$3 !== _p$.e && setStyleProperty(_el$27, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$27, "background", _p$.t = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$26;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$46 = _tmpl$3(), _el$47 = _el$46.firstChild, _el$48 = _el$47.firstChild, _el$52 = _el$48.nextSibling, _el$49 = _el$52.nextSibling, _el$53 = _el$49.nextSibling, _el$50 = _el$53.nextSibling, _el$54 = _el$50.nextSibling; _el$54.nextSibling; var _el$55 = _el$47.nextSibling, _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling, _el$58 = _el$57.nextSibling, _el$59 = _el$58.firstChild, _el$61 = _el$59.nextSibling; _el$61.nextSibling; var _el$62 = _el$58.nextSibling, _el$63 = _el$62.nextSibling, _el$64 = _el$63.nextSibling;
            insert(_el$47, () => (currentPage() - 1) * pageSize() + 1, _el$52);
            insert(_el$47, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$53);
            insert(_el$47, () => filteredAndSorted().length, _el$54);
            _el$56.$$click = () => setCurrentPage(1);
            _el$57.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$58, currentPage, _el$61);
            insert(_el$58, totalPages, null);
            _el$62.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$63.$$click = () => setCurrentPage(totalPages());
            _el$64.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$5 = currentPage() === 1, _v$6 = currentPage() === 1, _v$7 = currentPage() === totalPages(), _v$8 = currentPage() === totalPages();
              _v$5 !== _p$.e && (_el$56.disabled = _p$.e = _v$5);
              _v$6 !== _p$.t && (_el$57.disabled = _p$.t = _v$6);
              _v$7 !== _p$.a && (_el$62.disabled = _p$.a = _v$7);
              _v$8 !== _p$.o && (_el$63.disabled = _p$.o = _v$8);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$64.value = pageSize());
            return _el$46;
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
              var _el$83 = _tmpl$9(), _el$84 = _el$83.firstChild; _el$84.nextSibling;
              return _el$83;
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
              var _el$86 = _tmpl$9(), _el$87 = _el$86.firstChild; _el$87.nextSibling;
              return _el$86;
            })();
          },
          get children() {
            var _el$65 = _tmpl$4();
            insert(_el$65, createComponent(YAMLEditor, {
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
            return _el$65;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "certificate",
      get name() {
        return selected()?.name || "";
      },
      get namespace() {
        return selected()?.namespace;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$9 = getThemeBackground(), _v$0 = `1px solid ${getThemeBorderColor()}`;
      _v$9 !== _p$.e && setStyleProperty(_el$25, "background", _p$.e = _v$9);
      _v$0 !== _p$.t && setStyleProperty(_el$25, "border", _p$.t = _v$0);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$23.value = search());
    createRenderEffect(() => _el$24.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { Certificates as default };
//# sourceMappingURL=Certificates-CuEkakYT.js.map
