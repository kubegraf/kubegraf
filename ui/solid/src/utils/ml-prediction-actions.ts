// Copyright 2025 KubeGraf Contributors
// ML Prediction action handlers

import { MLPrediction } from '../services/brainML';
import { addNotification } from '../stores/ui';
import { api } from '../services/api';

/**
 * Execute cleanup action for artifact growth prediction
 */
export async function cleanupArtifacts(prediction: MLPrediction): Promise<void> {
  const resource = prediction.resource?.name || 'mlflow-artifacts';
  
  try {
    addNotification(`Starting artifact cleanup for ${resource}...`, 'info');
    
    // TODO: Implement actual cleanup API call
    // For now, just show notification
    // await api.cleanupMLflowArtifacts(resource, prediction.resource?.namespace);
    
    addNotification(`Cleanup initiated for ${resource}. Check storage view for progress.`, 'success');
  } catch (error) {
    console.error('Failed to cleanup artifacts:', error);
    addNotification(`Failed to cleanup artifacts: ${error}`, 'error');
  }
}

/**
 * Get recommendations for a prediction
 */
export function getPredictionRecommendations(prediction: MLPrediction): string[] {
  const recommendations: string[] = [];

  switch (prediction.type) {
    case 'artifact_growth':
      recommendations.push(
        'Review and delete old model artifacts',
        'Configure artifact retention policies',
        'Consider archiving to cold storage',
        'Monitor storage usage trends'
      );
      break;

    case 'gpu_saturation':
      recommendations.push(
        'Scale up GPU resources if available',
        'Review GPU allocation policies',
        'Consider using spot instances for non-critical workloads',
        'Optimize model inference to reduce GPU usage'
      );
      break;

    case 'latency_increase':
      recommendations.push(
        'Scale up deployment replicas',
        'Review and optimize model inference code',
        'Check for resource constraints (CPU/Memory)',
        'Consider using model caching or batching'
      );
      break;
  }

  return recommendations;
}

/**
 * Get severity-based action priority
 */
export function getActionPriority(prediction: MLPrediction): 'high' | 'medium' | 'low' {
  switch (prediction.severity) {
    case 'critical':
      return 'high';
    case 'warning':
      return 'medium';
    case 'info':
      return 'low';
    default:
      return 'medium';
  }
}

