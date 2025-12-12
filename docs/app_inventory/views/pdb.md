# View: `pdb`

- **Route file**: `ui/solid/src/routes/PDB.tsx`
- **Component closure**: 12 files (TS/TSX). Controls extracted from 6 TSX files.

## Headings & copy

- `Manage pod availability during voluntary disruptions`
- `Pod Disruption Budgets`
- `Security Recommendations`
- `We recommend implementing the following security best practices for a secure Kubernetes environment:`

## Buttons

- `Cancel`
- `Copy`
- `Download`
- `Next`
- `Previous`
- `Refresh`
- `Saving...`

## Links

- `Learn more →`

## Input placeholders

- `Search PDBs...`

## Button titles

- `Actions`

## Component prop text (cards/widgets)

### `placeholder=`
- `Search PDBs...`

### `title=`
- `Actions`

## Configured labels (menus / quick access / lists)

- `Delete`
- `Describe`
- `Edit`
- `View YAML`

## Configured titles

- `Horizontal Pod Autoscalers`
- `Network Policies`
- `Pod Disruption Budgets`
- `Pod Security Contexts`

## Controls by file

### `components/ActionMenu.tsx`
- **button titles**: `Actions`
- **jsx props**:
  - `title=`: `Actions`

### `components/DescribeModal.tsx`
- **buttons**: `Copy`

### `components/SecurityRecommendations.tsx`
- **headings/copy**: `Security Recommendations`, `We recommend implementing the following security best practices for a secure Kubernetes environment:`
- **links**: `Learn more →`
- **configured titles**: `Horizontal Pod Autoscalers`, `Network Policies`, `Pod Disruption Budgets`, `Pod Security Contexts`

### `components/YAMLEditor.tsx`
- **buttons**: `Cancel`, `Saving...`

### `components/YAMLViewer.tsx`
- **buttons**: `Download`

### `routes/PDB.tsx`
- **headings/copy**: `Manage pod availability during voluntary disruptions`, `Pod Disruption Budgets`
- **buttons**: `Next`, `Previous`, `Refresh`
- **input placeholders**: `Search PDBs...`
- **configured labels**: `Delete`, `Describe`, `Edit`, `View YAML`
- **jsx props**:
  - `placeholder=`: `Search PDBs...`
