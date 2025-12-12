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

import { api } from '../services/api';

/**
 * KubeconfigDetector checks for kubeconfig availability
 */
export interface KubeconfigAvailability {
  hasKubeconfig: boolean;
  discoveredCount: number;
  storedCount: number;
  hasContexts: boolean;
}

/**
 * Detects if kubeconfig files are available
 */
export async function detectKubeconfigAvailability(): Promise<KubeconfigAvailability> {
  try {
    const data = await api.getClusters();
    const discovered = data.discovered || [];
    const clusters = data.clusters || [];
    const contexts = data.contexts || [];

    return {
      hasKubeconfig: discovered.length > 0 || clusters.length > 0,
      discoveredCount: discovered.length,
      storedCount: clusters.length,
      hasContexts: contexts.length > 0,
    };
  } catch (error) {
    console.error('Failed to detect kubeconfig availability:', error);
    return {
      hasKubeconfig: false,
      discoveredCount: 0,
      storedCount: 0,
      hasContexts: false,
    };
  }
}


