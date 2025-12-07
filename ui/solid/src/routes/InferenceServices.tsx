// Copyright 2025 KubeGraf Contributors

import { Component, createSignal, Show, onMount } from 'solid-js';
import InferenceServicesList from '../features/inference/InferenceServicesList';
import InferenceServicePanel from '../features/inference/InferenceServicePanel';

const InferenceServices: Component = () => {
  const [serviceName, setServiceName] = createSignal<string>('');
  const [serviceNamespace, setServiceNamespace] = createSignal<string>('');

  onMount(() => {
    const stored = sessionStorage.getItem('kubegraf-selected-inference-service');
    if (stored) {
      try {
        const service = JSON.parse(stored);
        setServiceName(service.name);
        setServiceNamespace(service.namespace);
        sessionStorage.removeItem('kubegraf-selected-inference-service');
      } catch (e) {
        // Invalid stored data
      }
    }
  });

  const viewingDetails = () => serviceName() !== '';

  return (
    <Show when={!viewingDetails()} fallback={
      <InferenceServicePanel
        serviceName={serviceName()}
        serviceNamespace={serviceNamespace()}
      />
    }>
      <InferenceServicesList />
    </Show>
  );
};

export default InferenceServices;

