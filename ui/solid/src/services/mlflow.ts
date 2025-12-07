// Copyright 2025 KubeGraf Contributors

import { fetchAPI } from './api';

export interface MLflowStatus {
  installed: boolean;
  namespace?: string;
  version?: string;
  serviceName?: string;
  servicePort?: number;
  deployment?: string;
  backendStore?: string;
  artifactStore?: string;
  trackingUI?: boolean;
  error?: string;
}

export interface MLflowInstallRequest {
  namespace: string;
  backendStore: 'minio' | 's3' | 'gcs' | 'pvc';
  artifactStore: 'minio' | 's3' | 'gcs' | 'pvc';
  enableUI: boolean;
  enableIngress: boolean;
  cpu?: string;
  memory?: string;
  version?: string;
  customValues?: Record<string, any>;
}

export interface MLflowVersions {
  versions: string[];
  latest: string;
}

export const mlflowService = {
  getStatus: async (): Promise<MLflowStatus> => {
    return fetchAPI<MLflowStatus>('/mlflow/status');
  },

  install: async (request: MLflowInstallRequest): Promise<{ success: boolean; message: string }> => {
    return fetchAPI<{ success: boolean; message: string }>('/mlflow/install', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getVersions: async (): Promise<MLflowVersions> => {
    return fetchAPI<MLflowVersions>('/mlflow/versions');
  },

  upgrade: async (namespace: string, version: string): Promise<{ success: boolean; message: string }> => {
    return fetchAPI<{ success: boolean; message: string }>('/mlflow/upgrade', {
      method: 'POST',
      body: JSON.stringify({ namespace, version }),
    });
  },

  proxy: async (path: string, options?: RequestInit): Promise<Response> => {
    return fetch(`/api/mlflow/proxy${path}`, options);
  },
};

