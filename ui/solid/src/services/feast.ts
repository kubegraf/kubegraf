// Copyright 2025 KubeGraf Contributors

import { fetchAPI } from './api';

export interface FeastStatus {
  installed: boolean;
  version?: string;
  namespace?: string;
  onlineStore?: string;
  offlineStore?: string;
  servingURL?: string;
  registryURL?: string;
}

export interface FeastInstallRequest {
  namespace: string;
  version?: string;
  onlineStore: OnlineStoreSpec;
  offlineStore: OfflineStoreSpec;
  cpu?: string;
  memory?: string;
}

export interface OnlineStoreSpec {
  type: 'redis' | 'bigquery';
  redis?: RedisConfig;
  bigquery?: BigQueryConfig;
}

export interface OfflineStoreSpec {
  type: 'file' | 'pvc' | 'bigquery' | 'snowflake';
  file?: FileStoreConfig;
  pvc?: PVCConfig;
  bigquery?: BigQueryConfig;
  snowflake?: SnowflakeConfig;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
}

export interface BigQueryConfig {
  projectId: string;
  dataset: string;
  credentials?: string;
}

export interface FileStoreConfig {
  path: string;
}

export interface PVCConfig {
  pvcName: string;
  mountPath: string;
}

export interface SnowflakeConfig {
  account: string;
  database: string;
  schema: string;
  warehouse: string;
  username: string;
  password?: string;
}

export const feastService = {
  getStatus: async (): Promise<FeastStatus> => {
    return fetchAPI<FeastStatus>('/feast/status');
  },

  install: async (request: FeastInstallRequest): Promise<{ success: boolean; message?: string; error?: string }> => {
    return fetchAPI<{ success: boolean; message?: string; error?: string }>('/feast/install', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

