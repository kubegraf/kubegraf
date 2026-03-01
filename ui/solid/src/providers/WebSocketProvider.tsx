import { createContext, useContext, JSX, createSignal, onCleanup, onMount } from 'solid-js';
import { wsService } from '../services/websocket';
import type { WebSocketMessage } from '../services/websocket';
import { registerInsightEvent } from '../stores/insightsPulse';

/** A graph-derived causal chain pushed proactively by the graph engine. */
export interface GraphIncidentAlert {
  root_cause?: { kind: string; name: string; namespace?: string; status: string };
  affected_node?: { kind: string; name: string; namespace?: string; status: string };
  confidence: number;
  pattern_matched?: string;
  blast_radius: Array<{ kind: string; name: string; namespace?: string }>;
  analyzed_at?: string;
}

interface WebSocketContextValue {
  socket: () => WebSocket | null;
  connected: () => boolean;
  subscribe: (handler: (message: WebSocketMessage) => void) => () => void;
  send: (message: any) => void;
  graphIncident: () => GraphIncidentAlert | null;
  clearGraphIncident: () => void;
}

const WSContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider(props: { children: JSX.Element }) {
  const [connected, setConnected] = createSignal(false);
  const [socket, setSocket] = createSignal<WebSocket | null>(null);
  const [graphIncident, setGraphIncident] = createSignal<GraphIncidentAlert | null>(null);

  onMount(() => {
    // Connect WebSocket
    wsService.connect();

    // Subscribe to connection state changes
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === 'connection') {
        setConnected(msg.data.connected);
        // Note: We don't have direct access to the WebSocket instance
        // The wsService manages it internally
      }

      // Insights pulse indicator: any event/monitored_event implies new activity
      if (msg.type === 'event' || msg.type === 'monitored_event') {
        registerInsightEvent(1);
      }

      // Graph engine anomaly push — proactive incident detection
      if (msg.type === 'graph_incident' && msg.data) {
        setGraphIncident(msg.data as GraphIncidentAlert);
      }
    });

    // Cleanup on unmount
    onCleanup(() => {
      unsubscribe();
      wsService.disconnect();
    });
  });

  const value: WebSocketContextValue = {
    socket: () => socket(), // Returns null as wsService manages the socket internally
    connected,
    subscribe: (handler) => wsService.subscribe(handler),
    send: (message) => wsService.send(message),
    graphIncident,
    clearGraphIncident: () => setGraphIncident(null),
  };

  return (
    <WSContext.Provider value={value}>
      {props.children}
    </WSContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WSContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

