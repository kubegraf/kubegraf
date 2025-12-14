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

  // Default fallback values
  const defaultTimeline: TimelineEvent[] = [];
  const defaultOOM: OOMMetrics = { incidents24h: 0, crashLoops24h: 0, topProblematic: [] };
  const defaultSummary: BrainSummary = {
    last24hSummary: 'Cluster is healthy with no incidents detected in the last 24 hours.',
    topRiskAreas: ['No significant risk areas identified'],
    recommendedActions: ['Continue monitoring cluster health and resource usage'],
    generatedAt: new Date().toISOString(),
  };

  // Fetch all data in parallel with individual error handling
  // This ensures one failure doesn't break the entire panel
  let timelineEvents: TimelineEvent[] = defaultTimeline;
  let oomMetrics: OOMMetrics = defaultOOM;
  let summary: BrainSummary = defaultSummary;

  // Fetch all data in parallel with Promise.allSettled to ensure we always get results
  // This way, even if one API fails, we still get data from the others
  const [timelineResult, oomResult, summaryResult] = await Promise.allSettled([
    api.getBrainTimeline(hours).catch(err => {
      console.warn('Brain timeline fetch failed:', err);
      return defaultTimeline;
    }),
    api.getBrainOOMInsights().catch(err => {
      console.warn('Brain OOM insights fetch failed:', err);
      return defaultOOM;
    }),
    api.getBrainSummary().catch(err => {
      console.warn('Brain summary fetch failed:', err);
      return defaultSummary;
    }),
  ]);

  // Process timeline result
  if (timelineResult.status === 'fulfilled') {
    const result = timelineResult.value;
    if (Array.isArray(result)) {
      timelineEvents = result;
    } else {
      console.warn('Brain timeline returned invalid data, using default');
      timelineEvents = defaultTimeline;
    }
  } else {
    console.warn('Brain timeline promise rejected:', timelineResult.reason);
    timelineEvents = defaultTimeline;
  }

  // Process OOM insights result
  if (oomResult.status === 'fulfilled') {
    const result = oomResult.value;
    if (result && typeof result.incidents24h === 'number') {
      oomMetrics = result;
    } else {
      console.warn('Brain OOM insights returned invalid data, using default');
      oomMetrics = defaultOOM;
    }
  } else {
    console.warn('Brain OOM insights promise rejected:', oomResult.reason);
    oomMetrics = defaultOOM;
  }

  // Process summary result
  if (summaryResult.status === 'fulfilled') {
    const result = summaryResult.value;
    if (result && result.last24hSummary) {
      summary = result;
    } else {
      console.warn('Brain summary returned invalid data, using default');
      summary = defaultSummary;
    }
  } else {
    console.warn('Brain summary promise rejected:', summaryResult.reason);
    summary = {
      last24hSummary: 'Unable to fetch summary from server. Please check your cluster connection and try again.',
      topRiskAreas: ['Cluster connection may be unavailable'],
      recommendedActions: ['Verify cluster connection and refresh the panel'],
      generatedAt: new Date().toISOString(),
    };
  }

  const result: BrainData = {
    timelineEvents,
    oomMetrics,
    summary,
  };

  // Add ML data if enabled (with error handling)
  if (showML) {
    try {
      const [mlTimeline, mlPredictions, mlSummary] = await Promise.allSettled([
        brainMLService.getTimeline(hours),
        brainMLService.getPredictions(),
        brainMLService.getSummary(24),
      ]);

      if (mlTimeline.status === 'fulfilled') {
        result.mlTimeline = mlTimeline.value as any;
      }
      if (mlPredictions.status === 'fulfilled') {
        result.mlPredictions = mlPredictions.value as any;
      }
      if (mlSummary.status === 'fulfilled') {
        result.mlSummary = mlSummary.value as any;
      }
    } catch (err) {
      console.warn('ML data fetch failed:', err);
    }
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


