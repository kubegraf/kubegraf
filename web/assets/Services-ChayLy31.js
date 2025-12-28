import { c as createSignal, n as createEffect, d as createComponent, S as Show, t as template, i as insert, u as addEventListener, f as createRenderEffect, M as Modal, v as delegateEvents, F as For, k as api, G as addNotification, m as memo, a as createMemo, j as createResource, o as onMount, J as searchQuery, K as setSearchQuery, h as setStyleProperty, g as className, e as setAttribute, N as setGlobalLoading, w as clusterStatus, O as startExecution, H as selectedNamespaces } from './index-Bh-O-sIc.js';
import { c as createCachedResource } from './resourceCache-DXA8Kj29.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-CU5t99BZ.js';
import { Y as YAMLViewer } from './YAMLViewer-CNUTWpkV.js';
import { Y as YAMLEditor } from './YAMLEditor-Cvfm5wCJ.js';
import { C as CommandPreview } from './CommandPreview-C6bYxIqz.js';
import { D as DescribeModal } from './DescribeModal-6Ip9Wbf-.js';
import { C as ConfirmationModal } from './ConfirmationModal-CGGyzH3M.js';
import { A as ActionMenu } from './ActionMenu-BVo-8BTq.js';
import { L as LoadingSpinner } from './LoadingSpinner-CmW4_c8t.js';
import { u as useBulkSelection, B as BulkActions, S as SelectAllCheckbox, a as SelectionCheckbox, b as BulkDeleteModal } from './useBulkSelection-BCNQqaHy.js';

var _tmpl$$3 = /* @__PURE__ */ template(`<div class=space-y-3><div class="text-sm mb-2"style=color:var(--text-primary)>Port Forwarding for <span class=font-semibold></span></div><div><label class="block text-sm mb-1.5"style=color:var(--text-secondary)>Local port to forward from:</label><div class="flex items-center gap-2"><input type=number min=1024 max=65535 class="flex-1 px-3 py-2 rounded text-sm"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><button class="px-3 py-2 rounded text-xs"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">Random</button></div></div><div class="flex items-center gap-2"><input type=checkbox id=openInBrowser class="w-4 h-4 rounded"style=accentColor:var(--accent-primary)><label for=openInBrowser class="text-sm cursor-pointer"style=color:var(--text-primary)>Open in Browser</label></div><div class="text-xs px-2 py-1.5 rounded text-center"style=background:var(--bg-tertiary);color:var(--text-muted)><span class="font-mono text-blue-400">localhost:</span> → <span class="font-mono text-green-400">:</span></div><div class="flex gap-3 pt-1"><button class="btn-secondary flex-1 px-4 py-2 text-sm">Cancel</button><button class="btn-primary flex-1 px-4 py-2 text-sm">Start`);
const ServicePortForwardModal = (props) => {
  const [localPort, setLocalPort] = createSignal(0);
  const [openInBrowser, setOpenInBrowser] = createSignal(true);
  createEffect(() => {
    if (props.isOpen && props.port) {
      const randomPort = Math.floor(Math.random() * 1e3) + 8e3;
      setLocalPort(randomPort);
    }
  });
  const handleStart = () => {
    if (!props.port) return;
    const remotePort2 = typeof props.port.targetPort === "number" ? props.port.targetPort : props.port.port;
    props.onStart(localPort(), remotePort2, openInBrowser());
  };
  const port = () => props.port;
  const remotePort = () => {
    const p = port();
    if (!p) return 0;
    return typeof p.targetPort === "number" ? p.targetPort : p.port;
  };
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    get onClose() {
      return props.onClose;
    },
    title: "Port Forwarding",
    size: "xs",
    get children() {
      return createComponent(Show, {
        get when() {
          return port();
        },
        get children() {
          var _el$ = _tmpl$$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$2.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$0 = _el$5.nextSibling, _el$1 = _el$0.firstChild; _el$1.nextSibling; var _el$11 = _el$0.nextSibling, _el$12 = _el$11.firstChild; _el$12.firstChild; var _el$14 = _el$12.nextSibling, _el$15 = _el$14.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$11.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling;
          insert(_el$4, () => props.serviceName);
          _el$8.$$input = (e) => setLocalPort(parseInt(e.currentTarget.value) || 8080);
          _el$9.$$click = () => setLocalPort(Math.floor(Math.random() * 1e3) + 8e3);
          _el$1.addEventListener("change", (e) => setOpenInBrowser(e.currentTarget.checked));
          insert(_el$12, localPort, null);
          insert(_el$15, () => props.serviceName, _el$16);
          insert(_el$15, remotePort, null);
          addEventListener(_el$18, "click", props.onClose, true);
          _el$19.$$click = handleStart;
          createRenderEffect(() => _el$8.value = localPort());
          createRenderEffect(() => _el$1.checked = openInBrowser());
          return _el$;
        }
      });
    }
  });
};
delegateEvents(["input", "click"]);

var _tmpl$$2 = /* @__PURE__ */ template(`<div class=space-y-2>`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border"style=border-color:var(--border-color);background:var(--bg-secondary)><div class=flex-1><div class="text-sm font-medium"style=color:var(--text-primary)></div><div class="text-xs font-mono"style=color:var(--text-muted)></div></div><button class="px-4 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-80"style=background:var(--accent-primary);color:white>Forward`);
const ServicePortsList = (props) => {
  const formatPort = (port) => {
    let portStr = `${port.port}`;
    if (typeof port.targetPort === "number" && port.targetPort !== port.port) {
      portStr += `:${port.targetPort}`;
    } else if (typeof port.targetPort === "string") {
      portStr += `:${port.targetPort}`;
    }
    if (port.nodePort && port.nodePort > 0) {
      portStr += `:${port.nodePort}`;
    }
    portStr += `/${port.protocol}`;
    return portStr;
  };
  return (() => {
    var _el$ = _tmpl$$2();
    insert(_el$, createComponent(For, {
      get each() {
        return props.ports;
      },
      children: (port) => (() => {
        var _el$2 = _tmpl$2$2(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$3.nextSibling;
        insert(_el$4, () => port.name || `Port ${port.port}`);
        insert(_el$5, () => formatPort(port));
        _el$6.$$click = () => props.onForward(port);
        return _el$2;
      })()
    }));
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="fixed inset-0 z-50 flex"><div class="flex-1 bg-black/50"></div><div class="w-[600px] overflow-y-auto"style="background:var(--bg-primary);borderLeft:1px solid var(--border-color);boxShadow:-4px 0 12px rgba(0, 0, 0, 0.15)"><div class="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"style=background:var(--bg-primary);border-color:var(--border-color)><div><h2 class="text-lg font-semibold"style=color:var(--text-primary)>Describe: </h2></div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm font-medium transition-colors hover:opacity-80"title=Copy style=background:var(--bg-secondary);color:var(--text-primary)>Copy</button><button class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"style=color:var(--text-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12"></path></svg></button></div></div><div class="flex-1 overflow-y-auto p-6 space-y-8"style="scrollbar-width:thin;scrollbar-color:var(--border-color) var(--bg-primary)">`), _tmpl$2$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-64"><div class=text-center><div class="inline-block w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4"style=borderColor:var(--accent-primary);borderTopColor:transparent></div><p style=color:var(--text-muted)>Loading service details...`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class=space-y-3><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Basic Information</h3><div class="space-y-2 font-mono text-sm"style=color:var(--text-primary);line-height:1.8><div><span class=font-semibold style=color:var(--text-primary)>Name:</span><span style=color:var(--text-secondary);marginLeft:8px></span></div><div><span class=font-semibold style=color:var(--text-primary)>Namespace:</span><span style=color:var(--text-secondary);marginLeft:8px>`), _tmpl$4$1 = /* @__PURE__ */ template(`<span style=color:var(--text-secondary);marginLeft:8px>`), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="mt-1 ml-4 break-all"style=color:var(--text-secondary)>`), _tmpl$6$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Labels & Annotations</h3><div class="space-y-2 font-mono text-sm"style=color:var(--text-primary);line-height:1.8><div><span class=font-semibold style=color:var(--text-primary)>Labels:</span></div><div><span class=font-semibold style=color:var(--text-primary)>Annotations:</span>`), _tmpl$7$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Selector</h3><div class="font-mono text-sm"style=color:var(--text-secondary);line-height:1.8>`), _tmpl$8$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Service Configuration</h3><div class="space-y-2 font-mono text-sm"style=color:var(--text-primary);line-height:1.8><div><span class=font-semibold style=color:var(--text-primary)>Type:</span><span style=color:var(--text-secondary);marginLeft:8px></span></div><div><span class=font-semibold style=color:var(--text-primary)>IP Family Policy:</span><span style=color:var(--text-secondary);marginLeft:8px></span></div><div><span class=font-semibold style=color:var(--text-primary)>IP Families:</span><span style=color:var(--text-secondary);marginLeft:8px></span></div><div><span class=font-semibold style=color:var(--text-primary)>Session Affinity:</span><span style=color:var(--text-secondary);marginLeft:8px>`), _tmpl$9$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Network Configuration</h3><div class="space-y-2 font-mono text-sm"style=color:var(--text-primary);line-height:1.8><div><span class=font-semibold style=color:var(--text-primary)>IP:</span><span style=color:var(--text-secondary);marginLeft:8px></span></div><div><span class=font-semibold style=color:var(--text-primary)>IPs:</span><span style=color:var(--text-secondary);marginLeft:8px>`), _tmpl$0$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Ports</h3><div class="space-y-3 font-mono text-sm"style=color:var(--text-primary);line-height:1.8>`), _tmpl$1$1 = /* @__PURE__ */ template(`<span style=color:var(--text-secondary)>`), _tmpl$10$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Endpoints</h3><div class="font-mono text-sm"style=color:var(--text-primary);line-height:1.8>`), _tmpl$11$1 = /* @__PURE__ */ template(`<div class="border-t pt-8"style=borderColor:var(--border-color)><h3 class="text-base font-bold mb-4"style=background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text>Events</h3><div class="font-mono text-sm"style=color:var(--text-muted);line-height:1.8>&lt;none&gt;`), _tmpl$12$1 = /* @__PURE__ */ template(`<span style=color:var(--text-muted);marginLeft:8px>&lt;none&gt;`), _tmpl$13$1 = /* @__PURE__ */ template(`<div class=mb-1>=`), _tmpl$14$1 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">Stop/Remove`), _tmpl$15$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-between gap-3"><div class=space-y-1><div><span class=font-semibold style=color:var(--text-primary)>Port:</span><span style=color:var(--text-secondary);marginLeft:8px></span></div><div><span class=font-semibold style=color:var(--text-primary)>TargetPort:</span><span style=color:var(--text-secondary);marginLeft:8px>`), _tmpl$16$1 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"style=background:var(--accent-primary);color:white>Port Forward`), _tmpl$17$1 = /* @__PURE__ */ template(`<span style=color:var(--text-muted)>&lt;none&gt;`);
const ServiceDetailsPanel = (props) => {
  const [details, setDetails] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [selectedPort, setSelectedPort] = createSignal(null);
  const [showPortForward, setShowPortForward] = createSignal(false);
  const [portForwards, setPortForwards] = createSignal([]);
  createEffect(async () => {
    if (props.isOpen && props.serviceName) {
      setLoading(true);
      try {
        const data = await api.getServiceDetails(props.serviceName, props.serviceNamespace);
        setDetails(data);
        const pfs = await api.listPortForwards();
        setPortForwards(pfs || []);
      } catch (error) {
        console.error("Failed to fetch service details:", error);
        addNotification("Failed to load service details", "error");
      } finally {
        setLoading(false);
      }
    }
  });
  const formatLabels = (labels) => {
    return Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(", ");
  };
  const formatSelector = (selector) => {
    return Object.entries(selector).map(([k, v]) => `${k}=${v}`).join(", ");
  };
  const formatPort = (port) => {
    const name = port.name ? `${port.name}  ` : "<unset>  ";
    const portNum = port.port || port.portNumber || "";
    const protocol = port.protocol || "TCP";
    return `${name}${portNum}/${protocol}`;
  };
  const formatTargetPort = (port) => {
    const protocol = port.protocol || "TCP";
    if (typeof port.targetPort === "number") {
      return `${port.targetPort}/${protocol}`;
    } else if (typeof port.targetPort === "string") {
      return `${port.targetPort}/${protocol}`;
    }
    const portNum = port.port || port.portNumber || "";
    return `${portNum}/${protocol}`;
  };
  const getRemotePort = (port) => {
    if (typeof port.targetPort === "number") {
      return port.targetPort;
    }
    return port.port || port.portNumber || 0;
  };
  const isPortForwarded = (port) => {
    const remotePort = getRemotePort(port);
    return portForwards().some((pf) => pf.name === props.serviceName && pf.namespace === props.serviceNamespace && pf.remotePort === remotePort);
  };
  const getPortForward = (port) => {
    const remotePort = getRemotePort(port);
    return portForwards().find((pf) => pf.name === props.serviceName && pf.namespace === props.serviceNamespace && pf.remotePort === remotePort);
  };
  const handlePortForwardClick = (port) => {
    const svcPort = {
      name: port.name || "",
      port: port.port || port.portNumber,
      targetPort: port.targetPort ?? (port.port || port.portNumber),
      protocol: port.protocol || "TCP",
      nodePort: port.nodePort
    };
    setSelectedPort(svcPort);
    setShowPortForward(true);
  };
  const handleStopPortForward = async (port) => {
    const pf = getPortForward(port);
    if (!pf) return;
    try {
      await api.stopPortForward(pf.id);
      addNotification("Port forward stopped", "success");
      const pfs = await api.listPortForwards();
      setPortForwards(pfs || []);
      if (props.onPortForwardChange) {
        props.onPortForwardChange();
      }
    } catch (error) {
      console.error("Failed to stop port forward:", error);
      addNotification("Failed to stop port forward", "error");
    }
  };
  const formatServiceDetails = (svc) => {
    const lines = [`Name: ${svc.name}`, `Namespace: ${svc.namespace}`, `Labels: ${Object.keys(svc.labels || {}).length > 0 ? formatLabels(svc.labels) : "<none>"}`, `Annotations: ${Object.keys(svc.annotations || {}).length > 0 ? Object.entries(svc.annotations).map(([k, v]) => `${k}=${v}`).join(", ") : "<none>"}`, `Selector: ${formatSelector(svc.selector)}`, `Type: ${svc.type}`, `IP Family Policy: ${svc.ipFamilyPolicy || "-"}`, `IP Families: ${(svc.ipFamilies || []).join(", ") || "-"}`, `IP: ${svc.clusterIP}`, `IPs: ${(svc.clusterIPs || []).join(", ") || svc.clusterIP}`];
    const ports = svc.portsDetails || svc.ports || [];
    if (ports.length > 0) {
      ports.forEach((port) => {
        lines.push(`Port: ${formatPort(port)}`);
        lines.push(`TargetPort: ${formatTargetPort(port)}`);
      });
    }
    if (svc.endpoints && svc.endpoints.length > 0) {
      const endpointStrs = svc.endpoints.flatMap((e) => e.addresses.map((addr) => {
        const port = ports[0];
        if (port) {
          const targetPort = typeof port.targetPort === "number" ? port.targetPort : port.port || port.portNumber;
          return `${addr}:${targetPort}`;
        }
        return addr;
      }));
      lines.push(`Endpoints: ${endpointStrs.join(", ")}`);
    } else {
      lines.push(`Endpoints: <none>`);
    }
    lines.push(`Session Affinity: ${svc.sessionAffinity || "None"}`);
    lines.push(`Events: <none>`);
    return lines.join("\n");
  };
  const serviceDetails = () => details();
  return [createComponent(Show, {
    get when() {
      return props.isOpen;
    },
    get children() {
      var _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild; _el$6.firstChild; var _el$8 = _el$5.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$4.nextSibling;
      addEventListener(_el$2, "click", props.onClose, true);
      _el$3.$$click = (e) => e.stopPropagation();
      insert(_el$6, () => props.serviceName, null);
      _el$9.$$click = () => {
        if (serviceDetails()) {
          const text = `Describe: ${props.serviceName}

${formatServiceDetails(serviceDetails())}`;
          navigator.clipboard.writeText(text);
          addNotification("Copied to clipboard", "success");
        }
      };
      addEventListener(_el$0, "click", props.onClose, true);
      insert(_el$1, createComponent(Show, {
        get when() {
          return !loading();
        },
        get fallback() {
          return (() => {
            var _el$10 = _tmpl$2$1(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild; _el$12.nextSibling;
            return _el$10;
          })();
        },
        get children() {
          return createComponent(Show, {
            get when() {
              return serviceDetails();
            },
            children: (svc) => {
              const ports = svc().portsDetails || svc().ports || [];
              return [(() => {
                var _el$14 = _tmpl$3$1(), _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling, _el$20 = _el$17.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling;
                insert(_el$19, () => svc().name);
                insert(_el$22, () => svc().namespace);
                return _el$14;
              })(), (() => {
                var _el$23 = _tmpl$6$1(), _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$25.firstChild; _el$26.firstChild; var _el$29 = _el$26.nextSibling; _el$29.firstChild;
                insert(_el$26, createComponent(Show, {
                  get when() {
                    return Object.keys(svc().labels || {}).length > 0;
                  },
                  get fallback() {
                    return _tmpl$12$1();
                  },
                  get children() {
                    var _el$28 = _tmpl$4$1();
                    insert(_el$28, () => formatLabels(svc().labels));
                    return _el$28;
                  }
                }), null);
                insert(_el$29, createComponent(Show, {
                  get when() {
                    return Object.keys(svc().annotations || {}).length > 0;
                  },
                  get fallback() {
                    return _tmpl$12$1();
                  },
                  get children() {
                    var _el$31 = _tmpl$5$1();
                    insert(_el$31, () => Object.entries(svc().annotations).map(([k, v]) => (() => {
                      var _el$71 = _tmpl$13$1(), _el$72 = _el$71.firstChild;
                      insert(_el$71, k, _el$72);
                      insert(_el$71, (() => {
                        var _c$ = memo(() => v.length > 100);
                        return () => _c$() ? v.substring(0, 100) + "..." : v;
                      })(), null);
                      return _el$71;
                    })()));
                    return _el$31;
                  }
                }), null);
                return _el$23;
              })(), (() => {
                var _el$32 = _tmpl$7$1(), _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling;
                insert(_el$34, () => formatSelector(svc().selector));
                return _el$32;
              })(), (() => {
                var _el$35 = _tmpl$8$1(), _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling, _el$38 = _el$37.firstChild, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$38.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$44 = _el$41.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$44.nextSibling, _el$48 = _el$47.firstChild, _el$49 = _el$48.nextSibling;
                insert(_el$40, () => svc().type);
                insert(_el$43, () => svc().ipFamilyPolicy || "-");
                insert(_el$46, () => (svc().ipFamilies || []).join(", ") || "-");
                insert(_el$49, () => svc().sessionAffinity || "None");
                return _el$35;
              })(), (() => {
                var _el$50 = _tmpl$9$1(), _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling, _el$53 = _el$52.firstChild, _el$54 = _el$53.firstChild, _el$55 = _el$54.nextSibling, _el$56 = _el$53.nextSibling, _el$57 = _el$56.firstChild, _el$58 = _el$57.nextSibling;
                insert(_el$55, () => svc().clusterIP);
                insert(_el$58, () => (svc().clusterIPs || []).join(", ") || svc().clusterIP);
                return _el$50;
              })(), createComponent(Show, {
                get when() {
                  return ports.length > 0;
                },
                get children() {
                  var _el$59 = _tmpl$0$1(), _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling;
                  insert(_el$61, createComponent(For, {
                    each: ports,
                    children: (port) => {
                      const forwarded = isPortForwarded(port);
                      return (() => {
                        var _el$73 = _tmpl$15$1(), _el$74 = _el$73.firstChild, _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling, _el$78 = _el$75.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling;
                        insert(_el$77, () => formatPort(port));
                        insert(_el$80, () => formatTargetPort(port));
                        insert(_el$73, createComponent(Show, {
                          when: forwarded,
                          get fallback() {
                            return (() => {
                              var _el$82 = _tmpl$16$1();
                              _el$82.$$click = () => handlePortForwardClick(port);
                              return _el$82;
                            })();
                          },
                          get children() {
                            var _el$81 = _tmpl$14$1();
                            _el$81.$$click = () => handleStopPortForward(port);
                            return _el$81;
                          }
                        }), null);
                        return _el$73;
                      })();
                    }
                  }));
                  return _el$59;
                }
              }), (() => {
                var _el$62 = _tmpl$10$1(), _el$63 = _el$62.firstChild, _el$64 = _el$63.nextSibling;
                insert(_el$64, createComponent(Show, {
                  get when() {
                    return (svc().endpoints || []).length > 0;
                  },
                  get fallback() {
                    return _tmpl$17$1();
                  },
                  get children() {
                    var _el$65 = _tmpl$1$1();
                    insert(_el$65, () => (svc().endpoints || []).flatMap((e) => e.addresses.map((addr) => {
                      const port = ports[0];
                      if (port) {
                        const targetPort = typeof port.targetPort === "number" ? port.targetPort : port.port || port.portNumber;
                        return `${addr}:${targetPort}`;
                      }
                      return addr;
                    })).join(", "));
                    return _el$65;
                  }
                }));
                return _el$62;
              })(), (() => {
                var _el$66 = _tmpl$11$1(), _el$67 = _el$66.firstChild; _el$67.nextSibling;
                return _el$66;
              })()];
            }
          });
        }
      }));
      return _el$;
    }
  }), createComponent(ServicePortForwardModal, {
    get isOpen() {
      return showPortForward();
    },
    onClose: () => {
      setShowPortForward(false);
      setSelectedPort(null);
    },
    get serviceName() {
      return props.serviceName;
    },
    get serviceNamespace() {
      return props.serviceNamespace;
    },
    get port() {
      return selectedPort();
    },
    onStart: async (localPort, remotePort, openInBrowser) => {
      try {
        await api.startPortForward("service", props.serviceName, props.serviceNamespace, localPort, remotePort);
        addNotification(`Port forward started: localhost:${localPort} → ${props.serviceName}:${remotePort}`, "success");
        setShowPortForward(false);
        setSelectedPort(null);
        const pfs = await api.listPortForwards();
        setPortForwards(pfs || []);
        if (props.onPortForwardChange) {
          props.onPortForwardChange();
        }
        if (openInBrowser) {
          setTimeout(() => {
            window.open(`http://localhost:${localPort}`, "_blank");
          }, 500);
        }
      } catch (error) {
        console.error("Failed to start port forward:", error);
        addNotification("Failed to start port forward", "error");
      }
    }
  })];
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th style="padding:0 8px;text-align:left;font-weight:bold;line-height:24px;height:24px;border:none"></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Namespace </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Type </div></th><th class=whitespace-nowrap>Cluster IP</th><th class=whitespace-nowrap>External IP</th><th class=whitespace-nowrap>Ports</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> services</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$4 = /* @__PURE__ */ template(`<div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$5 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8">`), _tmpl$7 = /* @__PURE__ */ template(`<div class=space-y-2>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="card p-4"><div class="flex items-center justify-between mb-4"><h3 class="font-semibold flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>Active Port Forwards</h3><button class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-80"title="Refresh port forwards list"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><svg class="w-4 h-4 inline-block mr-1"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Refresh`), _tmpl$9 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Services</h1><p class=text-xs style=color:var(--text-secondary)>Network services and load balancers</p></div><div class="flex gap-2 border-b"style=border-color:var(--border-color)><button>Services</button><button>Port Forward</button></div><div class="flex items-center gap-3"><button class=icon-btn title="Refresh Services"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-2"><div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"style=border-color:var(--border-color)><span class=text-xs style=color:var(--text-secondary)>Total</span><span class="text-sm font-bold"style=color:var(--text-primary)></span></div><div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"style=border-color:var(--border-color)><span class=text-xs style=color:var(--text-secondary)>ClusterIP</span><span class="text-sm font-bold"style=color:var(--success-color)></span></div><div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"style=border-color:var(--border-color)><span class=text-xs style=color:var(--text-secondary)>NodePort</span><span class="text-sm font-bold"style=color:var(--warning-color)></span></div><div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"style=border-color:var(--border-color)><span class=text-xs style=color:var(--text-secondary)>LoadBalancer</span><span class="text-sm font-bold"style=color:#3b82f6></span></div><div class=flex-1></div><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100`), _tmpl$0 = /* @__PURE__ */ template(`<span class="ml-2 px-1.5 py-0.5 rounded-full text-xs"style=background:var(--accent-primary);color:white>`), _tmpl$1 = /* @__PURE__ */ template(`<div class="p-8 text-center">`), _tmpl$10 = /* @__PURE__ */ template(`<tr><td colspan=9 class="text-center py-8"style=color:var(--text-muted)>No services found`), _tmpl$11 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none;cursor:pointer"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td class="font-mono text-sm"style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td class="font-mono text-sm"style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td class=text-sm style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$12 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`), _tmpl$13 = /* @__PURE__ */ template(`<div class="text-center py-8"><div class="spinner mx-auto mb-2"></div><div class=text-sm style=color:var(--text-muted)>Loading port forwards...`), _tmpl$14 = /* @__PURE__ */ template(`<div class="text-center py-8 text-sm"style=color:var(--text-muted)>No active port forwards<div class="text-xs mt-2"style=color:var(--text-muted)>Start a port forward from Pods or Services to see it here`), _tmpl$15 = /* @__PURE__ */ template(`<div class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border"style=background:var(--bg-tertiary);border-color:var(--border-color)><div class="flex items-center gap-2 flex-1"><span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><div class=flex-1><div class="text-sm font-medium"style=color:var(--text-primary)></div><div class="text-xs font-mono"style=color:var(--text-muted)>localhost:<!> → </div></div></div><div class="flex items-center gap-2"><a target=_blank rel="noopener noreferrer"class="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"style=background:var(--accent-primary);color:white>Open</a><button class="p-1.5 rounded transition-colors hover:bg-red-500/20 text-red-400 hover:text-red-300"title="Stop Port Forward"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$16 = /* @__PURE__ */ template(`<span class="ml-2 text-xs px-1.5 py-0.5 rounded"style=background:var(--bg-secondary);color:var(--text-muted)>Service`), _tmpl$17 = /* @__PURE__ */ template(`<span class="ml-2 text-xs px-1.5 py-0.5 rounded"style=background:var(--bg-secondary);color:var(--text-muted)>Pod`), _tmpl$18 = /* @__PURE__ */ template(`<span class=ml-2>(<!>)`);
const Services = () => {
  const [typeFilter, setTypeFilter] = createSignal("all");
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const [showPortForward, setShowPortForward] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [selectedPort, setSelectedPort] = createSignal(null);
  const [activeTab, setActiveTab] = createSignal("services");
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const bulk = useBulkSelection();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
  const getInitialFontSize = () => {
    const saved = localStorage.getItem("services-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("services-font-size", size.toString());
  };
  const getInitialFontFamily = () => {
    const saved = localStorage.getItem("services-font-family");
    return saved || "Monaco";
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("services-font-family", family);
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
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const servicesCache = createCachedResource("services", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const services2 = await api.getServices(namespaceParam);
      return services2;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const services = createMemo(() => servicesCache.data() || []);
  const [portForwards, {
    refetch: refetchPF
  }] = createResource(api.listPortForwards);
  onMount(() => {
    refetchPF();
    const interval = setInterval(() => {
      if (activeTab() === "portforward") {
        refetchPF();
      }
    }, 3e3);
    return () => {
      clearInterval(interval);
    };
  });
  createEffect(() => {
    if (activeTab() === "portforward") {
      refetchPF();
    }
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getServiceYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch service YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const svc = selected();
    if (!svc) return;
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
      label: `Apply Service YAML: ${svc.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: svc.namespace,
      context: status.context,
      userAction: "services-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "services",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => servicesCache.refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const svc = selected();
    if (!svc) return;
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
      label: `Dry run Service YAML: ${svc.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: svc.namespace,
      context: status.context,
      userAction: "services-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "services",
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
    let all = services() || [];
    const query = searchQuery().toLowerCase();
    const type = typeFilter();
    if (type !== "all") {
      all = all.filter((s) => s.type === type);
    }
    if (query) {
      all = all.filter((s) => s.name.toLowerCase().includes(query) || s.namespace.toLowerCase().includes(query) || s.type.toLowerCase().includes(query));
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
        case "type":
          comparison = a.type.localeCompare(b.type);
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
  const paginatedServices = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = services() || [];
    return {
      total: all.length,
      clusterIP: all.filter((s) => s.type === "ClusterIP").length,
      nodePort: all.filter((s) => s.type === "NodePort").length,
      loadBalancer: all.filter((s) => s.type === "LoadBalancer").length
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
  const [servicePorts, setServicePorts] = createSignal([]);
  const [serviceDetails] = createResource(() => showPortForward() && selected() ? {
    name: selected().name,
    ns: selected().namespace
  } : null, async (params) => {
    if (!params) return null;
    return await api.getServiceDetails(params.name, params.ns);
  });
  createEffect(() => {
    const details = serviceDetails();
    if (details && details.portsDetails) {
      const ports = details.portsDetails.map((p) => ({
        name: p.name || "",
        port: p.port,
        targetPort: p.targetPort || p.port,
        protocol: p.protocol || "TCP",
        nodePort: p.nodePort || void 0
      }));
      setServicePorts(ports);
    }
  });
  const openPortForward = (svc) => {
    setSelected(svc);
    setShowPortForward(true);
  };
  const handlePortForward = (port) => {
    setSelectedPort(port);
    setShowPortForward(true);
  };
  const startPortForward = async (localPort, remotePort, openInBrowser) => {
    const svc = selected();
    if (!svc) return;
    try {
      await api.startPortForward("service", svc.name, svc.namespace, localPort, remotePort);
      addNotification(`✅ Port forward started: localhost:${localPort} → ${svc.name}:${remotePort}`, "success");
      setShowPortForward(false);
      setSelectedPort(null);
      refetchPF();
      if (openInBrowser) {
        setTimeout(() => {
          window.open(`http://localhost:${localPort}`, "_blank");
        }, 500);
      }
    } catch (error) {
      console.error("Failed to start port forward:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addNotification(`❌ Failed to start port forward: ${errorMsg}`, "error");
    }
  };
  const stopPortForward = async (pf) => {
    try {
      await api.stopPortForward(pf.id);
      addNotification(`✅ Port forward stopped: ${pf.name}`, "success");
      refetchPF();
    } catch (error) {
      console.error("Failed to stop port forward:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addNotification(`❌ Failed to stop port forward: ${errorMsg}`, "error");
    }
  };
  const handleDeleteConfirm = async () => {
    const svc = selected();
    if (!svc) return;
    setDeleting(true);
    try {
      await api.deleteService(svc.name, svc.namespace);
      addNotification(`Service ${svc.name} deleted successfully`, "success");
      servicesCache.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to delete service:", error);
      addNotification(`Failed to delete service: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const deleteService = (svc) => {
    setSelected(svc);
    setShowDeleteConfirm(true);
  };
  return (() => {
    var _el$4 = _tmpl$9(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling; _el$1.firstChild; var _el$11 = _el$9.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$5.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$14.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling, _el$20 = _el$17.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$20.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$23.nextSibling, _el$27 = _el$26.nextSibling, _el$28 = _el$27.nextSibling, _el$29 = _el$28.nextSibling, _el$30 = _el$29.nextSibling;
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
      resourceType: "services"
    }), _el$5);
    _el$0.$$click = () => setActiveTab("services");
    _el$1.$$click = () => setActiveTab("portforward");
    insert(_el$1, (() => {
      var _c$ = memo(() => (portForwards() || []).length > 0);
      return () => _c$() && (() => {
        var _el$79 = _tmpl$0();
        insert(_el$79, () => (portForwards() || []).length);
        return _el$79;
      })();
    })(), null);
    _el$12.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      servicesCache.refetch();
    };
    _el$14.$$click = () => {
      setTypeFilter("all");
      setCurrentPage(1);
    };
    insert(_el$16, () => statusCounts().total);
    _el$17.$$click = () => {
      setTypeFilter("ClusterIP");
      setCurrentPage(1);
    };
    insert(_el$19, () => statusCounts().clusterIP);
    _el$20.$$click = () => {
      setTypeFilter("NodePort");
      setCurrentPage(1);
    };
    insert(_el$22, () => statusCounts().nodePort);
    _el$23.$$click = () => {
      setTypeFilter("LoadBalancer");
      setCurrentPage(1);
    };
    insert(_el$25, () => statusCounts().loadBalancer);
    _el$27.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$28.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$29.$$input = (e) => {
      setSearchQuery(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$30.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$4, createComponent(Show, {
      get when() {
        return activeTab() === "services";
      },
      get children() {
        var _el$31 = _tmpl$4();
        insert(_el$31, createComponent(Show, {
          get when() {
            return !servicesCache.loading() || servicesCache.data() !== void 0;
          },
          get fallback() {
            return (() => {
              var _el$80 = _tmpl$1();
              insert(_el$80, createComponent(LoadingSpinner, {
                size: "lg",
                showText: true,
                text: "Loading services..."
              }));
              return _el$80;
            })();
          },
          get children() {
            return [(() => {
              var _el$32 = _tmpl$2(), _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling, _el$38 = _el$37.firstChild; _el$38.firstChild; var _el$40 = _el$37.nextSibling, _el$41 = _el$40.firstChild; _el$41.firstChild; var _el$43 = _el$40.nextSibling, _el$44 = _el$43.firstChild; _el$44.firstChild; var _el$46 = _el$43.nextSibling, _el$47 = _el$46.nextSibling, _el$48 = _el$47.nextSibling, _el$49 = _el$48.nextSibling, _el$50 = _el$49.firstChild; _el$50.firstChild; var _el$52 = _el$34.nextSibling;
              insert(_el$36, createComponent(SelectAllCheckbox, {
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
              _el$37.$$click = () => handleSort("name");
              insert(_el$38, createComponent(SortIcon, {
                field: "name"
              }), null);
              _el$40.$$click = () => handleSort("namespace");
              insert(_el$41, createComponent(SortIcon, {
                field: "namespace"
              }), null);
              _el$43.$$click = () => handleSort("type");
              insert(_el$44, createComponent(SortIcon, {
                field: "type"
              }), null);
              _el$49.$$click = () => handleSort("age");
              insert(_el$50, createComponent(SortIcon, {
                field: "age"
              }), null);
              insert(_el$52, createComponent(For, {
                get each() {
                  return paginatedServices();
                },
                get fallback() {
                  return (() => {
                    var _el$81 = _tmpl$10(); _el$81.firstChild;
                    return _el$81;
                  })();
                },
                children: (svc) => {
                  return (() => {
                    var _el$83 = _tmpl$11(), _el$84 = _el$83.firstChild, _el$85 = _el$84.nextSibling, _el$86 = _el$85.firstChild, _el$87 = _el$85.nextSibling, _el$88 = _el$87.nextSibling, _el$89 = _el$88.firstChild, _el$90 = _el$88.nextSibling, _el$91 = _el$90.nextSibling, _el$92 = _el$91.nextSibling, _el$93 = _el$92.nextSibling, _el$94 = _el$93.nextSibling;
                    insert(_el$84, createComponent(SelectionCheckbox, {
                      get checked() {
                        return bulk.isSelected(svc);
                      },
                      onChange: () => bulk.toggleSelection(svc)
                    }));
                    _el$86.$$click = () => {
                      setSelected(svc);
                      setShowDetails(true);
                    };
                    insert(_el$86, (() => {
                      var _c$2 = memo(() => svc.name.length > 40);
                      return () => _c$2() ? svc.name.slice(0, 37) + "..." : svc.name;
                    })());
                    _el$87.$$click = () => {
                      setSelected(svc);
                      setShowDetails(true);
                    };
                    insert(_el$87, () => svc.namespace);
                    insert(_el$89, () => svc.type);
                    insert(_el$90, () => svc.clusterIP);
                    insert(_el$91, () => svc.externalIP || "-");
                    insert(_el$92, () => svc.ports);
                    insert(_el$93, () => svc.age);
                    insert(_el$94, createComponent(ActionMenu, {
                      actions: [{
                        label: "Describe",
                        icon: "info",
                        onClick: () => {
                          setSelected(svc);
                          setShowDescribe(true);
                        }
                      }, {
                        label: "Port Forward",
                        icon: "portforward",
                        onClick: () => openPortForward(svc)
                      }, {
                        label: "View YAML",
                        icon: "yaml",
                        onClick: () => {
                          setSelected(svc);
                          setYamlKey(`${svc.name}|${svc.namespace}`);
                          setShowYaml(true);
                        }
                      }, {
                        label: "Edit YAML",
                        icon: "edit",
                        onClick: () => {
                          setSelected(svc);
                          setYamlKey(`${svc.name}|${svc.namespace}`);
                          setShowEdit(true);
                        }
                      }, {
                        label: "Delete",
                        icon: "delete",
                        onClick: () => {
                          setSelected(svc);
                          deleteService(svc);
                        },
                        variant: "danger",
                        divider: true
                      }]
                    }));
                    createRenderEffect((_p$) => {
                      var _v$23 = `${Math.max(24, fontSize() * 1.7)}px`, _v$24 = `${Math.max(24, fontSize() * 1.7)}px`, _v$25 = `${fontSize()}px`, _v$26 = `${Math.max(24, fontSize() * 1.7)}px`, _v$27 = `${Math.max(24, fontSize() * 1.7)}px`, _v$28 = `${fontSize()}px`, _v$29 = `${Math.max(24, fontSize() * 1.7)}px`, _v$30 = `${Math.max(24, fontSize() * 1.7)}px`, _v$31 = `${fontSize()}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `badge ${svc.type === "LoadBalancer" ? "badge-info" : svc.type === "NodePort" ? "badge-warning" : "badge-success"}`, _v$35 = `${fontSize()}px`, _v$36 = `${Math.max(24, fontSize() * 1.7)}px`, _v$37 = `${Math.max(24, fontSize() * 1.7)}px`, _v$38 = `${fontSize()}px`, _v$39 = `${Math.max(24, fontSize() * 1.7)}px`, _v$40 = `${Math.max(24, fontSize() * 1.7)}px`, _v$41 = `${fontSize()}px`, _v$42 = `${Math.max(24, fontSize() * 1.7)}px`, _v$43 = `${Math.max(24, fontSize() * 1.7)}px`, _v$44 = `${fontSize()}px`, _v$45 = `${Math.max(24, fontSize() * 1.7)}px`, _v$46 = `${Math.max(24, fontSize() * 1.7)}px`, _v$47 = `${Math.max(24, fontSize() * 1.7)}px`, _v$48 = `${Math.max(24, fontSize() * 1.7)}px`;
                      _v$23 !== _p$.e && setStyleProperty(_el$84, "height", _p$.e = _v$23);
                      _v$24 !== _p$.t && setStyleProperty(_el$84, "line-height", _p$.t = _v$24);
                      _v$25 !== _p$.a && setStyleProperty(_el$85, "font-size", _p$.a = _v$25);
                      _v$26 !== _p$.o && setStyleProperty(_el$85, "height", _p$.o = _v$26);
                      _v$27 !== _p$.i && setStyleProperty(_el$85, "line-height", _p$.i = _v$27);
                      _v$28 !== _p$.n && setStyleProperty(_el$87, "font-size", _p$.n = _v$28);
                      _v$29 !== _p$.s && setStyleProperty(_el$87, "height", _p$.s = _v$29);
                      _v$30 !== _p$.h && setStyleProperty(_el$87, "line-height", _p$.h = _v$30);
                      _v$31 !== _p$.r && setStyleProperty(_el$88, "font-size", _p$.r = _v$31);
                      _v$32 !== _p$.d && setStyleProperty(_el$88, "height", _p$.d = _v$32);
                      _v$33 !== _p$.l && setStyleProperty(_el$88, "line-height", _p$.l = _v$33);
                      _v$34 !== _p$.u && className(_el$89, _p$.u = _v$34);
                      _v$35 !== _p$.c && setStyleProperty(_el$90, "font-size", _p$.c = _v$35);
                      _v$36 !== _p$.w && setStyleProperty(_el$90, "height", _p$.w = _v$36);
                      _v$37 !== _p$.m && setStyleProperty(_el$90, "line-height", _p$.m = _v$37);
                      _v$38 !== _p$.f && setStyleProperty(_el$91, "font-size", _p$.f = _v$38);
                      _v$39 !== _p$.y && setStyleProperty(_el$91, "height", _p$.y = _v$39);
                      _v$40 !== _p$.g && setStyleProperty(_el$91, "line-height", _p$.g = _v$40);
                      _v$41 !== _p$.p && setStyleProperty(_el$92, "font-size", _p$.p = _v$41);
                      _v$42 !== _p$.b && setStyleProperty(_el$92, "height", _p$.b = _v$42);
                      _v$43 !== _p$.T && setStyleProperty(_el$92, "line-height", _p$.T = _v$43);
                      _v$44 !== _p$.A && setStyleProperty(_el$93, "font-size", _p$.A = _v$44);
                      _v$45 !== _p$.O && setStyleProperty(_el$93, "height", _p$.O = _v$45);
                      _v$46 !== _p$.I && setStyleProperty(_el$93, "line-height", _p$.I = _v$46);
                      _v$47 !== _p$.S && setStyleProperty(_el$94, "height", _p$.S = _v$47);
                      _v$48 !== _p$.W && setStyleProperty(_el$94, "line-height", _p$.W = _v$48);
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
                      W: void 0
                    });
                    return _el$83;
                  })();
                }
              }));
              createRenderEffect((_p$) => {
                var _v$3 = getFontFamilyCSS(), _v$4 = getThemeBackground();
                _v$3 !== _p$.e && setStyleProperty(_el$33, "font-family", _p$.e = _v$3);
                _v$4 !== _p$.t && setStyleProperty(_el$33, "background", _p$.t = _v$4);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              return _el$32;
            })(), createComponent(Show, {
              get when() {
                return totalPages() > 1 || filteredAndSorted().length > 0;
              },
              get children() {
                var _el$53 = _tmpl$3(), _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild, _el$59 = _el$55.nextSibling, _el$56 = _el$59.nextSibling, _el$60 = _el$56.nextSibling, _el$57 = _el$60.nextSibling, _el$61 = _el$57.nextSibling; _el$61.nextSibling; var _el$62 = _el$54.nextSibling, _el$63 = _el$62.firstChild, _el$64 = _el$63.nextSibling, _el$65 = _el$64.nextSibling, _el$66 = _el$65.firstChild, _el$68 = _el$66.nextSibling; _el$68.nextSibling; var _el$69 = _el$65.nextSibling, _el$70 = _el$69.nextSibling, _el$71 = _el$70.nextSibling;
                insert(_el$54, () => (currentPage() - 1) * pageSize() + 1, _el$59);
                insert(_el$54, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$60);
                insert(_el$54, () => filteredAndSorted().length, _el$61);
                _el$63.$$click = () => setCurrentPage(1);
                _el$64.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
                insert(_el$65, currentPage, _el$68);
                insert(_el$65, totalPages, null);
                _el$69.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
                _el$70.$$click = () => setCurrentPage(totalPages());
                _el$71.addEventListener("change", (e) => {
                  setPageSize(parseInt(e.currentTarget.value));
                  setCurrentPage(1);
                });
                createRenderEffect((_p$) => {
                  var _v$5 = currentPage() === 1, _v$6 = currentPage() === 1, _v$7 = currentPage() === totalPages(), _v$8 = currentPage() === totalPages();
                  _v$5 !== _p$.e && (_el$63.disabled = _p$.e = _v$5);
                  _v$6 !== _p$.t && (_el$64.disabled = _p$.t = _v$6);
                  _v$7 !== _p$.a && (_el$69.disabled = _p$.a = _v$7);
                  _v$8 !== _p$.o && (_el$70.disabled = _p$.o = _v$8);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0
                });
                createRenderEffect(() => _el$71.value = pageSize());
                return _el$53;
              }
            })];
          }
        }));
        createRenderEffect((_p$) => {
          var _v$9 = getThemeBackground(), _v$0 = `1px solid ${getThemeBorderColor()}`;
          _v$9 !== _p$.e && setStyleProperty(_el$31, "background", _p$.e = _v$9);
          _v$0 !== _p$.t && setStyleProperty(_el$31, "border", _p$.t = _v$0);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$31;
      }
    }), null);
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
              var _el$95 = _tmpl$12(), _el$96 = _el$95.firstChild;
              insert(_el$95, createComponent(LoadingSpinner, {
                size: "md"
              }), _el$96);
              return _el$95;
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
              var _el$97 = _tmpl$12(), _el$98 = _el$97.firstChild;
              insert(_el$97, createComponent(LoadingSpinner, {
                size: "md"
              }), _el$98);
              return _el$97;
            })();
          },
          get children() {
            var _el$72 = _tmpl$5();
            insert(_el$72, createComponent(Show, {
              get when() {
                return selected();
              },
              children: (svc) => createComponent(CommandPreview, {
                label: "Equivalent kubectl command",
                defaultCollapsed: true,
                get command() {
                  return `kubectl apply -f - -n ${svc().namespace || "default"}  # YAML from editor is sent via Kubernetes API`;
                },
                description: "This is an equivalent kubectl-style view of the Service update. The actual change is applied via Kubernetes API."
              })
            }), null);
            insert(_el$72, createComponent(YAMLEditor, {
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
            }), null);
            return _el$72;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "service",
      get name() {
        return selected()?.name || "";
      },
      get namespace() {
        return selected()?.namespace;
      }
    }), null);
    insert(_el$4, createComponent(ServiceDetailsPanel, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => setShowDetails(false),
      get serviceName() {
        return selected()?.name || "";
      },
      get serviceNamespace() {
        return selected()?.namespace || "";
      },
      onPortForwardChange: () => refetchPF()
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
      title: "Delete Service",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the Service "${selected().name}"?` : "Are you sure you want to delete this Service?";
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
    insert(_el$4, createComponent(Show, {
      get when() {
        return memo(() => !!(showPortForward() && servicePorts().length > 0))() && !selectedPort();
      },
      get children() {
        return createComponent(Modal, {
          get isOpen() {
            return memo(() => !!showPortForward())() && !selectedPort();
          },
          onClose: () => {
            setShowPortForward(false);
            setSelectedPort(null);
          },
          title: "Ports",
          size: "xs",
          get children() {
            return createComponent(ServicePortsList, {
              get serviceName() {
                return selected()?.name || "";
              },
              get ports() {
                return servicePorts();
              },
              onForward: handlePortForward
            });
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(Show, {
      get when() {
        return memo(() => !!showPortForward())() && servicePorts().length === 0;
      },
      get children() {
        return createComponent(Modal, {
          get isOpen() {
            return showPortForward();
          },
          onClose: () => {
            setShowPortForward(false);
            setSelectedPort(null);
          },
          title: "Ports",
          size: "xs",
          get children() {
            var _el$73 = _tmpl$6();
            insert(_el$73, createComponent(LoadingSpinner, {
              size: "md"
            }));
            return _el$73;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(ServicePortForwardModal, {
      get isOpen() {
        return memo(() => !!showPortForward())() && selectedPort() !== null;
      },
      onClose: () => {
        setShowPortForward(false);
        setSelectedPort(null);
      },
      get serviceName() {
        return selected()?.name || "";
      },
      get serviceNamespace() {
        return selected()?.namespace || "";
      },
      get port() {
        return selectedPort();
      },
      onStart: startPortForward
    }), null);
    insert(_el$4, createComponent(Show, {
      get when() {
        return activeTab() === "portforward";
      },
      get children() {
        var _el$74 = _tmpl$8(), _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling;
        _el$77.$$click = () => refetchPF();
        insert(_el$74, createComponent(Show, {
          get when() {
            return !portForwards.loading;
          },
          get fallback() {
            return (() => {
              var _el$99 = _tmpl$13(), _el$100 = _el$99.firstChild; _el$100.nextSibling;
              return _el$99;
            })();
          },
          get children() {
            return createComponent(Show, {
              get when() {
                return (portForwards() || []).length > 0;
              },
              get fallback() {
                return (() => {
                  var _el$102 = _tmpl$14(), _el$103 = _el$102.firstChild; _el$103.nextSibling;
                  return _el$102;
                })();
              },
              get children() {
                var _el$78 = _tmpl$7();
                insert(_el$78, createComponent(For, {
                  get each() {
                    return portForwards() || [];
                  },
                  children: (pf) => (() => {
                    var _el$105 = _tmpl$15(), _el$106 = _el$105.firstChild, _el$107 = _el$106.firstChild, _el$108 = _el$107.nextSibling, _el$109 = _el$108.firstChild, _el$110 = _el$109.nextSibling, _el$111 = _el$110.firstChild, _el$113 = _el$111.nextSibling; _el$113.nextSibling; var _el$114 = _el$106.nextSibling, _el$115 = _el$114.firstChild, _el$116 = _el$115.nextSibling;
                    insert(_el$109, () => pf.name, null);
                    insert(_el$109, (() => {
                      var _c$3 = memo(() => pf.type === "service");
                      return () => _c$3() && _tmpl$16();
                    })(), null);
                    insert(_el$109, (() => {
                      var _c$4 = memo(() => pf.type === "pod");
                      return () => _c$4() && _tmpl$17();
                    })(), null);
                    insert(_el$110, () => pf.localPort, _el$113);
                    insert(_el$110, () => pf.remotePort, null);
                    insert(_el$110, (() => {
                      var _c$5 = memo(() => !!pf.namespace);
                      return () => _c$5() && (() => {
                        var _el$119 = _tmpl$18(), _el$120 = _el$119.firstChild, _el$122 = _el$120.nextSibling; _el$122.nextSibling;
                        insert(_el$119, () => pf.namespace, _el$122);
                        return _el$119;
                      })();
                    })(), null);
                    _el$116.$$click = () => stopPortForward(pf);
                    createRenderEffect(() => setAttribute(_el$115, "href", `http://localhost:${pf.localPort}`));
                    return _el$105;
                  })()
                }));
                return _el$78;
              }
            });
          }
        }), null);
        return _el$74;
      }
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      resourceType: "Services",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      },
      onConfirm: async () => {
        const selectedServices = bulk.getSelectedItems(filteredAndSorted());
        for (const svc of selectedServices) {
          try {
            await api.deleteService(svc.name, svc.namespace);
          } catch (error) {
            console.error(`Failed to delete service ${svc.namespace}/${svc.name}:`, error);
            addNotification(`Failed to delete service ${svc.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        bulk.deselectAll();
        servicesCache.refetch();
        addNotification(`Successfully deleted ${selectedServices.length} service(s)`, "success");
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$1 = `px-4 py-2 text-sm font-medium transition-colors ${activeTab() === "services" ? "border-b-2" : "opacity-60 hover:opacity-100"}`, _v$10 = activeTab() === "services" ? "var(--accent-primary)" : "var(--text-secondary)", _v$11 = activeTab() === "services" ? "var(--accent-primary)" : "transparent", _v$12 = `px-4 py-2 text-sm font-medium transition-colors relative ${activeTab() === "portforward" ? "border-b-2" : "opacity-60 hover:opacity-100"}`, _v$13 = activeTab() === "portforward" ? "var(--accent-primary)" : "var(--text-secondary)", _v$14 = activeTab() === "portforward" ? "var(--accent-primary)" : "transparent", _v$15 = typeFilter() === "all" ? "2px solid var(--accent-primary)" : "2px solid transparent", _v$16 = typeFilter() === "all" ? 1 : 0.7, _v$17 = typeFilter() === "ClusterIP" ? "2px solid var(--success-color)" : "2px solid transparent", _v$18 = typeFilter() === "ClusterIP" ? 1 : 0.7, _v$19 = typeFilter() === "NodePort" ? "2px solid var(--warning-color)" : "2px solid transparent", _v$20 = typeFilter() === "NodePort" ? 1 : 0.7, _v$21 = typeFilter() === "LoadBalancer" ? "2px solid #3b82f6" : "2px solid transparent", _v$22 = typeFilter() === "LoadBalancer" ? 1 : 0.7;
      _v$1 !== _p$.e && className(_el$0, _p$.e = _v$1);
      _v$10 !== _p$.t && setStyleProperty(_el$0, "color", _p$.t = _v$10);
      _v$11 !== _p$.a && setStyleProperty(_el$0, "border-color", _p$.a = _v$11);
      _v$12 !== _p$.o && className(_el$1, _p$.o = _v$12);
      _v$13 !== _p$.i && setStyleProperty(_el$1, "color", _p$.i = _v$13);
      _v$14 !== _p$.n && setStyleProperty(_el$1, "border-color", _p$.n = _v$14);
      _v$15 !== _p$.s && setStyleProperty(_el$14, "border-left", _p$.s = _v$15);
      _v$16 !== _p$.h && setStyleProperty(_el$14, "opacity", _p$.h = _v$16);
      _v$17 !== _p$.r && setStyleProperty(_el$17, "border-left", _p$.r = _v$17);
      _v$18 !== _p$.d && setStyleProperty(_el$17, "opacity", _p$.d = _v$18);
      _v$19 !== _p$.l && setStyleProperty(_el$20, "border-left", _p$.l = _v$19);
      _v$20 !== _p$.u && setStyleProperty(_el$20, "opacity", _p$.u = _v$20);
      _v$21 !== _p$.c && setStyleProperty(_el$23, "border-left", _p$.c = _v$21);
      _v$22 !== _p$.w && setStyleProperty(_el$23, "opacity", _p$.w = _v$22);
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
    createRenderEffect(() => _el$27.value = fontSize());
    createRenderEffect(() => _el$28.value = fontFamily());
    createRenderEffect(() => _el$29.value = searchQuery());
    createRenderEffect(() => _el$30.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { Services as default };
//# sourceMappingURL=Services-ChayLy31.js.map
