// Copyright 2025 KubeGraf Contributors
// ML Prediction Card Component with actionable links

import { Component, Show } from 'solid-js';
import { MLPrediction } from '../services/brainML';
import { navigateToPrediction, getPredictionActions } from '../utils/ml-prediction-navigation';
import { getPredictionRecommendations, getActionPriority } from '../utils/ml-prediction-actions';

interface MLPredictionCardProps {
  prediction: MLPrediction;
}

const MLPredictionCard: Component<MLPredictionCardProps> = (props) => {
  const prediction = () => props.prediction;
  const actions = () => getPredictionActions(prediction());
  const recommendations = () => getPredictionRecommendations(prediction());
  const priority = () => getActionPriority(prediction());

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
        return 'var(--error-color)';
      case 'warning':
        return 'var(--warning-color)';
      case 'info':
        return 'var(--info-color)';
      default:
        return 'var(--text-muted)';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'var(--error-color)';
    if (confidence >= 0.6) return 'var(--warning-color)';
    return 'var(--info-color)';
  };

  const severityColor = () => getSeverityColor(prediction().severity);
  const confidenceColor = () => getConfidenceColor(prediction().confidence);

  return (
    <div 
      class="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg" 
      style={{
        background: 'var(--bg-tertiary)',
        borderColor: severityColor(),
        borderLeftWidth: '4px',
      }}
      onClick={() => navigateToPrediction(prediction())}
    >
      <div class="flex items-start gap-3 mb-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
          background: 'var(--bg-secondary)',
          border: `1px solid ${severityColor()}`
        }}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
            color: severityColor()
          }}>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getPredictionIcon(prediction().type)} />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2 mb-1">
            <h4 
              class="font-medium hover:underline" 
              style={{ color: 'var(--text-primary)' }}
              title="Click to navigate to related section"
            >
              {prediction().title}
            </h4>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded" style={{
                background: 'var(--bg-secondary)',
                color: confidenceColor(),
                border: '1px solid var(--border-color)'
              }}>
                {Math.round(prediction().confidence * 100)}% confidence
              </span>
            </div>
          </div>
          <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {prediction().description}
          </p>
          <div class="flex items-center gap-4 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Timeframe: <strong style={{ color: 'var(--text-primary)' }}>{prediction().timeframe}</strong></span>
            <span>Trend: <strong style={{ color: prediction().trend === 'increasing' ? 'var(--error-color)' : 'var(--success-color)' }}>{prediction().trend}</strong></span>
            <Show when={priority() === 'high'}>
              <span class="px-1.5 py-0.5 rounded text-xs font-medium" style={{
                background: 'var(--error-color)20',
                color: 'var(--error-color)',
              }}>
                High Priority
              </span>
            </Show>
          </div>
          <Show when={prediction().resource}>
            <div class="mt-2 flex items-center gap-2 text-xs">
              <span class="px-2 py-0.5 rounded" style={{ 
                background: 'var(--bg-secondary)',
                color: 'var(--info-color)',
                border: '1px solid var(--border-color)'
              }}>
                {prediction().resource!.kind}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{prediction().resource!.name}</span>
              <Show when={prediction().resource!.namespace}>
                <span style={{ color: 'var(--text-muted)' }}>• {prediction().resource!.namespace}</span>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      {/* Action Buttons */}
      <Show when={actions().length > 0}>
        <div class="mt-3 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
          <For each={actions()}>
            {(action) => (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  action.action();
                }}
                class="px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                style={{
                  background: action.type === 'primary' 
                    ? 'var(--accent-primary)' 
                    : action.type === 'danger'
                    ? 'var(--error-color)20'
                    : 'var(--bg-secondary)',
                  color: action.type === 'primary' 
                    ? '#000' 
                    : action.type === 'danger'
                    ? 'var(--error-color)'
                    : 'var(--text-primary)',
                  border: action.type === 'primary' ? 'none' : '1px solid var(--border-color)',
                }}
                onMouseEnter={(e) => {
                  if (action.type !== 'primary') {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (action.type !== 'primary') {
                    e.currentTarget.style.background = action.type === 'danger' 
                      ? 'var(--error-color)20' 
                      : 'var(--bg-secondary)';
                  }
                }}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Recommendations */}
      <Show when={recommendations().length > 0}>
        <div class="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div class="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            💡 Recommendations:
          </div>
          <ul class="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <For each={recommendations()}>
              {(rec) => (
                <li class="flex items-start gap-2">
                  <span>•</span>
                  <span>{rec}</span>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  );
};

export default MLPredictionCard;

