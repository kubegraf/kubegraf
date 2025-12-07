// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { mlJobsService, MLTrainingJob } from '../../services/mlJobs';
import { namespace } from '../../stores/cluster';
import { setCurrentView } from '../../stores/ui';
import TrainingJobForm from './TrainingJobForm';

const TrainingJobsList: Component = () => {
  const [selectedJob, setSelectedJob] = createSignal<MLTrainingJob | null>(null);
  const [showForm, setShowForm] = createSignal(false);

  const [jobs, { refetch }] = createResource(
    () => namespace(),
    async (ns) => {
      const result = await mlJobsService.list(ns === '_all' ? undefined : ns);
      return result.jobs;
    }
  );

  const handleDelete = async (job: MLTrainingJob) => {
    if (!confirm(`Are you sure you want to delete job "${job.name}"?`)) {
      return;
    }

    try {
      await mlJobsService.delete(job.name, job.namespace);
      refetch();
    } catch (error: any) {
      alert(`Failed to delete job: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return 'bg-green-500';
      case 'Failed':
        return 'bg-red-500';
      case 'Active':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div class="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>ML Training Jobs</h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage and monitor your machine learning training jobs
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          class="px-4 py-2 rounded-lg text-white transition-colors"
          style={{ background: 'var(--accent-primary)', color: '#000' }}
        >
          + Create Job
        </button>
      </div>

      <Show when={showForm()}>
        <TrainingJobForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            refetch();
            setShowForm(false);
          }}
        />
      </Show>

      <Show when={jobs.loading}>
        <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading jobs...</div>
      </Show>

      <Show when={jobs.error}>
        <div class="rounded-lg p-4 border" style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderColor: 'var(--error-color)', 
          color: 'var(--error-color)' 
        }}>
          Error: {jobs.error?.message || 'Failed to load jobs'}
        </div>
      </Show>

      <Show when={!jobs.loading && jobs() && jobs()!.length === 0}>
        <div class="card p-8 text-center border" style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-color)' 
        }}>
          <p class="mb-4" style={{ color: 'var(--text-secondary)' }}>No training jobs found</p>
          <button
            onClick={() => setShowForm(true)}
            class="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Create Your First Job
          </button>
        </div>
      </Show>

      <Show when={!jobs.loading && jobs() && jobs()!.length > 0}>
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
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Image</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Resources</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Created</th>
                <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              <For each={jobs()}>
                {(job) => (
                  <tr class="hover:opacity-80 transition-opacity" style={{ 
                    background: 'var(--bg-card)',
                    'border-color': 'var(--border-color)'
                  }}>
                    <td class="px-4 py-3">
                      <button
                        onClick={() => {
                          sessionStorage.setItem('kubegraf-selected-training-job', JSON.stringify({
                            name: job.name,
                            namespace: job.namespace,
                          }));
                          window.location.reload();
                        }}
                        class="font-medium transition-colors hover:opacity-80"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {job.name}
                      </button>
                    </td>
                    <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{job.namespace}</td>
                    <td class="px-4 py-3">
                      <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{job.image}</td>
                    <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div class="flex flex-col gap-1">
                        {job.resources.cpu && <span>CPU: {job.resources.cpu}</span>}
                        {job.resources.memory && <span>Memory: {job.resources.memory}</span>}
                        {job.resources.gpu && <span>GPU: {job.resources.gpu}</span>}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <button
                          onClick={() => {
                            sessionStorage.setItem('kubegraf-selected-training-job', JSON.stringify({
                              name: job.name,
                              namespace: job.namespace,
                            }));
                            window.location.reload();
                          }}
                          class="px-3 py-1 text-sm rounded transition-colors"
                          style={{ background: 'var(--accent-primary)', color: '#000' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(job)}
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

export default TrainingJobsList;

