function kindAbbrev(kind) {
  switch (kind.toLowerCase()) {
    case "deployment":
      return "DEP";
    case "statefulset":
      return "STS";
    case "daemonset":
      return "DS";
    case "job":
      return "JOB";
    case "cronjob":
      return "CJ";
    case "replicaset":
      return "RS";
    default:
      return kind.toUpperCase().slice(0, 3);
  }
}
function formatWorkloadChain(ref) {
  if (!ref) {
    return "Unowned";
  }
  let chain = "Pod";
  if (ref.via) {
    for (const via of ref.via) {
      chain += ` → ${via.kind} ${via.name}`;
    }
  }
  chain += ` → ${ref.kind} ${ref.name}`;
  return chain;
}
function workloadKindToView(kind) {
  switch (kind.toLowerCase()) {
    case "deployment":
      return "deployments";
    case "statefulset":
      return "statefulsets";
    case "daemonset":
      return "daemonsets";
    case "job":
      return "jobs";
    case "cronjob":
      return "cronjobs";
    case "replicaset":
      return "deployments";
    default:
      return "pods";
  }
}
function buildPodFiltersFromWorkload(ref) {
  return {
    ownerKind: ref.kind,
    ownerName: ref.name,
    namespace: ref.namespace
  };
}
function buildPodFilterQuery(ref) {
  const params = buildPodFiltersFromWorkload(ref);
  const queryParams = new URLSearchParams();
  if (params.ownerKind) queryParams.set("ownerKind", params.ownerKind);
  if (params.ownerName) queryParams.set("ownerName", params.ownerName);
  if (params.namespace) queryParams.set("namespace", params.namespace);
  return queryParams.toString();
}
function buildWorkloadFocusUrl(ref) {
  workloadKindToView(ref.kind);
  const params = new URLSearchParams();
  if (ref.namespace) params.set("namespace", ref.namespace);
  params.set("focus", ref.name);
  return `?${params.toString()}`;
}
function navigateToWorkloadWithFocus(ref, setCurrentView, returnView) {
  const view = workloadKindToView(ref.kind);
  buildWorkloadFocusUrl(ref);
  const currentUrl = new URL(window.location.href);
  const newParams = new URLSearchParams();
  if (ref.namespace) newParams.set("namespace", ref.namespace);
  newParams.set("focus", ref.name);
  {
    newParams.set("returnView", returnView);
  }
  currentUrl.search = newParams.toString();
  window.history.pushState({}, "", currentUrl.toString());
  setCurrentView(view);
}

export { buildPodFilterQuery as b, formatWorkloadChain as f, kindAbbrev as k, navigateToWorkloadWithFocus as n };
//# sourceMappingURL=workload-navigation-Cle66AyL.js.map
