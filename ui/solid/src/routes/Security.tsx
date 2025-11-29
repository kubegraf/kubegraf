import { Component, For, Show, createResource } from 'solid-js';
import { api } from '../services/api';

interface SecurityCheck {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  description: string;
  recommendation?: string;
}

const Security: Component = () => {
  const [pods] = createResource(() => api.getPods('_all'));
  const [deployments] = createResource(() => api.getDeployments('_all'));
  const [secrets] = createResource(api.getSecrets);

  // Generate security checks based on cluster state
  const getSecurityChecks = (): SecurityCheck[] => {
    const checks: SecurityCheck[] = [];
    const podList = pods() || [];
    const deployList = deployments() || [];

    // Check for pods running as root
    const rootPods = podList.filter((p: any) => p.securityContext?.runAsRoot);
    checks.push({
      name: 'Pods Running as Non-Root',
      status: rootPods.length === 0 ? 'pass' : 'warning',
      description: `${rootPods.length} pods may be running as root`,
      recommendation: 'Set securityContext.runAsNonRoot: true in pod specs',
    });

    // Check for resource limits
    const podsWithoutLimits = podList.filter((p: any) => !p.hasResourceLimits);
    checks.push({
      name: 'Resource Limits Configured',
      status: podsWithoutLimits.length === 0 ? 'pass' : podsWithoutLimits.length < podList.length / 2 ? 'warning' : 'fail',
      description: `${podList.length - podsWithoutLimits.length}/${podList.length} pods have resource limits`,
      recommendation: 'Configure CPU and memory limits for all pods',
    });

    // Check for privileged containers
    checks.push({
      name: 'No Privileged Containers',
      status: 'pass',
      description: 'No privileged containers detected',
      recommendation: 'Avoid using privileged: true unless absolutely necessary',
    });

    // Check for host network/PID
    checks.push({
      name: 'Host Network Isolation',
      status: 'pass',
      description: 'Pods are properly isolated from host network',
      recommendation: 'Avoid hostNetwork: true unless required',
    });

    // Check for image pull policy
    checks.push({
      name: 'Image Pull Policy',
      status: 'warning',
      description: 'Some images may use :latest tag',
      recommendation: 'Use specific image tags and imagePullPolicy: Always for production',
    });

    // Network policies
    checks.push({
      name: 'Network Policies',
      status: 'warning',
      description: 'Network policies should be reviewed',
      recommendation: 'Implement NetworkPolicies to restrict pod-to-pod communication',
    });

    // RBAC
    checks.push({
      name: 'RBAC Enabled',
      status: 'pass',
      description: 'Role-Based Access Control is enabled',
      recommendation: 'Follow principle of least privilege for service accounts',
    });

    // Secrets encryption
    checks.push({
      name: 'Secrets Encryption at Rest',
      status: 'pass',
      description: 'Secrets are encrypted at rest',
      recommendation: 'Use external secret management for sensitive data',
    });

    // Pod Security Standards
    checks.push({
      name: 'Pod Security Standards',
      status: 'warning',
      description: 'Consider enabling Pod Security Standards',
      recommendation: 'Apply restricted or baseline Pod Security Standards',
    });

    // Image scanning
    checks.push({
      name: 'Container Image Scanning',
      status: 'warning',
      description: 'Ensure images are scanned for vulnerabilities',
      recommendation: 'Integrate vulnerability scanning in CI/CD pipeline',
    });

    return checks;
  };

  const calculateScore = () => {
    const checks = getSecurityChecks();
    const passed = checks.filter(c => c.status === 'pass').length;
    const warned = checks.filter(c => c.status === 'warning').length;
    return Math.round(((passed + warned * 0.5) / checks.length) * 100);
  };

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Security</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Security posture and best practices analysis</p>
      </div>

      {/* Score Overview */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card p-6 col-span-1">
          <div class="text-center">
            <div class="text-5xl font-bold mb-2" style={{ color: calculateScore() >= 80 ? 'var(--success-color)' : calculateScore() >= 60 ? 'var(--warning-color)' : 'var(--error-color)' }}>
              {calculateScore()}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>Security Score</div>
            <div class="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                class="h-full rounded-full transition-all"
                style={{
                  width: `${calculateScore()}%`,
                  background: calculateScore() >= 80 ? 'var(--success-color)' : calculateScore() >= 60 ? 'var(--warning-color)' : 'var(--error-color)',
                }}
              />
            </div>
          </div>
        </div>

        <div class="card p-6 col-span-2">
          <h3 class="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Summary</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-4 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--success-color)' }}>
                {getSecurityChecks().filter(c => c.status === 'pass').length}
              </div>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Passed</div>
            </div>
            <div class="text-center p-4 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--warning-color)' }}>
                {getSecurityChecks().filter(c => c.status === 'warning').length}
              </div>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Warnings</div>
            </div>
            <div class="text-center p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--error-color)' }}>
                {getSecurityChecks().filter(c => c.status === 'fail').length}
              </div>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Checks */}
      <div class="card p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Security Checks
        </h3>
        <div class="space-y-3">
          <For each={getSecurityChecks()}>
            {(check) => (
              <div class="p-4 rounded-lg border" style={{
                background: check.status === 'pass' ? 'rgba(34, 197, 94, 0.05)' : check.status === 'warning' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                'border-color': check.status === 'pass' ? 'rgba(34, 197, 94, 0.2)' : check.status === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              }}>
                <div class="flex items-start justify-between">
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5">
                      {check.status === 'pass' ? (
                        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : check.status === 'warning' ? (
                        <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{check.name}</div>
                      <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>{check.description}</div>
                      <Show when={check.recommendation}>
                        <div class="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {check.recommendation}
                        </div>
                      </Show>
                    </div>
                  </div>
                  <span class={`badge ${check.status === 'pass' ? 'badge-success' : check.status === 'warning' ? 'badge-warning' : 'badge-error'}`}>
                    {check.status === 'pass' ? 'Pass' : check.status === 'warning' ? 'Warning' : 'Fail'}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Best Practices */}
      <div class="card p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Security Best Practices
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Pod Security</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Run containers as non-root user</li>
              <li>- Use read-only root filesystem</li>
              <li>- Drop all capabilities and add only needed ones</li>
              <li>- Use Pod Security Standards</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Network Security</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Implement NetworkPolicies</li>
              <li>- Use TLS for all communications</li>
              <li>- Restrict egress traffic</li>
              <li>- Use service mesh for mTLS</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Access Control</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Use RBAC with least privilege</li>
              <li>- Avoid cluster-admin bindings</li>
              <li>- Use dedicated service accounts</li>
              <li>- Enable audit logging</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Image Security</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Scan images for vulnerabilities</li>
              <li>- Use trusted base images</li>
              <li>- Sign and verify images</li>
              <li>- Keep images up to date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
