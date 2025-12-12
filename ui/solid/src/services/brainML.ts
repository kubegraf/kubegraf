// Copyright 2025 KubeGraf Contributors

import { fetchAPI } from './api';

export interface MLTimelineEvent {
  id: string;
  timestamp: string;
  type: 'training_failure' | 'gpu_spike' | 'model_deployment' | 'drift_detected';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  resource?: {
    kind: string;
    name: string;
    namespace?: string;
  };
  metrics?: Record<string, any>;
}

export interface MLPrediction {
  id: string;
  type: 'gpu_saturation' | 'latency_increase' | 'artifact_growth';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timeframe: string;
  confidence: number;
  resource?: {
    kind: string;
    name: string;
    namespace?: string;
  };
  currentValue?: any;
  predictedValue?: any;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface MLSummary {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  generatedAt: string;
  timeRange: string;
}

export interface MLTimelineResponse {
  events: MLTimelineEvent[];
  timeRange: string;
  total: number;
}

export interface MLPredictionsResponse {
  predictions: MLPrediction[];
  generatedAt: string;
  total: number;
}

export const brainMLService = {
  getTimeline: async (hours: number = 72): Promise<MLTimelineResponse> => {
    return fetchAPI<MLTimelineResponse>(`/brain/ml/timeline?hours=${hours}`);
  },

  getPredictions: async (): Promise<MLPredictionsResponse> => {
    return fetchAPI<MLPredictionsResponse>('/brain/ml/predictions');
  },

  getSummary: async (hours: number = 24): Promise<MLSummary> => {
    return fetchAPI<MLSummary>(`/brain/ml/summary?hours=${hours}`);
  },
};



