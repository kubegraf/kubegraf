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

import { createSignal, onMount } from 'solid-js';

const FIRST_TIME_KEY = 'kubegraf-first-time-visited';
const FIRST_TIME_CONNECTION_KEY = 'kubegraf-first-time-connection-check';

/**
 * Hook to detect first-time user access
 */
export function useFirstTimeConnection() {
  const [isFirstTime, setIsFirstTime] = createSignal(false);
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = createSignal(false);

  onMount(() => {
    // Check if this is the first time visiting
    const firstTimeVisited = !localStorage.getItem(FIRST_TIME_KEY);
    const firstTimeConnectionCheck = !localStorage.getItem(FIRST_TIME_CONNECTION_KEY);

    setIsFirstTime(firstTimeVisited || firstTimeConnectionCheck);
    setHasCheckedFirstTime(true);

    // Mark as visited
    if (firstTimeVisited) {
      localStorage.setItem(FIRST_TIME_KEY, 'true');
    }
  });

  /**
   * Mark that first-time connection check has been completed
   */
  const markFirstTimeConnectionChecked = () => {
    localStorage.setItem(FIRST_TIME_CONNECTION_KEY, 'true');
    setIsFirstTime(false);
  };

  /**
   * Reset first-time flags (for testing)
   */
  const resetFirstTimeFlags = () => {
    localStorage.removeItem(FIRST_TIME_KEY);
    localStorage.removeItem(FIRST_TIME_CONNECTION_KEY);
    setIsFirstTime(true);
  };

  return {
    isFirstTime: () => isFirstTime(),
    hasCheckedFirstTime: () => hasCheckedFirstTime(),
    markFirstTimeConnectionChecked,
    resetFirstTimeFlags,
  };
}

