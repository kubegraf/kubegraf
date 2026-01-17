# KubeGraf - Modular AI Kubernetes Assistant

A local-first, AI-powered Kubernetes assistant that provides intelligent insights and safe self-healing suggestions through natural language queries.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Web UI (React/Go Templates)  │  WebSocket Real-time Updates  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  REST API  │  WebSocket Handler  │  Message Broadcasting      │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  AI Intent Parser  │  Healing Engine  │  Confidence Scorer     │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Integration                       │
├─────────────────────────────────────────────────────────────────┤
│  Resource Health Checks  │  Metrics  │  Action Execution      │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Local LLM Integration                        │
├─────────────────────────────────────────────────────────────────┤
│  Ollama Provider  │  Intent Recognition  │  Response Generation │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 🧠 AI-Powered Natural Language Interface
- Natural language query parsing
- Intent recognition and entity extraction
- Context-aware responses
- Local LLM integration (Ollama)

### 🔧 Intelligent Self-Healing
- Safe action suggestions with confidence scoring
- Automated rollback recommendations
- Scaling suggestions based on metrics
- Restart recommendations for unhealthy pods

### 📊 Comprehensive Health Monitoring
- Real-time pod health checks
- Deployment status monitoring
- Resource metrics collection
- Event correlation and analysis

### 🛡️ Safety-First Design
- Confidence scoring for all suggestions
- Multi-layer safety checks
- User confirmation for risky actions
- Historical success rate tracking

### 🌐 Modern Web Interface
- Chat-based interaction
- Real-time updates via WebSocket
- Interactive dashboards
- Mobile-responsive design

## Quick Start

### Prerequisites

- Go 1.25+
- Kubernetes cluster access (kubectl configured)
- Ollama installed locally (for AI features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kubegraf/kubegraf.git
   cd kubegraf
   ```

2. **Install dependencies:**
   ```bash
   go mod tidy
   ```

3. **Install and start Ollama (if not already installed):**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama service
   ollama serve
   
   # Pull a model (e.g., llama2)
   ollama pull llama2
   ```

4. **Build and run KubeGraf:**
   ```bash
   go build -o kubegraf ./cmd/kubegraf
   ./kubegraf
   ```

5. **Access the web interface:**
   Open http://localhost:3000 in your browser

## Usage Examples

### Natural Language Queries

**Health Checks:**
- "Why is my deployment failing?"
- "Check health of pods in production namespace"
- "Show me the status of my-app-deployment"

**Logs and Diagnostics:**
- "Show logs for my-app-pod"
- "What happened to nginx-pod yesterday?"
- "Check recent events for my-service"

**Self-Healing Actions:**
- "Rollback my-app-deployment"
- "Scale my-service to 5 replicas"
- "Restart my-app-pod"

### Web Interface Features

1. **Chat Interface:** Natural language interaction with your cluster
2. **Real-time Updates:** Live status updates via WebSocket
3. **Healing Suggestions:** AI-powered recommendations with confidence scores
4. **Action Confirmation:** Safe execution of healing actions
5. **Resource Dashboards:** Visual overview of cluster health

## Configuration

### Environment Variables

- `KUBEGRAF_PORT`: Web server port (default: 3000)
- `KUBECONFIG`: Path to kubeconfig file
- `OLLAMA_MODEL`: LLM model to use (default: llama2)

### LLM Configuration

The application uses Ollama for local LLM integration. You can configure:

- Model selection (llama2, mistral, codellama, etc.)
- Custom system prompts
- Response generation parameters

## Architecture Details

### Module Structure

```
pkg/
├── ai/              # AI and LLM integration
│   ├── llm.go       # LLM provider interface and implementations
│   └── parser.go    # Intent parsing and recognition
├── kubernetes/      # Kubernetes client and health checks
│   ├── client.go    # Enhanced Kubernetes client
│   └── health.go    # Health monitoring logic
├── healing/         # Self-healing engine
│   ├── engine.go    # Healing suggestion generation
│   └── executor.go  # Action execution logic
├── confidence/      # Confidence scoring system
│   └── scorer.go    # Multi-factor confidence calculation
├── api/             # Web API and WebSocket handlers
│   └── server.go    # REST API and real-time communication
└── frontend/        # Web UI components
    └── components/  # React/Go template components
```

### Key Components

1. **AI Module:** Handles natural language processing and intent recognition
2. **Kubernetes Module:** Provides enhanced cluster interaction capabilities
3. **Healing Engine:** Generates intelligent self-healing suggestions
4. **Confidence Scorer:** Evaluates suggestion reliability using multiple factors
5. **API Server:** Manages web interface and real-time communication

### Confidence Scoring Algorithm

The confidence score is calculated using a weighted average of:

- **Resource Health (25%):** Current state of target resources
- **Action Complexity (20%):** Risk level and complexity of suggested action
- **Safety Checks (25%):** Results of prerequisite validations
- **Historical Data (15%):** Success rates of similar past actions
- **Time Factor (10%):** Freshness of health data
- **Cluster State (5%):** Overall cluster health and stability

## Safety Features

### Multi-Layer Validation

1. **Resource Existence:** Verify target resources exist
2. **Permission Checks:** Validate RBAC permissions
3. **Cluster Health:** Ensure cluster is stable enough for actions
4. **Safety Checks:** Resource-specific validations
5. **User Confirmation:** Require approval for high-risk actions

### Risk Assessment

- **Low Risk:** Read-only operations, simple scaling
- **Medium Risk:** Rollbacks, restarts with HA
- **High Risk:** Destructive operations, cluster-wide changes

## Development

### Building

```bash
# Build the application
go build -o kubegraf ./cmd/kubegraf

# Run tests
go test ./...

# Run with debug logging
LOG_LEVEL=debug ./kubegraf
```

### Adding New Features

1. **New Intent Types:** Extend the AI parser in `pkg/ai/`
2. **New Healing Actions:** Add to the healing engine in `pkg/healing/`
3. **New Resource Types:** Extend the Kubernetes client in `pkg/kubernetes/`
4. **New UI Components:** Add to the frontend in `pkg/frontend/`

### Testing

```bash
# Unit tests
go test ./pkg/...

# Integration tests (requires cluster)
go test ./test/...

# Load testing
go test ./bench/...
```

## Troubleshooting

### Common Issues

1. **Ollama not running:**
   ```bash
   # Start Ollama service
   ollama serve
   ```

2. **Kubernetes connection issues:**
   ```bash
   # Verify kubectl configuration
   kubectl cluster-info
   ```

3. **Permission errors:**
   ```bash
   # Check RBAC permissions
   kubectl auth can-i --list
   ```

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=debug ./kubegraf
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

Apache License 2.0 - see LICENSE file for details.

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: See /docs directory
- Community: Join our Discord server

---

**KubeGraf** - Making Kubernetes management intelligent, safe, and accessible through AI-powered assistance.