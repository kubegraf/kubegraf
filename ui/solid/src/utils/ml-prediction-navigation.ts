// Copyright 2025 KubeGraf Contributors
// ML Prediction navigation utilities

import { setCurrentView } from '../stores/ui';
import { setNamespace } from '../stores/cluster';
import { MLPrediction } from '../services/brainML';

/**
 * Get navigation target for a prediction type
 */
export function getPredictionNavigationTarget(prediction: MLPrediction): {
  view: string;
  namespace?: string;
  resource?: string;
  params?: Record<string, string>;
} {
  switch (prediction.type) {
    case 'artifact_growth':
      // Navigate to Storage view, filter by MLflow artifacts
      return {
        view: 'storage',
        namespace: prediction.resource?.namespace,
        params: {
          filter: 'mlflow',
          resource: prediction.resource?.name || 'mlflow-artifacts',
        },
      };

    case 'gpu_saturation':
      // Navigate to Nodes view to see GPU usage
      return {
        view: 'nodes',
        params: {
          filter: 'gpu',
          resource: prediction.resource?.name,
        },
      };

    case 'latency_increase':
      // Navigate to Services or Deployments view
      return {
        view: 'services',
        namespace: prediction.resource?.namespace,
        resource: prediction.resource?.name,
      };

    default:
      return {
        view: 'dashboard',
      };
  }
}

/**
 * Navigate to the relevant section for a prediction
 */
export function navigateToPrediction(prediction: MLPrediction): void {
  const target = getPredictionNavigationTarget(prediction);

  // Set namespace if provided
  if (target.namespace) {
    setNamespace(target.namespace);
  }

  // Navigate to the view
  setCurrentView(target.view as any);

  // Store resource info for highlighting/filtering
  if (target.resource) {
    sessionStorage.setItem(`kubegraf-highlight-${target.view}`, target.resource);
  }

  // Store params for filtering
  if (target.params) {
    Object.entries(target.params).forEach(([key, value]) => {
      sessionStorage.setItem(`kubegraf-filter-${target.view}-${key}`, value);
    });
  }
}

/**
 * Get action options for a prediction type
 */
export function getPredictionActions(prediction: MLPrediction): Array<{
  label: string;
  icon: string;
  action: () => void;
  type: 'primary' | 'secondary' | 'danger';
}> {
  const actions: Array<{
    label: string;
    icon: string;
    action: () => void;
    type: 'primary' | 'secondary' | 'danger';
  }> = [];

  switch (prediction.type) {
    case 'artifact_growth':
      actions.push(
        {
          label: 'View Storage',
          icon: '📦',
          action: () => navigateToPrediction(prediction),
          type: 'primary',
        },
        {
          label: 'View MLflow',
          icon: '🔬',
          action: () => {
            setCurrentView('mlflow' as any);
          },
          type: 'secondary',
        },
        {
          label: 'Cleanup Artifacts',
          icon: '🧹',
          action: () => {
            // Open cleanup dialog or navigate to cleanup page
            const resource = prediction.resource?.name || 'mlflow-artifacts';
            sessionStorage.setItem('kubegraf-cleanup-artifacts', resource);
            setCurrentView('storage' as any);
          },
          type: 'secondary',
        }
      );
      break;

    case 'gpu_saturation':
      actions.push(
        {
          label: 'View Nodes',
          icon: '🖥️',
          action: () => navigateToPrediction(prediction),
          type: 'primary',
        },
        {
          label: 'View GPU Pods',
          icon: '⚡',
          action: () => {
            setCurrentView('pods' as any);
            if (prediction.resource?.namespace) {
              setNamespace(prediction.resource.namespace);
            }
            sessionStorage.setItem('kubegraf-filter-pods-gpu', 'true');
          },
          type: 'secondary',
        },
        {
          label: 'Scale Resources',
          icon: '📈',
          action: () => {
            setCurrentView('hpa' as any);
            if (prediction.resource?.namespace) {
              setNamespace(prediction.resource.namespace);
            }
          },
          type: 'secondary',
        }
      );
      break;

    case 'latency_increase':
      actions.push(
        {
          label: 'View Service',
          icon: '🔗',
          action: () => navigateToPrediction(prediction),
          type: 'primary',
        },
        {
          label: 'View Metrics',
          icon: '📊',
          action: () => {
            setCurrentView('dashboard' as any);
            if (prediction.resource) {
              sessionStorage.setItem('kubegraf-view-metrics', prediction.resource.name);
            }
          },
          type: 'secondary',
        },
        {
          label: 'Scale Up',
          icon: '⬆️',
          action: () => {
            setCurrentView('deployments' as any);
            if (prediction.resource?.namespace) {
              setNamespace(prediction.resource.namespace);
            }
            if (prediction.resource?.name) {
              sessionStorage.setItem('kubegraf-scale-deployment', prediction.resource.name);
            }
          },
          type: 'secondary',
        }
      );
      break;
  }

  return actions;
}

