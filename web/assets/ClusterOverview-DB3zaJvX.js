import { o as onMount, w as clusterStatus, x as refetchPods, y as refetchDeployments, z as refetchServices, A as refetchNodes, n as createEffect, B as podsResource, C as deploymentsResource, D as servicesResource, p as nodesResource, a as createMemo, t as template, i as insert, d as createComponent, f as createRenderEffect, g as className, s as setCurrentView, S as Show, v as delegateEvents } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class=p-6><div class=mb-6><h1 class="text-2xl font-bold mb-1">Cluster Overview</h1><p class="text-sm opacity-70">`), _tmpl$2 = /* @__PURE__ */ template(`<div class="text-center py-12"><p class="text-sm opacity-70">No cluster connected`), _tmpl$3 = /* @__PURE__ */ template(`<div class="text-center py-12"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div><p class="mt-4 text-sm opacity-70">Loading cluster metrics...`), _tmpl$4 = /* @__PURE__ */ template(`<div><div class="flex items-center justify-between"><div><h2 class="text-lg font-semibold mb-1">Cluster Health Score</h2><p class="text-sm opacity-70">Overall cluster health indicator</p></div><div class=text-right><div>%</div><div class="text-xs opacity-70 mt-1">Health`), _tmpl$5 = /* @__PURE__ */ template(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><div class="bg-white/5 rounded-lg p-4 border border-white/10"><div class="flex items-center justify-between mb-2"><h3 class="font-semibold text-sm">Pods</h3><svg class="w-5 h-5 opacity-70"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div><div class="text-2xl font-bold mb-1"></div><div class="text-xs opacity-70 space-y-1"><div class="flex justify-between"><span>Running:</span><span class=text-green-400></span></div><div class="flex justify-between"><span>Pending:</span><span class=text-yellow-400></span></div><div class="flex justify-between"><span>Failed:</span><span class=text-red-400></span></div></div></div><div class="bg-white/5 rounded-lg p-4 border border-white/10"><div class="flex items-center justify-between mb-2"><h3 class="font-semibold text-sm">Deployments</h3><svg class="w-5 h-5 opacity-70"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg></div><div class="text-2xl font-bold mb-1"></div><div class="text-xs opacity-70 space-y-1"><div class="flex justify-between"><span>Ready:</span><span class=text-green-400></span></div><div class="flex justify-between"><span>Not Ready:</span><span class=text-red-400></span></div></div></div><div class="bg-white/5 rounded-lg p-4 border border-white/10"><div class="flex items-center justify-between mb-2"><h3 class="font-semibold text-sm">Services</h3><svg class="w-5 h-5 opacity-70"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg></div><div class="text-2xl font-bold mb-1"></div><div class="text-xs opacity-70">Total services</div></div><div class="bg-white/5 rounded-lg p-4 border border-white/10"><div class="flex items-center justify-between mb-2"><h3 class="font-semibold text-sm">Nodes</h3><svg class="w-5 h-5 opacity-70"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg></div><div class="text-2xl font-bold mb-1"></div><div class="text-xs opacity-70 space-y-1"><div class="flex justify-between"><span>Ready:</span><span class=text-green-400></span></div><div class="flex justify-between"><span>Not Ready:</span><span class=text-red-400>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="bg-white/5 rounded-lg p-4 border border-white/10"><h3 class="font-semibold mb-3">Quick Actions</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-2"><button class="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded text-sm text-center transition-colors cursor-pointer">View Pods</button><button class="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded text-sm text-center transition-colors cursor-pointer">View Deployments</button><button class="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded text-sm text-center transition-colors cursor-pointer">View Services</button><button class="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded text-sm text-center transition-colors cursor-pointer">View Nodes`);
const ClusterOverview = () => {
  onMount(() => {
    console.log("[ClusterOverview] Component mounted, cluster connected:", clusterStatus().connected);
    setTimeout(() => {
      console.log("[ClusterOverview] onMount: Refetching all resources");
      refetchPods();
      refetchDeployments();
      refetchServices();
      refetchNodes();
    }, 100);
    setTimeout(() => {
      if (clusterStatus().connected) {
        console.log("[ClusterOverview] onMount (delayed): Refetching all resources again");
        refetchPods();
        refetchDeployments();
        refetchServices();
        refetchNodes();
      }
    }, 1e3);
  });
  createEffect(() => {
    const connected = clusterStatus().connected;
    if (connected) {
      console.log("[ClusterOverview] Cluster connected, refetching resources");
      setTimeout(() => {
        if (clusterStatus().connected) {
          console.log("[ClusterOverview] Refetching pods, deployments, services, nodes");
          refetchPods();
          refetchDeployments();
          refetchServices();
          refetchNodes();
        }
      }, 500);
    }
  });
  createEffect(() => {
    const pods = podsResource();
    const deployments = deploymentsResource();
    const services = servicesResource();
    const nodes = nodesResource();
    console.log("[ClusterOverview] Resource states:", {
      podsLoading: podsResource.loading,
      podsError: podsResource.error,
      podsData: pods?.length || 0,
      podsSample: pods?.slice(0, 2).map((p) => ({
        name: p.name,
        namespace: p.namespace,
        status: p.status
      })) || [],
      deploymentsLoading: deploymentsResource.loading,
      deploymentsError: deploymentsResource.error,
      deploymentsData: deployments?.length || 0,
      servicesLoading: servicesResource.loading,
      servicesData: services?.length || 0,
      nodesLoading: nodesResource.loading,
      nodesData: nodes?.length || 0,
      connected: clusterStatus().connected
    });
    if (podsResource.error) {
      console.error("[ClusterOverview] Pods fetch error:", podsResource.error);
    }
    if (deploymentsResource.error) {
      console.error("[ClusterOverview] Deployments fetch error:", deploymentsResource.error);
    }
  });
  const clusterMetrics = createMemo(() => {
    const pods = podsResource() || [];
    const deployments = deploymentsResource() || [];
    const services = servicesResource() || [];
    const nodes = nodesResource() || [];
    const podStats = {
      total: pods.length,
      running: pods.filter((p) => p.status === "Running").length,
      pending: pods.filter((p) => p.status === "Pending").length,
      failed: pods.filter((p) => p.status === "Failed" || p.status === "Error").length
    };
    const deploymentStats = {
      total: deployments.length,
      ready: deployments.filter((d) => {
        if (!d.ready) return 0;
        const [ready, total] = String(d.ready).split("/").map(Number);
        return ready === total && total > 0;
      }).length,
      notReady: deployments.filter((d) => {
        if (!d.ready) return 0;
        const [ready, total] = String(d.ready).split("/").map(Number);
        return ready !== total || total === 0;
      }).length
    };
    const nodeStats = {
      total: nodes.length,
      ready: nodes.filter((n) => n.status === "Ready").length,
      notReady: nodes.filter((n) => n.status !== "Ready").length
    };
    return {
      pods: podStats,
      deployments: deploymentStats,
      services: {
        total: services.length
      },
      nodes: nodeStats
    };
  });
  const healthScore = createMemo(() => {
    const metrics = clusterMetrics();
    if (!metrics) return 0;
    let score = 0;
    let total = 0;
    if (metrics.pods.total > 0) {
      const podHealth = metrics.pods.running / metrics.pods.total * 100;
      score += podHealth * 0.4;
      total += 0.4;
    }
    if (metrics.deployments.total > 0) {
      const depHealth = metrics.deployments.ready / metrics.deployments.total * 100;
      score += depHealth * 0.3;
      total += 0.3;
    }
    if (metrics.nodes.total > 0) {
      const nodeHealth = metrics.nodes.ready / metrics.nodes.total * 100;
      score += nodeHealth * 0.3;
      total += 0.3;
    }
    return total > 0 ? Math.round(score / total) : 0;
  });
  const getHealthColor = (score) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };
  const getHealthBgColor = (score) => {
    if (score >= 90) return "bg-green-500/20 border-green-500/50";
    if (score >= 70) return "bg-yellow-500/20 border-yellow-500/50";
    return "bg-red-500/20 border-red-500/50";
  };
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling;
    insert(_el$4, () => clusterStatus().connected ? "Real-time cluster health and resource summary" : "Connect to a cluster to see overview");
    insert(_el$, createComponent(Show, {
      get when() {
        return clusterStatus().connected;
      },
      get fallback() {
        return _tmpl$2();
      },
      get children() {
        return (() => {
          const isLoading = podsResource.loading || deploymentsResource.loading || servicesResource.loading || nodesResource.loading;
          const metrics = clusterMetrics();
          if (isLoading || !metrics) {
            return _tmpl$3();
          }
          const score = healthScore();
          return [(() => {
            var _el$7 = _tmpl$4(), _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild;
            insert(_el$1, score, _el$10);
            createRenderEffect((_p$) => {
              var _v$ = `mb-6 p-6 rounded-lg border ${getHealthBgColor(score)}`, _v$2 = `text-4xl font-bold ${getHealthColor(score)}`;
              _v$ !== _p$.e && className(_el$7, _p$.e = _v$);
              _v$2 !== _p$.t && className(_el$1, _p$.t = _v$2);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$7;
          })(), (() => {
            var _el$11 = _tmpl$5(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$14.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling, _el$25 = _el$12.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$27.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.nextSibling, _el$32 = _el$29.nextSibling, _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling, _el$35 = _el$25.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling, _el$38 = _el$35.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$40.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.firstChild, _el$44 = _el$43.nextSibling, _el$45 = _el$42.nextSibling, _el$46 = _el$45.firstChild, _el$47 = _el$46.nextSibling;
            insert(_el$14, () => metrics.pods.total);
            insert(_el$18, () => metrics.pods.running);
            insert(_el$21, () => metrics.pods.pending);
            insert(_el$24, () => metrics.pods.failed);
            insert(_el$27, () => metrics.deployments.total);
            insert(_el$31, () => metrics.deployments.ready);
            insert(_el$34, () => metrics.deployments.notReady);
            insert(_el$37, () => metrics.services.total);
            insert(_el$40, () => metrics.nodes.total);
            insert(_el$44, () => metrics.nodes.ready);
            insert(_el$47, () => metrics.nodes.notReady);
            return _el$11;
          })(), (() => {
            var _el$48 = _tmpl$6(), _el$49 = _el$48.firstChild, _el$50 = _el$49.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling, _el$53 = _el$52.nextSibling, _el$54 = _el$53.nextSibling;
            _el$51.$$click = () => setCurrentView("pods");
            _el$52.$$click = () => setCurrentView("deployments");
            _el$53.$$click = () => setCurrentView("services");
            _el$54.$$click = () => setCurrentView("nodes");
            return _el$48;
          })()];
        })();
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

export { ClusterOverview as default };
//# sourceMappingURL=ClusterOverview-DB3zaJvX.js.map
