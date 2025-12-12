# UI tree (views, routes, buttons/actions)

Derived from:
- `ui/solid/src/config/navSections.ts` (sidebar sections/items)
- `ui/solid/src/components/AppContent.tsx` (view → route component)
- Heuristic extraction (route-level) for quick hints only

See also:
- `ui_layout.md` (global header/sidebar/quick-access/brain/ai panels)
- `views/*.md` (per-view: subtabs + buttons + key UI copy, including nested components)
- `docs/reports/UI_STRUCTURE.md` (hand-written feature descriptions)

## Overview

- **Dashboard** (`dashboard`) — route: `ui/solid/src/routes/Dashboard.tsx`
- **Cluster Overview** (`topology`) — route: `ui/solid/src/routes/ClusterOverview.tsx`
  - **links (text)**: `View Deployments`, `View Nodes`, `View Pods`, `View Services`
- **Live Events Stream** (`monitoredevents`) — route: `ui/solid/src/routes/MonitoredEvents.tsx`
  - **buttons (text)**: `Clear`, `Clear all`, `Select All`

## Insights

- **Incidents** (`incidents`) — route: `ui/solid/src/routes/Incidents.tsx`
- **Timeline Replay** (`timeline`) — route: `ui/solid/src/routes/Timeline.tsx`
- **Anomalies** (`anomalies`) — route: `ui/solid/src/routes/Anomalies.tsx`
- **Security Insights** (`security`) — route: `ui/solid/src/routes/Security.tsx`
  - **links (text)**: `Reference`
- **Cost Insights** (`cost`) — route: `ui/solid/src/routes/Cost.tsx`
- **Drift Detection** (`drift`) — route: `ui/solid/src/routes/Drift.tsx`
- **Continuity** (`continuity`) — route: `ui/solid/src/routes/Continuity.tsx`

## CD

- **Deploy** (`deployapp`)
- **Rollouts** (`rollouts`)

## Workloads

- **Pods** (`pods`) — route: `ui/solid/src/routes/Pods.tsx`
  - **buttons (text)**: `Delete Pod`, `Download`, `Start`
  - **links (text)**: `Open`
- **Deployments** (`deployments`) — route: `ui/solid/src/routes/Deployments.tsx`
  - **buttons (text)**: `Scale`
- **StatefulSets** (`statefulsets`) — route: `ui/solid/src/routes/StatefulSets.tsx`
  - **buttons (text)**: `Scale`
- **DaemonSets** (`daemonsets`) — route: `ui/solid/src/routes/DaemonSets.tsx`
- **Jobs** (`jobs`) — route: `ui/solid/src/routes/Jobs.tsx`
- **CronJobs** (`cronjobs`) — route: `ui/solid/src/routes/CronJobs.tsx`
- **PDB** (`pdb`) — route: `ui/solid/src/routes/PDB.tsx`
- **HPA** (`hpa`) — route: `ui/solid/src/routes/HPA.tsx`

## Networking

- **Services** (`services`) — route: `ui/solid/src/routes/Services.tsx`
  - **links (text)**: `Open`
- **Ingress** (`ingresses`) — route: `ui/solid/src/routes/Ingresses.tsx`
- **Network Policies** (`networkpolicies`) — route: `ui/solid/src/routes/NetworkPolicies.tsx`

## Config & Storage

- **ConfigMaps** (`configmaps`) — route: `ui/solid/src/routes/ConfigMaps.tsx`
- **Secrets** (`secrets`) — route: `ui/solid/src/routes/Secrets.tsx`
- **Certificates** (`certificates`) — route: `ui/solid/src/routes/Certificates.tsx`
- **PVs / PVCs** (`storage`) — route: `ui/solid/src/routes/Storage.tsx`

## Access Control

- **Service Accounts** (`serviceaccounts`) — route: `ui/solid/src/routes/ServiceAccounts.tsx`
- **RBAC** (`rbac`) — route: `ui/solid/src/routes/RBAC.tsx`

## Custom Resources

- **CRDs & Instances** (`customresources`) — route: `ui/solid/src/routes/CustomResources.tsx`

## Platform

- **Namespaces** (`namespaces`) — route: `ui/solid/src/routes/Namespaces.tsx`
- **Nodes** (`nodes`) — route: `ui/solid/src/routes/Nodes.tsx`
- **Users** (`usermanagement`) — route: `ui/solid/src/routes/UserManagement.tsx`
  - **buttons (text)**: `Logout`
- **Resource Map** (`resourcemap`) — route: `ui/solid/src/routes/ResourceMap.tsx`
- **Traffic Map** (`trafficmap`) — route: `ui/solid/src/routes/TrafficMapPage.tsx`
- **Integrations** (`connectors`) — route: `ui/solid/src/routes/Connectors.tsx`
  - **buttons (text)**: `Connector`
- **Plugins** (`plugins`) — route: `ui/solid/src/routes/Plugins.tsx`
  - **button titles**: `Apply changes from Git repository`, `Fetch latest state from cluster`
- **Terminal** (`terminal`) — route: `ui/solid/src/routes/Terminal.tsx`

## Intelligence

- **AI Assistant** (`ai`) — route: `ui/solid/src/routes/AIAssistant.tsx`
- **AutoFix Engine** (`autofix`) — route: `ui/solid/src/routes/AutoFix.tsx`
- **SRE Agent** (`sreagent`) — route: `ui/solid/src/routes/SREAgent.tsx`
  - **buttons (text)**: `Edit Configuration`, `Refresh`, `Save`
- **AI Agents** (`aiagents`) — route: `ui/solid/src/routes/AIAgents.tsx`

## ML

- **Training Jobs** (`trainingjobs`) — route: `ui/solid/src/routes/TrainingJobs.tsx`
- **Inference Services** (`inferenceservices`) — route: `ui/solid/src/routes/InferenceServices.tsx`
- **MLflow** (`mlflow`) — route: `ui/solid/src/routes/MLflow.tsx`
- **Feast** (`feast`) — route: `ui/solid/src/routes/Feast.tsx`
- **GPU Dashboard** (`gpudashboard`) — route: `ui/solid/src/routes/GPUDashboard.tsx`
