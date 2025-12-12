# View: `trainingjobs`

- **Route file**: `ui/solid/src/routes/TrainingJobs.tsx`
- **Component closure**: 8 files (TS/TSX). Controls extracted from 3 TSX files.

## Headings & copy

- `CPU`
- `Create ML Training Job`
- `Docker Image *`
- `Environment Variables`
- `GPU`
- `Job Name *`
- `ML Training Jobs`
- `Manage and monitor your machine learning training jobs`
- `Memory`
- `Namespace`
- `Namespace:`
- `No training jobs found`
- `Python Script *`
- `Restart Policy`
- `Volume Mounts`

## Buttons

- `+ Add`
- `+ Create Job`
- `Cancel`
- `Create Job`
- `Create Your First Job`
- `Creating...`
- `Delete`
- `Logs`
- `Overview`
- `Refresh`
- `Refresh Logs`
- `Start Streaming`
- `Stop Streaming`
- `View`
- `YAML`
- `×`

## Component prop text (cards/widgets)

### `placeholder=`
- `/mnt/data`
- `2Gi`
- `KEY`
- `Volume Name`
- `my-training-job`
- `pytorch/pytorch:latest`
- `value`

## Controls by file

### `features/mlJobs/TrainingJobDetails.tsx`
- **headings/copy**: `Namespace:`
- **buttons**: `Logs`, `Overview`, `Refresh`, `Refresh Logs`, `Start Streaming`, `Stop Streaming`, `YAML`

### `features/mlJobs/TrainingJobForm.tsx`
- **headings/copy**: `CPU`, `Create ML Training Job`, `Docker Image *`, `Environment Variables`, `GPU`, `Job Name *`, `Memory`, `Namespace`, `Python Script *`, `Restart Policy`, `Volume Mounts`
- **buttons**: `+ Add`, `Cancel`, `Create Job`, `Creating...`, `×`
- **jsx props**:
  - `placeholder=`: `/mnt/data`, `2Gi`, `KEY`, `Volume Name`, `my-training-job`, `pytorch/pytorch:latest`, `value`

### `features/mlJobs/TrainingJobsList.tsx`
- **headings/copy**: `ML Training Jobs`, `Manage and monitor your machine learning training jobs`, `No training jobs found`
- **buttons**: `+ Create Job`, `Create Your First Job`, `Delete`, `View`
