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
    const res = await fetch('/api/ai/providers');
    if (res.ok) {
      const data = await res.json();
      setProviders(data);
    }
  } catch (error) {
    console.error('Failed to fetch AI providers:', error);
  }
}

async function createSession(): Promise<string | null> {
  try {
    const res = await fetch('/api/ai/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: currentProvider() }),
    });
    if (res.ok) {
      const data = await res.json();
      setSessionId(data.id);
      return data.id;
    }
  } catch (error) {
    console.error('Failed to create AI session:', error);
  }
  return null;
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
    let sid = sessionId();
    if (!sid) {
      sid = await createSession();
    }

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sid,
        message: content,
        provider: currentProvider(),
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
          content: data.message,
          timestamp: new Date(),
          usage: data.usage,
        };
        setMessages(prev => [...prev, assistantMessage]);
        if (data.session_id) {
          setSessionId(data.session_id);
        }
      }
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
