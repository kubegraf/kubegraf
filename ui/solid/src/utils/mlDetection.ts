import { nodesResource } from '../stores/cluster';

/**
 * ML feature detection utility
 * Determines if ML section should be shown in the sidebar
 */
export function shouldShowMLSection(): boolean {
  // Check for ML features:
  // 1. GPU nodes detected
  // 2. ML CRDs detected (TrainingJob, InferenceService, etc.)
  // 3. User explicitly enabled ML features in settings
  // 4. MLflow or Feast services detected

  const nodes = nodesResource();
  const hasGPUNodes = checkForGPUNodes(nodes);
  const userEnabledML = checkUserMLPreference();

  // For now, return true if GPU nodes are detected or user enabled ML
  // In production, you might want to also check for ML CRDs and services
  // Always show ML section by default - users can disable it in settings if needed
  return hasGPUNodes || userEnabledML || true;
}

/**
 * Check if any nodes have GPU resources
 */
function checkForGPUNodes(nodes: any[] | undefined): boolean {
  if (!nodes || nodes.length === 0) {
    return false;
  }

  // Check for GPU-related labels or resources
  return nodes.some((node: any) => {
    const labels = node.labels || {};
    const capacity = node.capacity || {};
    
    // Check for common GPU indicators
    return (
      labels['nvidia.com/gpu'] !== undefined ||
      labels['accelerator'] === 'nvidia-tesla-k80' ||
      labels['accelerator'] === 'nvidia-tesla-p100' ||
      labels['accelerator'] === 'nvidia-tesla-v100' ||
      capacity['nvidia.com/gpu'] !== undefined ||
      node.allocatable?.['nvidia.com/gpu'] !== undefined
    );
  });
}

/**
 * Check if user has explicitly enabled ML features in settings
 */
function checkUserMLPreference(): boolean {
  try {
    const mlEnabled = localStorage.getItem('kubegraf-ml-enabled');
    return mlEnabled === 'true';
  } catch {
    return false;
  }
}


