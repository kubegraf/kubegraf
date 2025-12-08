import { Component, For } from 'solid-js';

interface SecurityRecommendationsProps {
  resourceType: 'PDB' | 'HPA' | 'POD' | 'DEPLOYMENT';
}

const SecurityRecommendations: Component<SecurityRecommendationsProps> = (props) => {
  const recommendations = () => {
    const baseRecommendations = [
      {
        title: 'Pod Security Contexts',
        description: 'Configure security contexts to run pods with least privilege. Set runAsNonRoot, readOnlyRootFilesystem, and drop capabilities.',
        icon: '🔒',
        link: 'https://kubernetes.io/docs/concepts/security/pod-security-standards/',
      },
      {
        title: 'Network Policies',
        description: 'Implement network policies to control traffic flow between pods and enforce network segmentation.',
        icon: '🛡️',
        link: 'https://kubernetes.io/docs/concepts/services-networking/network-policies/',
      },
    ];

    if (props.resourceType === 'PDB') {
      return [
        ...baseRecommendations,
        {
          title: 'Pod Disruption Budgets',
          description: 'Ensure PDBs are configured for critical workloads to maintain availability during voluntary disruptions.',
          icon: '⚖️',
          link: 'https://kubernetes.io/docs/tasks/run-application/configure-pdb/',
        },
      ];
    }

    if (props.resourceType === 'HPA') {
      return [
        ...baseRecommendations,
        {
          title: 'Horizontal Pod Autoscalers',
          description: 'Use HPAs to automatically scale workloads based on resource utilization, ensuring optimal performance and cost efficiency.',
          icon: '📈',
          link: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/',
        },
      ];
    }

    return baseRecommendations;
  };

  return (
    <div class="mb-6 rounded-lg border p-4" style={{ background: 'var(--bg-card)', 'border-color': 'var(--border-color)' }}>
      <div class="flex items-start gap-3">
        <div class="text-2xl">🔐</div>
        <div class="flex-1">
          <h3 class="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Security Recommendations
          </h3>
          <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            We recommend implementing the following security best practices for a secure Kubernetes environment:
          </p>
          <div class="space-y-2">
            <For each={recommendations()}>
              {(rec) => (
                <div class="flex items-start gap-2 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                  <span class="text-lg">{rec.icon}</span>
                  <div class="flex-1">
                    <div class="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {rec.title}
                    </div>
                    <div class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {rec.description}
                    </div>
                    <a
                      href={rec.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs mt-1 inline-block"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      Learn more →
                    </a>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityRecommendations;

