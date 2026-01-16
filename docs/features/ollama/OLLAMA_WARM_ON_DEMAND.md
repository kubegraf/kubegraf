# Ollama Warm-On-Demand with Idle Unload Implementation

## Summary

This implementation makes KubeGraf's Ollama integration production-ready by implementing warm-on-demand model loading with automatic idle unload. Models are only loaded when users ask AI questions, and automatically unloaded after a configurable idle period.

## Problem Solved

**Before**: KubeGraf kept Ollama models loaded on GPU even when users weren't using AI, wasting GPU memory and resources.

**After**: 
- Models load only when users ask questions
- Models stay loaded for a short idle window (default 5 minutes) for follow-up questions
- Models automatically unload after idle period
- No background calls trigger model loading
- Minimal TCP connections (shared HTTP client)

## Configuration

All configuration is via environment variables with sensible defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `KUBEGRAF_AI_ENABLED` | `true` | Enable/disable AI features |
| `KUBEGRAF_OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server URL |
| `KUBEGRAF_AI_MODEL` | `llama3.1:latest` | Model to use (if not auto-detected) |
| `KUBEGRAF_AI_KEEP_ALIVE` | `5m` | How long to keep model loaded after last request |
| `KUBEGRAF_AI_AUTOSTART` | `false` | Do NOT preload models on app startup |
| `KUBEGRAF_AI_HEALTHCHECK` | `version` | Health check endpoint (`version` or `tags`) |
| `KUBEGRAF_AI_MAX_IDLE_CONNS` | `2` | Max idle connections in HTTP client |
| `KUBEGRAF_AI_IDLE_CONN_TIMEOUT` | `30s` | Timeout for idle connections |

### Keep-Alive Values

- `5m` (default): Keep model loaded for 5 minutes after last request
- `0`: Unload immediately after each request
- `-1`: Never unload (keep model loaded permanently)
- Any duration: e.g., `10m`, `1h`, `30s`

## Implementation Details

### 1. Configuration (`AIConfig`)

Added new fields to `AIConfig`:
- `KeepAlive`: Duration to keep model loaded after last request
- `AutoStart`: Whether to check availability on startup (default: false)
- `HealthCheckEndpoint`: Endpoint for health checks (default: "version")
- `MaxIdleConns`: Max idle connections in HTTP client
- `IdleConnTimeout`: Timeout for idle connections

### 2. Shared HTTP Client

Implemented a shared HTTP client for all Ollama connections to prevent connection leaks:
- Singleton pattern with `sync.Once`
- Configurable max idle connections and timeout
- Reused across all Ollama provider instances

### 3. Health Checks (`IsAvailable()`)

Changed from `/api/tags` to `/api/version`:
- `/api/version` is lightweight and doesn't trigger model loading
- `/api/tags` can trigger model loading in some Ollama versions
- Health checks are now safe to call frequently

### 4. Keep-Alive in Requests

Added `keep_alive` parameter to all `/api/generate` requests:
- Tells Ollama how long to keep the model loaded after the request
- Value is calculated from `KUBEGRAF_AI_KEEP_ALIVE` environment variable
- Supports immediate unload (`0`), never unload (`-1`), or duration (e.g., `300s`)

### 5. Idle Unload Timer

Implemented automatic model unload after idle period:
- Timer starts/resets on each AI request
- After `keepAlive` duration of inactivity, model is unloaded
- Uses `keep_alive=0` in a dummy request to trigger unload
- Timer is disabled if `KEEP_ALIVE=0` (always unload) or `KEEP_ALIVE=-1` (never unload)

### 6. Lazy Initialization

Provider availability is checked lazily:
- If `AUTOSTART=false` (default), no API calls on startup
- Provider is only checked when user makes first query
- `IsAvailable()` performs lazy check without setting provider (for status endpoints)

### 7. No Background Calls

Audited all code paths:
- Removed any startup warmup/polling that calls `/api/chat` or `/api/generate`
- Health checks use `/api/version` only
- Model detection (`/api/tags`) only runs if `AUTOSTART=true`

## Code Changes

### Modified Files

- `ai.go`: Complete refactor of Ollama integration
  - Added configuration fields
  - Implemented shared HTTP client
  - Added keep-alive support
  - Implemented idle unload timer
  - Changed health checks to `/api/version`
  - Implemented lazy initialization

## Testing

### Acceptance Tests

1. **Start KubeGraf, do NOT use AI:**
   ```bash
   ./kubegraf web --port 3000
   ollama ps  # Should be empty
   lsof -nP -iTCP:11434  # Should show LISTEN only, or at most 1 short-lived connection
   ```

2. **Ask a question in KubeGraf:**
   - Navigate to AI Assistant
   - Ask a question
   - `ollama ps` should show model loaded

3. **Ask 2nd question immediately:**
   - Should get instant response
   - Model should still be loaded

4. **Wait 5 minutes idle:**
   - `ollama ps` should show empty (model unloaded)

5. **Manual unload:**
   ```bash
   ollama stop llama3.1:latest
   ```
   - Should not cause immediate reload unless user asks again

### Environment Variable Examples

```bash
# Keep model loaded for 10 minutes after last request
export KUBEGRAF_AI_KEEP_ALIVE=10m

# Always unload immediately after each request
export KUBEGRAF_AI_KEEP_ALIVE=0

# Never unload (keep model loaded permanently)
export KUBEGRAF_AI_KEEP_ALIVE=-1

# Use custom model
export KUBEGRAF_AI_MODEL=llama3.2:latest

# Enable auto-start (check availability on startup)
export KUBEGRAF_AI_AUTOSTART=true
```

## Benefits

1. **GPU Memory Efficiency**: Models only loaded when needed
2. **Fast Follow-ups**: Model stays loaded for short window for quick follow-up questions
3. **Automatic Cleanup**: Models unload automatically after idle period
4. **No Connection Leaks**: Shared HTTP client prevents connection buildup
5. **Production Ready**: No background calls, proper resource management

## Backward Compatibility

- All existing functionality preserved
- Default behavior is warm-on-demand (no breaking changes)
- Environment variables are optional (sensible defaults)
- Existing code using `NewAIAssistant()` continues to work

## Future Improvements

- Add metrics for model load/unload events
- Add configuration UI in web interface
- Support multiple models with separate keep-alive timers
- Add graceful shutdown to unload models on exit

