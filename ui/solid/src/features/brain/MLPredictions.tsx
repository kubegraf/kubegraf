// Copyright 2025 KubeGraf Contributors

import { Component, For, Show } from 'solid-js';
import { MLPrediction } from '../../services/brainML';

interface MLPredictionsProps {
  predictions: MLPrediction[];
}

const MLPredictions: Component<MLPredictionsProps> = (props) => {
  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'gpu_saturation':
        return 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z';
      case 'latency_increase':
        return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
      case 'artifact_growth':
        return 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4';
      default:
        return 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#8b949e';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#ef4444';
    if (confidence >= 0.6) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold" style={{ color: '#f0f6fc' }}>ML Predictions</h3>
        <span class="text-sm px-2 py-1 rounded" style={{ 
          background: 'rgba(245, 158, 11, 0.2)', 
          color: '#f59e0b' 
        }}>
          {props.predictions.length} forecasts
        </span>
      </div>

      <Show when={props.predictions.length === 0}>
        <div class="text-center py-8" style={{ color: '#8b949e' }}>
          <p>No predictions available at this time</p>
        </div>
      </Show>

      <Show when={props.predictions.length > 0}>
        <div class="space-y-4">
          <For each={props.predictions}>
            {(prediction) => (
              <div class="p-4 rounded-lg border" style={{
                background: 'rgba(22, 27, 34, 0.5)',
                borderColor: getSeverityColor(prediction.severity),
                borderLeftWidth: '4px'
              }}>
                <div class="flex items-start gap-3 mb-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                    background: `rgba(${getSeverityColor(prediction.severity).replace('#', '')}, 0.2)`
                  }}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
                      color: getSeverityColor(prediction.severity)
                    }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getPredictionIcon(prediction.type)} />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <h4 class="font-medium" style={{ color: '#f0f6fc' }}>{prediction.title}</h4>
                      <div class="flex items-center gap-2">
                        <span class="text-xs px-2 py-0.5 rounded" style={{
                          background: `rgba(${getConfidenceColor(prediction.confidence).replace('#', '')}, 0.2)`,
                          color: getConfidenceColor(prediction.confidence)
                        }}>
                          {Math.round(prediction.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    <p class="text-sm mb-2" style={{ color: '#8b949e' }}>{prediction.description}</p>
                    <div class="flex items-center gap-4 text-xs" style={{ color: '#8b949e' }}>
                      <span>Timeframe: <strong style={{ color: '#f0f6fc' }}>{prediction.timeframe}</strong></span>
                      <span>Trend: <strong style={{ color: prediction.trend === 'increasing' ? '#ef4444' : '#10b981' }}>{prediction.trend}</strong></span>
                    </div>
                    <Show when={prediction.resource}>
                      <div class="mt-2 flex items-center gap-2 text-xs">
                        <span class="px-2 py-0.5 rounded" style={{ 
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6'
                        }}>
                          {prediction.resource!.kind}
                        </span>
                        <span style={{ color: '#8b949e' }}>{prediction.resource!.name}</span>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default MLPredictions;

