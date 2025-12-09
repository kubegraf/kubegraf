// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { setCurrentView } from '../stores/ui';
import { detectKubeconfigAvailability, type KubeconfigAvailability } from '../utils/kubeconfigDetector';

/**
 * ClusterConnectionFlow handles the automatic navigation flow
 * when no cluster is connected on first access
 */
export class ClusterConnectionFlow {
  /**
   * Checks if we should auto-navigate to cluster manager
   * Based on best practices:
   * - If kubeconfig exists, show cluster manager to let user choose
   * - If no kubeconfig, show helpful setup instructions
   */
  static async shouldAutoNavigateToClusterManager(
    isConnected: boolean,
    isFirstTime: boolean
  ): Promise<boolean> {
    // Only auto-navigate if:
    // 1. Not connected
    // 2. First time access
    if (isConnected || !isFirstTime) {
      return false;
    }

    // Check kubeconfig availability
    const availability = await detectKubeconfigAvailability();

    // Auto-navigate if kubeconfig is available (user can choose cluster)
    // Don't auto-navigate if no kubeconfig (show setup instructions instead)
    return availability.hasKubeconfig;
  }

  /**
   * Handles the connection flow based on current state
   * Returns the action to take: 'navigate', 'show-setup', or 'none'
   */
  static async handleConnectionFlow(
    isConnected: boolean,
    isFirstTime: boolean
  ): Promise<'navigate' | 'show-setup' | 'none'> {
    if (isConnected) {
      return 'none';
    }

    if (!isFirstTime) {
      return 'none';
    }

    const availability = await detectKubeconfigAvailability();

    if (availability.hasKubeconfig) {
      // Kubeconfig exists - navigate to cluster manager
      return 'navigate';
    } else {
      // No kubeconfig - show setup instructions
      return 'show-setup';
    }
  }

  /**
   * Navigates to cluster manager
   */
  static navigateToClusterManager() {
    console.log('[ClusterConnectionFlow] Navigating to cluster manager');
    setCurrentView('clustermanager');
  }

  /**
   * Gets the appropriate message based on kubeconfig availability
   */
  static async getConnectionMessage(): Promise<{
    title: string;
    description: string;
    action: 'navigate' | 'show-setup';
  }> {
    const availability = await detectKubeconfigAvailability();

    if (availability.hasKubeconfig) {
      return {
        title: 'Select a Cluster',
        description: `Found ${availability.discoveredCount + availability.storedCount} cluster(s). Select one to connect.`,
        action: 'navigate',
      };
    } else {
      return {
        title: 'No Cluster Configuration Found',
        description: 'Set up your kubeconfig file to connect to a Kubernetes cluster.',
        action: 'show-setup',
      };
    }
  }
}

