// Copyright 2025 KubeGraf Contributors
package metrics

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a connected WebSocket client.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// Hub manages WebSocket connections and broadcasts.
type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]bool
	broadcast  chan interface{}
	register   chan *Client
	unregister chan *Client
	buffer     *RingBuffer // Reference to ring buffer for snapshot
}

// NewHub creates a new WebSocket hub.
func NewHub(buffer *RingBuffer) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan interface{}, 100),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		buffer:     buffer,
	}
}

// Run starts the hub's main loop.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[MetricsHub] Client connected, total: %d", len(h.clients))

			// Send snapshot to new client
			go h.sendSnapshot(client)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("[MetricsHub] Client disconnected, total: %d", len(h.clients))

		case message := <-h.broadcast:
			data, err := json.Marshal(message)
			if err != nil {
				log.Printf("[MetricsHub] Failed to marshal broadcast: %v", err)
				continue
			}

			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- data:
				default:
					// Client buffer full, will be cleaned up
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends a message to all connected clients.
func (h *Hub) Broadcast(message interface{}) {
	select {
	case h.broadcast <- message:
	default:
		// Channel full, drop message
	}
}

// sendSnapshot sends the current buffer snapshot to a client.
func (h *Hub) sendSnapshot(client *Client) {
	if h.buffer == nil {
		return
	}

	points := h.buffer.Snapshot()
	msg := SnapshotMessage{
		Type:   "snapshot",
		Points: points,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[MetricsHub] Failed to marshal snapshot: %v", err)
		return
	}

	select {
	case client.send <- data:
	default:
		// Client buffer full
	}
}

// ClientCount returns the number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// ServeWs handles WebSocket connections.
func (h *Hub) ServeWs(conn *websocket.Conn) {
	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}

	h.register <- client

	// Start writer goroutine
	go client.writePump()

	// Reader goroutine (handles disconnection)
	client.readPump()
}

// readPump reads messages from the WebSocket (mainly for detecting disconnection).
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[MetricsHub] Read error: %v", err)
			}
			break
		}
	}
}

// writePump sends messages to the WebSocket.
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
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

