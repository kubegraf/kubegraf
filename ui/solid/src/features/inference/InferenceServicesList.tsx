// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { inferenceService, InferenceService } from '../../services/inference';
import { namespace } from '../../stores/cluster';
import InferenceServiceForm from './InferenceServiceForm';

const InferenceServicesList: Component = () => {
  const [showForm, setShowForm] = createSignal(false);

  const [services, { refetch }] = createResource(
    () => namespace(),
    async (ns) => {
      const result = await inferenceService.list(ns === '_all' ? undefined : ns);
      return result.services;
    }
  );

  const handleDelete = async (service: InferenceService) => {
    if (!confirm(`Are you sure you want to delete inference service "${service.name}"?`)) {
      return;
    }

    try {
      await inferenceService.delete(service.name, service.namespace);
      refetch();
    } catch (error: any) {
      alert(`Failed to delete service: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'bg-green-500';
      case 'Failed':
        return 'bg-red-500';
      case 'Pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div class="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inference Services</h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Deploy and manage ML model inference services
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          class="px-4 py-2 rounded-lg text-white transition-colors"
          style={{ background: 'var(--accent-primary)', color: '#000' }}
        >
          + Deploy Model
        </button>
      </div>

      <Show when={showForm()}>
        <InferenceServiceForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            refetch();
            setShowForm(false);
          }}
        />
      </Show>

      <Show when={services.loading}>
        <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading services...</div>
      </Show>

      <Show when={services.error}>
        <div class="rounded-lg p-4 border" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'var(--error-color)',
          color: 'var(--error-color)'
        }}>
          Error: {services.error?.message || 'Failed to load services'}
        </div>
      </Show>

      <Show when={!services.loading && services() && services()!.length === 0}>
        <div class="card p-8 text-center border" style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)'
        }}>
          <p class="mb-4" style={{ color: 'var(--text-secondary)' }}>No inference services found</p>
          <button
            onClick={() => setShowForm(true)}
            class="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Deploy Your First Model
          </button>
        </div>
      </Show>

      <Show when={!services.loading && services() && services()!.length > 0}>
        <div class="card border rounded-lg overflow-hidden" style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)'
        }}>
          <table class="w-full">
            <thead class="border-b" style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)'
            }}>
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Namespace</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Status</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Runtime</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Replicas</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Model</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Created</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              <For each={services()}>
                {(service) => (
                  <tr class="hover:opacity-80 transition-opacity" style={{
                    background: 'var(--bg-card)',
                    'border-color': 'var(--border-color)'
                  }}>
                    <td class="px-4 py-3">
                      <button
                        onClick={() => {
                          sessionStorage.setItem('kubegraf-selected-inference-service', JSON.stringify({
                            name: service.name,
                            namespace: service.namespace,
                          }));
                          window.location.reload();
                        }}
                        class="font-medium transition-colors hover:opacity-80"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {service.name}
                      </button>
                    </td>
                    <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{service.namespace}</td>
                    <td class="px-4 py-3">
                      <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{service.runtime}</td>
                    <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {service.readyReplicas}/{service.replicas}
                    </td>
                    <td class="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{service.modelFile}</td>
                    <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(service.createdAt).toLocaleString()}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <button
                          onClick={() => {
                            sessionStorage.setItem('kubegraf-selected-inference-service', JSON.stringify({
                              name: service.name,
                              namespace: service.namespace,
                            }));
                            window.location.reload();
                          }}
                          class="px-3 py-1 text-sm rounded transition-colors"
                          style={{ background: 'var(--accent-primary)', color: '#000' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          class="px-3 py-1 text-sm rounded transition-colors"
                          style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
};

export default InferenceServicesList;

