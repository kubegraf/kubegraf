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
import { brainMLService } from './brainML';
import { settings } from '../stores/settings';
import { TimelineEvent } from '../features/brain/types';
import { OOMMetrics } from '../features/brain/types';
import { BrainSummary } from '../features/brain/types';

export interface BrainData {
  timelineEvents: TimelineEvent[];
  oomMetrics: OOMMetrics;
  summary: BrainSummary;
  mlTimeline?: { events: any[]; timeRange: string; total: number };
  mlPredictions?: { predictions: any[]; generatedAt: string; total: number };
  mlSummary?: {
    summary: string;
    keyInsights: any[];
    recommendations: any[];
    generatedAt: string;
    timeRange: string;
  };
}

/**
 * Fetch all Brain data in parallel for faster loading
 */
export async function fetchBrainDataInParallel(): Promise<BrainData> {
  const hours = 72;
  const showML = settings().showMLTimelineInBrain;

  // Fetch all data in parallel
  const [
    timelineEvents,
    oomMetrics,
    summary,
    ...mlData
  ] = await Promise.all([
    // Core Brain data (always fetch)
    api.getBrainTimeline(hours),
    api.getBrainOOMInsights(),
    api.getBrainSummary(),
    // ML data (only if enabled)
    ...(showML ? [
      brainMLService.getTimeline(hours),
      brainMLService.getPredictions(),
      brainMLService.getSummary(24),
    ] : []),
  ]);

  const result: BrainData = {
    timelineEvents,
    oomMetrics,
    summary,
  };

  // Add ML data if enabled
  if (showML && mlData.length === 3) {
    result.mlTimeline = mlData[0] as any;
    result.mlPredictions = mlData[1] as any;
    result.mlSummary = mlData[2] as any;
  }

  return result;
}

/**
 * Pre-fetch Brain data in background (lightweight version)
 * This runs on app load to warm up the cache
 */
export async function preFetchBrainData(): Promise<void> {
  try {
    // Only pre-fetch lightweight data
    await Promise.all([
      api.getBrainOOMInsights().catch(() => null),
      // Don't pre-fetch heavy timeline/summary - let them load on demand
    ]);
  } catch (error) {
    // Silently fail - this is just pre-fetching
    console.debug('Brain pre-fetch failed:', error);
  }
}

