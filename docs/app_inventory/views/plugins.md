# View: `plugins`

- **Route file**: `ui/solid/src/routes/Plugins.tsx`
- **Component closure**: 5 files (TS/TSX). Controls extracted from 2 TSX files.

## Headings & copy

- `Are you sure you want to uninstall from ?`
- `ArgoCD may not be installed or configured`
- `Flux may not be installed or configured`
- `GitOps and package management integrations`
- `No ArgoCD applications found`
- `No Flux resources found`
- `Plugins`
- `Quick Stats`
- `This action cannot be undone.`

## Buttons

- `Cancel`
- `Refresh`
- `Refreshing...`
- `Rollback`
- `Rolling back...`
- `Sync`
- `Syncing...`
- `Uninstalling...`
- `View →`

## Button titles

- `Apply changes from Git repository`
- `Fetch latest state from cluster`

## Component prop text (cards/widgets)

### `title=`
- `Apply changes from Git repository`
- `Details`
- `Details & History`
- `Fetch latest state from cluster`
- `Refresh - Fetch latest state`
- `Sync - Apply changes from Git`
- `Uninstall Helm Release`
- `Uninstall release`

## Configured labels (menus / quick access / lists)

- `ArgoCD Apps`
- `Flux Resources`
- `Helm Releases`
- `Overview`

## Controls by file

### `components/HelmReleaseDeleteModal.tsx`
- **headings/copy**: `Are you sure you want to uninstall from ?`, `This action cannot be undone.`
- **buttons**: `Cancel`, `Uninstalling...`
- **jsx props**:
  - `title=`: `Uninstall Helm Release`

### `routes/Plugins.tsx`
- **headings/copy**: `ArgoCD may not be installed or configured`, `Flux may not be installed or configured`, `GitOps and package management integrations`, `No ArgoCD applications found`, `No Flux resources found`, `Plugins`, `Quick Stats`
- **buttons**: `Refresh`, `Refreshing...`, `Rollback`, `Rolling back...`, `Sync`, `Syncing...`, `View →`
- **button titles**: `Apply changes from Git repository`, `Fetch latest state from cluster`
- **configured labels**: `ArgoCD Apps`, `Flux Resources`, `Helm Releases`, `Overview`
- **jsx props**:
  - `title=`: `Apply changes from Git repository`, `Details`, `Details & History`, `Fetch latest state from cluster`, `Refresh - Fetch latest state`, `Sync - Apply changes from Git`, `Uninstall release`
