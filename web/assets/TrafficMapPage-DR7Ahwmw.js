import { j as createResource, k as api, P as namespace, n as createEffect, t as template, i as insert, d as createComponent, S as Show, m as memo, L as use, v as delegateEvents } from './index-B8I71-mz.js';
import { s as select, z as zoom, a as simulation, l as link, m as manyBody, b as center, d as collide, e as drag } from './zoom-Y-yTGFIv.js';

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-64"><div class=text-center><div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p style=color:var(--text-muted)>Loading traffic data...`), _tmpl$2 = /* @__PURE__ */ template(`<div class="rounded-lg border overflow-hidden"style=background:var(--bg-card);borderColor:var(--border-color);minHeight:600px><svg class="w-full h-full">`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center gap-6 p-4 rounded-lg"style=background:var(--bg-secondary)><div class="flex items-center gap-2"><div class="w-4 h-4 rounded-full"style=background:#06b6d4></div><span class=text-sm style=color:var(--text-secondary)>Services</span></div><div class="flex items-center gap-2"><div class="w-4 h-4 rounded-full"style=background:#3b82f6></div><span class=text-sm style=color:var(--text-secondary)>Deployments</span></div><div class="flex items-center gap-2"><div class="w-4 h-4 rounded-full"style=background:#ec4899></div><span class=text-sm style=color:var(--text-secondary)>Pods</span></div><div class="flex items-center gap-2"><svg class="w-4 h-4"style=color:#94a3b8><line x1=0 y1=0 x2=20 y2=0 stroke=currentColor stroke-width=2></line></svg><span class=text-sm style=color:var(--text-secondary)>Traffic Flow`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-64"><p style=color:var(--text-muted)>No services found in this namespace`), _tmpl$5 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between"><div><h2 class="text-xl font-bold"style=color:var(--text-primary)>Traffic Map</h2><p class=text-sm style=color:var(--text-secondary)>Service mesh traffic visualization • Services → Pods → Deployments</p></div><button class="px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-tertiary)]"style=background:var(--bg-secondary);color:var(--text-primary)>Reset Layout`);
const TrafficMap = () => {
  const [services] = createResource(() => namespace(), async (ns) => {
    const svcs = await api.getServices(ns === "_all" ? void 0 : ns);
    const pods = await api.getPods(ns === "_all" ? void 0 : ns);
    const deployments = await api.getDeployments(ns === "_all" ? void 0 : ns);
    return {
      services: svcs || [],
      pods: pods || [],
      deployments: deployments || []
    };
  });
  let svgRef;
  let containerRef;
  let simulation$1 = null;
  const setupVisualization = () => {
    if (!svgRef || !services() || !containerRef) return;
    const data = services();
    if (!data || data.services.length === 0) return;
    select(svgRef).selectAll("*").remove();
    if (simulation$1) simulation$1.stop();
    const width = containerRef.clientWidth || 1e3;
    const height = 600;
    const svg = select(svgRef).attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);
    const g = svg.append("g");
    const zoom$1 = zoom().scaleExtent([0.2, 4]).on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom$1);
    const nodes = data.services.map((svc) => ({
      id: `service-${svc.namespace}-${svc.name}`,
      name: svc.name,
      namespace: svc.namespace || "default",
      type: "service",
      status: "running",
      endpoints: svc.endpoints?.length || 0,
      x: Math.random() * width,
      y: Math.random() * height
    }));
    data.deployments.forEach((dep) => {
      nodes.push({
        id: `deployment-${dep.namespace}-${dep.name}`,
        name: dep.name,
        namespace: dep.namespace || "default",
        type: "deployment",
        status: dep.status || "unknown",
        x: Math.random() * width,
        y: Math.random() * height
      });
    });
    const links = [];
    data.services.forEach((svc) => {
      const svcId = `service-${svc.namespace}-${svc.name}`;
      if (svc.selectors) {
        data.pods.forEach((pod) => {
          if (pod.namespace === svc.namespace) {
            let matches = true;
            for (const [key, value] of Object.entries(svc.selectors)) {
              if (pod.labels?.[key] !== value) {
                matches = false;
                break;
              }
            }
            if (matches) {
              const podId = `pod-${pod.namespace}-${pod.name}`;
              if (!nodes.find((n) => n.id === podId)) {
                nodes.push({
                  id: podId,
                  name: pod.name,
                  namespace: pod.namespace,
                  type: "pod",
                  status: pod.status,
                  x: Math.random() * width,
                  y: Math.random() * height
                });
              }
              links.push({
                source: svcId,
                target: podId,
                protocol: "TCP",
                port: svc.ports?.[0]?.port || 80
              });
            }
          }
        });
      }
      data.deployments.forEach((dep) => {
        if (dep.namespace === svc.namespace && dep.labels) {
          let matches = true;
          if (svc.selectors) {
            for (const [key, value] of Object.entries(svc.selectors)) {
              if (dep.labels[key] !== value) {
                matches = false;
                break;
              }
            }
          }
          if (matches) {
            const depId = `deployment-${dep.namespace}-${dep.name}`;
            links.push({
              source: svcId,
              target: depId,
              protocol: "TCP"
            });
          }
        }
      });
    });
    simulation$1 = simulation(nodes).force("link", link(links).id((d) => d.id).distance(100)).force("charge", manyBody().strength(-300)).force("center", center(width / 2, height / 2)).force("collision", collide().radius(40));
    const link$1 = g.append("g").selectAll("line").data(links).enter().append("line").attr("stroke", "#94a3b8").attr("stroke-width", 2).attr("stroke-opacity", 0.6).attr("marker-end", "url(#arrowhead)");
    svg.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "0 -5 10 10").attr("refX", 25).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto").append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#94a3b8");
    const node = g.append("g").selectAll("g").data(nodes).enter().append("g").call(drag().on("start", (event, d) => {
      if (!event.active) simulation$1?.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }).on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    }).on("end", (event, d) => {
      if (!event.active) simulation$1?.alphaTarget(0);
      d.fx = void 0;
      d.fy = void 0;
    }));
    node.append("circle").attr("r", (d) => d.type === "service" ? 20 : d.type === "deployment" ? 15 : 12).attr("fill", (d) => {
      if (d.type === "service") return "#06b6d4";
      if (d.type === "deployment") return "#3b82f6";
      return "#ec4899";
    }).attr("stroke", "#fff").attr("stroke-width", 2);
    node.append("text").text((d) => d.name).attr("dx", (d) => d.type === "service" ? 25 : 20).attr("dy", 5).attr("font-size", "12px").attr("fill", "var(--text-primary)").style("pointer-events", "none");
    simulation$1.on("tick", () => {
      link$1.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y).attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  };
  createEffect(() => {
    if (services() && !services.loading) {
      setTimeout(() => setupVisualization(), 100);
    }
  });
  return (() => {
    var _el$ = _tmpl$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling;
    _el$6.$$click = () => setupVisualization();
    insert(_el$, createComponent(Show, {
      get when() {
        return services.loading;
      },
      get children() {
        var _el$7 = _tmpl$$1(), _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild; _el$9.nextSibling;
        return _el$7;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!services.loading)() && services();
      },
      get children() {
        return [(() => {
          var _el$1 = _tmpl$2(), _el$10 = _el$1.firstChild;
          var _ref$ = containerRef;
          typeof _ref$ === "function" ? use(_ref$, _el$1) : containerRef = _el$1;
          var _ref$2 = svgRef;
          typeof _ref$2 === "function" ? use(_ref$2, _el$10) : svgRef = _el$10;
          return _el$1;
        })(), (() => {
          var _el$11 = _tmpl$3(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild; _el$13.nextSibling; var _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild; _el$16.nextSibling; var _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild; _el$19.nextSibling; var _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild; _el$22.nextSibling;
          return _el$11;
        })()];
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!services.loading && services()))() && services().services.length === 0;
      },
      get children() {
        var _el$24 = _tmpl$4(); _el$24.firstChild;
        return _el$24;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<div class="h-full flex flex-col"><div class="flex items-center justify-between mb-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Service Mesh Traffic Map</h1><p style=color:var(--text-secondary)>Live traffic visualization powered by Kiali • Real-time metrics from Istio service mesh</p></div></div><div class=flex-1>`);
const TrafficMapPage = () => {
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$2.nextSibling;
    insert(_el$6, createComponent(TrafficMap, {}));
    return _el$;
  })();
};

export { TrafficMapPage as default };
//# sourceMappingURL=TrafficMapPage-DR7Ahwmw.js.map
