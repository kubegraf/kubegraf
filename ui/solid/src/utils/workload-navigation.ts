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

export interface WorkloadRef {
  kind: string; // deployment, statefulset, daemonset, job, cronjob, replicaset
  name: string;
  namespace: string;
  via?: ViaRef[];
}

export interface ViaRef {
  kind: string; // replicaset, job
  name: string;
}

/**
 * Returns the abbreviation for a workload kind
 */
export function kindAbbrev(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'deployment':
      return 'DEP';
    case 'statefulset':
      return 'STS';
    case 'daemonset':
      return 'DS';
    case 'job':
      return 'JOB';
    case 'cronjob':
      return 'CJ';
    case 'replicaset':
      return 'RS';
    default:
      return kind.toUpperCase().slice(0, 3);
  }
}

/**
 * Formats the workload chain for tooltip display
 */
export function formatWorkloadChain(ref: WorkloadRef | null | undefined): string {
  if (!ref) {
    return 'Unowned';
  }

  let chain = 'Pod';
  if (ref.via) {
    for (const via of ref.via) {
      chain += ` → ${via.kind} ${via.name}`;
    }
  }
  chain += ` → ${ref.kind} ${ref.name}`;
  return chain;
}

/**
 * Returns the URL for a workload detail page
 */
export function toWorkloadUrl(ref: WorkloadRef): string {
  return `/api/workloads/${ref.namespace}/${ref.kind}/${ref.name}`;
}

/**
 * Returns the view name for a workload kind
 */
export function workloadKindToView(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'deployment':
      return 'deployments';
    case 'statefulset':
      return 'statefulsets';
    case 'daemonset':
      return 'daemonsets';
    case 'job':
      return 'jobs';
    case 'cronjob':
      return 'cronjobs';
    case 'replicaset':
      return 'deployments'; // ReplicaSets are shown in Deployments view
    default:
      return 'pods';
  }
}

/**
 * Builds filter parameters for Pods list based on workload reference
 */
export function buildPodFiltersFromWorkload(ref: WorkloadRef): {
  ownerKind?: string;
  ownerName?: string;
  namespace?: string;
} {
  return {
    ownerKind: ref.kind,
    ownerName: ref.name,
    namespace: ref.namespace,
  };
}

/**
 * Builds query string for Pods list filtering
 */
export function buildPodFilterQuery(ref: WorkloadRef): string {
  const params = buildPodFiltersFromWorkload(ref);
  const queryParams = new URLSearchParams();
  if (params.ownerKind) queryParams.set('ownerKind', params.ownerKind);
  if (params.ownerName) queryParams.set('ownerName', params.ownerName);
  if (params.namespace) queryParams.set('namespace', params.namespace);
  return queryParams.toString();
}

/**
 * Builds navigation URL with focus parameter for workload detail pages
 * This allows navigation to a specific resource with automatic focus/highlight
 */
export function buildWorkloadFocusUrl(ref: WorkloadRef): string {
  const view = workloadKindToView(ref.kind);
  const params = new URLSearchParams();
  if (ref.namespace) params.set('namespace', ref.namespace);
  params.set('focus', ref.name);
  return `?${params.toString()}`;
}

/**
 * Navigates to a workload view with focus on a specific resource
 * Updates the URL and view state
 * @param returnView - Optional view to return to when modal closes (e.g., 'pods')
 */
export function navigateToWorkloadWithFocus(
  ref: WorkloadRef,
  setCurrentView: (view: string) => void,
  returnView?: string
): void {
  const view = workloadKindToView(ref.kind);
  const focusUrl = buildWorkloadFocusUrl(ref);
  
  // Update URL with focus params
  const currentUrl = new URL(window.location.href);
  const newParams = new URLSearchParams();
  if (ref.namespace) newParams.set('namespace', ref.namespace);
  newParams.set('focus', ref.name);
  
  // Store return view in URL if provided
  if (returnView) {
    newParams.set('returnView', returnView);
  }
  
  // Preserve other query params if needed
  currentUrl.search = newParams.toString();
  window.history.pushState({}, '', currentUrl.toString());
  
  // Navigate to the view
  setCurrentView(view as any);
}

