// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

import { api } from './api';

export interface KialiStatus {
  installed: boolean;
  namespace?: string;
  version?: string;
  serviceName?: string;
  servicePort?: number;
  deployment?: string;
  istioDetected: boolean;
  error?: string;
}

export interface KialiInstallRequest {
  namespace: string;
  version: string;
  authStrategy: 'anonymous' | 'token' | 'openid' | 'ldap';
  serviceType: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  enableIngress: boolean;
  ingressHost?: string;
}

export interface KialiInstallResponse {
  success: boolean;
  message: string;
  version?: string;
  namespace?: string;
  error?: string;
}

export interface KialiVersion {
  tag_name: string;
  name: string;
}

// Helper function to make API calls
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }

  return response.json();
}

export const kialiService = {
  async getStatus(): Promise<KialiStatus> {
    return fetchAPI<KialiStatus>('/integrations/kiali/status');
  },

  async getTrafficData(namespace?: string): Promise<any> {
    // Get services and their endpoints to visualize traffic
    const services = await api.getServices(namespace);
    const pods = await api.getPods(namespace);
    
    // Build traffic map data
    return {
      services: services || [],
      pods: pods || [],
      connections: [], // Will be built from service selectors
    };
  },

  async proxy(path: string, options?: RequestInit): Promise<Response> {
    const url = `/api/kiali/proxy${path}`;
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  },
};

