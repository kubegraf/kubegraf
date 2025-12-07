// Copyright 2025 KubeGraf Contributors

import { fetchAPI } from './api';

export interface GPUNodeInfo {
  nodeName: string;
  gpus: GPUInfo[];
  totalGPUs: number;
  gpuType?: string;
  labels?: Record<string, string>;
}

export interface GPUInfo {
  id: string;
  type?: string;
  capacity: string;
}

export interface GPUStatus {
  dcgmInstalled: boolean;
  gpuNodesFound: boolean;
  gpuNodes?: GPUNodeInfo[];
  namespace?: string;
  serviceURL?: string;
  prometheusURL?: string;
}

export interface GPUMetrics {
  nodeName: string;
  gpuId: string;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  processes: GPUProcess[];
  timestamp: string;
}

export interface GPUProcess {
  pid: number;
  name: string;
  memory: number;
  utilization: number;
}

export interface GPUInstallRequest {
  namespace: string;
  version?: string;
}

export const gpuService = {
  getStatus: async (): Promise<GPUStatus> => {
    return fetchAPI<GPUStatus>('/gpu/status');
  },

  getNodes: async (): Promise<{ nodes: GPUNodeInfo[] }> => {
    return fetchAPI<{ nodes: GPUNodeInfo[] }>('/gpu/nodes');
  },

  getMetrics: async (): Promise<{ metrics: GPUMetrics[] }> => {
    return fetchAPI<{ metrics: GPUMetrics[] }>('/gpu/metrics');
  },

  install: async (request: GPUInstallRequest): Promise<{ success: boolean; message?: string; error?: string }> => {
    return fetchAPI<{ success: boolean; message?: string; error?: string }>('/gpu/install', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

