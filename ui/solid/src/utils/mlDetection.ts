import { nodesResource } from '../stores/cluster';
import { createSignal } from 'solid-js';

// Signal to track if ML workloads are detected
const [hasMLWorkloads, setHasMLWorkloads] = createSignal(false);

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

  // Check for ML workloads/CRDs (async, but we check the signal)
  checkForMLWorkloads();

  // Return true if GPU nodes are detected, user enabled ML, or ML workloads are detected
  // Also allow manual override via localStorage
  const manualOverride = localStorage.getItem('kubegraf-ml-force-show');
  if (manualOverride === 'true') {
    return true;
  }

  // For now, show ML section by default to make it accessible
  // Users can disable it by setting 'kubegraf-ml-enabled' to 'false' in localStorage
  // In production, you might want to make this truly adaptive
  const mlDisabled = localStorage.getItem('kubegraf-ml-disabled');
  if (mlDisabled === 'true') {
    return false;
  }

  return hasGPUNodes || userEnabledML || hasMLWorkloads() || true;
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

/**
 * Check for ML workloads (TrainingJobs, InferenceServices, etc.)
 * This checks the cluster for ML-related resources
 */
async function checkForMLWorkloads(): Promise<void> {
  try {
    // Check for TrainingJobs and InferenceServices via API
    const response = await fetch('/api/trainingjobs?limit=1');
    if (response.ok) {
      setHasMLWorkloads(true);
      return;
    }
  } catch {
    // Ignore errors
  }

  try {
    const response = await fetch('/api/inferenceservices?limit=1');
    if (response.ok) {
      setHasMLWorkloads(true);
      return;
    }
  } catch {
    // Ignore errors
  }

  // Also check for MLflow and Feast services
  try {
    const response = await fetch('/api/services?namespace=default');
    if (response.ok) {
      const services = await response.json();
      const hasMLServices = services.some((svc: any) => 
        svc.name?.toLowerCase().includes('mlflow') || 
        svc.name?.toLowerCase().includes('feast')
      );
      if (hasMLServices) {
        setHasMLWorkloads(true);
      }
    }
  } catch {
    // Ignore errors
  }
}

// Initialize ML workload detection on module load
if (typeof window !== 'undefined') {
  checkForMLWorkloads();
  // Re-check periodically
  setInterval(checkForMLWorkloads, 30000); // Check every 30 seconds
}


