import { Component, onMount } from 'solid-js';
import AIChat from '../components/AIChat';
import { setAIPanelOpen } from '../stores/ui';

/**
 * AI Assistant View
 * Wrapper component that displays the AI Chat interface as a full-page view
 */
const AIAssistant: Component = () => {
  onMount(() => {
    // Ensure AI panel is open when viewing this page
    setAIPanelOpen(true);
  });

  return (
    <div class="h-full flex flex-col">
      <div class="mb-4">
        <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          AI Assistant
        </h1>
        <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Ask questions about your Kubernetes cluster and get AI-powered insights
        </p>
      </div>
      <div class="flex-1 overflow-hidden">
        <AIChat />
      </div>
    </div>
  );
};

export default AIAssistant;

