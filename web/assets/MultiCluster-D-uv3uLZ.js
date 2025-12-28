import { c as createSignal, n as createEffect, t as template, i as insert, d as createComponent, m as memo, S as Show, F as For, f as createRenderEffect, h as setStyleProperty, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<div style=display:flex;align-items:center;justify-content:center;padding:60px;color:var(--text-secondary)><div class=spinner style=margin-right:12px></div>Loading multi-cluster data...`), _tmpl$2 = /* @__PURE__ */ template(`<div style="background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.3);border-radius:8px;padding:16px;color:var(--error-color);margin-bottom:24px"><strong>Error:</strong> <button style="margin-left:12px;padding:4px 12px;background:var(--error-color);color:white;border:none;border-radius:4px;cursor:pointer">Retry`), _tmpl$3 = /* @__PURE__ */ template(`<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:24px"><div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px"><div style=font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px>Total Clusters</div><div style=font-size:32px;font-weight:700;color:var(--accent-primary)></div></div><div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px"><div style=font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px>Total Incidents</div><div style=font-size:32px;font-weight:700;color:var(--text-primary)></div></div><div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px"><div style=font-size:12px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px>By Severity</div><div style=display:flex;flex-wrap:wrap;gap:8px></div></div><div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px"><div style=font-size:12px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px>Top Patterns</div><div style=display:flex;flex-wrap:wrap;gap:6px>`), _tmpl$4 = /* @__PURE__ */ template(`<h2 style=font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:16px>Individual Cluster Health`), _tmpl$5 = /* @__PURE__ */ template(`<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(350px, 1fr));gap:16px">`), _tmpl$6 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:40px;text-align:center;color:var(--text-secondary)"><div style=font-size:48px;margin-bottom:16px>🌐</div><h3 style="margin:0 0 8px;color:var(--text-primary)">No Cluster Data Available</h3><p style=margin:0;font-size:14px>Connect to Kubernetes clusters to see aggregated health and incident data here.`), _tmpl$7 = /* @__PURE__ */ template(`<div style=margin-top:24px;text-align:center;font-size:12px;color:var(--text-muted)>Last refreshed: <button style="margin-left:12px;padding:4px 12px;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:4px;cursor:pointer;font-size:12px">`), _tmpl$8 = /* @__PURE__ */ template(`<div style="padding:24px;max-width:1400px;margin:0 auto"><div style=margin-bottom:24px><h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:12px">🌐 Multi-Cluster Summary</h1><p style=margin:0;color:var(--text-secondary);font-size:14px>Aggregated view of incidents and health across all connected Kubernetes clusters`), _tmpl$9 = /* @__PURE__ */ template(`<span style="padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600">: `), _tmpl$0 = /* @__PURE__ */ template(`<span style="padding:4px 10px;border-radius:12px;font-size:11px;font-weight:500;background:var(--accent-primary)20;color:var(--accent-primary)">`), _tmpl$1 = /* @__PURE__ */ template(`<span style=font-size:11px;color:var(--text-muted)>No incidents 🎉`), _tmpl$10 = /* @__PURE__ */ template(`<div><div style=font-size:11px;color:var(--text-muted);margin-bottom:6px>Top Patterns</div><div style=display:flex;flex-wrap:wrap;gap:4px>`), _tmpl$11 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:20px;transition:border-color 0.2s, box-shadow 0.2s"><div style=display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px><div><h3 style="margin:0 0 4px;font-size:16px;font-weight:600;color:var(--text-primary)"></h3><div style=font-size:11px;color:var(--text-muted)>Last updated: </div></div><div style=display:flex;flex-direction:column;align-items:flex-end><div style=font-size:24px;font-weight:700>%</div><div style=font-size:10px;color:var(--text-muted)>Health Score</div></div></div><div style=background:var(--bg-secondary);border-radius:4px;height:8px;overflow:hidden;margin-bottom:16px><div style="height:100%;border-radius:4px;transition:width 0.3s ease"></div></div><div style=margin-bottom:12px><div style=font-size:11px;color:var(--text-muted);margin-bottom:6px>Incidents by Severity</div><div style=display:flex;flex-wrap:wrap;gap:6px>`), _tmpl$12 = /* @__PURE__ */ template(`<span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500">: `), _tmpl$13 = /* @__PURE__ */ template(`<span style="padding:2px 8px;border-radius:10px;font-size:10px;background:var(--bg-secondary);color:var(--text-secondary)">`);
const MultiCluster = () => {
  const [summary, setSummary] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/clusters/summary");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err.message || "Failed to fetch multi-cluster summary");
      console.error("Error fetching multi-cluster summary:", err);
    } finally {
      setLoading(false);
    }
  };
  createEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 3e4);
    return () => clearInterval(interval);
  });
  const getHealthColor = (score) => {
    if (score >= 80) return "var(--success-color, #10b981)";
    if (score >= 50) return "var(--warning-color, #f59e0b)";
    return "var(--error-color, #ef4444)";
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "#dc3545";
      case "high":
        return "#ff6b6b";
      case "medium":
      case "warning":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "var(--text-secondary)";
    }
  };
  return (() => {
    var _el$ = _tmpl$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild; _el$3.nextSibling;
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!loading())() && !summary();
      },
      get children() {
        var _el$5 = _tmpl$(); _el$5.firstChild;
        return _el$5;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$7 = _tmpl$2(), _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling;
        insert(_el$7, error, _el$0);
        _el$0.$$click = fetchSummary;
        return _el$7;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return summary();
      },
      get children() {
        return [(() => {
          var _el$1 = _tmpl$3(), _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$13.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling;
          insert(_el$12, () => summary().totalClusters);
          insert(_el$15, () => summary().totalIncidents);
          insert(_el$18, createComponent(For, {
            get each() {
              return Object.entries(summary().severityCounts || {});
            },
            children: ([severity, count]) => (() => {
              var _el$31 = _tmpl$9(), _el$32 = _el$31.firstChild;
              insert(_el$31, severity, _el$32);
              insert(_el$31, count, null);
              createRenderEffect((_p$) => {
                var _v$ = getSeverityColor(severity) + "20", _v$2 = getSeverityColor(severity);
                _v$ !== _p$.e && setStyleProperty(_el$31, "background", _p$.e = _v$);
                _v$2 !== _p$.t && setStyleProperty(_el$31, "color", _p$.t = _v$2);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              return _el$31;
            })()
          }));
          insert(_el$21, createComponent(For, {
            get each() {
              return summary().topPatterns?.slice(0, 3) || [];
            },
            children: (pattern) => (() => {
              var _el$33 = _tmpl$0();
              insert(_el$33, pattern);
              return _el$33;
            })()
          }));
          return _el$1;
        })(), _tmpl$4(), (() => {
          var _el$23 = _tmpl$5();
          insert(_el$23, createComponent(For, {
            get each() {
              return summary().clusters || [];
            },
            children: (cluster) => (() => {
              var _el$34 = _tmpl$11(), _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling; _el$38.firstChild; var _el$40 = _el$36.nextSibling, _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild; _el$41.nextSibling; var _el$44 = _el$35.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$44.nextSibling, _el$47 = _el$46.firstChild, _el$48 = _el$47.nextSibling;
              insert(_el$37, () => cluster.clusterId || "Unknown Cluster");
              insert(_el$38, () => new Date(cluster.lastUpdated).toLocaleString(), null);
              insert(_el$41, () => cluster.healthScore.toFixed(0), _el$42);
              insert(_el$48, createComponent(For, {
                get each() {
                  return Object.entries(cluster.incidentCounts || {});
                },
                children: ([severity, count]) => (() => {
                  var _el$53 = _tmpl$12(), _el$54 = _el$53.firstChild;
                  insert(_el$53, severity, _el$54);
                  insert(_el$53, count, null);
                  createRenderEffect((_p$) => {
                    var _v$6 = getSeverityColor(severity) + "20", _v$7 = getSeverityColor(severity);
                    _v$6 !== _p$.e && setStyleProperty(_el$53, "background", _p$.e = _v$6);
                    _v$7 !== _p$.t && setStyleProperty(_el$53, "color", _p$.t = _v$7);
                    return _p$;
                  }, {
                    e: void 0,
                    t: void 0
                  });
                  return _el$53;
                })()
              }), null);
              insert(_el$48, createComponent(Show, {
                get when() {
                  return Object.keys(cluster.incidentCounts || {}).length === 0;
                },
                get children() {
                  return _tmpl$1();
                }
              }), null);
              insert(_el$34, createComponent(Show, {
                get when() {
                  return memo(() => !!cluster.topPatterns)() && cluster.topPatterns.length > 0;
                },
                get children() {
                  var _el$50 = _tmpl$10(), _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling;
                  insert(_el$52, createComponent(For, {
                    get each() {
                      return cluster.topPatterns;
                    },
                    children: (pattern) => (() => {
                      var _el$55 = _tmpl$13();
                      insert(_el$55, pattern);
                      return _el$55;
                    })()
                  }));
                  return _el$50;
                }
              }), null);
              createRenderEffect((_p$) => {
                var _v$3 = getHealthColor(cluster.healthScore), _v$4 = `${cluster.healthScore}%`, _v$5 = getHealthColor(cluster.healthScore);
                _v$3 !== _p$.e && setStyleProperty(_el$41, "color", _p$.e = _v$3);
                _v$4 !== _p$.t && setStyleProperty(_el$45, "width", _p$.t = _v$4);
                _v$5 !== _p$.a && setStyleProperty(_el$45, "background", _p$.a = _v$5);
                return _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0
              });
              return _el$34;
            })()
          }));
          return _el$23;
        })(), createComponent(Show, {
          get when() {
            return summary().clusters?.length === 0;
          },
          get children() {
            var _el$24 = _tmpl$6(), _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling; _el$26.nextSibling;
            return _el$24;
          }
        }), (() => {
          var _el$28 = _tmpl$7(), _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling;
          insert(_el$28, (() => {
            var _c$ = memo(() => !!summary()?.generatedAt);
            return () => _c$() ? new Date(summary().generatedAt).toLocaleString() : "N/A";
          })(), _el$30);
          _el$30.$$click = fetchSummary;
          insert(_el$30, () => loading() ? "Refreshing..." : "🔄 Refresh");
          createRenderEffect(() => _el$30.disabled = loading());
          return _el$28;
        })()];
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

export { MultiCluster as default };
//# sourceMappingURL=MultiCluster-D-uv3uLZ.js.map
