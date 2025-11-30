// Kubernetes State Stores
import { writable, derived } from 'svelte/store';

// Types
export interface Pod {
	name: string;
	namespace: string;
	status: string;
	ready: string;
	restarts: number;
	age: string;
	cpu: string;
	memory: string;
	node: string;
}

export interface Deployment {
	name: string;
	namespace: string;
	ready: string;
	upToDate: number;
	available: number;
	age: string;
}

export interface Service {
	name: string;
	namespace: string;
	type: string;
	clusterIP: string;
	externalIP: string;
	ports: string;
	age: string;
}

export interface Node {
	name: string;
	status: string;
	roles: string;
	age: string;
	version: string;
	cpu: string;
	memory: string;
}

export interface ClusterInfo {
	name: string;
	connected: boolean;
	version: string;
	error?: string;
}

// Stores
export const cluster = writable<ClusterInfo>({
	name: '',
	connected: false,
	version: ''
});

export const namespaces = writable<string[]>([]);
export const currentNamespace = writable<string>('default');

export const pods = writable<Pod[]>([]);
export const deployments = writable<Deployment[]>([]);
export const services = writable<Service[]>([]);
export const nodes = writable<Node[]>([]);

export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);

// Derived stores
export const podCount = derived(pods, $pods => $pods.length);
export const healthyPods = derived(pods, $pods =>
	$pods.filter(p => p.status === 'Running').length
);
export const unhealthyPods = derived(pods, $pods =>
	$pods.filter(p => p.status !== 'Running').length
);

// WebSocket connection for real-time updates
let ws: WebSocket | null = null;

export function connectWebSocket(url: string) {
	if (ws) {
		ws.close();
	}

	ws = new WebSocket(url);

	ws.onopen = () => {
		console.log('WebSocket connected');
	};

	ws.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			handleWebSocketMessage(data);
		} catch (e) {
			console.error('Failed to parse WebSocket message:', e);
		}
	};

	ws.onclose = () => {
		console.log('WebSocket disconnected');
		// Reconnect after 3 seconds
		setTimeout(() => connectWebSocket(url), 3000);
	};

	ws.onerror = (err) => {
		console.error('WebSocket error:', err);
	};
}

function handleWebSocketMessage(data: any) {
	switch (data.type) {
		case 'pods':
			pods.set(data.data);
			break;
		case 'deployments':
			deployments.set(data.data);
			break;
		case 'services':
			services.set(data.data);
			break;
		case 'nodes':
			nodes.set(data.data);
			break;
		case 'cluster':
			cluster.set(data.data);
			break;
		case 'namespaces':
			namespaces.set(data.data);
			break;
	}
}

export function disconnectWebSocket() {
	if (ws) {
		ws.close();
		ws = null;
	}
}
