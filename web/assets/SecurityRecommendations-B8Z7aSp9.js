import { t as template, i as insert, d as createComponent, f as createRenderEffect, e as setAttribute, F as For } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="mb-6 rounded-lg border p-4"style=background:var(--bg-card);border-color:var(--border-color)><div class="flex items-start gap-3"><div class=text-2xl>🔐</div><div class=flex-1><h3 class="font-semibold mb-2"style=color:var(--text-primary)>Security Recommendations</h3><p class="text-sm mb-3"style=color:var(--text-secondary)>We recommend implementing the following security best practices for a secure Kubernetes environment:</p><div class=space-y-2>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-start gap-2 p-2 rounded"style=background:var(--bg-secondary)><span class=text-lg></span><div class=flex-1><div class="font-medium text-sm"style=color:var(--text-primary)></div><div class="text-xs mt-1"style=color:var(--text-secondary)></div><a target=_blank rel="noopener noreferrer"class="text-xs mt-1 inline-block"style=color:var(--accent-primary)>Learn more →`);
const SecurityRecommendations = (props) => {
  const recommendations = () => {
    const baseRecommendations = [{
      title: "Pod Security Contexts",
      description: "Configure security contexts to run pods with least privilege. Set runAsNonRoot, readOnlyRootFilesystem, and drop capabilities.",
      icon: "🔒",
      link: "https://kubernetes.io/docs/concepts/security/pod-security-standards/"
    }, {
      title: "Network Policies",
      description: "Implement network policies to control traffic flow between pods and enforce network segmentation.",
      icon: "🛡️",
      link: "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
    }];
    if (props.resourceType === "PDB") {
      return [...baseRecommendations, {
        title: "Pod Disruption Budgets",
        description: "Ensure PDBs are configured for critical workloads to maintain availability during voluntary disruptions.",
        icon: "⚖️",
        link: "https://kubernetes.io/docs/tasks/run-application/configure-pdb/"
      }];
    }
    if (props.resourceType === "HPA") {
      return [...baseRecommendations, {
        title: "Horizontal Pod Autoscalers",
        description: "Use HPAs to automatically scale workloads based on resource utilization, ensuring optimal performance and cost efficiency.",
        icon: "📈",
        link: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/"
      }];
    }
    return baseRecommendations;
  };
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling;
    insert(_el$7, createComponent(For, {
      get each() {
        return recommendations();
      },
      children: (rec) => (() => {
        var _el$8 = _tmpl$2(), _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$10.nextSibling;
        insert(_el$9, () => rec.icon);
        insert(_el$1, () => rec.title);
        insert(_el$10, () => rec.description);
        createRenderEffect(() => setAttribute(_el$11, "href", rec.link));
        return _el$8;
      })()
    }));
    return _el$;
  })();
};

export { SecurityRecommendations as S };
//# sourceMappingURL=SecurityRecommendations-B8Z7aSp9.js.map
