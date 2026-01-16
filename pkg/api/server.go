// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kubegraf/kubegraf/pkg/ai"
	"github.com/kubegraf/kubegraf/pkg/healing"
	"github.com/kubegraf/kubegraf/pkg/kubernetes"
)

// Server provides the web API for KubeGraf
type Server struct {
	k8sClient      *kubernetes.Client
	aiParser       ai.IntentParser
	healingEngine  *healing.Engine
	upgrader       websocket.Upgrader
	clients        map[string]*Client
	broadcast      chan Message
	port           int
	webHandler     http.Handler
}

// Client represents a WebSocket client connection
type Client struct {
	ID       string
	conn     *websocket.Conn
	send     chan Message
	server   *Server
}

// Message represents a message sent to clients
type Message struct {
	Type      string      `json:"type"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// NewServer creates a new API server
func NewServer(k8sClient *kubernetes.Client, aiParser ai.IntentParser, healingEngine *healing.Engine, port int) *Server {
	return &Server{
		k8sClient:     k8sClient,
		aiParser:      aiParser,
		healingEngine: healingEngine,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for development
			},
		},
		clients:   make(map[string]*Client),
		broadcast: make(chan Message, 100),
		port:      port,
	}
}

// SetWebHandler sets the web handler for serving UI assets
func (s *Server) SetWebHandler(handler http.Handler) {
	s.webHandler = handler
}

// Start starts the API server
func (s *Server) Start() error {
	// Setup API routes
	http.HandleFunc("/api/health", s.handleHealth)
	http.HandleFunc("/api/chat", s.handleChat)
	http.HandleFunc("/api/suggestion", s.handleSuggestion)
	http.HandleFunc("/api/execute", s.handleExecute)
	http.HandleFunc("/api/resources/", s.handleResources)
	// http.HandleFunc("/api/ai/status", s.handleAIStatus) // Add AI status endpoint - commented out to avoid conflict with main web server
	http.HandleFunc("/api/executions", s.handleExecutions) // Add executions endpoint
	http.HandleFunc("/api/executions/logs", s.handleExecutionLogs) // Add execution logs endpoint
	http.HandleFunc("/ws", s.handleWebSocket)
	
	// Setup web asset serving
	if s.webHandler != nil {
		// Use the provided web handler for all non-API routes (SPA support)
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// Check if this is an API route first
			if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/ws") {
				http.NotFound(w, r)
				return
			}
			// Otherwise serve web assets
			s.webHandler.ServeHTTP(w, r)
		})
	} else {
		// Fallback to simple index handler if no web handler provided
		http.HandleFunc("/", s.handleIndex)
	}

	// Start broadcast handler
	go s.broadcastHandler()

	log.Printf("Starting KubeGraf API server on port %d", s.port)
	return http.ListenAndServe(fmt.Sprintf(":%d", s.port), nil)
}

// handleHealth handles health check requests
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "1.0.0",
	}
	
	json.NewEncoder(w).Encode(health)
}

// handleChat handles chat/NL queries
func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Parse the user's query
	ctx := context.Background()
	intent, err := s.aiParser.ParseQuery(ctx, request.Message)
	if err != nil {
		s.sendError(w, "Failed to parse query", err)
		return
	}

	// Generate response based on intent
	response, err := s.generateChatResponse(ctx, intent)
	if err != nil {
		s.sendError(w, "Failed to generate response", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// generateChatResponse generates a response to the user's query
func (s *Server) generateChatResponse(ctx context.Context, intent *ai.Intent) (map[string]interface{}, error) {
	switch intent.Type {
	case "query", "health":
		return s.generateHealthResponse(ctx, intent)
	case "logs":
		return s.generateLogsResponse(ctx, intent)
	case "describe":
		return s.generateDescribeResponse(ctx, intent)
	default:
		return s.generateGenericResponse(ctx, intent)
	}
}

// generateHealthResponse generates a health check response
func (s *Server) generateHealthResponse(ctx context.Context, intent *ai.Intent) (map[string]interface{}, error) {
	health, err := s.k8sClient.CheckPodHealth(ctx, intent.Namespace, intent.Name)
	if err != nil {
		return nil, err
	}

	response := map[string]interface{}{
		"type":       "health_response",
		"intent":     intent,
		"health":     health,
		"suggestion": nil,
	}

	// Generate healing suggestion if issues are found
	if len(health.Issues) > 0 {
		suggestion, err := s.healingEngine.GenerateHealingSuggestion(ctx, intent)
		if err == nil {
			response["suggestion"] = suggestion
		}
	}

	return response, nil
}

// generateLogsResponse generates a logs response
func (s *Server) generateLogsResponse(ctx context.Context, intent *ai.Intent) (map[string]interface{}, error) {
	logs, err := s.k8sClient.GetPodLogs(ctx, intent.Namespace, intent.Name, "", false)
	if err != nil {
		return nil, err
	}

	// Get previous logs if current logs are short
	if len(logs) < 1000 {
		previousLogs, _ := s.k8sClient.GetPodLogs(ctx, intent.Namespace, intent.Name, "", true)
		if previousLogs != "" {
			logs = "=== CURRENT LOGS ===\n" + logs + "\n=== PREVIOUS LOGS ===\n" + previousLogs
		}
	}

	return map[string]interface{}{
		"type": "logs_response",
		"intent": intent,
		"logs": logs,
	}, nil
}

// generateDescribeResponse generates a describe response
func (s *Server) generateDescribeResponse(ctx context.Context, intent *ai.Intent) (map[string]interface{}, error) {
	// For now, return a simple response
	return map[string]interface{}{
		"type": "describe_response",
		"intent": intent,
		"message": fmt.Sprintf("Describe information for %s %s in namespace %s", intent.Resource, intent.Name, intent.Namespace),
	}, nil
}

// generateGenericResponse generates a generic response
func (s *Server) generateGenericResponse(ctx context.Context, intent *ai.Intent) (map[string]interface{}, error) {
	return map[string]interface{}{
		"type": "generic_response",
		"intent": intent,
		"message": fmt.Sprintf("I understand you want to %s %s %s in namespace %s", intent.Type, intent.Resource, intent.Name, intent.Namespace),
	}, nil
}

// handleSuggestion handles healing suggestion requests
func (s *Server) handleSuggestion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Intent *ai.Intent `json:"intent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	suggestion, err := s.healingEngine.GenerateHealingSuggestion(ctx, request.Intent)
	if err != nil {
		s.sendError(w, "Failed to generate suggestion", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(suggestion)
}

// handleExecute handles healing action execution
func (s *Server) handleExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Suggestion *healing.HealingSuggestion `json:"suggestion"`
		Confirmed  bool                       `json:"confirmed"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	result, err := s.healingEngine.ExecuteAction(ctx, request.Suggestion, request.Confirmed)
	if err != nil {
		s.sendError(w, "Failed to execute action", err)
		return
	}

	// Broadcast action result to all connected clients
	s.broadcast <- Message{
		Type:      "action_result",
		Timestamp: time.Now(),
		Data:      result,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleResources handles resource-specific API requests
func (s *Server) handleResources(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/resources/")
	parts := strings.Split(path, "/")
	
	if len(parts) < 2 {
		http.Error(w, "Invalid resource path", http.StatusBadRequest)
		return
	}

	resourceType := parts[0]
	resourceName := parts[1]
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = "default"
	}

	ctx := context.Background()
	
	switch r.Method {
	case http.MethodGet:
		s.handleGetResource(w, r, ctx, resourceType, resourceName, namespace)
	case http.MethodPost:
		s.handlePostResource(w, r, ctx, resourceType, resourceName, namespace)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleGetResource handles GET requests for resources
func (s *Server) handleGetResource(w http.ResponseWriter, r *http.Request, ctx context.Context, resourceType, name, namespace string) {
	switch resourceType {
	case "pods":
		health, err := s.k8sClient.CheckPodHealth(ctx, namespace, name)
		if err != nil {
			s.sendError(w, "Failed to get pod health", err)
			return
		}
		json.NewEncoder(w).Encode(health)
	case "deployments":
		health, err := s.k8sClient.CheckDeploymentHealth(ctx, namespace, name)
		if err != nil {
			s.sendError(w, "Failed to get deployment health", err)
			return
		}
		json.NewEncoder(w).Encode(health)
	default:
		http.Error(w, "Unsupported resource type", http.StatusBadRequest)
	}
}

// handlePostResource handles POST requests for resources
func (s *Server) handlePostResource(w http.ResponseWriter, r *http.Request, ctx context.Context, resourceType, name, namespace string) {
	// Handle resource-specific actions
	var request map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	action := request["action"].(string)
	
	switch action {
	case "logs":
		container := ""
		if containerVal, ok := request["container"]; ok {
			container = containerVal.(string)
		}
		previous := false
		if prevVal, ok := request["previous"]; ok {
			previous = prevVal.(bool)
		}
		
		logs, err := s.k8sClient.GetPodLogs(ctx, namespace, name, container, previous)
		if err != nil {
			s.sendError(w, "Failed to get logs", err)
			return
		}
		
		json.NewEncoder(w).Encode(map[string]interface{}{"logs": logs})
	default:
		http.Error(w, "Unsupported action", http.StatusBadRequest)
	}
}

// handleWebSocket handles WebSocket connections
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &Client{
		ID:     fmt.Sprintf("client-%d", time.Now().UnixNano()),
		conn:   conn,
		send:   make(chan Message, 100),
		server: s,
	}

	s.clients[client.ID] = client
	go client.writePump()
	go client.readPump()

	// Send initial connection message
	client.send <- Message{
		Type:      "connected",
		Timestamp: time.Now(),
		Data:      map[string]string{"client_id": client.ID},
	}
}

// handleIndex serves the main UI
func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	// For now, return a simple HTML page
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>KubeGraf - AI Kubernetes Assistant</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .chat-box { border: 1px solid #ccc; height: 400px; overflow-y: scroll; padding: 10px; margin: 20px 0; }
        .input-area { display: flex; gap: 10px; }
        input[type="text"] { flex: 1; padding: 10px; }
        button { padding: 10px 20px; cursor: pointer; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user-message { background: #e3f2fd; text-align: right; }
        .ai-message { background: #f5f5f5; }
        .suggestion { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .confidence-high { color: #28a745; }
        .confidence-medium { color: #ffc107; }
        .confidence-low { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 KubeGraf - AI Kubernetes Assistant</h1>
        <p>Ask me anything about your Kubernetes cluster!</p>
        
        <div id="chat-box" class="chat-box"></div>
        
        <div class="input-area">
            <input type="text" id="message-input" placeholder="Type your message here..." />
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        let ws = new WebSocket('ws://localhost:' + window.location.port + '/ws');
        
        ws.onmessage = function(event) {
            const message = JSON.parse(event.data);
            handleMessage(message);
        };
        
        function handleMessage(message) {
            const chatBox = document.getElementById('chat-box');
            
            switch(message.type) {
                case 'connected':
                    addMessage('System', 'Connected to KubeGraf', 'ai-message');
                    break;
                case 'action_result':
                    const result = message.data;
                    const status = result.status === 'completed' ? '✅' : '❌';
                    addMessage('Action Result', status + ' Action \'' + result.action + '\' on ' + result.resource + '/' + result.name + ': ' + result.status, 'ai-message');
                    break;
            }
        }
        
        function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            addMessage('You', message, 'user-message');
            input.value = '';
            
            // Send to chat API
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            })
            .then(response => response.json())
            .then(data => {
                handleChatResponse(data);
            })
            .catch(error => {
                addMessage('Error', 'Failed to get response: ' + error.message, 'ai-message');
            });
        }
        
        function handleChatResponse(response) {
            if (response.suggestion) {
                displaySuggestion(response.suggestion);
            } else {
                let content = '';
                switch(response.type) {
                    case 'health_response':
                        const health = response.health;
                        content = 'Health check for ' + health.name + ':\nStatus: ' + health.status + '\nReady: ' + health.ready + '\nMessage: ' + health.message;
                        if (health.issues.length > 0) {
                            content += '\nIssues: ' + health.issues.map(issue => issue.message).join(', ');
                        }
                        break;
                    case 'logs_response':
                        content = 'Logs: ' + (response.logs || 'No logs available');
                        break;
                    default:
                        content = response.message || 'Response received';
                }
                addMessage('AI', content, 'ai-message');
            }
        }
        
        function displaySuggestion(suggestion) {
            const chatBox = document.getElementById('chat-box');
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'suggestion';
            
            const confidenceClass = suggestion.confidence > 0.8 ? 'confidence-high' : 
                                  suggestion.confidence > 0.6 ? 'confidence-medium' : 'confidence-low';
            
            suggestionDiv.innerHTML = '<strong>💡 Healing Suggestion</strong><br>' +
                '<strong>Action:</strong> ' + suggestion.action + '<br>' +
                '<strong>Description:</strong> ' + suggestion.description + '<br>' +
                '<strong>Confidence:</strong> <span class="' + confidenceClass + '">' + (suggestion.confidence * 100).toFixed(1) + '%</span><br>' +
                '<strong>Risk Level:</strong> ' + suggestion.risk_level + '<br>' +
                (suggestion.requires_approval ? 
                    '<button onclick="executeSuggestion(' + JSON.stringify(suggestion) + ')" style="margin-top: 10px;">Execute Action</button>' :
                    '<em>No approval required</em>');
            
            chatBox.appendChild(suggestionDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        
        function executeSuggestion(suggestion) {
            if (!confirm('Are you sure you want to execute this action?')) return;
            
            fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    suggestion: suggestion,
                    confirmed: true
                })
            })
            .then(response => response.json())
            .then(result => {
                addMessage('Action', 'Action \'' + result.action + '\' executed: ' + result.status, 'ai-message');
            })
            .catch(error => {
                addMessage('Error', 'Failed to execute action: ' + error.message, 'ai-message');
            });
        }
        
        function addMessage(sender, content, className) {
            const chatBox = document.getElementById('chat-box');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + className;
            messageDiv.innerHTML = '<strong>' + sender + ':</strong> ' + content;
            chatBox.appendChild(messageDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        
        // Allow Enter key to send message
        document.getElementById('message-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>
	`
	
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}

// handleExecutions handles execution list requests
func (s *Server) handleExecutions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse limit parameter (for future use)
	// limit := 20
	// if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
	// 	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
	// 		limit = l
	// 	}
	// }

	// Return empty list for now (mock data)
	// In a real implementation, this would come from a database or storage
	executions := []map[string]interface{}{
		// Return empty array to avoid errors
	}

	response := map[string]interface{}{
		"executions": executions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleExecutionLogs handles execution logs requests
func (s *Server) handleExecutionLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	executionId := r.URL.Query().Get("executionId")
	if executionId == "" {
		s.sendError(w, "executionId parameter is required", fmt.Errorf("missing executionId"))
		return
	}

	// Return empty logs for now (mock data)
	response := map[string]interface{}{
		"executionId": executionId,
		"logs":        []map[string]interface{}{},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// sendError sends an error response
func (s *Server) sendError(w http.ResponseWriter, message string, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	
	errorResponse := map[string]interface{}{
		"error":   message,
		"details": err.Error(),
		"timestamp": time.Now(),
	}
	
	json.NewEncoder(w).Encode(errorResponse)
}

// broadcastHandler handles broadcasting messages to all connected clients
func (s *Server) broadcastHandler() {
	for {
		message := <-s.broadcast
		for _, client := range s.clients {
			select {
			case client.send <- message:
			default:
				// Client channel is full, skip
			}
		}
	}
}

// readPump pumps messages from the websocket connection to the server
func (c *Client) readPump() {
	defer func() {
		c.conn.Close()
		delete(c.server.clients, c.ID)
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var message map[string]interface{}
		err := c.conn.ReadJSON(&message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle client messages
		log.Printf("Received message from client %s: %v", c.ID, message)
	}
}

// writePump pumps messages from the server to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleAIStatus handles AI status requests
func (s *Server) handleAIStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	
	// For now, return that AI is available with the current provider
	status := map[string]interface{}{
		"available": true,
		"provider":  "kubegraf-ai", // Simple identifier for our AI system
	}
	
	json.NewEncoder(w).Encode(status)
}

// createWebHandler creates a handler for serving web assets
func (s *Server) createWebHandler() (http.Handler, error) {
	// For now, use a simple fallback that serves the index.html for all routes
	// This supports Single Page Application routing
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Serve index.html for all non-asset routes (SPA support)
		if !strings.Contains(r.URL.Path, ".") || strings.HasSuffix(r.URL.Path, ".html") {
			s.serveIndex(w, r)
			return
		}
		
		// For asset files, try to serve them directly
		// This is a simplified version - in production you'd want proper asset serving
		s.serveIndex(w, r)
	}), nil
}

// serveIndex serves the main index.html file
func (s *Server) serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	
	// Simple HTML that includes the AI chat interface
	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KubeGraf - AI Kubernetes Assistant</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .chat-container { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; }
        .chat-messages { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; background: #fafafa; }
        .chat-input { display: flex; gap: 10px; }
        .chat-input input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .chat-input button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .chat-input button:hover { background: #2980b9; }
        .message { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .user-message { background: #e3f2fd; text-align: right; }
        .ai-message { background: #f5f5f5; }
        .suggestion { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .confidence-high { color: #28a745; }
        .confidence-medium { color: #ffc107; }
        .confidence-low { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 KubeGraf - AI Kubernetes Assistant</h1>
            <p>Ask me anything about your Kubernetes cluster!</p>
        </div>
        
        <div class="chat-container">
            <h2>💬 AI Chat Interface</h2>
            <div id="chat-messages" class="chat-messages"></div>
            <div class="chat-input">
                <input type="text" id="message-input" placeholder="Type your message here..." />
                <button onclick="sendMessage()">Send</button>
            </div>
        </div>
    </div>

    <script>
        let ws = new WebSocket('ws://localhost:' + window.location.port + '/ws');
        
        ws.onmessage = function(event) {
            const message = JSON.parse(event.data);
            handleMessage(message);
        };
        
        ws.onopen = function() {
            addMessage('System', 'Connected to KubeGraf AI', 'ai-message');
        };
        
        ws.onclose = function() {
            addMessage('System', 'Disconnected from KubeGraf AI', 'ai-message');
        };
        
        function handleMessage(message) {
            const chatMessages = document.getElementById('chat-messages');
            
            switch(message.type) {
                case 'connected':
                    addMessage('System', 'Connected to KubeGraf', 'ai-message');
                    break;
                case 'action_result':
                    const result = message.data;
                    const status = result.status === 'completed' ? '✅' : '❌';
                    addMessage('Action Result', status + ' Action \'' + result.action + '\' on ' + result.resource + '/' + result.name + ': ' + result.status, 'ai-message');
                    break;
            }
        }
        
        function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            addMessage('You', message, 'user-message');
            input.value = '';
            
            // Send to chat API
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            })
            .then(response => response.json())
            .then(data => {
                handleChatResponse(data);
            })
            .catch(error => {
                addMessage('Error', 'Failed to get response: ' + error.message, 'ai-message');
            });
        }
        
        function handleChatResponse(response) {
            if (response.suggestion) {
                displaySuggestion(response.suggestion);
            } else {
                let content = '';
                switch(response.type) {
                    case 'health_response':
                        const health = response.health;
                        content = 'Health check for ' + health.name + ':\nStatus: ' + health.status + '\nReady: ' + health.ready + '\nMessage: ' + health.message;
                        if (health.issues.length > 0) {
                            content += '\nIssues: ' + health.issues.map(issue => issue.message).join(', ');
                        }
                        break;
                    case 'logs_response':
                        content = 'Logs: ' + (response.logs || 'No logs available');
                        break;
                    default:
                        content = response.message || 'Response received';
                }
                addMessage('AI', content, 'ai-message');
            }
        }
        
        function displaySuggestion(suggestion) {
            const chatMessages = document.getElementById('chat-messages');
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'suggestion';
            
            const confidenceClass = suggestion.confidence > 0.8 ? 'confidence-high' : 
                                  suggestion.confidence > 0.6 ? 'confidence-medium' : 'confidence-low';
            
            suggestionDiv.innerHTML = 
                '<strong>💡 Healing Suggestion</strong><br>' +
                '<strong>Action:</strong> ' + suggestion.action + '<br>' +
                '<strong>Description:</strong> ' + suggestion.description + '<br>' +
                '<strong>Confidence:</strong> <span class="' + confidenceClass + '">' + (suggestion.confidence * 100).toFixed(1) + '%</span><br>' +
                '<strong>Risk Level:</strong> ' + suggestion.risk_level + '<br>' +
                (suggestion.requires_approval ? 
                    '<button onclick="executeSuggestion(' + JSON.stringify(suggestion) + ')" style="margin-top: 10px;">Execute Action</button>' :
                    '<em>No approval required</em>');
            
            chatMessages.appendChild(suggestionDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        function executeSuggestion(suggestion) {
            if (!confirm('Are you sure you want to execute this action?')) return;
            
            fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    suggestion: suggestion,
                    confirmed: true
                })
            })
            .then(response => response.json())
            .then(result => {
                addMessage('Action', 'Action \'' + result.action + '\' executed: ' + result.status, 'ai-message');
            })
            .catch(error => {
                addMessage('Error', 'Failed to execute action: ' + error.message, 'ai-message');
            });
        }
        
        function addMessage(sender, content, className) {
            const chatMessages = document.getElementById('chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + className;
            messageDiv.innerHTML = '<strong>' + sender + ':</strong> ' + content;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Allow Enter key to send message
        document.getElementById('message-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>`
	
	fmt.Fprint(w, html)
}