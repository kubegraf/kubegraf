// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

import { createSignal, createResource } from 'solid-js';

export interface Capabilities {
  incidentDetection: boolean;
  incidentDiagnosis: boolean;
  incidentSnapshot: boolean;
  fixPreview: boolean;
  autoRemediation: boolean;
  learningEngine: boolean;
  similarIncidents: boolean;
  metricsCorrelation: boolean;
  bulkFixes: boolean;
  fixApplication: boolean;
}

async function fetchCapabilities(): Promise<Capabilities> {
  const res = await fetch('/api/capabilities');
  if (!res.ok) {
    // Default to v1 safe capabilities on error
    return {
      incidentDetection: true,
      incidentDiagnosis: true,
      incidentSnapshot: true,
      fixPreview: true,
      autoRemediation: false,
      learningEngine: false,
      similarIncidents: false,
      metricsCorrelation: false,
      bulkFixes: false,
      fixApplication: true,
    };
  }
  return await res.json();
}

// Create resource that fetches capabilities on mount
const [capabilitiesResource] = createResource(fetchCapabilities);

export const capabilities = {
  get: () => capabilitiesResource() || {
    incidentDetection: true,
    incidentDiagnosis: true,
    incidentSnapshot: true,
    fixPreview: true,
    autoRemediation: false,
    learningEngine: false,
    similarIncidents: false,
    metricsCorrelation: false,
    bulkFixes: false,
    fixApplication: true,
  },
  isLoading: () => capabilitiesResource.loading,
  isAutoRemediationEnabled: () => capabilitiesResource()?.autoRemediation ?? false,
  isLearningEngineEnabled: () => capabilitiesResource()?.learningEngine ?? false,
  isSimilarIncidentsEnabled: () => capabilitiesResource()?.similarIncidents ?? false,
  isMetricsCorrelationEnabled: () => capabilitiesResource()?.metricsCorrelation ?? false,
  isBulkFixesEnabled: () => capabilitiesResource()?.bulkFixes ?? false,
  isFixApplicationEnabled: () => capabilitiesResource()?.fixApplication ?? false,
};

