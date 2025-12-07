// Copyright 2025 KubeGraf Contributors

import { Component, createSignal, Show, onMount } from 'solid-js';
import TrainingJobsList from '../features/mlJobs/TrainingJobsList';
import TrainingJobDetails from '../features/mlJobs/TrainingJobDetails';
import { currentView } from '../stores/ui';

const TrainingJobs: Component = () => {
  // Get job details from sessionStorage or URL params
  const [jobName, setJobName] = createSignal<string>('');
  const [jobNamespace, setJobNamespace] = createSignal<string>('');

  onMount(() => {
    // Check if we're viewing a specific job
    const stored = sessionStorage.getItem('kubegraf-selected-training-job');
    if (stored) {
      try {
        const job = JSON.parse(stored);
        setJobName(job.name);
        setJobNamespace(job.namespace);
        sessionStorage.removeItem('kubegraf-selected-training-job');
      } catch (e) {
        // Invalid stored data
      }
    }
  });

  const viewingDetails = () => jobName() !== '';

  return (
    <Show when={!viewingDetails()} fallback={
      <TrainingJobDetails
        jobName={jobName()}
        jobNamespace={jobNamespace()}
      />
    }>
      <TrainingJobsList />
    </Show>
  );
};

export default TrainingJobs;

