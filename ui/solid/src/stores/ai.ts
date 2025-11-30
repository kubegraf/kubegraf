import { createSignal } from 'solid-js';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  icon: string;
}

const [sessionId, setSessionId] = createSignal<string | null>(null);
const [messages, setMessages] = createSignal<AIMessage[]>([]);
const [isLoading, setIsLoading] = createSignal(false);
const [currentProvider, setCurrentProvider] = createSignal<string>('ollama');
const [providers, setProviders] = createSignal<AIProvider[]>([
  { id: 'ollama', name: 'Ollama (Local)', icon: 'llama' },
  { id: 'openai', name: 'OpenAI GPT-4', icon: 'openai' },
  { id: 'anthropic', name: 'Claude', icon: 'anthropic' },
]);

async function fetchProviders() {
  try {
    const res = await fetch('/api/ai/status');
    if (res.ok) {
      const data = await res.json();
      // Update current provider based on backend status
      if (data.available && data.provider) {
        const providerName = data.provider.split(' ')[0]; // e.g., "ollama (llama3.2)" -> "ollama"
        setCurrentProvider(providerName);
      }
    }
  } catch (error) {
    console.error('Failed to fetch AI status:', error);
  }
}

async function createSession(): Promise<string | null> {
  // Sessions are not needed with the simple query API
  return crypto.randomUUID();
}

async function sendMessage(content: string) {
  if (!content.trim() || isLoading()) return;

  const userMessage: AIMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    timestamp: new Date(),
  };

  setMessages(prev => [...prev, userMessage]);
  setIsLoading(true);

  try {
    // Check if AI is available first
    const statusRes = await fetch('/api/ai/status');
    const statusData = await statusRes.json();

    if (!statusData.available) {
      const errorMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'No AI provider available. Configure Ollama (local), OpenAI (OPENAI_API_KEY), or Claude (ANTHROPIC_API_KEY) to enable AI features.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const res = await fetch('/api/ai/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: content,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.error) {
        const errorMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const assistantMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } else {
      const errorText = await res.text();
      const errorMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorText}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  } catch (error) {
    const errorMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Failed to send message: ${error}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
}

function clearChat() {
  setMessages([]);
  setSessionId(null);
}

function switchProvider(providerId: string) {
  setCurrentProvider(providerId);
  clearChat();
}

export {
  sessionId,
  messages,
  isLoading,
  currentProvider,
  providers,
  fetchProviders,
  createSession,
  sendMessage,
  clearChat,
  switchProvider,
};
