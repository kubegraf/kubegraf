import { Component, onMount, Show } from 'solid-js';
import AIChat from '../components/AIChat';
import { setAIPanelOpen, setCurrentView } from '../stores/ui';

/**
 * AI Assistant View
 * Wrapper component that displays the AI Chat interface as a full-page view
 */
const AIAssistant: Component = () => {
  onMount(() => {
    // Ensure AI panel is open when viewing this page
    setAIPanelOpen(true);
  });

  const handleClose = () => {
    setAIPanelOpen(false);
    // Navigate to dashboard when closing from route view
    setCurrentView('dashboard');
  };

  return (
    <div class="h-full flex flex-col">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            AI Assistant
          </h1>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Ask questions about your Kubernetes cluster and get AI-powered insights
          </p>
        </div>
        <button
          onClick={handleClose}
          class="p-2 rounded-lg transition-colors border"
          style={{ 
            color: 'var(--text-secondary)',
            'border-color': 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.color = 'var(--error-color)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          title="Close AI Assistant"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-hidden rounded-lg border" style={{ background: 'var(--bg-card)', 'border-color': 'var(--border-color)' }}>
        <AIChat inline={true} />
      </div>
    </div>
  );
};

export default AIAssistant;

