# AI Agents Integration Guide

This guide explains how to integrate external AI agents (like Codex, Cursor, etc.) into KubeGraf's AI Assistant panel.

## Overview

KubeGraf supports integration with multiple AI agents through a flexible plugin system. You can connect:
- **OpenAI Codex** - For code generation and completion
- **Cursor AI** - Cursor IDE's AI assistant
- **Custom AI Agents** - Any AI service with an HTTP API
- **Ollama** - Local AI models
- **OpenAI** - GPT models
- **Claude** - Anthropic's Claude models

## Architecture

The AI agent integration is organized into separate files for better maintainability:

### Backend (`internal/aiagents/`)
- `types.go` - Core types and interfaces
- `registry.go` - Agent registry and management
- `codex.go` - OpenAI Codex implementation
- `cursor.go` - Cursor AI implementation
- `custom.go` - Custom HTTP API agent implementation
- `discovery.go` - Auto-discovery of available agents

### Frontend (`ui/solid/src/`)
- `services/aiAgents/` - API service layer
  - `types.ts` - TypeScript types
  - `api.ts` - API client functions
- `stores/aiAgents.ts` - State management
- `components/aiAgents/` - UI components
  - `AgentSelector.tsx` - Agent selection dropdown
  - `AgentConfigModal.tsx` - Agent configuration modal

## Quick Start

### 1. Using Codex (OpenAI)

If you have `OPENAI_API_KEY` set in your environment, Codex will be automatically discovered:

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
./kubegraf web --port 3003
```

The system will automatically:
- Detect the API key
- Register Codex agent
- Make it available in the AI Assistant panel

### 2. Using Cursor AI

#### Option A: Local Cursor Server
If Cursor is running a local server on port 3001:

```bash
# Cursor should be running with API enabled
# Default endpoint: http://localhost:3001/api/chat
```

The system will automatically discover it if it's accessible.

#### Option B: Cursor API
Set environment variables:

```bash
export CURSOR_API_ENDPOINT="https://api.cursor.sh/v1/chat"
export CURSOR_API_KEY="your-cursor-api-key"
./kubegraf web --port 3003
```

### 3. Adding Custom Agents via UI

1. Open KubeGraf UI
2. Click "AI Assistant" in the sidebar
3. Click the "+" button in the agent selector
4. Fill in the agent configuration:
   - **Name**: Display name for the agent
   - **Type**: Select "Custom API"
   - **Endpoint**: Full URL to the agent's API (e.g., `http://localhost:8080/api/chat`)
   - **API Key**: Optional, if required
   - **Description**: Brief description

5. Click "Register Agent"
6. The agent will be tested and registered if connection succeeds

### 4. Adding Custom Agents via Environment Variables

```bash
export CUSTOM_AI_ENDPOINT="http://localhost:8080/api/chat"
export CUSTOM_AI_NAME="My Custom Agent"
export CUSTOM_AI_API_KEY="optional-api-key"
./kubegraf web --port 3003
```

## API Endpoints

### List All Agents
```bash
GET /api/ai/agents
```

Response:
```json
{
  "agents": [
    {
      "id": "codex-openai",
      "name": "OpenAI Codex",
      "type": "codex",
      "status": "connected",
      "enabled": true,
      "description": "OpenAI Codex for code generation",
      "icon": "codex",
      "connected": true
    }
  ]
}
```

### Query an Agent
```bash
POST /api/ai/agents/query
Content-Type: application/json

{
  "agentId": "codex-openai",
  "message": "Explain Kubernetes pods",
  "context": {},
  "model": "code-davinci-002",
  "maxTokens": 1000
}
```

### Register a New Agent
```bash
POST /api/ai/agents/register
Content-Type: application/json

{
  "id": "my-agent",
  "name": "My Custom Agent",
  "type": "custom",
  "endpoint": "http://localhost:8080/api/chat",
  "apiKey": "optional-key",
  "enabled": true,
  "description": "My custom AI agent"
}
```

### Discover Agents
```bash
POST /api/ai/agents/discover
```

Triggers automatic discovery of agents from environment variables.

## Using Agents in the UI

1. **Open AI Assistant**: Click "AI Assistant" in the sidebar
2. **Select Agent**: Use the "Agent" dropdown to select an available agent
3. **Chat**: Type your message and press Enter
4. **Add Agent**: Click the "+" button to add a new agent

The selected agent will be used for all queries until you change it. If no agent is selected, the system falls back to the default AI provider.

## Agent Types

### Codex (`codex`)
- **Endpoint**: `https://api.openai.com/v1/completions`
- **Requires**: `OPENAI_API_KEY` environment variable
- **Default Model**: `code-davinci-002`

### Cursor (`cursor`)
- **Local**: `http://localhost:3001/api/chat`
- **API**: Set via `CURSOR_API_ENDPOINT` and `CURSOR_API_KEY`
- **Description**: Cursor IDE's AI assistant

### Custom (`custom`)
- **Endpoint**: Any HTTP API endpoint
- **Format**: Expects JSON request/response
- **Request Format**:
  ```json
  {
    "message": "user message",
    "model": "optional",
    "max_tokens": 1000
  }
  ```
- **Response Format** (any of these fields):
  ```json
  {
    "response": "AI response",
    "content": "AI response",
    "text": "AI response",
    "answer": "AI response"
  }
  ```

## Troubleshooting

### Agent Not Appearing
1. Check if agent is enabled: `GET /api/ai/agents`
2. Check agent status: Look for `"status": "connected"`
3. Try health check: `POST /api/ai/agents/health` with `{"agentId": "agent-id"}`

### Connection Errors
- Verify the endpoint URL is correct
- Check if API key is required and set correctly
- Ensure the agent service is running and accessible
- Check firewall/network settings

### Auto-Discovery Not Working
- Ensure environment variables are set before starting KubeGraf
- Try manual discovery: `POST /api/ai/agents/discover`
- Check server logs for discovery errors

## Examples

### Example: Local Ollama Agent
```bash
# Start Ollama locally
ollama serve

# Add via UI:
# - Type: Custom API
# - Endpoint: http://localhost:11434/api/generate
# - Name: Ollama Local
```

### Example: Custom Python AI Service
```python
# Your AI service should accept:
POST /api/chat
{
  "message": "user message"
}

# And return:
{
  "response": "AI response"
}
```

Then register it in KubeGraf UI with endpoint: `http://localhost:5000/api/chat`

## Security Notes

- API keys are stored in memory (not persisted to disk)
- API keys are not exposed in API responses
- Use environment variables for sensitive credentials
- Custom endpoints should use HTTPS in production

## Next Steps

- Add more agent types by implementing `AgentInterface` in `internal/aiagents/`
- Customize agent behavior by modifying agent-specific files
- Add agent-specific UI components in `components/aiAgents/`

