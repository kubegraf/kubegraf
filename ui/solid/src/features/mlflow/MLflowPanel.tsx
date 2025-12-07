// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, Show } from 'solid-js';
import { mlflowService, MLflowStatus } from '../../services/mlflow';

const MLflowPanel: Component = () => {
  const [status, { refetch }] = createResource(mlflowService.getStatus);
  const [showUI, setShowUI] = createSignal(false);

  const openUI = () => {
    if (status()?.installed && status()?.serviceName) {
      // Open MLflow UI via port-forward proxy
      const url = `/api/mlflow/proxy/?namespace=${status()?.namespace || 'mlflow'}`;
      window.open(url, '_blank');
    }
  };

  const restartPods = async () => {
    if (!status()?.installed) return;
    
    try {
      // Restart deployment by scaling down and up
      const response = await fetch(`/api/deployments/${status()?.namespace}/${status()?.deployment}/restart`, {
        method: 'POST',
      });
      if (response.ok) {
        alert('MLflow pods are restarting...');
        setTimeout(() => refetch(), 5000);
      }
    } catch (error) {
      console.error('Failed to restart pods:', error);
      alert('Failed to restart pods');
    }
  };

  return (
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">MLflow</h2>
        <Show when={status()?.installed}>
          <button
            onClick={() => refetch()}
            class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            Refresh
          </button>
        </Show>
      </div>

      <Show when={status.loading}>
        <div class="text-center py-8">Loading MLflow status...</div>
      </Show>

      <Show when={status.error}>
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {status.error?.message || 'Failed to load MLflow status'}
        </div>
      </Show>

      <Show when={!status.loading && !status()?.installed}>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p class="text-lg font-medium text-yellow-800 mb-2">MLflow is not installed</p>
          <p class="text-sm text-yellow-700 mb-4">
            Install MLflow from the Marketplace → ML Apps section
          </p>
          <a
            href="/apps?tab=marketplace&category=ML Apps"
            class="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Marketplace
          </a>
        </div>
      </Show>

      <Show when={status()?.installed}>
        <div class="space-y-4">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="font-semibold text-green-800">MLflow is installed</span>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <span class="text-gray-600">Version:</span>
                <span class="ml-2 font-medium">{status()?.version || 'Unknown'}</span>
              </div>
              <div>
                <span class="text-gray-600">Namespace:</span>
                <span class="ml-2 font-medium">{status()?.namespace}</span>
              </div>
              <div>
                <span class="text-gray-600">Deployment:</span>
                <span class="ml-2 font-medium">{status()?.deployment}</span>
              </div>
              <div>
                <span class="text-gray-600">Service:</span>
                <span class="ml-2 font-medium">{status()?.serviceName}</span>
              </div>
              <Show when={status()?.backendStore}>
                <div>
                  <span class="text-gray-600">Backend Store:</span>
                  <span class="ml-2 font-medium">{status()?.backendStore}</span>
                </div>
              </Show>
              <Show when={status()?.artifactStore}>
                <div>
                  <span class="text-gray-600">Artifact Store:</span>
                  <span class="ml-2 font-medium">{status()?.artifactStore}</span>
                </div>
              </Show>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              onClick={openUI}
              class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Open Tracking UI
            </button>
            <button
              onClick={restartPods}
              class="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white"
            >
              Restart Pods
            </button>
          </div>

          <div class="bg-white border rounded-lg p-4">
            <h3 class="font-semibold mb-3">Quick Links</h3>
            <div class="space-y-2 text-sm">
              <a
                href={`/api/mlflow/proxy/?namespace=${status()?.namespace || 'mlflow'}`}
                target="_blank"
                class="block text-blue-600 hover:underline"
              >
                → MLflow Tracking UI
              </a>
              <a
                href={`/api/mlflow/proxy/api/2.0/mlflow/experiments/search?namespace=${status()?.namespace || 'mlflow'}`}
                target="_blank"
                class="block text-blue-600 hover:underline"
              >
                → MLflow API (Experiments)
              </a>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default MLflowPanel;

