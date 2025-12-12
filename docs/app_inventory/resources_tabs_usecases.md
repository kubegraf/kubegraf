# Resource tabs: what they are + how they are powered

This is a **wiring-focused** companion to `docs/reports/UI_STRUCTURE.md`. It shows:
- which **view** implements a resource tab
- which **backend endpoints** power the view
- which **UI files** call those endpoints (literal matches)

## Pods (`pods`)
- **Route**: `ui/solid/src/routes/Pods.tsx`
- **Primary list endpoint**: `/api/pods` → `ws.handlePods`
- **UI callers (literal matches)**: `ui/solid/src/routes/ClusterOverview.tsx`, `ui/solid/src/stores/cluster.ts`
- **Detail/CRUD endpoints**:
  - `/api/pod/delete` → `ws.handlePodDelete`
  - `/api/pod/describe` → `ws.handlePodDescribe`
  - `/api/pod/details` → `ws.handlePodDetails`
  - `/api/pod/exec` → `ws.handlePodExec`
  - `/api/pod/logs` → `ws.handlePodLogs`
  - `/api/pod/restart` → `ws.handlePodRestart`
  - `/api/pod/terminal` → `ws.handlePodTerminalWS`
  - `/api/pod/update` → `ws.handlePodUpdate`
  - `/api/pod/yaml` → `ws.handlePodYAML`
- **UI actions (route-level)**:
  - buttons: `Delete Pod`, `Download`, `Start`
  - links: `Open`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Deployments (`deployments`)
- **Route**: `ui/solid/src/routes/Deployments.tsx`
- **Primary list endpoint**: `/api/deployments` → `ws.handleDeployments`
- **UI callers (literal matches)**: `ui/solid/src/features/mlflow/MLflowPanel.tsx`, `ui/solid/src/routes/ClusterOverview.tsx`, `ui/solid/src/stores/cluster.ts`
- **Detail/CRUD endpoints**:
  - `/api/deployment/delete` → `ws.handleDeploymentDelete`
  - `/api/deployment/describe` → `ws.handleDeploymentDescribe`
  - `/api/deployment/details` → `ws.handleDeploymentDetails`
  - `/api/deployment/restart` → `ws.handleDeploymentRestart`
  - `/api/deployment/scale` → `ws.handleDeploymentScale`
  - `/api/deployment/update` → `ws.handleDeploymentUpdate`
  - `/api/deployment/yaml` → `ws.handleDeploymentYAML`
- **UI actions (route-level)**:
  - buttons: `Scale`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## StatefulSets (`statefulsets`)
- **Route**: `ui/solid/src/routes/StatefulSets.tsx`
- **Primary list endpoint**: `/api/statefulsets` → `ws.handleStatefulSets`
- **Detail/CRUD endpoints**:
  - `/api/statefulset/delete` → `ws.handleStatefulSetDelete`
  - `/api/statefulset/describe` → `ws.handleStatefulSetDescribe`
  - `/api/statefulset/details` → `ws.handleStatefulSetDetails`
  - `/api/statefulset/restart` → `ws.handleStatefulSetRestart`
  - `/api/statefulset/scale` → `ws.handleStatefulSetScale`
  - `/api/statefulset/update` → `ws.handleStatefulSetUpdate`
  - `/api/statefulset/yaml` → `ws.handleStatefulSetYAML`
- **UI actions (route-level)**:
  - buttons: `Scale`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## DaemonSets (`daemonsets`)
- **Route**: `ui/solid/src/routes/DaemonSets.tsx`
- **Primary list endpoint**: `/api/daemonsets` → `ws.handleDaemonSets`
- **Detail/CRUD endpoints**:
  - `/api/daemonset/delete` → `ws.handleDaemonSetDelete`
  - `/api/daemonset/describe` → `ws.handleDaemonSetDescribe`
  - `/api/daemonset/details` → `ws.handleDaemonSetDetails`
  - `/api/daemonset/restart` → `ws.handleDaemonSetRestart`
  - `/api/daemonset/update` → `ws.handleDaemonSetUpdate`
  - `/api/daemonset/yaml` → `ws.handleDaemonSetYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Jobs (`jobs`)
- **Route**: `ui/solid/src/routes/Jobs.tsx`
- **Primary list endpoint**: `/api/jobs` → `ws.handleJobs`
- **Detail/CRUD endpoints**:
  - `/api/job/delete` → `ws.handleJobDelete`
  - `/api/job/describe` → `ws.handleJobDescribe`
  - `/api/job/details` → `ws.handleJobDetails`
  - `/api/job/update` → `ws.handleJobUpdate`
  - `/api/job/yaml` → `ws.handleJobYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## CronJobs (`cronjobs`)
- **Route**: `ui/solid/src/routes/CronJobs.tsx`
- **Primary list endpoint**: `/api/cronjobs` → `ws.handleCronJobs`
- **Detail/CRUD endpoints**:
  - `/api/cronjob/delete` → `ws.handleCronJobDelete`
  - `/api/cronjob/describe` → `ws.handleCronJobDescribe`
  - `/api/cronjob/details` → `ws.handleCronJobDetails`
  - `/api/cronjob/update` → `ws.handleCronJobUpdate`
  - `/api/cronjob/yaml` → `ws.handleCronJobYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## PDB (`pdb`)
- **Route**: `ui/solid/src/routes/PDB.tsx`
- **Primary list endpoint**: `/api/pdbs` → `ws.handlePDBs`
- **Detail/CRUD endpoints**:
  - `/api/pdb/delete` → `ws.handlePDBDelete`
  - `/api/pdb/describe` → `ws.handlePDBDescribe`
  - `/api/pdb/update` → `ws.handlePDBUpdate`
  - `/api/pdb/yaml` → `ws.handlePDBYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## HPA (`hpa`)
- **Route**: `ui/solid/src/routes/HPA.tsx`
- **Primary list endpoint**: `/api/hpas` → `ws.handleHPAs`
- **Detail/CRUD endpoints**:
  - `/api/hpa/delete` → `ws.handleHPADelete`
  - `/api/hpa/describe` → `ws.handleHPADescribe`
  - `/api/hpa/update` → `ws.handleHPAUpdate`
  - `/api/hpa/yaml` → `ws.handleHPAYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Services (`services`)
- **Route**: `ui/solid/src/routes/Services.tsx`
- **Primary list endpoint**: `/api/services` → `ws.handleServices`
- **UI callers (literal matches)**: `ui/solid/src/routes/ClusterOverview.tsx`, `ui/solid/src/stores/cluster.ts`, `ui/solid/src/utils/mlDetection.ts`
- **Detail/CRUD endpoints**:
  - `/api/service/delete` → `ws.handleServiceDelete`
  - `/api/service/describe` → `ws.handleServiceDescribe`
  - `/api/service/details` → `ws.handleServiceDetails`
  - `/api/service/update` → `ws.handleServiceUpdate`
  - `/api/service/yaml` → `ws.handleServiceYAML`
- **UI actions (route-level)**:
  - links: `Open`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Ingress (`ingresses`)
- **Route**: `ui/solid/src/routes/Ingresses.tsx`
- **Primary list endpoint**: `/api/ingresses` → `ws.handleIngresses`
- **Detail/CRUD endpoints**:
  - `/api/ingress/delete` → `ws.handleIngressDelete`
  - `/api/ingress/describe` → `ws.handleIngressDescribe`
  - `/api/ingress/details` → `ws.handleIngressDetails`
  - `/api/ingress/update` → `ws.handleIngressUpdate`
  - `/api/ingress/yaml` → `ws.handleIngressYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Network Policies (`networkpolicies`)
- **Route**: `ui/solid/src/routes/NetworkPolicies.tsx`
- **Primary list endpoint**: `/api/networkpolicies` → `ws.handleNetworkPolicies`
- **Detail/CRUD endpoints**:
  - `/api/networkpolicy/delete` → `ws.handleNetworkPolicyDelete`
  - `/api/networkpolicy/describe` → `ws.handleNetworkPolicyDescribe`
  - `/api/networkpolicy/details` → `ws.handleNetworkPolicyDetails`
  - `/api/networkpolicy/yaml` → `ws.handleNetworkPolicyYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## ConfigMaps (`configmaps`)
- **Route**: `ui/solid/src/routes/ConfigMaps.tsx`
- **Primary list endpoint**: `/api/configmaps` → `ws.handleConfigMaps`
- **Detail/CRUD endpoints**:
  - `/api/configmap/delete` → `ws.handleConfigMapDelete`
  - `/api/configmap/describe` → `ws.handleConfigMapDescribe`
  - `/api/configmap/details` → `ws.handleConfigMapDetails`
  - `/api/configmap/update` → `ws.handleConfigMapUpdate`
  - `/api/configmap/yaml` → `ws.handleConfigMapYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Secrets (`secrets`)
- **Route**: `ui/solid/src/routes/Secrets.tsx`
- **Primary list endpoint**: `/api/secrets` → `ws.handleSecrets`
- **Detail/CRUD endpoints**:
  - `/api/secret/delete` → `ws.handleSecretDelete`
  - `/api/secret/describe` → `ws.handleSecretDescribe`
  - `/api/secret/update` → `ws.handleSecretUpdate`
  - `/api/secret/yaml` → `ws.handleSecretYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Certificates (`certificates`)
- **Route**: `ui/solid/src/routes/Certificates.tsx`
- **Primary list endpoint**: `/api/certificates` → `ws.handleCertificates`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## PVs / PVCs (`storage`)
- **Route**: `ui/solid/src/routes/Storage.tsx`
- **Primary list endpoint**: (varies / not a single list endpoint)
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Namespaces (`namespaces`)
- **Route**: `ui/solid/src/routes/Namespaces.tsx`
- **Primary list endpoint**: `/api/namespaces` → `ws.handleNamespaces`
- **UI callers (literal matches)**: `ui/solid/src/stores/cluster.ts`, `ui/solid/src/stores/namespace.ts`
- **Detail/CRUD endpoints**:
  - `/api/namespace/delete` → `ws.handleNamespaceDelete`
  - `/api/namespace/describe` → `ws.handleNamespaceDescribe`
  - `/api/namespace/details` → `ws.handleNamespaceDetails`
  - `/api/namespace/update` → `ws.handleNamespaceUpdate`
  - `/api/namespace/yaml` → `ws.handleNamespaceYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## Nodes (`nodes`)
- **Route**: `ui/solid/src/routes/Nodes.tsx`
- **Primary list endpoint**: `/api/nodes` → `ws.handleNodes`
- **UI callers (literal matches)**: `ui/solid/src/routes/ClusterOverview.tsx`, `ui/solid/src/stores/cluster.ts`
- **Detail/CRUD endpoints**:
  - `/api/node/describe` → `ws.handleNodeDescribe`
  - `/api/node/details` → `ws.handleNodeDetails`
  - `/api/node/yaml` → `ws.handleNodeYAML`
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.

## CRDs & Instances (`customresources`)
- **Route**: `ui/solid/src/routes/CustomResources.tsx`
- **Primary list endpoint**: (varies / not a single list endpoint)
- **Use-cases**: browse resources, inspect details (YAML/describe), and perform operations supported by that resource type.
