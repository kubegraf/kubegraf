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

import { api } from './api';
import { preFetchBrainData } from './brainService';

/**
 * Background pre-fetch service
 * Fetches critical data in parallel on app initialization
 * to improve first-load performance
 */
class BackgroundPrefetchService {
  private initialized = false;
  private prefetchPromise: Promise<void> | null = null;

  /**
   * Initialize background pre-fetching
   * Runs all critical data fetches in parallel
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Start pre-fetching in background (don't block)
    this.prefetchPromise = this.prefetchAll();
  }

  /**
   * Pre-fetch all critical data in parallel
   */
  private async prefetchAll(): Promise<void> {
    try {
      // Fetch all critical data in parallel
      await Promise.allSettled([
        // 1. Cluster status (critical for header)
        api.getStatus().catch(() => null),

        // 2. Namespaces (critical for namespace selector)
        api.getNamespaces().catch(() => null),

        // 3. Cloud info (for header badge)
        api.getCloudInfo().catch(() => null),

        // 4. Lightweight Brain data (for faster Brain panel)
        preFetchBrainData(),

        // 5. Contexts (for cluster selector)
        api.getContexts().catch(() => null),
      ]);

      console.debug('Background pre-fetch completed');
    } catch (error) {
      // Silently fail - pre-fetching should not break the app
      console.debug('Background pre-fetch error:', error);
    }
  }

  /**
   * Wait for pre-fetch to complete (useful for testing)
   */
  async waitForPrefetch(): Promise<void> {
    if (this.prefetchPromise) {
      await this.prefetchPromise;
    }
  }

  /**
   * Reset the service (for testing)
   */
  reset(): void {
    this.initialized = false;
    this.prefetchPromise = null;
  }
}

// Singleton instance
export const backgroundPrefetch = new BackgroundPrefetchService();

