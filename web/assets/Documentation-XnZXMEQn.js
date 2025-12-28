import { c as createSignal, t as template, i as insert, d as createComponent, S as Show, F as For, f as createRenderEffect, e as setAttribute, v as delegateEvents } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="max-w-6xl mx-auto p-6"style=color:var(--text-primary)><div class=mb-8><h1 class="text-4xl font-bold mb-4 gradient-text">KubēGraf Documentation</h1><p class=text-lg style=color:var(--text-muted)>Learn how to use KubēGraf effectively and understand all features</p></div><div class="card p-6 mb-8"style="background:var(--bg-surface);border:1px solid var(--accent-primary)"><div class="flex items-start gap-4"><svg class="w-6 h-6 flex-shrink-0 mt-1"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:#3b82f6><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg><div class=flex-1><h3 class="text-lg font-semibold mb-2"style=color:var(--text-primary)>Comprehensive Documentation Available Online</h3><p class="mb-3 text-sm"style=color:var(--text-muted)>For detailed guides, tutorials, API references, and the latest updates, visit our official documentation website.</p><a href=https://kubegraf.io/docs target=_blank rel="noopener noreferrer"class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"style=background:#3b82f6;color:white><span>Visit Documentation</span><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div></div></div><div class=space-y-4></div><div class="mt-8 card p-6"style="background:var(--bg-surface);border:1px solid var(--border-color)"><h2 class="text-xl font-semibold mb-4"style=color:var(--text-primary)>Quick Links</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><a href=https://kubegraf.io target=_blank rel="noopener noreferrer"class="p-4 rounded-lg hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="font-semibold mb-1"style=color:var(--text-primary)>Website</div><div class=text-sm style=color:var(--text-muted)>kubegraf.io</div></a><a href=https://github.com/kubegraf/kubegraf target=_blank rel="noopener noreferrer"class="p-4 rounded-lg hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="font-semibold mb-1"style=color:var(--text-primary)>GitHub</div><div class=text-sm style=color:var(--text-muted)>Source code & issues</div></a><a href=https://kubegraf.io/docs target=_blank rel="noopener noreferrer"class="p-4 rounded-lg hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="font-semibold mb-1"style=color:var(--text-primary)>Documentation</div><div class=text-sm style=color:var(--text-muted)>Full documentation`), _tmpl$2 = /* @__PURE__ */ template(`<div class="mt-6 pt-6 border-t"style=borderColor:var(--border-color)>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="card p-6"style="background:var(--bg-surface);border:1px solid var(--border-color)"><button class="w-full flex items-center gap-4 text-left"><div class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"style="background:rgba(6, 182, 212, 0.1)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div class=flex-1><h2 class="text-xl font-semibold mb-1"style=color:var(--text-primary)></h2><p class=text-sm style=color:var(--text-muted)></p></div><svg fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5l7 7-7 7">`), _tmpl$4 = /* @__PURE__ */ template(`<div class="mb-6 last:mb-0"><h3 class="text-lg font-semibold mb-3"style=color:var(--text-primary)></h3><ul class="list-disc list-inside space-y-2"style=color:var(--text-muted)>`), _tmpl$5 = /* @__PURE__ */ template(`<li class=text-sm>`);
const Documentation = () => {
  const [selectedSection, setSelectedSection] = createSignal(null);
  const sections = [{
    id: "overview",
    title: "Overview",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    description: "Get started with KubēGraf and understand the basics",
    content: [{
      title: "What is KubēGraf?",
      items: ["KubēGraf is an advanced Kubernetes visualization and management platform", "Provides real-time monitoring, resource management, and cluster insights", "Designed for DevOps engineers, SREs, and platform teams", "All data is stored locally on your device for maximum privacy"]
    }, {
      title: "Key Features",
      items: ["Real-time cluster monitoring and resource visualization", "Multi-cluster management and context switching", "Event monitoring and log error detection", "Security analysis and vulnerability scanning", "Cost analysis and optimization recommendations", "AI-powered insights and recommendations", "Configuration drift detection", "Web-based terminal access"]
    }, {
      title: "Getting Started",
      items: ["Connect to your Kubernetes cluster using kubeconfig", "Select your default namespace or view all namespaces", "Navigate through the sidebar to explore different resources", "Use the search functionality to quickly find resources", "Configure settings to customize your experience"]
    }]
  }, {
    id: "sidebar",
    title: "Sidebar Navigation",
    icon: "M4 6h16M4 12h16M4 18h16",
    description: "Understanding the sidebar and navigation structure",
    content: [{
      title: "Overview Section",
      items: ["<strong>Dashboard:</strong> High-level cluster overview with resource summaries and health metrics", "<strong>Topology:</strong> Visual representation of cluster resources and their relationships", "<strong>Live Events Stream:</strong> Real-time event monitoring with timeline, grouped views, and log errors"]
    }, {
      title: "Insights Section",
      items: ["<strong>Incidents:</strong> Track and manage cluster incidents and issues", "<strong>Anomalies:</strong> ML-powered anomaly detection for unusual cluster behavior", "<strong>Security:</strong> Security analysis, vulnerability scanning, and compliance checks", "<strong>Cost:</strong> Cloud cost analysis and optimization recommendations", "<strong>Drift:</strong> Configuration drift detection across deployments"]
    }, {
      title: "Workloads Section",
      items: ["<strong>Pods:</strong> View, manage, and debug pod resources", "<strong>Deployments:</strong> Manage deployment configurations and scaling", "<strong>StatefulSets:</strong> Handle stateful application deployments", "<strong>DaemonSets:</strong> Manage daemon set configurations", "<strong>Jobs:</strong> View and manage Kubernetes jobs", "<strong>CronJobs:</strong> Schedule and manage cron jobs", "<strong>PDB:</strong> Pod Disruption Budget management", "<strong>HPA:</strong> Horizontal Pod Autoscaler configuration"]
    }, {
      title: "Networking Section",
      items: ["<strong>Services:</strong> Manage service resources and endpoints", "<strong>Ingresses:</strong> Configure ingress rules and routing", "<strong>Network Policies:</strong> Define and manage network security policies"]
    }, {
      title: "Config & Storage Section",
      items: ["<strong>ConfigMaps:</strong> Manage configuration data", "<strong>Secrets:</strong> Handle sensitive data (encrypted)", "<strong>Certificates:</strong> Manage TLS certificates", "<strong>Storage:</strong> Persistent volumes and storage classes"]
    }, {
      title: "Access Control Section",
      items: ["<strong>Service Accounts:</strong> Manage service account resources", "<strong>RBAC:</strong> Roles, RoleBindings, ClusterRoles, and ClusterRoleBindings"]
    }, {
      title: "Platform Section",
      items: ["<strong>Nodes:</strong> View cluster nodes and their status", "<strong>User Management:</strong> Manage local user accounts and permissions", "<strong>Resource Map:</strong> Visual resource mapping and relationships", "<strong>Connectors:</strong> Integrate with external services", "<strong>Plugins:</strong> Extend functionality with plugins (Helm, ArgoCD, Flux)", "<strong>Terminal:</strong> Web-based terminal access to clusters"]
    }, {
      title: "Intelligence Section",
      items: ["<strong>AI Assistant:</strong> AI-powered chat for cluster management", "<strong>AutoFix:</strong> Automated issue detection and remediation", "<strong>SRE Agent:</strong> Site Reliability Engineering automation", "<strong>AI Agents:</strong> Custom AI agents for specific tasks"]
    }]
  }, {
    id: "features",
    title: "Core Features",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    description: "Detailed explanation of KubēGraf features",
    content: [{
      title: "Event Monitoring",
      items: ["Real-time Kubernetes event streaming", "Timeline view of all cluster events", "Grouped events by time periods", "Log error detection (HTTP 500, 502, 503, POST calls)", "Event statistics and severity analysis", "Filter by namespace, severity, and type"]
    }, {
      title: "Multi-Cluster Management",
      items: ["Connect to multiple Kubernetes clusters", "Switch between cluster contexts seamlessly", "View resources across all clusters", "Cluster health and status monitoring"]
    }, {
      title: "Security Analysis",
      items: ["CVE vulnerability scanning using NIST NVD database", "Security policy compliance checks", "Secret scanning and exposure detection", "Network policy analysis", "RBAC security assessment"]
    }, {
      title: "Cost Analysis",
      items: ["Cloud provider cost estimation", "Resource usage cost breakdown", "Optimization recommendations", "Cost trends and forecasting"]
    }, {
      title: "AI & ML Features",
      items: ["AI-powered chat assistant for cluster queries", "ML-based anomaly detection", "Automated optimization recommendations", "Predictive scaling suggestions"]
    }, {
      title: "Database & Backups",
      items: ["Local SQLite database for all data storage", "Automatic backups with configurable intervals", "Manual backup creation", "Backup restore functionality", "AES-256-GCM encryption for sensitive data", "Corruption prevention and integrity checks"]
    }]
  }, {
    id: "best-practices",
    title: "Best Practices",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    description: "Tips and best practices for using KubēGraf",
    content: [{
      title: "Security",
      items: ["Set KUBEGRAF_ENCRYPTION_KEY environment variable for production", "Regularly review and rotate credentials", "Enable automatic backups for critical clusters", "Use network policies to restrict cluster access", "Review security insights regularly"]
    }, {
      title: "Performance",
      items: ["Use namespace filtering to reduce load", "Adjust auto-refresh intervals based on needs", "Enable caching for frequently accessed resources", "Monitor resource usage in the dashboard"]
    }, {
      title: "Backup & Recovery",
      items: ["Configure automatic backups (recommended: 6-12 hours)", "Test restore procedures periodically", "Keep backups in a separate location", "Monitor backup status regularly"]
    }, {
      title: "Multi-Cluster",
      items: ["Use descriptive cluster names", "Organize clusters by environment (dev, staging, prod)", "Monitor all clusters from a single dashboard", "Use context switching for efficient management"]
    }]
  }];
  const toggleSection = (sectionId) => {
    setSelectedSection(selectedSection() === sectionId ? null : sectionId);
  };
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild; _el$3.nextSibling; var _el$5 = _el$2.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling; _el$0.nextSibling; var _el$10 = _el$5.nextSibling, _el$11 = _el$10.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild; _el$15.nextSibling; var _el$17 = _el$14.nextSibling, _el$18 = _el$17.firstChild; _el$18.nextSibling; var _el$20 = _el$17.nextSibling, _el$21 = _el$20.firstChild; _el$21.nextSibling;
    insert(_el$10, createComponent(For, {
      each: sections,
      children: (section) => (() => {
        var _el$23 = _tmpl$3(), _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.firstChild, _el$27 = _el$26.firstChild, _el$28 = _el$25.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$28.nextSibling;
        _el$24.$$click = () => toggleSection(section.id);
        insert(_el$29, () => section.title);
        insert(_el$30, () => section.description);
        insert(_el$23, createComponent(Show, {
          get when() {
            return selectedSection() === section.id;
          },
          get children() {
            var _el$32 = _tmpl$2();
            insert(_el$32, createComponent(For, {
              get each() {
                return section.content;
              },
              children: (content) => (() => {
                var _el$33 = _tmpl$4(), _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling;
                insert(_el$34, () => content.title);
                insert(_el$35, createComponent(For, {
                  get each() {
                    return content.items;
                  },
                  children: (item) => (() => {
                    var _el$36 = _tmpl$5();
                    _el$36.innerHTML = item;
                    return _el$36;
                  })()
                }));
                return _el$33;
              })()
            }));
            return _el$32;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$ = section.icon, _v$2 = `w-5 h-5 transition-transform flex-shrink-0 ${selectedSection() === section.id ? "rotate-90" : ""}`;
          _v$ !== _p$.e && setAttribute(_el$27, "d", _p$.e = _v$);
          _v$2 !== _p$.t && setAttribute(_el$31, "class", _p$.t = _v$2);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$23;
      })()
    }));
    return _el$;
  })();
};
delegateEvents(["click"]);

export { Documentation as default };
//# sourceMappingURL=Documentation-XnZXMEQn.js.map
