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

import { Component, Show, For, createResource } from 'solid-js';
import { api } from '../services/api';
import { setCurrentView } from '../stores/ui';
import { buildPodFilterQuery } from '../utils/workload-navigation';

interface RelatedResourcesProps {
  namespace: string;
  kind: string; // deployment, statefulset, daemonset, job, cronjob
  name: string;
}

const RelatedResources: Component<RelatedResourcesProps> = (props) => {
  const [related] = createResource(
    () => ({ namespace: props.namespace, kind: props.kind, name: props.name }),
    async (params) => {
      try {
        return await api.getWorkloadRelated(params.namespace, params.kind, params.name);
      } catch (error) {
        console.error('Failed to fetch related resources:', error);
        return { pods: [], services: [], ingresses: [], replicasets: [] };
      }
    }
  );

  const handleNavigateToPods = () => {
    const query = buildPodFilterQuery({
      kind: props.kind,
      name: props.name,
      namespace: props.namespace,
    });
    setCurrentView('pods');
    // Update URL with filter params
    const url = new URL(window.location.href);
    url.search = query;
    window.history.pushState({}, '', url.toString());
  };

  const handleNavigateToServices = () => {
    setCurrentView('services');
    // TODO: Add filtering for services when implemented
  };

  const handleNavigateToIngresses = () => {
    setCurrentView('ingresses');
    // TODO: Add filtering for ingresses when implemented
  };

  return (
    <Show when={related()}>
      {(data) => {
        const pods = data().pods || [];
        const services = data().services || [];
        const ingresses = data().ingresses || [];
        const replicasets = data().replicasets || [];
        const hasRelated = pods.length > 0 || services.length > 0 || ingresses.length > 0 || replicasets.length > 0;

        return (
          <Show when={hasRelated}>
            <div class="space-y-3">
              <h3 class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Related</h3>
              <div class="flex flex-wrap gap-2">
                <Show when={pods.length > 0}>
                  <button
                    onClick={handleNavigateToPods}
                    class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      color: '#0ea5e9',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    Pods ({pods.length})
                  </button>
                </Show>
                <Show when={props.kind === 'deployment' && replicasets.length > 0}>
                  <button
                    onClick={() => setCurrentView('deployments')}
                    class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      color: '#0ea5e9',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    ReplicaSets ({replicasets.length})
                  </button>
                </Show>
                <Show when={services.length > 0}>
                  <button
                    onClick={handleNavigateToServices}
                    class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      color: '#0ea5e9',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    Services ({services.length})
                  </button>
                </Show>
                <Show when={ingresses.length > 0}>
                  <button
                    onClick={handleNavigateToIngresses}
                    class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      color: '#0ea5e9',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    Ingresses ({ingresses.length})
                  </button>
                </Show>
              </div>
            </div>
          </Show>
        );
      }}
    </Show>
  );
};

export default RelatedResources;

