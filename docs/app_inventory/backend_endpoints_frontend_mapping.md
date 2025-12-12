# Backend endpoints and frontend mapping (generated from code)

**Source of truth**: backend route registrations in `web_server.go` (`http.HandleFunc(...)`), cross-referenced against Solid UI code under `ui/solid/src/`.

## Notes
- Many endpoints are **method-multiplexed** (same path handles GET/POST based on `r.Method` inside handler). `methods_hint` is a best-effort scan, not authoritative.
- `frontend_files` is based on **literal string matches** of the endpoint in UI source. Proxy endpoints like `/api/kiali/proxy/` are used as **prefixes** (the UI may call `/api/kiali/proxy` + path).
- If an endpoint shows **no frontend files**, it may still be used by the classic web UI, TUI, curl, or future UI work.

## `/api/apps`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/apps` | `ws.handleApps` | `apps.go` |  |
| `/api/apps/install` | `ws.handleInstallApp` | `apps.go` |  |
| `/api/apps/installed` | `ws.handleInstalledApps` | `apps.go` |  |
| `/api/apps/local-clusters` | `ws.handleLocalClusters` | `apps.go` |  |
| `/api/apps/uninstall` | `ws.handleUninstallApp` | `apps.go` |  |

## `/api/auth`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/auth/login` | `ws.handleLogin` | `iam.go` |  |
| `/api/auth/logout` | `ws.handleLogout` | `iam.go` |  |
| `/api/auth/me` | `ws.handleGetCurrentUser` | `iam.go` |  |
| `/api/auth/register` | `ws.handleRegister` | `iam.go` |  |
| `/api/auth/validate-token` | `ws.handleValidateSessionToken` | `web_server.go` |  |

## `/api/brain`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/brain/ml/predictions` | `ws.handleBrainMLPredictions` | `web_brain_ml.go` |  |
| `/api/brain/ml/summary` | `ws.handleBrainMLSummary` | `web_brain_ml.go` |  |
| `/api/brain/ml/timeline` | `ws.handleBrainMLTimeline` | `web_brain_ml.go` |  |
| `/api/brain/oom-insights` | `ws.handleBrainOOMInsights` | `web_brain.go` |  |
| `/api/brain/summary` | `ws.handleBrainSummary` | `web_brain.go` |  |
| `/api/brain/timeline` | `ws.handleBrainTimeline` | `web_brain.go` |  |

## `/api/certificate`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/certificate/delete` | `ws.handleCertificateDelete` | `web_server.go` |  |
| `/api/certificate/describe` | `ws.handleCertificateDescribe` | `web_server.go` |  |
| `/api/certificate/update` | `ws.handleCertificateUpdate` | `web_server.go` |  |
| `/api/certificate/yaml` | `ws.handleCertificateYAML` | `web_server.go` |  |

## `/api/certificates`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/certificates` | `ws.handleCertificates` | `web_resources.go` |  |

## `/api/clusters`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/clusters` | `ws.handleClusters` | `web_clusters.go` | `ui/solid/src/features/marketplace/clustering.ts` |
| `/api/clusters/connect` | `ws.handleClusterConnect` | `web_clusters.go` |  |
| `/api/clusters/disconnect` | `ws.handleClusterDisconnect` | `web_clusters.go` |  |
| `/api/clusters/events` | `ws.handleGetClusterEventsNew` | `web_clusters.go` |  |
| `/api/clusters/list` | `ws.handleListClustersNew` | `web_clusters.go` |  |
| `/api/clusters/namespaces` | `ws.handleGetClusterNamespacesNew` | `web_clusters.go` |  |
| `/api/clusters/pods` | `ws.handleGetClusterPodsNew` | `web_clusters.go` |  |
| `/api/clusters/refresh` | `ws.handleRefreshClusters` | `web_clusters.go` |  |
| `/api/clusters/status` | `ws.handleClusterStatus` | `web_clusters.go` |  |

## `/api/configmap`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/configmap/delete` | `ws.handleConfigMapDelete` | `web_server.go` |  |
| `/api/configmap/describe` | `ws.handleConfigMapDescribe` | `web_server.go` |  |
| `/api/configmap/details` | `ws.handleConfigMapDetails` | `web_server.go` |  |
| `/api/configmap/update` | `ws.handleConfigMapUpdate` | `web_server.go` |  |
| `/api/configmap/yaml` | `ws.handleConfigMapYAML` | `web_server.go` |  |

## `/api/configmaps`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/configmaps` | `ws.handleConfigMaps` | `web_resources.go` |  |

## `/api/contexts`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/contexts` | `ws.handleContexts` | `web_misc.go` | `ui/solid/src/stores/cluster.ts` |
| `/api/contexts/current` | `ws.handleCurrentContext` | `web_misc.go` |  |
| `/api/contexts/switch` | `ws.handleSwitchContext` | `web_misc.go` | `ui/solid/src/stores/cluster.ts` |

## `/api/continuity`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/continuity/summary` | `ws.handleContinuitySummary` | `web_continuity.go` |  |

## `/api/cronjob`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/cronjob/delete` | `ws.handleCronJobDelete` | `web_server.go` |  |
| `/api/cronjob/describe` | `ws.handleCronJobDescribe` | `web_server.go` |  |
| `/api/cronjob/details` | `ws.handleCronJobDetails` | `web_server.go` |  |
| `/api/cronjob/update` | `ws.handleCronJobUpdate` | `web_server.go` |  |
| `/api/cronjob/yaml` | `ws.handleCronJobYAML` | `web_server.go` |  |

## `/api/cronjobs`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/cronjobs` | `ws.handleCronJobs` | `web_resources.go` |  |

## `/api/daemonset`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/daemonset/delete` | `ws.handleDaemonSetDelete` | `web_server.go` |  |
| `/api/daemonset/describe` | `ws.handleDaemonSetDescribe` | `web_server.go` |  |
| `/api/daemonset/details` | `ws.handleDaemonSetDetails` | `web_server.go` |  |
| `/api/daemonset/restart` | `ws.handleDaemonSetRestart` | `web_server.go` |  |
| `/api/daemonset/update` | `ws.handleDaemonSetUpdate` | `web_server.go` |  |
| `/api/daemonset/yaml` | `ws.handleDaemonSetYAML` | `web_server.go` |  |

## `/api/daemonsets`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/daemonsets` | `ws.handleDaemonSets` | `web_resources.go` |  |
| `/api/daemonsets/bulk/delete` | `ws.handleBulkDaemonSetDelete` | `web_server.go` |  |
| `/api/daemonsets/bulk/restart` | `ws.handleBulkDaemonSetRestart` | `web_server.go` |  |

## `/api/database`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/database/backup/config` | `ws.handleBackupConfig` | `web_database_backup.go` |  |
| `/api/database/backup/list` | `ws.handleBackupList` | `web_database_backup.go` |  |
| `/api/database/backup/now` | `ws.handleBackupNow` | `web_database_backup.go` |  |
| `/api/database/backup/restore` | `ws.handleBackupRestore` | `web_database_backup.go` |  |
| `/api/database/backup/status` | `ws.handleBackupStatus` | `web_database_backup.go` |  |

## `/api/deployment`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/deployment/delete` | `ws.handleDeploymentDelete` | `web_server.go` |  |
| `/api/deployment/describe` | `ws.handleDeploymentDescribe` | `web_server.go` |  |
| `/api/deployment/details` | `ws.handleDeploymentDetails` | `web_server.go` |  |
| `/api/deployment/restart` | `ws.handleDeploymentRestart` | `web_server.go` |  |
| `/api/deployment/scale` | `ws.handleDeploymentScale` | `web_server.go` |  |
| `/api/deployment/update` | `ws.handleDeploymentUpdate` | `web_server.go` | `ui/solid/src/services/api.ts` |
| `/api/deployment/yaml` | `ws.handleDeploymentYAML` | `web_server.go` |  |

## `/api/deployments`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/deployments` | `ws.handleDeployments` | `web_resources.go` | `ui/solid/src/features/mlflow/MLflowPanel.tsx`<br/>`ui/solid/src/routes/ClusterOverview.tsx`<br/>`ui/solid/src/stores/cluster.ts` |
| `/api/deployments/bulk/delete` | `ws.handleBulkDeploymentDelete` | `web_server.go` |  |
| `/api/deployments/bulk/restart` | `ws.handleBulkDeploymentRestart` | `web_server.go` |  |

## `/api/events`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/events` | `ws.handleEvents` | `web_misc.go` |  |

## `/api/feast`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/feast/install` | `ws.handleFeastInstall` | `web_feast.go` |  |
| `/api/feast/status` | `ws.handleFeastStatus` | `web_feast.go` |  |

## `/api/gpu`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/gpu/install` | `ws.handleGPUInstall` | `web_gpu.go` |  |
| `/api/gpu/metrics` | `ws.handleGPUMetrics` | `web_gpu.go` |  |
| `/api/gpu/nodes` | `ws.handleGPUNodes` | `web_gpu.go` |  |
| `/api/gpu/status` | `ws.handleGPUStatus` | `web_gpu.go` |  |

## `/api/hpa`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/hpa/delete` | `ws.handleHPADelete` | `web_pdb_hpa.go` |  |
| `/api/hpa/describe` | `ws.handleHPADescribe` | `web_pdb_hpa.go` |  |
| `/api/hpa/update` | `ws.handleHPAUpdate` | `web_pdb_hpa.go` |  |
| `/api/hpa/yaml` | `ws.handleHPAYAML` | `web_pdb_hpa.go` |  |

## `/api/hpas`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/hpas` | `ws.handleHPAs` | `web_pdb_hpa.go` |  |

## `/api/impact`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/impact` | `ws.handleImpactAnalysis` | `web_handlers_impact.go` |  |

## `/api/incidents`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/incidents` | `ws.handleIncidents` | `web_incidents.go` |  |

## `/api/inference`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/inference/create` | `ws.handleInferenceCreate` | `web_inference.go` |  |
| `/api/inference/delete` | `ws.handleInferenceDelete` | `web_inference.go` |  |
| `/api/inference/get` | `ws.handleInferenceGet` | `web_inference.go` |  |
| `/api/inference/list` | `ws.handleInferenceList` | `web_inference.go` |  |
| `/api/inference/status` | `ws.handleInferenceGet` | `web_inference.go` |  |
| `/api/inference/test` | `ws.handleInferenceTest` | `web_inference.go` |  |

## `/api/ingress`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/ingress/delete` | `ws.handleIngressDelete` | `web_server.go` |  |
| `/api/ingress/describe` | `ws.handleIngressDescribe` | `web_server.go` |  |
| `/api/ingress/details` | `ws.handleIngressDetails` | `web_server.go` |  |
| `/api/ingress/update` | `ws.handleIngressUpdate` | `web_server.go` |  |
| `/api/ingress/yaml` | `ws.handleIngressYAML` | `web_server.go` |  |

## `/api/ingresses`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/ingresses` | `ws.handleIngresses` | `web_resources.go` |  |

## `/api/integrations`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/integrations/kiali/install` | `ws.handleKialiInstall` | `web_kiali.go` |  |
| `/api/integrations/kiali/status` | `ws.handleKialiStatus` | `web_kiali.go` |  |
| `/api/integrations/kiali/versions` | `ws.handleKialiVersions` | `web_kiali.go` |  |

## `/api/job`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/job/delete` | `ws.handleJobDelete` | `web_server.go` |  |
| `/api/job/describe` | `ws.handleJobDescribe` | `web_server.go` |  |
| `/api/job/details` | `ws.handleJobDetails` | `web_server.go` |  |
| `/api/job/update` | `ws.handleJobUpdate` | `web_server.go` |  |
| `/api/job/yaml` | `ws.handleJobYAML` | `web_server.go` |  |

## `/api/jobs`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/jobs` | `ws.handleJobs` | `web_resources.go` |  |

## `/api/kiali`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/kiali/proxy` | `ws.handleKialiProxy` | `web_kiali.go` | `ui/solid/src/features/kiali/KialiDashboard.tsx`<br/>`ui/solid/src/services/kiali.ts` |
| `/api/kiali/proxy/` | `ws.handleKialiProxy` | `web_kiali.go` | `ui/solid/src/features/kiali/KialiDashboard.tsx` |

## `/api/local`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/local/terminal` | `ws.handleLocalTerminalWS` | `web_server.go` | `ui/solid/src/components/LocalTerminal.tsx` |

## `/api/mcp`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/mcp` | `ws.mcpServer.HandleRequest` | `` | `ui/solid/src/routes/AIAgents.tsx` |

## `/api/metrics`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/metrics` | `ws.handleMetrics` | `web_misc.go` |  |

## `/api/ml`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/ml/jobs/create` | `ws.handleMLJobCreate` | `web_ml_jobs.go` |  |
| `/api/ml/jobs/delete` | `ws.handleMLJobDelete` | `web_ml_jobs.go` |  |
| `/api/ml/jobs/get` | `ws.handleMLJobGet` | `web_ml_jobs.go` |  |
| `/api/ml/jobs/list` | `ws.handleMLJobList` | `web_ml_jobs.go` |  |
| `/api/ml/jobs/logs` | `ws.handleMLJobLogs` | `web_ml_jobs.go` | `ui/solid/src/services/mlJobs.ts` |
| `/api/ml/jobs/logs/ws` | `ws.handleMLJobLogsWS` | `web_ml_jobs.go` | `ui/solid/src/services/mlJobs.ts` |

## `/api/mlflow`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/mlflow/install` | `ws.handleMLflowInstall` | `web_mlflow.go` |  |
| `/api/mlflow/proxy` | `ws.ProxyMLflowAPI` | `mlflow_proxy.go` | `ui/solid/src/features/mlflow/MLflowPanel.tsx`<br/>`ui/solid/src/services/mlflow.ts` |
| `/api/mlflow/proxy/` | `ws.ProxyMLflowAPI` | `mlflow_proxy.go` | `ui/solid/src/features/mlflow/MLflowPanel.tsx` |
| `/api/mlflow/status` | `ws.handleMLflowStatus` | `web_mlflow.go` |  |
| `/api/mlflow/upgrade` | `ws.handleMLflowUpgrade` | `web_mlflow.go` |  |
| `/api/mlflow/versions` | `ws.handleMLflowVersions` | `web_mlflow.go` |  |

## `/api/namespace`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/namespace/delete` | `ws.handleNamespaceDelete` | `web_server.go` |  |
| `/api/namespace/describe` | `ws.handleNamespaceDescribe` | `web_server.go` |  |
| `/api/namespace/details` | `ws.handleNamespaceDetails` | `web_server.go` |  |
| `/api/namespace/update` | `ws.handleNamespaceUpdate` | `web_server.go` |  |
| `/api/namespace/yaml` | `ws.handleNamespaceYAML` | `web_server.go` |  |

## `/api/namespaces`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/namespaces` | `ws.handleNamespaces` | `web_misc.go` | `ui/solid/src/stores/cluster.ts`<br/>`ui/solid/src/stores/namespace.ts` |

## `/api/networkpolicies`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/networkpolicies` | `ws.handleNetworkPolicies` | `web_resources.go` |  |

## `/api/networkpolicy`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/networkpolicy/delete` | `ws.handleNetworkPolicyDelete` | `web_server.go` |  |
| `/api/networkpolicy/describe` | `ws.handleNetworkPolicyDescribe` | `web_server.go` |  |
| `/api/networkpolicy/details` | `ws.handleNetworkPolicyDetails` | `web_server.go` |  |
| `/api/networkpolicy/yaml` | `ws.handleNetworkPolicyYAML` | `web_server.go` |  |

## `/api/node`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/node/describe` | `ws.handleNodeDescribe` | `web_server.go` |  |
| `/api/node/details` | `ws.handleNodeDetails` | `web_server.go` |  |
| `/api/node/yaml` | `ws.handleNodeYAML` | `web_server.go` |  |

## `/api/nodes`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/nodes` | `ws.handleNodes` | `web_resources.go` | `ui/solid/src/routes/ClusterOverview.tsx`<br/>`ui/solid/src/stores/cluster.ts` |

## `/api/pdb`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/pdb/delete` | `ws.handlePDBDelete` | `web_pdb_hpa.go` |  |
| `/api/pdb/describe` | `ws.handlePDBDescribe` | `web_pdb_hpa.go` |  |
| `/api/pdb/update` | `ws.handlePDBUpdate` | `web_pdb_hpa.go` |  |
| `/api/pdb/yaml` | `ws.handlePDBYAML` | `web_pdb_hpa.go` |  |

## `/api/pdbs`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/pdbs` | `ws.handlePDBs` | `web_pdb_hpa.go` |  |

## `/api/plugins`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/plugins/argocd/app` | `ws.handleArgoCDAppDetails` | `web_gitops.go` |  |
| `/api/plugins/argocd/apps` | `ws.handleArgoCDApps` | `web_gitops.go` |  |
| `/api/plugins/argocd/refresh` | `ws.handleArgoCDRefresh` | `web_gitops.go` |  |
| `/api/plugins/argocd/sync` | `ws.handleArgoCDSync` | `web_gitops.go` |  |
| `/api/plugins/flux/resources` | `ws.handleFluxResources` | `web_gitops.go` |  |
| `/api/plugins/helm/history` | `ws.handleHelmReleaseHistory` | `web_gitops.go` |  |
| `/api/plugins/helm/release` | `ws.handleHelmReleaseDetails` | `web_gitops.go` |  |
| `/api/plugins/helm/releases` | `ws.handleHelmReleases` | `web_gitops.go` |  |
| `/api/plugins/helm/rollback` | `ws.handleHelmRollback` | `web_gitops.go` |  |
| `/api/plugins/kustomize/resources` | `ws.handleKustomizeResources` | `web_gitops.go` |  |

## `/api/pod`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/pod/delete` | `ws.handlePodDelete` | `web_server.go` |  |
| `/api/pod/describe` | `ws.handlePodDescribe` | `web_server.go` |  |
| `/api/pod/details` | `ws.handlePodDetails` | `web_misc.go` |  |
| `/api/pod/exec` | `ws.handlePodExec` | `web_server.go` | `ui/solid/src/routes/Pods.tsx` |
| `/api/pod/logs` | `ws.handlePodLogs` | `web_server.go` | `ui/solid/src/components/LogsModal.tsx`<br/>`ui/solid/src/routes/Logs.tsx`<br/>`ui/solid/src/routes/Pods.tsx` |
| `/api/pod/restart` | `ws.handlePodRestart` | `web_server.go` |  |
| `/api/pod/terminal` | `ws.handlePodTerminalWS` | `web_server.go` |  |
| `/api/pod/update` | `ws.handlePodUpdate` | `web_server.go` | `ui/solid/src/services/api.ts` |
| `/api/pod/yaml` | `ws.handlePodYAML` | `web_server.go` |  |

## `/api/pods`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/pods` | `ws.handlePods` | `web_resources.go` | `ui/solid/src/routes/ClusterOverview.tsx`<br/>`ui/solid/src/stores/cluster.ts` |
| `/api/pods/metrics` | `ws.handlePodMetrics` | `web_resources.go` |  |

## `/api/portforward`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/portforward/list` | `ws.handlePortForwardList` | `web_portforward.go` |  |
| `/api/portforward/start` | `ws.handlePortForwardStart` | `web_portforward.go` |  |
| `/api/portforward/stop` | `ws.handlePortForwardStop` | `web_portforward.go` |  |

## `/api/resourcemap`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/resourcemap` | `ws.handleResourceMap` | `web_misc.go` |  |

## `/api/secret`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/secret/delete` | `ws.handleSecretDelete` | `web_server.go` |  |
| `/api/secret/describe` | `ws.handleSecretDescribe` | `web_server.go` |  |
| `/api/secret/update` | `ws.handleSecretUpdate` | `web_server.go` | `ui/solid/src/services/api.ts` |
| `/api/secret/yaml` | `ws.handleSecretYAML` | `web_server.go` |  |

## `/api/secrets`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/secrets` | `ws.handleSecrets` | `web_resources.go` |  |

## `/api/security`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/security` | `ws.handleSecurityAnalysis` | `web_security.go` |  |

## `/api/service`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/service/delete` | `ws.handleServiceDelete` | `web_server.go` |  |
| `/api/service/describe` | `ws.handleServiceDescribe` | `web_server.go` |  |
| `/api/service/details` | `ws.handleServiceDetails` | `web_server.go` |  |
| `/api/service/update` | `ws.handleServiceUpdate` | `web_server.go` |  |
| `/api/service/yaml` | `ws.handleServiceYAML` | `web_server.go` |  |

## `/api/services`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/services` | `ws.handleServices` | `web_resources.go` | `ui/solid/src/routes/ClusterOverview.tsx`<br/>`ui/solid/src/stores/cluster.ts`<br/>`ui/solid/src/utils/mlDetection.ts` |

## `/api/statefulset`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/statefulset/delete` | `ws.handleStatefulSetDelete` | `web_server.go` |  |
| `/api/statefulset/describe` | `ws.handleStatefulSetDescribe` | `web_server.go` |  |
| `/api/statefulset/details` | `ws.handleStatefulSetDetails` | `web_server.go` |  |
| `/api/statefulset/restart` | `ws.handleStatefulSetRestart` | `web_server.go` |  |
| `/api/statefulset/scale` | `ws.handleStatefulSetScale` | `web_server.go` |  |
| `/api/statefulset/update` | `ws.handleStatefulSetUpdate` | `web_server.go` |  |
| `/api/statefulset/yaml` | `ws.handleStatefulSetYAML` | `web_server.go` |  |

## `/api/statefulsets`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/statefulsets` | `ws.handleStatefulSets` | `web_resources.go` |  |
| `/api/statefulsets/bulk/delete` | `ws.handleBulkStatefulSetDelete` | `web_server.go` |  |
| `/api/statefulsets/bulk/restart` | `ws.handleBulkStatefulSetRestart` | `web_server.go` |  |

## `/api/status`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/status` | `ws.handleConnectionStatus` | `web_misc.go` | `ui/solid/src/stores/cluster.ts` |

## `/api/topology`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/topology` | `ws.handleTopology` | `web_misc.go` | `ui/solid/src/utils/prefetch.ts` |

## `/api/traffic`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/traffic/metrics` | `ws.handleTrafficMetrics` | `web_traffic_metrics.go` | `ui/solid/src/features/kiali/LiveTrafficMap.tsx` |

## `/api/update`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/update/auto-check` | `ws.handleAutoCheckUpdates` | `web_update_handlers.go` |  |
| `/api/update/check` | `ws.handleCheckUpdates` | `web_misc.go` |  |

## `/api/updates`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/updates/check` | `ws.handleCheckUpdates` | `web_misc.go` |  |
| `/api/updates/install` | `ws.handleInstallUpdate` | `web_misc.go` |  |

## `/api/workspace`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/api/workspace/context` | `ws.handleWorkspaceContext` | `web_workspace.go` |  |

## `/terminal`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/terminal` | `ws.handleLocalTerminalPage` | `web_server.go` | `ui/solid/src/components/LocalTerminal.tsx` |

## `/ws`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/ws` | `ws.handleWebSocket` | `web_server.go` | `ui/solid/src/components/ShellModal.tsx`<br/>`ui/solid/src/services/mlJobs.ts`<br/>`ui/solid/src/services/websocket.ts` |

## `static (SPA + assets)`

| Endpoint | Handler | Handler file | Frontend references |
|---|---|---|---|
| `/` | `staticHandler` | `` | `ui/solid/src/components/DescribeModal.tsx`<br/>`ui/solid/src/components/DockedTerminal.tsx`<br/>`ui/solid/src/components/LocalTerminal.tsx`<br/>`ui/solid/src/components/LoginModal.tsx`<br/>`ui/solid/src/components/LogsModal.tsx`<br/>`ui/solid/src/components/ShellModal.tsx`<br/>`ui/solid/src/features/kiali/KialiDashboard.tsx`<br/>`ui/solid/src/features/kiali/LiveTrafficMap.tsx`<br/>`ui/solid/src/features/marketplace/clustering.ts`<br/>`ui/solid/src/features/mlflow/MLflowPanel.tsx`<br/>`ui/solid/src/routes/AIAgents.tsx`<br/>`ui/solid/src/routes/ClusterOverview.tsx`<br/>`ui/solid/src/routes/Connectors.tsx`<br/>`ui/solid/src/routes/CustomResources.tsx`<br/>`ui/solid/src/routes/Logs.tsx`<br/>`ui/solid/src/routes/Pods.tsx`<br/>`ui/solid/src/routes/RBAC.tsx`<br/>`ui/solid/src/routes/SREAgent.tsx`<br/>`ui/solid/src/routes/ServiceAccounts.tsx`<br/>`ui/solid/src/routes/Storage.tsx`<br/>`ui/solid/src/routes/UserManagement.tsx`<br/>`ui/solid/src/services/api.ts`<br/>`ui/solid/src/services/kiali.ts`<br/>`ui/solid/src/services/mlJobs.ts`<br/>`ui/solid/src/services/mlflow.ts`<br/>`ui/solid/src/services/websocket.ts`<br/>`ui/solid/src/stores/ai.ts`<br/>`ui/solid/src/stores/cluster.ts`<br/>`ui/solid/src/stores/namespace.ts`<br/>`ui/solid/src/utils/containerTypes.ts`<br/>`ui/solid/src/utils/mlDetection.ts`<br/>`ui/solid/src/utils/prefetch.ts` |
