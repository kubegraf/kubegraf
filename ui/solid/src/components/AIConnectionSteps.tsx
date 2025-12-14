import { Component, Show, For, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { setCurrentView } from '../stores/ui';

interface AIConnectionStepsProps {
  onClose?: () => void;
}

const AIConnectionSteps: Component<AIConnectionStepsProps> = (props) => {
  const [aiStatus] = createResource(() => api.getAIStatus().catch(() => ({ available: false, provider: null })));

  const steps = [
    {
      title: '1. Choose Your AI Provider',
      description: 'Select one of the following AI providers:',
      options: [
        {
          name: 'Ollama (Local)',
          description: 'Run AI models locally on your machine',
          setup: [
            'Install Ollama from https://ollama.ai',
            'Run: ollama pull llama3.2',
            'Ensure Ollama is running: ollama serve',
            'KubeGraf will automatically detect Ollama'
          ],
          envVars: []
        },
        {
          name: 'OpenAI GPT-4',
          description: 'Use OpenAI\'s GPT-4 for advanced AI capabilities',
          setup: [
            'Get your API key from https://platform.openai.com/api-keys',
            'Set environment variable: export OPENAI_API_KEY="your-key-here"',
            'Restart KubeGraf',
            'AI Assistant will use GPT-4 automatically'
          ],
          envVars: ['OPENAI_API_KEY']
        },
        {
          name: 'Claude (Anthropic)',
          description: 'Use Anthropic\'s Claude for intelligent assistance',
          setup: [
            'Get your API key from https://console.anthropic.com/',
            'Set environment variable: export ANTHROPIC_API_KEY="your-key-here"',
            'Restart KubeGraf',
            'AI Assistant will use Claude automatically'
          ],
          envVars: ['ANTHROPIC_API_KEY']
        }
      ]
    },
    {
      title: '2. Verify Connection',
      description: 'Check if your AI provider is connected:',
      action: 'Click "Check Status" below to verify your setup'
    },
    {
      title: '3. Start Using AI Assistant',
      description: 'Once connected, you can:',
      features: [
        'Ask questions about your Kubernetes cluster',
        'Get troubleshooting help',
        'Request resource analysis',
        'Receive AI-powered recommendations'
      ]
    }
  ];

  return (
    <div class="p-6 space-y-6 max-w-4xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Connect AI Agents
          </h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Follow these steps to connect and configure AI agents for KubeGraf
          </p>
        </div>
        <Show when={props.onClose}>
          <button
            onClick={props.onClose}
            class="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            title="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Show>
      </div>

      {/* Current Status */}
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class={`w-3 h-3 rounded-full ${aiStatus()?.available ? 'bg-green-500' : 'bg-red-500'}`} />
          <div>
            <div class="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {aiStatus()?.available ? 'AI Provider Connected' : 'No AI Provider Detected'}
            </div>
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {aiStatus()?.available 
                ? `Using: ${aiStatus()?.provider || 'Unknown'}`
                : 'Follow the steps below to connect an AI provider'}
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div class="space-y-6">
        <For each={steps}>
          {(step, index) => (
            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                {step.title}
              </h3>
              <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {step.description}
              </p>

              {/* Provider Options */}
              <Show when={step.options}>
                <div class="space-y-4">
                  <For each={step.options}>
                    {(option) => (
                      <div class="p-4 rounded-lg border" style={{ 
                        background: 'var(--bg-secondary)', 
                        borderColor: 'var(--border-color)' 
                      }}>
                        <div class="flex items-start justify-between mb-2">
                          <div>
                            <div class="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {option.name}
                            </div>
                            <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {option.description}
                            </div>
                          </div>
                        </div>
                        <div class="mt-3 space-y-2">
                          <div class="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            Setup Steps:
                          </div>
                          <ol class="list-decimal list-inside space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <For each={option.setup}>
                              {(setupStep) => <li>{setupStep}</li>}
                            </For>
                          </ol>
                          <Show when={option.envVars && option.envVars.length > 0}>
                            <div class="mt-3">
                              <div class="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                Environment Variables:
                              </div>
                              <For each={option.envVars}>
                                {(envVar) => (
                                  <code class="block px-2 py-1 rounded text-xs mb-1" style={{ 
                                    background: 'var(--bg-tertiary)', 
                                    color: 'var(--accent-primary)' 
                                  }}>
                                    {envVar}
                                  </code>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Features List */}
              <Show when={step.features}>
                <ul class="list-disc list-inside space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <For each={step.features}>
                    {(feature) => <li>{feature}</li>}
                  </For>
                </ul>
              </Show>

              {/* Action Button */}
              <Show when={step.action}>
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  class="mt-4 px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                  Check Status
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>

      {/* Quick Links */}
      <div class="card p-4">
        <div class="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Need Help?
        </div>
        <div class="flex gap-4 text-sm">
          <button
            onClick={() => setCurrentView('aiagents')}
            class="text-[var(--accent-primary)] hover:underline"
          >
            View AI Agents Configuration →
          </button>
          <a
            href="https://github.com/kubegraf/kubegraf/blob/main/docs/AI_SETUP.md"
            target="_blank"
            class="text-[var(--accent-primary)] hover:underline"
          >
            Documentation →
          </a>
        </div>
      </div>
    </div>
  );
};

export default AIConnectionSteps;

