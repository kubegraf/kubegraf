// Copyright 2025 KubeGraf Contributors

import { fetchAPI } from './api';

export interface MLTrainingJob {
  name: string;
  namespace: string;
  status: 'Active' | 'Succeeded' | 'Failed';
  createdAt: string;
  completedAt?: string;
  image: string;
  resources: Record<string, string>;
  pods?: string[];
}

export interface MLTrainingJobRequest {
  name: string;
  namespace: string;
  script?: string;
  image?: string;
  autoBuild?: boolean;
  cpu?: string;
  memory?: string;
  gpu?: string;
  restartPolicy: 'Never' | 'OnFailure' | 'Always';
  envVars?: Record<string, string>;
  volumeMounts?: VolumeMount[];
  nodeSelector?: Record<string, string>;
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  pvcName?: string;
  readOnly?: boolean;
}

export interface MLJobLogsResponse {
  logs: string;
}

export const mlJobsService = {
  create: async (request: MLTrainingJobRequest): Promise<{ success: boolean; job?: MLTrainingJob; error?: string }> => {
    return fetchAPI<{ success: boolean; job?: MLTrainingJob; error?: string }>('/ml/jobs/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  list: async (namespace?: string): Promise<{ jobs: MLTrainingJob[] }> => {
    const endpoint = namespace && namespace !== '_all'
      ? `/ml/jobs/list?namespace=${namespace}`
      : '/ml/jobs/list';
    return fetchAPI<{ jobs: MLTrainingJob[] }>(endpoint);
  },

  get: async (name: string, namespace: string): Promise<MLTrainingJob> => {
    return fetchAPI<MLTrainingJob>(`/ml/jobs/get?name=${name}&namespace=${namespace}`);
  },

  delete: async (name: string, namespace: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    return fetchAPI<{ success: boolean; message?: string; error?: string }>('/ml/jobs/delete', {
      method: 'POST',
      body: JSON.stringify({ name, namespace }),
    });
  },

  getLogs: async (name: string, namespace: string, follow: boolean = false): Promise<string> => {
    const endpoint = `/ml/jobs/logs?name=${name}&namespace=${namespace}&follow=${follow}`;
    const response = await fetch(`/api${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }
    return response.text();
  },

  streamLogs: (name: string, namespace: string, onMessage: (message: string) => void, onError: (error: Error) => void): WebSocket => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ml/jobs/logs/ws?name=${name}&namespace=${namespace}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      onMessage(event.data);
    };
    
    ws.onerror = (error) => {
      onError(new Error('WebSocket error'));
    };
    
    ws.onclose = () => {
      // Connection closed
    };
    
    return ws;
  },
};

