// Copyright 2025 KubeGraf Contributors

import { Component, For, Show } from 'solid-js';
import { MLPrediction } from '../../services/brainML';
import MLPredictionCard from '../../components/MLPredictionCard';

interface MLPredictionsProps {
  predictions: MLPrediction[];
}

const MLPredictions: Component<MLPredictionsProps> = (props) => {
  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>ML Predictions</h3>
          <p class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Click on any prediction to navigate to the related section
          </p>
        </div>
        <span class="text-sm px-2 py-1 rounded" style={{ 
          background: 'var(--glass-gradient)', 
          color: 'var(--warning-color)',
          border: '1px solid var(--border-color)'
        }}>
          {props.predictions.length} forecasts
        </span>
      </div>

      <Show when={props.predictions.length === 0}>
        <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <p>No predictions available at this time</p>
        </div>
      </Show>

      <Show when={props.predictions.length > 0}>
        <div class="space-y-4">
          <For each={props.predictions}>
            {(prediction) => (
              <MLPredictionCard prediction={prediction} />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default MLPredictions;


