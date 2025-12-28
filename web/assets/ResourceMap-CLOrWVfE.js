import { a as createMemo, o as onMount, c as createSignal, n as createEffect, U as on, E as onCleanup, t as template, i as insert, d as createComponent, f as createRenderEffect, h as setStyleProperty, F as For, S as Show, m as memo, L as use, H as selectedNamespaces, M as Modal, N as setGlobalLoading, k as api, v as delegateEvents } from './index-NnaOo1cf.js';
import { c as createCachedResource } from './resourceCache-DgXvRxiF.js';
import { c as constant, s as select, z as zoom, a as simulation, l as link, m as manyBody, b as center, d as collide, e as drag, i as identity } from './zoom-Y-yTGFIv.js';

function x(x) {
  var strength = constant(0.1),
      nodes,
      strengths,
      xz;

  if (typeof x !== "function") x = constant(x == null ? 0 : +x);

  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    xz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.x = function(_) {
    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
  };

  return force;
}

function y(y) {
  var strength = constant(0.1),
      nodes,
      strengths,
      yz;

  if (typeof y !== "function") y = constant(y == null ? 0 : +y);

  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vy += (yz[i] - node.y) * strengths[i] * alpha;
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    yz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(yz[i] = +y(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.y = function(_) {
    return arguments.length ? (y = typeof _ === "function" ? _ : constant(+_), initialize(), force) : y;
  };

  return force;
}

var _tmpl$ = /* @__PURE__ */ template(`<div class="card p-4 mb-4"style="background:var(--error-bg);border:1px solid var(--error-color)"><div class="flex items-center gap-2"><span style=color:var(--error-color)>❌</span><span style=color:var(--error-color)>Error loading topology: `), _tmpl$2 = /* @__PURE__ */ template(`<svg style=width:100%;height:100%;background:var(--bg-primary)>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="p-4 text-center text-sm rounded-lg"style=background:var(--bg-tertiary);color:var(--text-muted)>No connected resources`), _tmpl$4 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center gap-4 p-4 rounded-lg"><div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"></div><div><div class="font-bold text-lg"style=color:var(--text-primary)></div><div class="flex items-center gap-2 mt-1"><span class="px-2 py-0.5 rounded text-xs font-medium uppercase"style=color:white></span><span class=text-sm style=color:var(--text-muted)>in </span></div></div></div><div><h4 class="font-semibold mb-3 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>Connected Resources (<!>)</h4><div class="grid gap-2 max-h-64 overflow-auto">`), _tmpl$5 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Resource Map</h1><p style=color:var(--text-secondary)>D3.js force-directed graph • Drag nodes • Scroll to zoom • Hover to highlight</p></div><div class="flex items-center gap-3"><button class=icon-btn title=Refresh style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button><button class="px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-tertiary)]"style=background:var(--bg-secondary);color:var(--text-primary)>Reset Layout</button></div></div><div class="grid grid-cols-2 md:grid-cols-6 gap-3"><div class="card p-3 flex items-center gap-3"><div class="w-10 h-10 rounded-lg flex items-center justify-center"style=background:var(--bg-tertiary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></div><div><div class="text-xl font-bold"style=color:var(--accent-primary)></div><div class=text-xs style=color:var(--text-muted)>Connections</div></div></div></div><div class="card overflow-hidden relative"style=height:650px><div class="absolute bottom-4 left-4 p-3 rounded-lg text-xs"style="background:var(--bg-secondary);border:1px solid var(--border-color)"><div class="font-semibold mb-2"style=color:var(--text-primary)>Legend</div><div class="grid grid-cols-3 gap-x-4 gap-y-1"></div></div><div class="absolute bottom-4 right-4 px-3 py-2 rounded-lg text-xs"style=background:var(--bg-secondary);color:var(--text-muted)>🖱️ Drag nodes • Scroll to zoom • Click for details`), _tmpl$6 = /* @__PURE__ */ template(`<div class="card p-3 flex items-center gap-3"><div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"></div><div><div class="text-xl font-bold"></div><div class="text-xs capitalize"style=color:var(--text-muted)>s`), _tmpl$7 = /* @__PURE__ */ template(`<div class="h-full flex items-center justify-center"><div class=spinner>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="h-full flex items-center justify-center flex-col gap-4"style=color:var(--text-muted)><svg class="w-20 h-20 opacity-30"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=1.5 d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg><p class=text-lg>No resources found</p><p class=text-sm>`), _tmpl$9 = /* @__PURE__ */ template(`<p class="text-xs opacity-70">The selected namespace(s) may not have any resources`), _tmpl$0 = /* @__PURE__ */ template(`<div class="flex items-center gap-1.5"><span></span><span class=capitalize style=color:var(--text-muted)>`), _tmpl$1 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform"style=background:var(--bg-tertiary)><div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"></div><div class="flex-1 min-w-0"><div class="font-medium truncate"style=color:var(--accent-primary)></div><div class="text-xs capitalize"style=color:var(--text-muted)></div></div><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-muted)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5l7 7-7 7">`);
const ResourceMap = () => {
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const topologyCache = createCachedResource("topology", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      console.log("[ResourceMap] Fetching topology with namespace:", namespaceParam);
      const topology2 = await api.getTopology(namespaceParam);
      console.log("[ResourceMap] Fetched topology:", topology2);
      console.log("[ResourceMap] Nodes count:", topology2?.nodes?.length || 0);
      console.log("[ResourceMap] Links count:", topology2?.links?.length || 0);
      return topology2;
    } catch (error) {
      console.error("[ResourceMap] Error fetching topology:", error);
      throw error;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const topology = createMemo(() => {
    const data = topologyCache.data();
    console.log("[ResourceMap] Current topology data from cache:", data);
    return data;
  });
  const refetch = () => topologyCache.refetch();
  onMount(() => {
    if (!topologyCache.data()) {
      topologyCache.refetch();
    }
  });
  const [selectedNode, setSelectedNode] = createSignal(null);
  const [showDetails, setShowDetails] = createSignal(false);
  let svgRef;
  let containerRef;
  let simulation$1 = null;
  const nodeColors = {
    node: "#22c55e",
    deployment: "#3b82f6",
    statefulset: "#8b5cf6",
    daemonset: "#f59e0b",
    service: "#06b6d4",
    pod: "#ec4899",
    configmap: "#84cc16",
    secret: "#ef4444",
    ingress: "#14b8a6",
    replicaset: "#6366f1",
    job: "#f97316",
    cronjob: "#a855f7"
  };
  const setupVisualization = () => {
    if (!svgRef || !topology()) return;
    const topo = topology();
    if (!topo?.nodes || topo.nodes.length === 0) return;
    select(svgRef).selectAll("*").remove();
    if (simulation$1) simulation$1.stop();
    const width = containerRef?.clientWidth || 1e3;
    const height = 650;
    const svg = select(svgRef).attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);
    const g = svg.append("g");
    const zoom$1 = zoom().scaleExtent([0.2, 4]).on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom$1);
    const nodes = topo.nodes.map((n) => ({
      ...n
    }));
    const links = topo.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value || 1
    }));
    simulation$1 = simulation(nodes).force("link", link(links).id((d) => d.id).distance(120).strength(0.5)).force("charge", manyBody().strength(-400)).force("center", center(width / 2, height / 2)).force("collision", collide().radius(60)).force("x", x(width / 2).strength(0.05)).force("y", y(height / 2).strength(0.05));
    const defs = svg.append("defs");
    defs.append("marker").attr("id", "arrowhead").attr("viewBox", "-0 -5 10 10").attr("refX", 25).attr("refY", 0).attr("orient", "auto").attr("markerWidth", 8).attr("markerHeight", 8).append("path").attr("d", "M 0,-5 L 10 ,0 L 0,5").attr("fill", "#06b6d4").style("opacity", 0.8);
    const gradient = defs.append("linearGradient").attr("id", "linkGradient").attr("gradientUnits", "userSpaceOnUse");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.6);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#8b5cf6").attr("stop-opacity", 0.6);
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    const link$1 = g.append("g").attr("class", "links").selectAll("path").data(links).join("path").attr("fill", "none").attr("stroke", "url(#linkGradient)").attr("stroke-width", 2).attr("stroke-opacity", 0.6).attr("marker-end", "url(#arrowhead)");
    const node = g.append("g").attr("class", "nodes").selectAll("g").data(nodes).join("g").attr("cursor", "pointer").call(drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));
    node.append("circle").attr("class", "node-ring").attr("r", 45).attr("fill", (d) => nodeColors[d.type] || "#6b7280").attr("fill-opacity", 0).attr("stroke", (d) => nodeColors[d.type] || "#6b7280").attr("stroke-width", 0).attr("stroke-dasharray", "4 4");
    node.append("circle").attr("class", "node-circle").attr("r", 32).attr("fill", (d) => `${nodeColors[d.type] || "#6b7280"}20`).attr("stroke", (d) => nodeColors[d.type] || "#6b7280").attr("stroke-width", 2.5);
    node.append("circle").attr("r", 22).attr("fill", (d) => `${nodeColors[d.type] || "#6b7280"}30`);
    const emojiIcons2 = {
      node: "🖥️",
      deployment: "📦",
      statefulset: "🗄️",
      daemonset: "👹",
      service: "🌐",
      pod: "🫛",
      configmap: "⚙️",
      secret: "🔐",
      ingress: "🚪",
      replicaset: "📋",
      job: "⚡",
      cronjob: "⏰"
    };
    node.append("text").attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", "20px").text((d) => emojiIcons2[d.type] || "❓");
    node.append("text").attr("class", "node-label").attr("text-anchor", "middle").attr("dy", 48).attr("font-size", "10px").attr("fill", "var(--text-primary)").attr("font-weight", "500").text((d) => d.name.length > 18 ? d.name.slice(0, 15) + "..." : d.name);
    node.append("rect").attr("x", -20).attr("y", 55).attr("width", 40).attr("height", 14).attr("rx", 7).attr("fill", (d) => nodeColors[d.type] || "#6b7280").attr("fill-opacity", 0.9);
    node.append("text").attr("text-anchor", "middle").attr("y", 65).attr("font-size", "8px").attr("fill", "white").attr("font-weight", "600").text((d) => d.type.toUpperCase().slice(0, 6));
    node.on("mouseenter", function(event, d) {
      select(this).select(".node-circle").attr("filter", "url(#glow)").attr("stroke-width", 3.5);
      select(this).select(".node-ring").attr("fill-opacity", 0.1).attr("stroke-width", 2);
      link$1.attr("stroke-opacity", (l) => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        return src === d.id || tgt === d.id ? 1 : 0.1;
      }).attr("stroke-width", (l) => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        return src === d.id || tgt === d.id ? 3 : 1;
      });
      const connectedIds = /* @__PURE__ */ new Set();
      connectedIds.add(d.id);
      links.forEach((l) => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        if (src === d.id) connectedIds.add(tgt);
        if (tgt === d.id) connectedIds.add(src);
      });
      node.attr("opacity", (n) => connectedIds.has(n.id) ? 1 : 0.3);
    }).on("mouseleave", function() {
      select(this).select(".node-circle").attr("filter", null).attr("stroke-width", 2.5);
      select(this).select(".node-ring").attr("fill-opacity", 0).attr("stroke-width", 0);
      link$1.attr("stroke-opacity", 0.6).attr("stroke-width", 2);
      node.attr("opacity", 1);
    });
    let wasDragged = false;
    function dragstarted(event) {
      wasDragged = false;
      if (!event.active) simulation$1?.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      wasDragged = true;
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) simulation$1?.alphaTarget(0);
    }
    node.on("click", function(event, d) {
      if (wasDragged) {
        wasDragged = false;
        return;
      }
      event.stopPropagation();
      setSelectedNode(d);
      setShowDetails(true);
    });
    simulation$1.on("tick", () => {
      link$1.attr("d", (d) => {
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;
        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
    const initialTransform = identity.translate(0, 0).scale(0.9);
    svg.call(zoom$1.transform, initialTransform);
  };
  const getConnectedNodes = (nodeId) => {
    const topo = topology();
    if (!topo?.links) return [];
    const connected = [];
    const nodeMap = new Map(topo.nodes.map((n) => [n.id, n]));
    topo.links.forEach((link) => {
      if (link.source === nodeId || typeof link.source === "object" && link.source.id === nodeId) {
        const targetId = typeof link.target === "object" ? link.target.id : link.target;
        const targetNode = nodeMap.get(targetId);
        if (targetNode) connected.push(targetNode);
      }
      if (link.target === nodeId || typeof link.target === "object" && link.target.id === nodeId) {
        const sourceId = typeof link.source === "object" ? link.source.id : link.source;
        const sourceNode = nodeMap.get(sourceId);
        if (sourceNode) connected.push(sourceNode);
      }
    });
    return connected;
  };
  let isSetupInProgress = false;
  let lastTopologyData = null;
  createEffect(on(() => [topology(), svgRef], () => {
    if (svgRef && topology() && !isSetupInProgress) {
      const currentData = JSON.stringify(topology());
      if (currentData === lastTopologyData) {
        console.log("[ResourceMap] Topology data unchanged, skipping setup");
        return;
      }
      console.log("[ResourceMap] Topology data changed, setting up visualization");
      lastTopologyData = currentData;
      isSetupInProgress = true;
      requestAnimationFrame(() => {
        setupVisualization();
        setTimeout(() => {
          isSetupInProgress = false;
        }, 1e3);
      });
    }
  }));
  onMount(() => {
    const handleResize = () => setupVisualization();
    window.addEventListener("resize", handleResize);
    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
      if (simulation$1) simulation$1.stop();
    });
  });
  const getStats = () => {
    const topo = topology();
    if (!topo?.nodes) return {};
    return topo.nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
  };
  const emojiIcons = {
    node: "🖥️",
    deployment: "📦",
    statefulset: "🗄️",
    daemonset: "👹",
    service: "🌐",
    pod: "🫛",
    configmap: "⚙️",
    secret: "🔐",
    ingress: "🚪",
    replicaset: "📋",
    job: "⚡",
    cronjob: "⏰"
  };
  return (() => {
    var _el$ = _tmpl$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$2.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild; _el$1.firstChild; var _el$11 = _el$1.nextSibling, _el$12 = _el$11.firstChild; _el$12.nextSibling; var _el$19 = _el$9.nextSibling, _el$21 = _el$19.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling; _el$21.nextSibling;
    _el$7.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetch();
    };
    _el$8.$$click = () => setupVisualization();
    insert(_el$9, createComponent(For, {
      get each() {
        return Object.entries(getStats());
      },
      children: ([type, count]) => (() => {
        var _el$42 = _tmpl$6(), _el$43 = _el$42.firstChild, _el$44 = _el$43.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$46.firstChild;
        insert(_el$43, () => emojiIcons[type] || "❓");
        insert(_el$45, count);
        insert(_el$46, type, _el$47);
        createRenderEffect((_p$) => {
          var _v$4 = `${nodeColors[type]}20`, _v$5 = nodeColors[type], _v$6 = nodeColors[type];
          _v$4 !== _p$.e && setStyleProperty(_el$43, "background", _p$.e = _v$4);
          _v$5 !== _p$.t && setStyleProperty(_el$43, "color", _p$.t = _v$5);
          _v$6 !== _p$.a && setStyleProperty(_el$45, "color", _p$.a = _v$6);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$42;
      })()
    }), _el$0);
    insert(_el$12, () => (topology()?.links || []).length);
    insert(_el$, createComponent(Show, {
      get when() {
        return topologyCache.error();
      },
      get children() {
        var _el$14 = _tmpl$(), _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling; _el$17.firstChild;
        insert(_el$17, () => topologyCache.error()?.message || "Unknown error", null);
        return _el$14;
      }
    }), _el$19);
    var _ref$ = containerRef;
    typeof _ref$ === "function" ? use(_ref$, _el$19) : containerRef = _el$19;
    insert(_el$19, createComponent(Show, {
      get when() {
        return !topologyCache.loading() || topologyCache.data() !== void 0;
      },
      get fallback() {
        return _tmpl$7();
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!(topology() && topology()?.nodes))() && topology()?.nodes?.length > 0;
          },
          get fallback() {
            return (() => {
              var _el$49 = _tmpl$8(), _el$50 = _el$49.firstChild, _el$51 = _el$50.nextSibling, _el$52 = _el$51.nextSibling;
              insert(_el$52, (() => {
                var _c$ = memo(() => !!topologyCache.error());
                return () => _c$() ? "Error loading topology data" : topology() ? "Select a namespace with deployments and services" : "Loading topology data...";
              })());
              insert(_el$49, (() => {
                var _c$2 = memo(() => !!(topology() && topology()?.nodes && topology()?.nodes?.length === 0));
                return () => _c$2() && _tmpl$9();
              })(), null);
              return _el$49;
            })();
          },
          get children() {
            var _el$20 = _tmpl$2();
            var _ref$2 = svgRef;
            typeof _ref$2 === "function" ? use(_ref$2, _el$20) : svgRef = _el$20;
            return _el$20;
          }
        });
      }
    }), _el$21);
    insert(_el$23, createComponent(For, {
      get each() {
        return Object.entries(emojiIcons).slice(0, 6);
      },
      children: ([type, icon]) => (() => {
        var _el$54 = _tmpl$0(), _el$55 = _el$54.firstChild, _el$56 = _el$55.nextSibling;
        insert(_el$55, icon);
        insert(_el$56, type);
        return _el$54;
      })()
    }));
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => setShowDetails(false),
      get title() {
        return `${selectedNode()?.type}: ${selectedNode()?.name}`;
      },
      size: "lg",
      get children() {
        return createComponent(Show, {
          get when() {
            return selectedNode();
          },
          get children() {
            var _el$25 = _tmpl$4(), _el$26 = _el$25.firstChild, _el$27 = _el$26.firstChild, _el$28 = _el$27.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling; _el$32.firstChild; var _el$34 = _el$26.nextSibling, _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling, _el$39 = _el$37.nextSibling; _el$39.nextSibling; var _el$40 = _el$35.nextSibling;
            insert(_el$27, () => emojiIcons[selectedNode().type] || "❓");
            insert(_el$29, () => selectedNode().name);
            insert(_el$31, () => selectedNode().type);
            insert(_el$32, () => selectedNode().namespace || (selectedNamespaces().length === 0 ? "all namespaces" : selectedNamespaces().join(", ")), null);
            insert(_el$35, () => getConnectedNodes(selectedNode().id).length, _el$39);
            insert(_el$40, createComponent(For, {
              get each() {
                return getConnectedNodes(selectedNode().id);
              },
              children: (connectedNode) => (() => {
                var _el$57 = _tmpl$1(), _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling; _el$59.nextSibling;
                _el$57.$$click = () => setSelectedNode(connectedNode);
                insert(_el$58, () => emojiIcons[connectedNode.type] || "❓");
                insert(_el$60, () => connectedNode.name);
                insert(_el$61, () => connectedNode.type);
                createRenderEffect((_$p) => setStyleProperty(_el$58, "background", `${nodeColors[connectedNode.type]}20`));
                return _el$57;
              })()
            }), null);
            insert(_el$40, createComponent(Show, {
              get when() {
                return getConnectedNodes(selectedNode().id).length === 0;
              },
              get children() {
                return _tmpl$3();
              }
            }), null);
            createRenderEffect((_p$) => {
              var _v$ = `${nodeColors[selectedNode().type]}15`, _v$2 = `${nodeColors[selectedNode().type]}25`, _v$3 = nodeColors[selectedNode().type];
              _v$ !== _p$.e && setStyleProperty(_el$26, "background", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$27, "background", _p$.t = _v$2);
              _v$3 !== _p$.a && setStyleProperty(_el$31, "background", _p$.a = _v$3);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0
            });
            return _el$25;
          }
        });
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

export { ResourceMap as default };
//# sourceMappingURL=ResourceMap-CLOrWVfE.js.map
