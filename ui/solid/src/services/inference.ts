// Copyright 2025 KubeGraf Contributors

import { fetchAPI } from './api';

export interface InferenceService {
  name: string;
  namespace: string;
  status: 'Running' | 'Pending' | 'Failed';
  runtime: string;
  modelFile: string;
  endpoint?: string;
  replicas: number;
  readyReplicas: number;
  createdAt: string;
  resources: Record<string, string>;
}

export interface InferenceServiceRequest {
  name: string;
  namespace: string;
  modelFile: string; // Base64 encoded
  modelFileName: string;
  runtime: 'fastapi' | 'mlserver' | 'bentoml' | 'kserve';
  cpu?: string;
  memory?: string;
  gpu?: string;
  replicas?: number;
  hpa?: HPASpec;
  ingress?: IngressSpec;
  storage?: StorageSpec;
  envVars?: Record<string, string>;
}

export interface HPASpec {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetCPU: number;
}

export interface IngressSpec {
  enabled: boolean;
  host?: string;
  path?: string;
  tls?: boolean;
}

export interface StorageSpec {
  type: 'pvc' | 'minio' | 's3';
  pvcName?: string;
  minio?: MinIOConfig;
  s3?: S3Config;
  mountPath?: string;
}

export interface MinIOConfig {
  endpoint: string;
  bucket: string;
  accessKey?: string;
  secretKey?: string;
}

export interface S3Config {
  endpoint: string;
  bucket: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
}

export interface InferenceTestRequest {
  name: string;
  namespace: string;
  input: Record<string, any>;
}

export interface InferenceTestResponse {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  latency?: string;
}

export const inferenceService = {
  create: async (request: InferenceServiceRequest): Promise<{ success: boolean; message?: string; error?: string }> => {
    return fetchAPI<{ success: boolean; message?: string; error?: string }>('/inference/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  list: async (namespace?: string): Promise<{ services: InferenceService[] }> => {
    const endpoint = namespace && namespace !== '_all'
      ? `/inference/list?namespace=${namespace}`
      : '/inference/list';
    return fetchAPI<{ services: InferenceService[] }>(endpoint);
  },

  get: async (name: string, namespace: string): Promise<InferenceService> => {
    return fetchAPI<InferenceService>(`/inference/get?name=${name}&namespace=${namespace}`);
  },

  delete: async (name: string, namespace: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    return fetchAPI<{ success: boolean; message?: string; error?: string }>('/inference/delete', {
      method: 'POST',
      body: JSON.stringify({ name, namespace }),
    });
  },

  test: async (request: InferenceTestRequest): Promise<InferenceTestResponse> => {
    return fetchAPI<InferenceTestResponse>('/inference/test', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getStatus: async (name: string, namespace: string): Promise<InferenceService> => {
    return fetchAPI<InferenceService>(`/inference/status?name=${name}&namespace=${namespace}`);
  },
};

