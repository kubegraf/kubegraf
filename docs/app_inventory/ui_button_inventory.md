# UI button/link inventory (all TSX files)

This is a **mechanical inventory** extracted from `ui/solid/src/**/*.tsx` (not just routes).
It attempts to list every user-facing button/link label via heuristics (text nodes + `title` + `aria-label`).

For the raw machine output, see `docs/app_inventory/_generated/ui_button_inventory.json`.

## `ui/solid/src/components/ActionMenu.tsx`
- **button titles**: `Actions`

## `ui/solid/src/components/AppContent.tsx`
- **links (text)**: `GitHub`

## `ui/solid/src/components/AppUninstallModal.tsx`
- **buttons (text)**: `Cancel`, `Uninstalling...`

## `ui/solid/src/components/ConnectionOverlay.tsx`
- **links (text)**: `Documentation`

## `ui/solid/src/components/CustomAppDeleteModal.tsx`
- **buttons (text)**: `Cancel`, `Removing...`

## `ui/solid/src/components/DescribeModal.tsx`
- **buttons (text)**: `Copy`

## `ui/solid/src/components/DockedTerminal.tsx`
- **button titles**: `Close`

## `ui/solid/src/components/ErrorModal.tsx`
- **buttons (text)**: `OK`

## `ui/solid/src/components/Header.tsx`
- **buttons (text)**: `AI`, `All Namespaces`, `Apply`, `🧠 Brain`
- **button titles**: `Open Brain Panel`

## `ui/solid/src/components/HelmReleaseDeleteModal.tsx`
- **buttons (text)**: `Cancel`, `Uninstalling...`

## `ui/solid/src/components/HelmReleaseErrorModal.tsx`
- **buttons (text)**: `OK`

## `ui/solid/src/components/LogsModal.tsx`
- **buttons (text)**: `Download`

## `ui/solid/src/components/NotificationCenter.tsx`
- **buttons (text)**: `Clear all`, `Mark all read`

## `ui/solid/src/components/RealtimeEventsPanel.tsx`
- **buttons (text)**: `Clear`
- **button titles**: `Clear events`

## `ui/solid/src/components/SecurityRecommendations.tsx`
- **links (text)**: `Learn more →`

## `ui/solid/src/components/ServicePortForwardModal.tsx`
- **buttons (text)**: `Cancel`, `Start`

## `ui/solid/src/components/ShellModal.tsx`
- **buttons (text)**: `Send`

## `ui/solid/src/components/UIDemo.tsx`
- **buttons (text)**: `Another Tooltip`, `Connect Cluster`, `Focus Visible`, `Hover for Tooltip`, `Primary Button`, `Secondary Button`, `View Details`

## `ui/solid/src/components/UpdateApplyButton.tsx`
- **buttons (text)**: `Apply Update`, `Update Failed - Try Again`

## `ui/solid/src/components/UpdateModal.tsx`
- **buttons (text)**: `Copy`, `Remind Me Later`, `View on GitHub`

## `ui/solid/src/components/YAMLEditor.tsx`
- **buttons (text)**: `Cancel`, `Saving...`

## `ui/solid/src/components/YAMLViewer.tsx`
- **buttons (text)**: `Copied!`, `Download`

## `ui/solid/src/features/feast/FeastInstallWizard.tsx`
- **buttons (text)**: `Cancel`

## `ui/solid/src/features/gpu/GPUInstallWizard.tsx`
- **buttons (text)**: `Cancel`

## `ui/solid/src/features/inference/InferenceServiceForm.tsx`
- **buttons (text)**: `+ Add`, `Cancel`

## `ui/solid/src/features/kiali/KialiInstallModal.tsx`
- **buttons (text)**: `Cancel`

## `ui/solid/src/features/kiali/KialiPanel.tsx`
- **buttons (text)**: `Open Kiali Dashboard`, `Refresh`

## `ui/solid/src/features/mlJobs/TrainingJobDetails.tsx`
- **buttons (text)**: `Refresh Logs`, `Start Streaming`, `Stop Streaming`

## `ui/solid/src/features/mlJobs/TrainingJobForm.tsx`
- **buttons (text)**: `+ Add`, `Cancel`

## `ui/solid/src/features/mlflow/MLflowInstallWizard.tsx`
- **buttons (text)**: `Cancel`

## `ui/solid/src/features/mlflow/MLflowPanel.tsx`
- **buttons (text)**: `Open Tracking UI`, `Restart Pods`
- **links (text)**: `Go to Marketplace`, `→ MLflow API (Experiments)`, `→ MLflow Tracking UI`

## `ui/solid/src/routes/Apps.tsx`
- **buttons (text)**: `Add App`

## `ui/solid/src/routes/ClusterManager.tsx`
- **buttons (text)**: `Connect cluster`
- **links (text)**: `Documentation`

## `ui/solid/src/routes/ClusterOverview.tsx`
- **links (text)**: `View Deployments`, `View Nodes`, `View Pods`, `View Services`

## `ui/solid/src/routes/Connectors.tsx`
- **buttons (text)**: `Connector`

## `ui/solid/src/routes/Deployments.tsx`
- **buttons (text)**: `Scale`

## `ui/solid/src/routes/Documentation.tsx`
- **links (text)**: `Documentation Full documentation`, `GitHub Source code & issues`, `Visit Documentation`, `Website kubegraf.io`

## `ui/solid/src/routes/LandingPage.tsx`
- **links (text)**: `Demo`, `Discord`, `Documentation`, `Features`, `GitHub`, `View on GitHub`

## `ui/solid/src/routes/Logs.tsx`
- **buttons (text)**: `Download`

## `ui/solid/src/routes/MonitoredEvents.tsx`
- **buttons (text)**: `Clear`, `Clear all`, `Select All`

## `ui/solid/src/routes/Plugins.tsx`
- **button titles**: `Apply changes from Git repository`, `Fetch latest state from cluster`

## `ui/solid/src/routes/Pods.tsx`
- **buttons (text)**: `Delete Pod`, `Download`, `Start`
- **links (text)**: `Open`

## `ui/solid/src/routes/Privacy.tsx`
- **links (text)**: `GitHub`, `GitHub repository`, `source code`, `website`

## `ui/solid/src/routes/SREAgent.tsx`
- **buttons (text)**: `Edit Configuration`, `Refresh`, `Save`

## `ui/solid/src/routes/Security.tsx`
- **links (text)**: `Reference`

## `ui/solid/src/routes/Services.tsx`
- **links (text)**: `Open`

## `ui/solid/src/routes/Settings.tsx`
- **buttons (text)**: `Reset to Defaults`
- **links (text)**: `Documentation`, `GitHub`, `Report Issue`

## `ui/solid/src/routes/StatefulSets.tsx`
- **buttons (text)**: `Scale`

## `ui/solid/src/routes/Topology.tsx`
- **button titles**: `Refresh Topology`

## `ui/solid/src/routes/UserManagement.tsx`
- **buttons (text)**: `Logout`
