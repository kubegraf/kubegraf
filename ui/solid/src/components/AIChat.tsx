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
} from '../stores/ai';
import { setAIPanelOpen, sidebarCollapsed } from '../stores/ui';

const AIChat: Component = () => {
  let messagesEndRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;
  const [inputValue, setInputValue] = createSignal('');
  const [isMaximized, setIsMaximized] = createSignal(false);

  const suggestions = [
    'Show me pods with high restart counts',
    'List deployments not fully available',
    'What services expose port 80?',
    'Show cluster resource usage',
  ];

  onMount(() => {
    fetchProviders();
    inputRef?.focus();
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
        class="fixed right-0 border-l flex flex-col z-50 animate-slide-in shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          'border-color': 'var(--border-color)',
          top: '112px', // Header (64px) + Quick Access bar (48px)
          bottom: '0',
          height: 'calc(100vh - 112px)',
          width: isMaximized() 
            ? `calc(100vw - ${sidebarCollapsed() ? '64px' : '208px'})` 
            : '420px', // When maximized, take full width minus sidebar (64px collapsed, 208px expanded)
          transition: 'width 0.3s ease-in-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 class="font-semibold" style={{ color: 'var(--text-primary)' }}>AI Assistant</h2>
              <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Kubernetes expert</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            {/* Provider selector */}
            <select
              value={currentProvider()}
              onChange={(e) => switchProvider(e.target.value)}
              class="rounded-lg px-2 py-1 text-sm focus:outline-none"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              <For each={providers()}>
                {(provider) => (
                  <option value={provider.id}>{provider.name}</option>
                )}
              </For>
            </select>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearChat();
              }}
              class="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Clear chat"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized());
              }}
              class="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title={isMaximized() ? "Restore" : "Maximize"}
            >
              <Show
                when={isMaximized()}
                fallback={
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                }
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              </Show>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAIPanelOpen(false);
              }}
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
              title="Close panel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

      {/* Messages */}
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <Show when={messages().length === 0}>
          <div class="text-center py-8">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-secondary)' }}>
              <svg class="w-8 h-8" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>How can I help?</h3>
            <p class="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Ask me about your Kubernetes cluster, resources, or troubleshooting
            </p>
            <div class="space-y-2">
              <For each={suggestions}>
                {(suggestion) => (
                  <button
                    onClick={() => handleSuggestion(suggestion)}
                    class="w-full text-left px-4 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
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
                class="max-w-[85%] rounded-lg px-4 py-3"
                style={{
                  background: message.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: message.role === 'user' ? '#000' : 'var(--text-primary)'
                }}
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
                    <div class="mt-2 pt-2 border-t text-xs" style={{ 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}>
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
            <div class="rounded-lg px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
              <div class="flex items-center gap-2">
                <div class="flex gap-1">
                  <div class="w-2 h-2 rounded-full animate-bounce" style={{ "animation-delay": "0ms", background: 'var(--accent-primary)' }}></div>
                  <div class="w-2 h-2 rounded-full animate-bounce" style={{ "animation-delay": "150ms", background: 'var(--accent-primary)' }}></div>
                  <div class="w-2 h-2 rounded-full animate-bounce" style={{ "animation-delay": "300ms", background: 'var(--accent-primary)' }}></div>
                </div>
                <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
              </div>
            </div>
          </div>
        </Show>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} class="p-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
        <div class="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue()}
            onInput={(e) => setInputValue(e.currentTarget.value)}
            placeholder="Ask about your cluster..."
            disabled={isLoading()}
            class="flex-1 rounded-lg px-4 py-2.5 focus:outline-none disabled:opacity-50"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
          />
          <button
            type="submit"
            disabled={isLoading() || !inputValue().trim()}
            class="p-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent-primary)',
              color: '#000'
            }}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p class="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Using {providers().find(p => p.id === currentProvider())?.name || 'AI'}
        </p>
      </form>
      </div>
    </>
  );
};

export default AIChat;
