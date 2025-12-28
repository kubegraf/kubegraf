import { j as createResource, k as api, d as createComponent, S as Show, t as template, i as insert, s as setCurrentView, m as memo, v as delegateEvents } from './index-NnaOo1cf.js';
import { b as buildPodFilterQuery } from './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<button class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"style="background:rgba(14, 165, 233, 0.15);color:#0ea5e9;border:1px solid rgba(14, 165, 233, 0.3)">Pods (<!>)`), _tmpl$2 = /* @__PURE__ */ template(`<button class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"style="background:rgba(14, 165, 233, 0.15);color:#0ea5e9;border:1px solid rgba(14, 165, 233, 0.3)">ReplicaSets (<!>)`), _tmpl$3 = /* @__PURE__ */ template(`<button class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"style="background:rgba(14, 165, 233, 0.15);color:#0ea5e9;border:1px solid rgba(14, 165, 233, 0.3)">Services (<!>)`), _tmpl$4 = /* @__PURE__ */ template(`<button class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"style="background:rgba(14, 165, 233, 0.15);color:#0ea5e9;border:1px solid rgba(14, 165, 233, 0.3)">Ingresses (<!>)`), _tmpl$5 = /* @__PURE__ */ template(`<div class=space-y-3><h3 class="text-sm font-semibold"style=color:var(--text-primary)>Related</h3><div class="flex flex-wrap gap-2">`);
const RelatedResources = (props) => {
  const [related] = createResource(() => ({
    namespace: props.namespace,
    kind: props.kind,
    name: props.name
  }), async (params) => {
    try {
      return await api.getWorkloadRelated(params.namespace, params.kind, params.name);
    } catch (error) {
      console.error("Failed to fetch related resources:", error);
      return {
        pods: [],
        services: [],
        ingresses: [],
        replicasets: []
      };
    }
  });
  const handleNavigateToPods = () => {
    const query = buildPodFilterQuery({
      kind: props.kind,
      name: props.name,
      namespace: props.namespace
    });
    setCurrentView("pods");
    const url = new URL(window.location.href);
    url.search = query;
    window.history.pushState({}, "", url.toString());
  };
  const handleNavigateToServices = () => {
    setCurrentView("services");
  };
  const handleNavigateToIngresses = () => {
    setCurrentView("ingresses");
  };
  return createComponent(Show, {
    get when() {
      return related();
    },
    children: (data) => {
      const pods = data().pods || [];
      const services = data().services || [];
      const ingresses = data().ingresses || [];
      const replicasets = data().replicasets || [];
      const hasRelated = pods.length > 0 || services.length > 0 || ingresses.length > 0 || replicasets.length > 0;
      return createComponent(Show, {
        when: hasRelated,
        get children() {
          var _el$ = _tmpl$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling;
          insert(_el$3, createComponent(Show, {
            get when() {
              return pods.length > 0;
            },
            get children() {
              var _el$4 = _tmpl$(), _el$5 = _el$4.firstChild, _el$7 = _el$5.nextSibling; _el$7.nextSibling;
              _el$4.$$click = handleNavigateToPods;
              insert(_el$4, () => pods.length, _el$7);
              return _el$4;
            }
          }), null);
          insert(_el$3, createComponent(Show, {
            get when() {
              return memo(() => props.kind === "deployment")() && replicasets.length > 0;
            },
            get children() {
              var _el$8 = _tmpl$2(), _el$9 = _el$8.firstChild, _el$1 = _el$9.nextSibling; _el$1.nextSibling;
              _el$8.$$click = () => setCurrentView("deployments");
              insert(_el$8, () => replicasets.length, _el$1);
              return _el$8;
            }
          }), null);
          insert(_el$3, createComponent(Show, {
            get when() {
              return services.length > 0;
            },
            get children() {
              var _el$10 = _tmpl$3(), _el$11 = _el$10.firstChild, _el$13 = _el$11.nextSibling; _el$13.nextSibling;
              _el$10.$$click = handleNavigateToServices;
              insert(_el$10, () => services.length, _el$13);
              return _el$10;
            }
          }), null);
          insert(_el$3, createComponent(Show, {
            get when() {
              return ingresses.length > 0;
            },
            get children() {
              var _el$14 = _tmpl$4(), _el$15 = _el$14.firstChild, _el$17 = _el$15.nextSibling; _el$17.nextSibling;
              _el$14.$$click = handleNavigateToIngresses;
              insert(_el$14, () => ingresses.length, _el$17);
              return _el$14;
            }
          }), null);
          return _el$;
        }
      });
    }
  });
};
delegateEvents(["click"]);

export { RelatedResources as R };
//# sourceMappingURL=RelatedResources-COwjojL_.js.map
