# View: `services`

- **Route file**: `ui/solid/src/routes/Services.tsx`
- **Component closure**: 19 files (TS/TSX). Controls extracted from 9 TSX files.

## Headings & copy

- `Active Port Forwards`
- `Basic Information`
- `Describe:`
- `Endpoints`
- `Error Loading Data`
- `Events`
- `Labels & Annotations`
- `Loading service details...`
- `Local port to forward from:`
- `Network Configuration`
- `Network services and load balancers`
- `Open in Browser`
- `Ports`
- `Selector`
- `Service Configuration`
- `Services`

## Buttons

- `Cancel`
- `Copy`
- `Download`
- `First`
- `Forward`
- `Last`
- `Next →`
- `Random`
- `Saving...`
- `Services`
- `Start`
- `← Prev`

## Links

- `Failed to fetch service details:`
- `Failed to load service details`
- `Failed to start port forward`
- `Failed to start port forward:`
- `None`
- `Open`
- `TCP`
- `font-semibold`
- `mb-1`
- `number`
- `space-y-1`

## Input placeholders

- `Search...`

## Button titles

- `Actions`

## Component prop text (cards/widgets)

### `placeholder=`
- `Search...`

### `title=`
- `Actions`
- `Copy`
- `Font Family`
- `Font Size`
- `Port Forwarding`
- `Ports`
- `Refresh Services`
- `Stop Port Forward`

## Configured labels (menus / quick access / lists)

- `Delete`
- `Describe`
- `Edit YAML`
- `Port Forward`
- `View YAML`

## Controls by file

### `components/ActionMenu.tsx`
- **button titles**: `Actions`
- **jsx props**:
  - `title=`: `Actions`

### `components/DescribeModal.tsx`
- **buttons**: `Copy`

### `components/Loading.tsx`
- **headings/copy**: `Error Loading Data`

### `components/ServiceDetailsPanel.tsx`
- **headings/copy**: `Basic Information`, `Describe:`, `Endpoints`, `Events`, `Labels & Annotations`, `Loading service details...`, `Network Configuration`, `Ports`, `Selector`, `Service Configuration`
- **buttons**: `Copy`
- **links**: `Failed to fetch service details:`, `Failed to load service details`, `Failed to start port forward`, `Failed to start port forward:`, `None`, `TCP`, `font-semibold`, `mb-1`, `number`, `space-y-1`
- **jsx props**:
  - `title=`: `Copy`

### `components/ServicePortForwardModal.tsx`
- **headings/copy**: `Local port to forward from:`, `Open in Browser`
- **buttons**: `Cancel`, `Random`, `Start`
- **jsx props**:
  - `title=`: `Port Forwarding`

### `components/ServicePortsList.tsx`
- **buttons**: `Forward`

### `components/YAMLEditor.tsx`
- **buttons**: `Cancel`, `Saving...`

### `components/YAMLViewer.tsx`
- **buttons**: `Download`

### `routes/Services.tsx`
- **headings/copy**: `Active Port Forwards`, `Network services and load balancers`, `Services`
- **buttons**: `First`, `Last`, `Next →`, `Services`, `← Prev`
- **links**: `Open`
- **input placeholders**: `Search...`
- **configured labels**: `Delete`, `Describe`, `Edit YAML`, `Port Forward`, `View YAML`
- **jsx props**:
  - `placeholder=`: `Search...`
  - `title=`: `Font Family`, `Font Size`, `Ports`, `Refresh Services`, `Stop Port Forward`
