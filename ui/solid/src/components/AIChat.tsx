import { Component, For, Show, createSignal, onMount, createEffect } from 'solid-js';
import { marked } from 'marked';
import {
  messages,
  isLoading,
  currentProvider,
  providers,
  sendMessage,
  clearChat,
  switchProvider,
  fetchProviders,
  type AIMessage,
} from '../stores/ai';
import { setAIPanelOpen, sidebarCollapsed } from '../stores/ui';
import AgentSelector from './aiAgents/AgentSelector';
import AgentConfigModal from './aiAgents/AgentConfigModal';
import AgentConnectionGuide from './aiAgents/AgentConnectionGuide';
import { getAvailableAgents, selectedAgentId, queryAgent, discoverAgents, refreshAgents, getSelectedAgent, selectAgent } from '../stores/aiAgents';

const AIChat: Component = () => {
  let messagesEndRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;
  const [inputValue, setInputValue] = createSignal('');
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [showAgentConfig, setShowAgentConfig] = createSignal(false);
  const [panelWidth, setPanelWidth] = createSignal(420); // Default width
  const [isResizing, setIsResizing] = createSignal(false);

  const suggestions = [
    'Show me pods with high restart counts',
    'List deployments not fully available',
    'What services expose port 80?',
    'Show cluster resource usage',
  ];

  onMount(() => {
    fetchProviders();
    inputRef?.focus();
    // Auto-discover and refresh agents on mount
    discoverAgents().then(() => refreshAgents());
  });

  // Auto-scroll to bottom when new messages arrive
  createEffect(() => {
    messages();
    setTimeout(() => {
      messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const msg = inputValue().trim();
    if (!msg) return;
    setInputValue('');

    // Try using selected AI agent first, fallback to default AI
    const agentId = selectedAgentId();
    if (agentId) {
      try {
        const response = await queryAgent(msg);
        const assistantMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          usage: response.usage,
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      } catch (error) {
        console.error('Agent query failed:', error);
        // Fall through to default AI
      }
    }

    // Fallback to default AI
    await sendMessage(msg);
  }

  function handleSuggestion(suggestion: string) {
    sendMessage(suggestion);
  }

  function renderMarkdown(content: string): string {
    try {
      return marked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  }

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        class="fixed inset-0 bg-black/50 transition-opacity z-40"
        onClick={() => setAIPanelOpen(false)}
        style={{ 
          opacity: 1,
          pointerEvents: 'auto'
        }}
      />

      {/* Panel */}
      <div 
        class="fixed right-0 bg-k8s-card border-l border-k8s-border flex flex-col z-50 animate-slide-in shadow-2xl"
        style={{
          top: '112px', // Header (64px) + Quick Access bar (48px)
          bottom: '0',
          height: 'calc(100vh - 112px)',
          width: isMaximized() 
            ? `calc(100vw - ${sidebarCollapsed() ? '64px' : '208px'})` 
            : `${panelWidth()}px`,
          transition: isResizing() ? 'none' : 'width 0.3s ease-in-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resize Handle */}
        <div
          class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500/50 transition-colors z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsResizing(true);
            const startX = e.clientX;
            const startWidth = panelWidth();

            const handleMouseMove = (e: MouseEvent) => {
              const diff = startX - e.clientX; // Inverted because we're on the left edge
              const newWidth = Math.max(300, Math.min(800, startWidth + diff));
              setPanelWidth(newWidth);
            };

            const handleMouseUp = () => {
              setIsResizing(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
        {/* Header */}
        <div class="flex items-center justify-between px-2 py-1 border-b border-k8s-border bg-k8s-dark/50 min-h-[32px]">
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="w-6 h-6 rounded bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 class="text-white font-medium text-sm">AI</h2>
          </div>
          <div class="flex items-center gap-0.5 flex-shrink-0">
            <AgentSelector onAgentChange={() => clearChat()} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAgentConfig(true);
              }}
              class="p-0.5 rounded hover:bg-k8s-border/50 text-gray-400 hover:text-white"
              title="Add"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearChat();
              }}
              class="p-1 rounded hover:bg-k8s-border/50 transition-colors text-gray-400 hover:text-white"
              title="Clear"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {/* Width Controls */}
            <div class="flex items-center gap-0.5 border-l border-k8s-border pl-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelWidth(Math.max(300, panelWidth() - 50));
                }}
                class="p-1 rounded hover:bg-k8s-border/50 transition-colors text-gray-400 hover:text-white"
                title="Narrower"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelWidth(Math.min(800, panelWidth() + 50));
                }}
                class="p-1 rounded hover:bg-k8s-border/50 transition-colors text-gray-400 hover:text-white"
                title="Wider"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {/* Maximize Button - ALWAYS VISIBLE */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized());
              }}
              class="p-1.5 rounded hover:bg-k8s-border/50 transition-colors text-white hover:text-purple-300 border border-k8s-border/50"
              title={isMaximized() ? "Restore" : "Maximize"}
              style="min-width: 24px; min-height: 24px; display: flex; align-items: center; justify-content: center;"
            >
              <Show
                when={isMaximized()}
                fallback={
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                }
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              </Show>
            </button>
            {/* Close Button - ALWAYS VISIBLE */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAIPanelOpen(false);
              }}
              class="p-1.5 rounded hover:bg-red-500/30 transition-colors text-white hover:text-red-300 border border-red-500/50"
              title="Close panel"
              style="min-width: 24px; min-height: 24px; display: flex; align-items: center; justify-content: center;"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

      {/* Messages */}
      <div class="flex-1 overflow-y-auto p-2">
        {/* Connection Guide - Show when agent selected but not connected */}
        <Show when={selectedAgentId()}>
          {() => {
            const agent = getSelectedAgent();
            return (
              <Show when={agent && !agent.connected}>
                <div class="mb-2">
                  <AgentConnectionGuide
                    agent={agent}
                    onClose={() => selectAgent(null)}
                  />
                </div>
              </Show>
            );
          }}
        </Show>

        <div class="space-y-2">
          <Show when={messages().length === 0}>
            <div class="text-center py-8">
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 class="text-white font-medium mb-2">How can I help?</h3>
              <p class="text-gray-500 text-sm mb-6">
                Ask me about your Kubernetes cluster, resources, or troubleshooting
              </p>
              <div class="space-y-2">
                <For each={suggestions}>
                  {(suggestion) => (
                    <button
                      onClick={() => handleSuggestion(suggestion)}
                      class="w-full text-left px-4 py-2 bg-k8s-dark hover:bg-k8s-border/50 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {suggestion}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <For each={messages()}>
            {(message) => (
              <div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  class={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-k8s-blue text-white'
                      : 'bg-k8s-dark text-gray-300'
                  }`}
                >
                  <Show
                    when={message.role === 'assistant'}
                    fallback={<p class="text-sm whitespace-pre-wrap">{message.content}</p>}
                  >
                    <div
                      class="prose prose-invert prose-sm max-w-none"
                      innerHTML={renderMarkdown(message.content)}
                    />
                    <Show when={message.usage}>
                      <div class="mt-2 pt-2 border-t border-k8s-border/50 text-xs text-gray-500">
                        Tokens: {message.usage?.totalTokens}
                      </div>
                    </Show>
                  </Show>
                </div>
              </div>
            )}
          </For>

          {/* Loading indicator */}
          <Show when={isLoading()}>
            <div class="flex justify-start">
              <div class="bg-k8s-dark rounded-lg px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="flex gap-1">
                    <div class="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ "animation-delay": "0ms" }}></div>
                    <div class="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ "animation-delay": "150ms" }}></div>
                    <div class="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ "animation-delay": "300ms" }}></div>
                  </div>
                  <span class="text-gray-500 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          </Show>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} class="p-4 border-t border-k8s-border">
        <div class="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue()}
            onInput={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your cluster..."
            disabled={isLoading()}
            class="flex-1 bg-k8s-dark border border-k8s-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading() || !inputValue().trim()}
            class="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-500 text-center">
          Using {providers().find(p => p.id === currentProvider())?.name || 'AI'}
        </p>
      </form>
      </div>

      {/* Agent Configuration Modal */}
      <AgentConfigModal
        isOpen={showAgentConfig()}
        onClose={() => setShowAgentConfig(false)}
      />
    </>
  );
};

export default AIChat;

