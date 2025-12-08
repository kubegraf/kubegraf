# Sidebar & Routing Refactor Proposal

## 1. Updated Sidebar Data Structure

```typescript
// New structure organized into separate files
const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '...' },
      { id: 'topology', label: 'Topology', icon: '...' },
      { id: 'monitoredevents', label: 'Live Events Stream', icon: '...' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'incidents', label: 'Incidents', icon: '...' },
      { id: 'anomalies', label: 'Anomalies', icon: '...' },
      { id: 'security', label: 'Security Insights', icon: '...' },
      { id: 'cost', label: 'Cost Insights', icon: '...' },
      { id: 'drift', label: 'Drift Detection', icon: '...' },
    ],
  },
  {
    title: 'Workloads',
    items: [
      { id: 'pods', label: 'Pods', icon: '...' },
      { id: 'deployments', label: 'Deployments', icon: '...' },
      { id: 'statefulsets', label: 'StatefulSets', icon: '...' },
      { id: 'daemonsets', label: 'DaemonSets', icon: '...' },
      { id: 'jobs', label: 'Jobs', icon: '...' },
      { id: 'cronjobs', label: 'CronJobs', icon: '...' },
    ],
  },
  {
    title: 'Networking',
    items: [
      { id: 'services', label: 'Services', icon: '...' },
      { id: 'ingresses', label: 'Ingress', icon: '...' },
      { id: 'networkpolicies', label: 'Network Policies', icon: '...' },
    ],
  },
  {
    title: 'Config & Storage',
    items: [
      { id: 'configmaps', label: 'ConfigMaps', icon: '...' },
      { id: 'secrets', label: 'Secrets', icon: '...' },
      { id: 'certificates', label: 'Certificates', icon: '...' },
      { id: 'storage', label: 'PVs / PVCs', icon: '...' },
      // Note: StorageClasses would be part of Storage view
    ],
  },
  {
    title: 'Platform',
    items: [
      { id: 'nodes', label: 'Nodes', icon: '...' },
      { id: 'rbac', label: 'RBAC', icon: '...' },
      { id: 'usermanagement', label: 'Users', icon: '...' },
      { id: 'resourcemap', label: 'Resource Map', icon: '...' },
      { id: 'connectors', label: 'Integrations', icon: '...' },
      { id: 'plugins', label: 'Plugins', icon: '...' },
      { id: 'terminal', label: 'Terminal', icon: '...' },
      { id: 'settings', label: 'Settings', icon: '...' },
      // Note: Version/About would be in Settings or footer
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'ai', label: 'AI Assistant', icon: '...' },
      { id: 'autofix', label: 'AutoFix Engine', icon: '...' },
      { id: 'sreagent', label: 'SRE Agent', icon: '...' },
      { id: 'aiagents', label: 'AI Agents', icon: '...' },
    ],
  },
  // ML section - conditionally shown
  {
    title: 'ML',
    items: [
      { id: 'trainingjobs', label: 'Training Jobs', icon: '...' },
      { id: 'inferenceservices', label: 'Inference Services', icon: '...' },
      { id: 'mlflow', label: 'MLflow', icon: '...' },
      { id: 'feast', label: 'Feast', icon: '...' },
      { id: 'gpudashboard', label: 'GPU Dashboard', icon: '...' },
    ],
    conditional: true, // Only show if ML features detected
  },
];
```

## 2. Updated Routing Tree

### View Mappings (existing views → new structure)

| New Section | View ID | Component | Status |
|------------|---------|-----------|--------|
| Overview → Dashboard | `dashboard` | Dashboard | ✅ Exists |
| Overview → Topology | `topology` | Topology | ✅ Exists |
| Overview → Live Events Stream | `monitoredevents` | MonitoredEvents | ✅ Exists |
| Insights → Incidents | `incidents` | Incidents | ✅ Exists |
| Insights → Anomalies | `anomalies` | Anomalies | ✅ Exists |
| Insights → Security Insights | `security` | Security | ✅ Exists |
| Insights → Cost Insights | `cost` | Cost | ✅ Exists |
| Insights → Drift Detection | `drift` | Drift | ✅ Exists |
| Workloads → Pods | `pods` | Pods | ✅ Exists |
| Workloads → Deployments | `deployments` | Deployments | ✅ Exists |
| Workloads → StatefulSets | `statefulsets` | StatefulSets | ✅ Exists |
| Workloads → DaemonSets | `daemonsets` | DaemonSets | ✅ Exists |
| Workloads → Jobs | `jobs` | Jobs | ✅ Exists |
| Workloads → CronJobs | `cronjobs` | CronJobs | ✅ Exists |
| Networking → Services | `services` | Services | ✅ Exists |
| Networking → Ingress | `ingresses` | Ingresses | ✅ Exists |
| Networking → Network Policies | `networkpolicies` | NetworkPolicies | ✅ Exists |
| Config & Storage → ConfigMaps | `configmaps` | ConfigMaps | ✅ Exists |
| Config & Storage → Secrets | `secrets` | Secrets | ✅ Exists |
| Config & Storage → Certificates | `certificates` | Certificates | ✅ Exists |
| Config & Storage → PVs / PVCs | `storage` | Storage | ✅ Exists |
| Platform → Nodes | `nodes` | Nodes | ✅ Exists |
| Platform → RBAC | `rbac` | RBAC | ✅ Exists |
| Platform → Users | `usermanagement` | UserManagement | ✅ Exists |
| Platform → Resource Map | `resourcemap` | ResourceMap | ✅ Exists |
| Platform → Integrations | `connectors` | Connectors | ✅ Exists |
| Platform → Plugins | `plugins` | Plugins | ✅ Exists |
| Platform → Terminal | `terminal` | Terminal | ✅ Exists |
| Platform → Settings | `settings` | Settings | ✅ Exists |
| Intelligence → AI Assistant | `ai` | AIChat (panel) | ⚠️ Needs view wrapper |
| Intelligence → AutoFix Engine | `autofix` | ❌ Needs creation |
| Intelligence → SRE Agent | `sreagent` | SREAgent | ✅ Exists |
| Intelligence → AI Agents | `aiagents` | AIAgents | ✅ Exists |
| ML → Training Jobs | `trainingjobs` | TrainingJobs | ✅ Exists |
| ML → Inference Services | `inferenceservices` | InferenceServices | ✅ Exists |
| ML → MLflow | `mlflow` | MLflow | ✅ Exists |
| ML → Feast | `feast` | Feast | ✅ Exists |
| ML → GPU Dashboard | `gpudashboard` | GPUDashboard | ✅ Exists |

### New Views Needed

1. **`autofix`** - AutoFix Engine view (combines OOM + HPA max + Security autofix + Drift autofix)
2. **`ai`** - AI Assistant view (wrapper for AIChat panel)

### Views to Remove/Deprecate

- `events` - Merged into Live Events Stream (`monitoredevents`)
- `apps` / `customapps` - Move to Platform → Integrations or keep separate
- `rollouts` - Keep as placeholder or remove
- `deployapp` - Keep as placeholder or remove
- `releases` - Keep as placeholder or remove
- `kiali` - Move to Platform → Integrations or keep separate
- `clustermanager` - Move to Platform or Settings
- `uidemo` - Remove or keep in dev mode only

## 3. Files to Modify/Create

### New Files to Create

1. `kubegraf/ui/solid/src/config/navConfig.ts` - Navigation configuration
2. `kubegraf/ui/solid/src/config/navSections.ts` - Sidebar sections definition
3. `kubegraf/ui/solid/src/utils/mlDetection.ts` - ML feature detection logic
4. `kubegraf/ui/solid/src/routes/AutoFix.tsx` - AutoFix Engine view
5. `kubegraf/ui/solid/src/routes/AIAssistant.tsx` - AI Assistant view wrapper

### Files to Modify

1. `kubegraf/ui/solid/src/components/Sidebar.tsx` - Update to use new structure
2. `kubegraf/ui/solid/src/App.tsx` - Update views mapping
3. `kubegraf/ui/solid/src/stores/ui.ts` - Add new View types (`autofix`, ensure `topology` exists)
4. `kubegraf/ui/solid/src/routes/Storage.tsx` - Ensure it shows PVs/PVCs/StorageClasses

### Files to Review (may need updates)

1. `kubegraf/ui/solid/src/routes/Incidents.tsx` - Verify it exists and works
2. `kubegraf/ui/solid/src/routes/Anomalies.tsx` - Verify structure
3. `kubegraf/ui/solid/src/routes/Topology.tsx` - Verify it's complete

## 4. Conditional ML Section Logic

```typescript
// mlDetection.ts
export function shouldShowMLSection(): boolean {
  // Check for:
  // 1. GPU nodes detected
  // 2. ML CRDs detected (TrainingJob, InferenceService, etc.)
  // 3. User explicitly enabled ML features in settings
  // 4. MLflow or Feast services detected
  
  // Implementation will check:
  // - nodesResource() for GPU nodes
  // - Custom resources for ML workloads
  // - Settings preference
  // - Service detection
  
  return hasGPUNodes() || hasMLWorkloads() || hasMLServices() || userEnabledML();
}
```

## 5. Migration Notes

- All existing routes will continue to work (no breaking changes)
- Views are mapped 1:1 where possible
- New "Intelligence" section groups AI/SRE features
- ML section is hidden by default, shown conditionally
- Platform section consolidates cluster management features
- Settings moved to Platform section (bottom of sidebar)

## 6. Icon Updates

Icons will remain the same for existing items. New items:
- AI Assistant: Brain/AI icon
- AutoFix Engine: Wrench/Tool icon
- Live Events Stream: Activity/Stream icon

