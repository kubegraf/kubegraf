import { Component, Show } from 'solid-js';

interface AuthErrorHelperProps {
  provider: string;
  clusterName: string;
  onRetry: () => void;
}

const AuthErrorHelper: Component<AuthErrorHelperProps> = (props) => {
  const getProviderInstructions = () => {
    switch (props.provider.toLowerCase()) {
      case 'gke':
        return {
          title: 'GKE Authentication Required',
          steps: [
            'Run: gcloud auth login',
            'Run: gcloud container clusters get-credentials <cluster-name> --zone <zone>',
            'Click Retry below after completing authentication',
          ],
          docs: 'https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl',
        };
      case 'eks':
        return {
          title: 'EKS Authentication Required',
          steps: [
            'Ensure AWS credentials are configured: aws configure',
            'For SSO: aws sso login --profile <profile>',
            'Update kubeconfig: aws eks update-kubeconfig --name <cluster-name>',
            'Click Retry below after completing authentication',
          ],
          docs: 'https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html',
        };
      case 'aks':
        return {
          title: 'AKS Authentication Required',
          steps: [
            'Run: az login',
            'If using kubelogin: kubelogin convert-kubeconfig -l azurecli',
            'Get credentials: az aks get-credentials --name <cluster-name> --resource-group <rg>',
            'Click Retry below after completing authentication',
          ],
          docs: 'https://learn.microsoft.com/azure/aks/learn/quick-kubernetes-deploy-portal',
        };
      default:
        return {
          title: 'Authentication Required',
          steps: [
            'Check your kubeconfig credentials',
            'Verify cluster access permissions',
            'Ensure authentication plugins are configured correctly',
            'Click Retry below after fixing authentication',
          ],
          docs: null,
        };
    }
  };

  const instructions = getProviderInstructions();

  return (
    <div class="p-4 rounded-lg border" style={{ border: '1px solid var(--error-color)', background: 'rgba(239,68,68,0.1)' }}>
      <div class="flex items-start gap-3 mb-3">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="flex-1">
          <h3 class="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{instructions.title}</h3>
          <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Cluster <strong>{props.clusterName}</strong> requires authentication. Follow these steps:
          </p>
          <ol class="list-decimal list-inside space-y-1 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            {instructions.steps.map((step) => (
              <li>{step}</li>
            ))}
          </ol>
          <Show when={instructions.docs}>
            <a
              href={instructions.docs}
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm underline inline-flex items-center gap-1 mb-3"
              style={{ color: 'var(--accent-primary)' }}
            >
              View Documentation
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </Show>
          <button
            onClick={props.onRetry}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthErrorHelper;
