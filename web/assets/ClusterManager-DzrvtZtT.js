import { c as createSignal, o as onMount, ab as refreshClusterData, ac as refreshClusterStatus, a as createMemo, ad as clusterManagerStatus, w as clusterStatus, t as template, i as insert, s as setCurrentView, d as createComponent, ae as disconnectActiveCluster, f as createRenderEffect, af as clusterLoading, S as Show, m as memo, ag as discoveredClusters, ah as clusters, F as For, ai as connectToCluster, aj as setDefaultCluster, h as setStyleProperty, g as className, ak as runtimeContexts, al as switchContext, G as addNotification, v as delegateEvents } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded-md text-sm"style=background:var(--error-color);color:#fff>Disconnect`), _tmpl$2 = /* @__PURE__ */ template(`<div class="p-6 rounded-xl border mb-6"style="border:1px solid var(--border-color);background:var(--bg-card);border-left:4px solid var(--accent-primary)"><div class="flex items-start gap-4"><div class=flex-shrink-0><svg class="w-8 h-8"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div><div class=flex-1><h2 class="text-xl font-semibold mb-2"style=color:var(--text-primary)>Choose your cluster to connect</h2><p class="text-sm mb-4"style=color:var(--text-secondary)>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-center min-h-[60vh] p-8"><div class="max-w-3xl w-full"><div class="text-center mb-8"><div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"style="background:rgba(6, 182, 212, 0.15)"><svg class="w-12 h-12"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg></div><h2 class="text-3xl font-bold mb-3"style=color:var(--text-primary)>No Cluster Connected</h2><p class="text-base mb-8"style=color:var(--text-secondary)>Connect to an existing Kubernetes cluster or create a local one to get started</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer"style="border:2px solid var(--border-color)"><div class="flex items-center gap-3 mb-4"><div class="w-12 h-12 rounded-lg flex items-center justify-center"style="background:rgba(6, 182, 212, 0.1)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></div><h3 class="text-lg font-semibold"style=color:var(--text-primary)>Connect via kubeconfig</h3></div><p class="text-sm mb-4"style=color:var(--text-secondary)>Connect to an existing Kubernetes cluster using your kubeconfig file</p><ul class="text-xs space-y-2 mb-4"style=color:var(--text-muted)><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Ensure kubeconfig is at <code class="px-1 py-0.5 rounded"style=background:var(--bg-tertiary)>~/.kube/config</code></span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Verify with: <code class="px-1 py-0.5 rounded"style=background:var(--bg-tertiary)>kubectl cluster-info</code></span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Click "Retry Connection" below</span></li></ul><button class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 relative overflow-hidden"style=background:var(--accent-primary);color:#000><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Retry Connection</button></div><div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer"style="border:2px solid var(--border-color)"><div class="flex items-center gap-3 mb-4"><div class="w-12 h-12 rounded-lg flex items-center justify-center"style="background:rgba(34, 197, 94, 0.1)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:#22c55e><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div><h3 class="text-lg font-semibold"style=color:var(--text-primary)>Create Local Cluster</h3></div><p class="text-sm mb-4"style=color:var(--text-secondary)>Set up a local Kubernetes cluster using k3d, kind, or minikube</p><ul class="text-xs space-y-2 mb-4"style=color:var(--text-muted)><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Requires Docker Desktop installed and running</span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Choose from k3d, kind, or minikube</span></li><li class="flex items-start gap-2"><span class=mt-1>•</span><span>Automatically connects after creation</span></li></ul><button class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"style=background:#22c55e;color:#000><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Go to Marketplace</button></div></div><div class="flex items-center justify-center gap-3"><button class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"style=background:var(--accent-primary);color:#000><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Retry Connection</button><a href=https://kubegraf.io/docs target=_blank class="px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>Documentation`), _tmpl$4 = /* @__PURE__ */ template(`<div class=space-y-3>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="space-y-2 max-h-64 overflow-y-auto pr-1">`), _tmpl$6 = /* @__PURE__ */ template(`<div class="space-y-3 max-h-80 overflow-y-auto pr-1">`), _tmpl$7 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex flex-col gap-2"><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-semibold"style=color:var(--text-primary)>Cluster Manager</h1><p class=text-sm style=color:var(--text-secondary)>Discover, connect, and manage every Kubernetes cluster from one place.</p></div><div class="flex items-center gap-3"><div><span></span></div><button class="px-3 py-1.5 rounded-md text-sm flex items-center gap-2"title="Install k3d, kind, or minikube for local Kubernetes (works offline)"style=background:#22c55e;color:#000><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>Marketplace</button><button class="px-3 py-1.5 rounded-md text-sm transition-colors"style="border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);boxShadow:0 1px 2px rgba(0,0,0,0.08)">Auto-detect</button></div></div></div><div class="grid gap-6 lg:grid-cols-2"><div class="p-4 rounded-xl border"style="border:1px solid var(--border-color);background:var(--bg-card)"><div class="flex items-center justify-between mb-4"><div><h2 class="text-lg font-semibold"style=color:var(--text-primary)>Connected Clusters</h2><p class=text-sm style=color:var(--text-secondary)>Track every cluster KubeGraf knows about.</p></div></div><div class="mt-6 border-t pt-4"style=borderColor:var(--border-color)><div class="flex items-center justify-between mb-3"><div><h3 class="text-sm font-semibold"style=color:var(--text-primary)>Runtime kubeconfig contexts</h3><p class=text-xs style=color:var(--text-secondary)>Direct view of every context available in your local kubeconfig.</p></div><button class="px-3 py-1 text-xs rounded-md transition-colors"style="border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);boxShadow:0 1px 2px rgba(0,0,0,0.08)">Refresh</button></div></div></div><div class="p-4 rounded-xl border"style="border:1px solid var(--border-color);background:var(--bg-card)"><div class="flex items-center justify-between mb-4"><div><h2 class="text-lg font-semibold"style=color:var(--text-primary)>Auto-detected kubeconfigs</h2><p class=text-sm style=color:var(--text-secondary)>One click connect to any discovered file.</p></div></div><div class="mt-5 border-t pt-4"style=borderColor:var(--border-color)><h3 class="text-sm font-semibold mb-2"style=color:var(--text-primary)>Manual import</h3><div class=space-y-2><input type=text placeholder="Cluster name (optional)"class="w-full px-3 py-2 rounded-md text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><input type=text placeholder=/path/to/kubeconfig class="w-full px-3 py-2 rounded-md text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"><select class="w-full px-3 py-2 rounded-md text-sm"style="background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary)"></select><button class="w-full px-3 py-2 rounded-md text-sm"style=background:var(--accent-primary);color:#000>Connect cluster`), _tmpl$8 = /* @__PURE__ */ template(`<p class=text-sm style=color:var(--text-muted)>No clusters saved yet.`), _tmpl$9 = /* @__PURE__ */ template(`<span class="px-2 py-0.5 text-xs rounded-full"style=background:rgba(59,130,246,0.15);color:#3b82f6>Default`), _tmpl$0 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border flex flex-col gap-2"style="border:1px solid var(--border-color);background:var(--bg-secondary)"><div class="flex items-center justify-between"><div><div class="flex items-center gap-2"><span class="text-base font-semibold"style=color:var(--text-primary)></span></div><p class=text-xs style=color:var(--text-muted)> • </p></div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full"></span><span class=text-xs style=color:var(--text-secondary)></span></div></div><div class="flex flex-wrap gap-2"><button class="px-3 py-1.5 text-sm rounded-md transition-all">Connect</button><button class="px-3 py-1.5 text-sm rounded-md transition-all"style="border:1px solid var(--border-color)">Disconnect</button><button class="px-3 py-1.5 text-sm rounded-md transition-all"style="border:1px solid var(--border-color)">Set Default`), _tmpl$1 = /* @__PURE__ */ template(`<p class=text-sm style=color:var(--text-muted)>No contexts detected. Import a kubeconfig to get started.`), _tmpl$10 = /* @__PURE__ */ template(`<span class="px-2 py-0.5 text-xs rounded-full"style=background:rgba(16,185,129,0.15);color:#10b981>Active`), _tmpl$11 = /* @__PURE__ */ template(`<p class="text-xs mt-1"style=color:var(--error-color)>`), _tmpl$12 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border flex items-center justify-between gap-3"style="border:1px solid var(--border-color);background:var(--bg-tertiary)"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap"><p class="text-sm font-semibold"style=color:var(--text-primary)></p></div><p class=text-xs style=color:var(--text-secondary)>Provider: <!> • </p><p class="text-xs truncate"style=color:var(--text-muted)></p></div><div class="flex flex-col items-end gap-2"><div class="flex items-center gap-2 text-xs"style=color:var(--text-secondary)><span></span></div><button class="px-4 py-2 text-sm rounded-md font-semibold transition-all"style=font-weight:600>Switch`), _tmpl$13 = /* @__PURE__ */ template(`<p class=text-sm style=color:var(--text-muted)>Nothing detected yet. Try running auto-detect.`), _tmpl$14 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border flex items-center justify-between gap-3"style="border:1px solid var(--border-color)"><div><p class="text-sm font-semibold"style=color:var(--text-primary)></p><p class=text-xs style=color:var(--text-muted)></p><p class=text-xs style=color:var(--text-secondary)>Contexts: </p></div><button class="px-3 py-1.5 text-sm rounded-md transition-all hover:opacity-90">Connect`), _tmpl$15 = /* @__PURE__ */ template(`<option>`);
const providerOptions = [{
  id: "generic",
  label: "Generic / Other"
}, {
  id: "gke",
  label: "Google Kubernetes Engine (GKE)"
}, {
  id: "eks",
  label: "Amazon EKS"
}, {
  id: "aks",
  label: "Azure AKS"
}, {
  id: "kind",
  label: "kind (local)"
}, {
  id: "minikube",
  label: "Minikube"
}, {
  id: "k3s",
  label: "K3s / K3d"
}, {
  id: "docker-desktop",
  label: "Docker Desktop"
}];
const ClusterManager = () => {
  const [manualPath, setManualPath] = createSignal("");
  const [manualName, setManualName] = createSignal("");
  const [manualProvider, setManualProvider] = createSignal("generic");
  onMount(() => {
    refreshClusterData();
    refreshClusterStatus();
  });
  const hasActiveCluster = createMemo(() => {
    const managerStatus = clusterManagerStatus()?.connected;
    const status = clusterStatus().connected;
    return Boolean(managerStatus ?? status);
  });
  const handleSwitchContext = async (contextName) => {
    try {
      await switchContext(contextName);
      addNotification(`Switched to ${contextName}`, "success");
      refreshClusterData();
    } catch (err) {
      console.error("Failed to switch context", err);
      addNotification(err?.message || `Failed to switch to ${contextName}`, "error");
    }
  };
  const connectManual = async () => {
    if (!manualPath().trim()) {
      return;
    }
    await connectToCluster({
      name: manualName() || void 0,
      provider: manualProvider(),
      kubeconfigPath: manualPath()
    });
    setManualPath("");
    setManualName("");
  };
  return (() => {
    var _el$ = _tmpl$7(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild; _el$5.nextSibling; var _el$7 = _el$4.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$8.nextSibling, _el$1 = _el$0.nextSibling, _el$55 = _el$2.nextSibling, _el$56 = _el$55.firstChild, _el$57 = _el$56.firstChild, _el$58 = _el$57.firstChild, _el$59 = _el$58.firstChild; _el$59.nextSibling; var _el$62 = _el$57.nextSibling, _el$63 = _el$62.firstChild, _el$64 = _el$63.firstChild, _el$65 = _el$64.firstChild; _el$65.nextSibling; var _el$67 = _el$64.nextSibling, _el$69 = _el$56.nextSibling, _el$70 = _el$69.firstChild, _el$71 = _el$70.firstChild, _el$72 = _el$71.firstChild; _el$72.nextSibling; var _el$75 = _el$70.nextSibling, _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling, _el$78 = _el$77.firstChild, _el$79 = _el$78.nextSibling, _el$80 = _el$79.nextSibling, _el$81 = _el$80.nextSibling;
    insert(_el$8, () => hasActiveCluster() ? "Cluster Connected" : "Cluster Disconnected", null);
    _el$0.$$click = () => {
      sessionStorage.setItem("kubegraf-auto-filter", "local-cluster");
      sessionStorage.setItem("kubegraf-default-tab", "marketplace");
      setCurrentView("apps");
    };
    _el$1.$$click = () => refreshClusterData();
    insert(_el$7, createComponent(Show, {
      get when() {
        return hasActiveCluster();
      },
      get children() {
        var _el$10 = _tmpl$();
        _el$10.$$click = () => disconnectActiveCluster();
        createRenderEffect(() => _el$10.disabled = clusterLoading());
        return _el$10;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!hasActiveCluster())() && (discoveredClusters().length > 0 || clusters().length > 0);
      },
      get children() {
        var _el$11 = _tmpl$2(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild; _el$13.firstChild; var _el$15 = _el$13.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling;
        insert(_el$17, (() => {
          var _c$ = memo(() => !!(discoveredClusters().length > 0 && clusters().length > 0));
          return () => _c$() ? `Found ${discoveredClusters().length} discovered kubeconfig${discoveredClusters().length > 1 ? "s" : ""} and ${clusters().length} saved cluster${clusters().length > 1 ? "s" : ""}. Select one below to connect.` : memo(() => discoveredClusters().length > 0)() ? `Found ${discoveredClusters().length} kubeconfig${discoveredClusters().length > 1 ? "s" : ""}. Select one below to connect.` : `You have ${clusters().length} saved cluster${clusters().length > 1 ? "s" : ""}. Select one below to connect.`;
        })());
        return _el$11;
      }
    }), _el$55);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!hasActiveCluster() && discoveredClusters().length === 0 && clusters().length === 0))() && !clusterLoading();
      },
      get children() {
        var _el$18 = _tmpl$3(), _el$19 = _el$18.firstChild, _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild; _el$21.firstChild; var _el$23 = _el$21.nextSibling; _el$23.nextSibling; var _el$25 = _el$20.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.firstChild, _el$28 = _el$27.firstChild; _el$28.firstChild; _el$28.nextSibling; var _el$31 = _el$27.nextSibling, _el$32 = _el$31.nextSibling, _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild; _el$36.nextSibling; var _el$38 = _el$33.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$40.firstChild; _el$41.nextSibling; var _el$43 = _el$32.nextSibling, _el$44 = _el$26.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.firstChild; _el$46.firstChild; _el$46.nextSibling; var _el$49 = _el$45.nextSibling, _el$50 = _el$49.nextSibling, _el$51 = _el$50.nextSibling, _el$52 = _el$25.nextSibling, _el$53 = _el$52.firstChild; _el$53.nextSibling;
        _el$26.$$click = () => {
          alert('To connect to an existing cluster:\n\n1. Ensure your kubeconfig is set up (~/.kube/config)\n2. Verify access: kubectl cluster-info\n3. Click "Auto-detect" button above or refresh the page\n\nKubeGraf will automatically detect and connect to your cluster.');
        };
        _el$43.$$click = (e) => {
          e.stopPropagation();
          refreshClusterData();
        };
        _el$44.$$click = () => {
          sessionStorage.setItem("kubegraf-auto-filter", "local-cluster");
          sessionStorage.setItem("kubegraf-default-tab", "marketplace");
          setCurrentView("apps");
        };
        _el$51.$$click = (e) => {
          e.stopPropagation();
          sessionStorage.setItem("kubegraf-auto-filter", "local-cluster");
          sessionStorage.setItem("kubegraf-default-tab", "marketplace");
          setCurrentView("apps");
        };
        _el$53.$$click = () => refreshClusterData();
        return _el$18;
      }
    }), _el$55);
    insert(_el$56, createComponent(Show, {
      get when() {
        return clusters().length > 0;
      },
      get fallback() {
        return _tmpl$8();
      },
      get children() {
        var _el$61 = _tmpl$4();
        insert(_el$61, createComponent(For, {
          get each() {
            return clusters();
          },
          children: (cluster) => (() => {
            var _el$83 = _tmpl$0(), _el$84 = _el$83.firstChild, _el$85 = _el$84.firstChild, _el$86 = _el$85.firstChild, _el$87 = _el$86.firstChild, _el$89 = _el$86.nextSibling, _el$90 = _el$89.firstChild, _el$91 = _el$85.nextSibling, _el$92 = _el$91.firstChild, _el$93 = _el$92.nextSibling, _el$94 = _el$84.nextSibling, _el$95 = _el$94.firstChild, _el$96 = _el$95.nextSibling, _el$97 = _el$96.nextSibling;
            insert(_el$87, () => cluster.name);
            insert(_el$86, createComponent(Show, {
              get when() {
                return cluster.isDefault;
              },
              get children() {
                return _tmpl$9();
              }
            }), null);
            insert(_el$89, () => cluster.provider, _el$90);
            insert(_el$89, () => cluster.kubeconfigPath, null);
            insert(_el$93, () => cluster.connected ? "Connected" : "Disconnected");
            _el$95.$$click = () => {
              console.log("Connect button clicked:", cluster.name);
              connectToCluster({
                name: cluster.name,
                provider: cluster.provider,
                kubeconfigPath: cluster.kubeconfigPath
              });
            };
            _el$96.$$click = () => disconnectActiveCluster();
            _el$97.$$click = () => setDefaultCluster(cluster);
            createRenderEffect((_p$) => {
              var _v$6 = cluster.connected ? "var(--success-color)" : "var(--text-muted)", _v$7 = cluster.connected || clusterLoading() ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$8 = cluster.connected || clusterLoading() ? "var(--text-muted)" : "#000", _v$9 = cluster.connected || clusterLoading() ? "not-allowed" : "pointer", _v$0 = cluster.connected || clusterLoading() ? 0.5 : 1, _v$1 = cluster.connected || clusterLoading(), _v$10 = !cluster.connected || clusterLoading() ? "not-allowed" : "pointer", _v$11 = !cluster.connected || clusterLoading() ? 0.5 : 1, _v$12 = !cluster.connected || clusterLoading(), _v$13 = cluster.isDefault || clusterLoading() ? "not-allowed" : "pointer", _v$14 = cluster.isDefault || clusterLoading() ? 0.5 : 1, _v$15 = cluster.isDefault || clusterLoading();
              _v$6 !== _p$.e && setStyleProperty(_el$92, "background", _p$.e = _v$6);
              _v$7 !== _p$.t && setStyleProperty(_el$95, "background", _p$.t = _v$7);
              _v$8 !== _p$.a && setStyleProperty(_el$95, "color", _p$.a = _v$8);
              _v$9 !== _p$.o && setStyleProperty(_el$95, "cursor", _p$.o = _v$9);
              _v$0 !== _p$.i && setStyleProperty(_el$95, "opacity", _p$.i = _v$0);
              _v$1 !== _p$.n && (_el$95.disabled = _p$.n = _v$1);
              _v$10 !== _p$.s && setStyleProperty(_el$96, "cursor", _p$.s = _v$10);
              _v$11 !== _p$.h && setStyleProperty(_el$96, "opacity", _p$.h = _v$11);
              _v$12 !== _p$.r && (_el$96.disabled = _p$.r = _v$12);
              _v$13 !== _p$.d && setStyleProperty(_el$97, "cursor", _p$.d = _v$13);
              _v$14 !== _p$.l && setStyleProperty(_el$97, "opacity", _p$.l = _v$14);
              _v$15 !== _p$.u && (_el$97.disabled = _p$.u = _v$15);
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
            return _el$83;
          })()
        }));
        return _el$61;
      }
    }), _el$62);
    _el$67.$$click = () => refreshClusterData();
    insert(_el$62, createComponent(Show, {
      get when() {
        return runtimeContexts().length > 0;
      },
      get fallback() {
        return _tmpl$1();
      },
      get children() {
        var _el$68 = _tmpl$5();
        insert(_el$68, createComponent(For, {
          get each() {
            return runtimeContexts();
          },
          children: (ctx) => (() => {
            var _el$99 = _tmpl$12(), _el$100 = _el$99.firstChild, _el$101 = _el$100.firstChild, _el$102 = _el$101.firstChild, _el$104 = _el$101.nextSibling, _el$105 = _el$104.firstChild, _el$107 = _el$105.nextSibling; _el$107.nextSibling; var _el$108 = _el$104.nextSibling, _el$110 = _el$100.nextSibling, _el$111 = _el$110.firstChild, _el$112 = _el$111.firstChild, _el$113 = _el$111.nextSibling;
            insert(_el$102, () => ctx.name);
            insert(_el$101, createComponent(Show, {
              get when() {
                return ctx.current;
              },
              get children() {
                return _tmpl$10();
              }
            }), null);
            insert(_el$104, () => ctx.provider || "generic", _el$107);
            insert(_el$104, (() => {
              var _c$2 = memo(() => !!ctx.serverVersion);
              return () => _c$2() ? `Kubernetes ${ctx.serverVersion}` : "version unknown";
            })(), null);
            insert(_el$108, () => ctx.kubeconfigPath);
            insert(_el$100, createComponent(Show, {
              get when() {
                return ctx.error;
              },
              get children() {
                var _el$109 = _tmpl$11();
                insert(_el$109, () => ctx.error);
                return _el$109;
              }
            }), null);
            insert(_el$111, () => ctx.connected ? "Reachable" : "Unavailable", null);
            _el$113.addEventListener("mouseleave", (e) => {
              if (!ctx.current && !clusterLoading()) {
                e.currentTarget.style.background = "var(--accent-primary)";
                e.currentTarget.style.borderColor = "var(--accent-primary)";
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(6, 182, 212, 0.2)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            });
            _el$113.addEventListener("mouseenter", (e) => {
              if (!ctx.current && !clusterLoading()) {
                e.currentTarget.style.background = "var(--accent-primary)";
                e.currentTarget.style.borderColor = "var(--accent-primary)";
                e.currentTarget.style.opacity = "0.9";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(6, 182, 212, 0.3)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            });
            _el$113.$$click = () => handleSwitchContext(ctx.name);
            createRenderEffect((_p$) => {
              var _v$16 = `w-2 h-2 rounded-full ${ctx.connected ? "bg-emerald-400" : "bg-red-500"}`, _v$17 = ctx.current ? "1px solid var(--border-color)" : "2px solid var(--accent-primary)", _v$18 = ctx.current ? "var(--bg-secondary)" : "var(--accent-primary)", _v$19 = ctx.current ? "var(--text-secondary)" : "#000000", _v$20 = ctx.current || clusterLoading() ? 0.6 : 1, _v$21 = ctx.current || clusterLoading() ? "not-allowed" : "pointer", _v$22 = ctx.current ? "none" : "0 2px 4px rgba(6, 182, 212, 0.2)", _v$23 = ctx.current || clusterLoading();
              _v$16 !== _p$.e && className(_el$112, _p$.e = _v$16);
              _v$17 !== _p$.t && setStyleProperty(_el$113, "border", _p$.t = _v$17);
              _v$18 !== _p$.a && setStyleProperty(_el$113, "background", _p$.a = _v$18);
              _v$19 !== _p$.o && setStyleProperty(_el$113, "color", _p$.o = _v$19);
              _v$20 !== _p$.i && setStyleProperty(_el$113, "opacity", _p$.i = _v$20);
              _v$21 !== _p$.n && setStyleProperty(_el$113, "cursor", _p$.n = _v$21);
              _v$22 !== _p$.s && setStyleProperty(_el$113, "box-shadow", _p$.s = _v$22);
              _v$23 !== _p$.h && (_el$113.disabled = _p$.h = _v$23);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0,
              n: void 0,
              s: void 0,
              h: void 0
            });
            return _el$99;
          })()
        }));
        return _el$68;
      }
    }), null);
    insert(_el$69, createComponent(Show, {
      get when() {
        return discoveredClusters().length > 0;
      },
      get fallback() {
        return _tmpl$13();
      },
      get children() {
        var _el$74 = _tmpl$6();
        insert(_el$74, createComponent(For, {
          get each() {
            return discoveredClusters();
          },
          children: (item) => (() => {
            var _el$115 = _tmpl$14(), _el$116 = _el$115.firstChild, _el$117 = _el$116.firstChild, _el$118 = _el$117.nextSibling, _el$119 = _el$118.nextSibling; _el$119.firstChild; var _el$121 = _el$116.nextSibling;
            insert(_el$117, () => item.name);
            insert(_el$118, () => item.path);
            insert(_el$119, () => item.contexts.join(", "), null);
            _el$121.$$click = () => {
              console.log("Connect button clicked (discovered):", item.name, item.path);
              connectToCluster({
                name: item.name,
                provider: item.provider,
                kubeconfigPath: item.path
              });
            };
            createRenderEffect((_p$) => {
              var _v$24 = clusterLoading() ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$25 = clusterLoading() ? "var(--text-muted)" : "#000", _v$26 = clusterLoading() ? "not-allowed" : "pointer", _v$27 = clusterLoading() ? 0.5 : 1, _v$28 = clusterLoading();
              _v$24 !== _p$.e && setStyleProperty(_el$121, "background", _p$.e = _v$24);
              _v$25 !== _p$.t && setStyleProperty(_el$121, "color", _p$.t = _v$25);
              _v$26 !== _p$.a && setStyleProperty(_el$121, "cursor", _p$.a = _v$26);
              _v$27 !== _p$.o && setStyleProperty(_el$121, "opacity", _p$.o = _v$27);
              _v$28 !== _p$.i && (_el$121.disabled = _p$.i = _v$28);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            return _el$115;
          })()
        }));
        return _el$74;
      }
    }), _el$75);
    _el$78.$$input = (e) => setManualName(e.currentTarget.value);
    _el$79.$$input = (e) => setManualPath(e.currentTarget.value);
    _el$80.$$input = (e) => setManualProvider(e.currentTarget.value);
    insert(_el$80, createComponent(For, {
      each: providerOptions,
      children: (option) => (() => {
        var _el$122 = _tmpl$15();
        insert(_el$122, () => option.label);
        createRenderEffect(() => _el$122.value = option.id);
        return _el$122;
      })()
    }));
    _el$81.$$click = connectManual;
    createRenderEffect((_p$) => {
      var _v$ = `px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${hasActiveCluster() ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`, _v$2 = `w-2 h-2 rounded-full ${hasActiveCluster() ? "bg-emerald-400" : "bg-red-400"}`, _v$3 = clusterLoading(), _v$4 = clusterLoading(), _v$5 = !manualPath().trim() || clusterLoading();
      _v$ !== _p$.e && className(_el$8, _p$.e = _v$);
      _v$2 !== _p$.t && className(_el$9, _p$.t = _v$2);
      _v$3 !== _p$.a && (_el$1.disabled = _p$.a = _v$3);
      _v$4 !== _p$.o && (_el$67.disabled = _p$.o = _v$4);
      _v$5 !== _p$.i && (_el$81.disabled = _p$.i = _v$5);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0
    });
    createRenderEffect(() => _el$78.value = manualName());
    createRenderEffect(() => _el$79.value = manualPath());
    createRenderEffect(() => _el$80.value = manualProvider());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { ClusterManager as default };
//# sourceMappingURL=ClusterManager-DzrvtZtT.js.map
