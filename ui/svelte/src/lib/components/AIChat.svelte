<script lang="ts">
	import { onMount, tick } from 'svelte';

	interface Message {
		role: 'user' | 'assistant' | 'system';
		content: string;
		timestamp: Date;
		toolCalls?: any[];
	}

	let messages: Message[] = [];
	let inputValue = '';
	let isLoading = false;
	let chatContainer: HTMLElement;
	let sessionId = '';

	// AI Provider selection
	let selectedProvider: 'openai' | 'anthropic' | 'ollama' = 'ollama';
	let providers = [
		{ id: 'ollama', name: 'Ollama (Local)', icon: '🦙' },
		{ id: 'openai', name: 'OpenAI', icon: '🤖' },
		{ id: 'anthropic', name: 'Claude', icon: '🧠' }
	];

	// Sample suggestions for quick actions
	const suggestions = [
		'Why is my nginx pod failing?',
		'Scale deployment api to 3 replicas',
		'Show pods using high memory',
		'Generate a Redis deployment'
	];

	onMount(async () => {
		// Initialize chat session
		try {
			const res = await fetch('/api/ai/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: selectedProvider })
			});
			const data = await res.json();
			sessionId = data.id;
		} catch (e) {
			console.error('Failed to initialize AI session:', e);
		}
	});

	async function sendMessage() {
		if (!inputValue.trim() || isLoading) return;

		const userMessage: Message = {
			role: 'user',
			content: inputValue.trim(),
			timestamp: new Date()
		};

		messages = [...messages, userMessage];
		const query = inputValue;
		inputValue = '';
		isLoading = true;

		await tick();
		scrollToBottom();

		try {
			const res = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					session_id: sessionId,
					message: query,
					provider: selectedProvider
				})
			});

			const data = await res.json();

			const assistantMessage: Message = {
				role: 'assistant',
				content: data.message?.content || data.error || 'No response',
				timestamp: new Date(),
				toolCalls: data.message?.tool_calls
			};

			messages = [...messages, assistantMessage];
		} catch (e) {
			messages = [...messages, {
				role: 'assistant',
				content: `Error: ${e instanceof Error ? e.message : 'Failed to get response'}`,
				timestamp: new Date()
			}];
		}

		isLoading = false;
		await tick();
		scrollToBottom();
	}

	function scrollToBottom() {
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function useSuggestion(suggestion: string) {
		inputValue = suggestion;
		sendMessage();
	}
</script>

<div class="ai-chat">
	<div class="chat-header">
		<div class="title">
			<span class="icon">✨</span>
			<span>KubeGraf AI</span>
		</div>
		<select bind:value={selectedProvider} class="provider-select">
			{#each providers as provider}
				<option value={provider.id}>{provider.icon} {provider.name}</option>
			{/each}
		</select>
	</div>

	<div class="chat-container" bind:this={chatContainer}>
		{#if messages.length === 0}
			<div class="welcome">
				<h3>Welcome to KubeGraf AI</h3>
				<p>Ask me anything about your Kubernetes cluster</p>
				<div class="suggestions">
					{#each suggestions as suggestion}
						<button class="suggestion" on:click={() => useSuggestion(suggestion)}>
							{suggestion}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			{#each messages as message}
				<div class="message {message.role}">
					<div class="avatar">
						{#if message.role === 'user'}👤{:else}🤖{/if}
					</div>
					<div class="content">
						<div class="text">{message.content}</div>
						{#if message.toolCalls && message.toolCalls.length > 0}
							<div class="tool-calls">
								{#each message.toolCalls as call}
									<div class="tool-call">
										<span class="tool-icon">🔧</span>
										<span class="tool-name">{call.function?.name}</span>
									</div>
								{/each}
							</div>
						{/if}
						<div class="timestamp">
							{message.timestamp.toLocaleTimeString()}
						</div>
					</div>
				</div>
			{/each}
		{/if}

		{#if isLoading}
			<div class="message assistant loading">
				<div class="avatar">🤖</div>
				<div class="content">
					<div class="typing-indicator">
						<span></span><span></span><span></span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<div class="chat-input">
		<textarea
			bind:value={inputValue}
			placeholder="Ask about your cluster... (e.g., 'Why is my pod failing?')"
			on:keydown={handleKeyDown}
			disabled={isLoading}
			rows="1"
		></textarea>
		<button class="send-btn" on:click={sendMessage} disabled={isLoading || !inputValue.trim()}>
			{#if isLoading}⏳{:else}📤{/if}
		</button>
	</div>
</div>

<style>
	.ai-chat {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-primary, #0f172a);
		border-radius: 12px;
		overflow: hidden;
	}

	.chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		color: white;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	.icon {
		font-size: 1.25rem;
	}

	.provider-select {
		padding: 0.5rem;
		border-radius: 8px;
		background: rgba(255,255,255,0.2);
		border: none;
		color: white;
		cursor: pointer;
	}

	.chat-container {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.welcome {
		text-align: center;
		padding: 2rem;
		color: var(--text-secondary, #94a3b8);
	}

	.welcome h3 {
		color: var(--text-primary, white);
		margin-bottom: 0.5rem;
	}

	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		margin-top: 1rem;
	}

	.suggestion {
		padding: 0.5rem 1rem;
		background: var(--bg-secondary, #1e293b);
		border: 1px solid var(--border-light, #334155);
		border-radius: 20px;
		color: var(--text-primary, white);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.suggestion:hover {
		background: #6366f1;
		border-color: #6366f1;
	}

	.message {
		display: flex;
		gap: 0.75rem;
		max-width: 85%;
	}

	.message.user {
		align-self: flex-end;
		flex-direction: row-reverse;
	}

	.message.assistant {
		align-self: flex-start;
	}

	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--bg-secondary, #1e293b);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.content {
		background: var(--bg-secondary, #1e293b);
		padding: 0.75rem 1rem;
		border-radius: 12px;
		color: var(--text-primary, white);
	}

	.message.user .content {
		background: #6366f1;
	}

	.text {
		white-space: pre-wrap;
		word-break: break-word;
	}

	.timestamp {
		font-size: 0.75rem;
		color: var(--text-secondary, #94a3b8);
		margin-top: 0.5rem;
	}

	.tool-calls {
		margin-top: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tool-call {
		font-size: 0.75rem;
		background: rgba(99, 102, 241, 0.2);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.typing-indicator {
		display: flex;
		gap: 4px;
		padding: 0.5rem;
	}

	.typing-indicator span {
		width: 8px;
		height: 8px;
		background: #6366f1;
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out;
	}

	.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
	.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

	@keyframes bounce {
		0%, 80%, 100% { transform: scale(0); }
		40% { transform: scale(1); }
	}

	.chat-input {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--bg-secondary, #1e293b);
		border-top: 1px solid var(--border-light, #334155);
	}

	.chat-input textarea {
		flex: 1;
		padding: 0.75rem 1rem;
		border-radius: 24px;
		border: 1px solid var(--border-light, #334155);
		background: var(--bg-primary, #0f172a);
		color: var(--text-primary, white);
		resize: none;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.chat-input textarea:focus {
		outline: none;
		border-color: #6366f1;
	}

	.send-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: none;
		background: #6366f1;
		color: white;
		cursor: pointer;
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.send-btn:hover:not(:disabled) {
		background: #4f46e5;
		transform: scale(1.05);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
