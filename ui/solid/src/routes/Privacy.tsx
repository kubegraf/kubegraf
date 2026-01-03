import { Component } from 'solid-js';

const Privacy: Component = () => {
  return (
    <div class="max-w-4xl mx-auto p-6" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-4 gradient-text">
          Privacy Policy
        </h1>
        <p class="text-lg" style={{ color: 'var(--text-muted)' }}>
          Your privacy and data security are our top priorities
        </p>
        <p class="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Local-Only Storage Section */}
      <div class="card p-6 mb-6">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Local-Only Storage
            </h2>
            <p class="mb-4" style={{ color: 'var(--text-text)' }}>
              KubēGraf is designed with privacy-first principles. <strong>All data is stored exclusively on your local device</strong> - nothing is transmitted to external servers, cloud services, or third-party analytics platforms.
            </p>
            
            <div class="space-y-3">
              <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <h3 class="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  What We Store Locally
                </h3>
                <ul class="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <li>User accounts and authentication sessions</li>
                  <li>Encrypted cloud provider credentials (AWS, GCP, Azure)</li>
                  <li>Kubernetes cluster configurations and connection details</li>
                  <li>Event monitoring data and log errors</li>
                  <li>Application settings and user preferences</li>
                  <li>Database backups (stored in <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>~/.kubegraf/backups/</code>)</li>
                </ul>
              </div>

              <div class="p-4 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 class="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      Zero External Data Transmission
                    </h3>
                    <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                      KubēGraf does not send any data to external servers. All operations, including cluster monitoring, event tracking, and data analysis, happen entirely on your local machine.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Encryption */}
      <div class="card p-6 mb-6">
        <h2 class="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Data Encryption
        </h2>
        <p class="mb-4" style={{ color: 'var(--text-text)' }}>
          Sensitive data stored in the local SQLite database is encrypted using <strong>AES-256-GCM</strong> encryption, providing military-grade security for your credentials and sensitive information.
        </p>
        <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
            <strong>Encryption Key:</strong> The encryption key is derived from the <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>KUBEGRAF_ENCRYPTION_KEY</code> environment variable. If not set, a default key is used (not recommended for production).
          </p>
        </div>
      </div>

      {/* Network Communication */}
      <div class="card p-6 mb-6">
        <h2 class="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Network Communication
        </h2>
        <p class="mb-4" style={{ color: 'var(--text-text)' }}>
          KubēGraf only communicates with:
        </p>
        <ul class="list-disc list-inside space-y-2 mb-4" style={{ color: 'var(--text-muted)' }}>
          <li><strong>Your Kubernetes clusters:</strong> Direct API calls to your cluster endpoints (configured by you)</li>
          <li><strong>Cloud provider APIs:</strong> Only when you explicitly configure cloud integrations (AWS, GCP, Azure)</li>
          <li><strong>Update checks (optional):</strong> Can be disabled in settings - only checks for new versions, no data sent</li>
          <li><strong>Announcements (opt-in):</strong> Optional feature to fetch announcements from kubegraf.io - see details below</li>
        </ul>
        <div class="p-4 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
            <strong>Note:</strong> All network communication is initiated by you and only to endpoints you configure. KubēGraf does not maintain any persistent connections to external services.
          </p>
        </div>
      </div>

      {/* Announcements Feature */}
      <div class="card p-6 mb-6">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Optional Announcements (Opt-In)
            </h2>
            <p class="mb-4" style={{ color: 'var(--text-text)' }}>
              KubēGraf offers an <strong>optional, privacy-safe announcements feature</strong> that you can enable in Settings. This feature is designed with strict privacy guarantees:
            </p>

            <div class="space-y-3">
              <div class="p-4 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <h3 class="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Privacy Guarantees
                </h3>
                <ul class="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <li><strong>Opt-in only:</strong> Disabled by default, you must explicitly enable in Settings</li>
                  <li><strong>No identifiers sent:</strong> No user ID, device ID, IP tracking, or fingerprinting</li>
                  <li><strong>No telemetry:</strong> Simple GET request to fetch a public JSON file</li>
                  <li><strong>Rate limited:</strong> Maximum once per 24 hours</li>
                  <li><strong>Public endpoint:</strong> Same announcements delivered to all users</li>
                  <li><strong>No cookies or tracking:</strong> No persistent identifiers or session tracking</li>
                </ul>
              </div>

              <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <h3 class="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  What You Receive
                </h3>
                <p class="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                  When enabled, KubēGraf will check once daily for announcements about:
                </p>
                <ul class="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <li>New version releases and updates</li>
                  <li>Critical security patches and vulnerabilities</li>
                  <li>Important feature announcements</li>
                  <li>Breaking changes that may affect your deployment</li>
                </ul>
              </div>

              <div class="p-4 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                  <strong>Technical Details:</strong> When opted-in, KubēGraf sends a simple GET request to <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>https://kubegraf.io/announcements.json</code> at most once per 24 hours. The request contains no headers, parameters, or identifying information beyond what your browser/HTTP client normally sends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Acceptance */}
      <div class="card p-6 mb-6">
        <h2 class="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Terms & Privacy Policy Acceptance
        </h2>
        <p class="mb-4" style={{ color: 'var(--text-text)' }}>
          To ensure clarity about how KubēGraf handles your data and cluster access, you must accept our Terms & Privacy Policy before accessing cluster features.
        </p>
        <div class="space-y-3">
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h3 class="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              What You're Agreeing To
            </h3>
            <ul class="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              <li>KubēGraf is <strong>local-first</strong> and stores all data on your device by default</li>
              <li>No telemetry, tracking, or data collection without explicit opt-in</li>
              <li>Optional announcements feature with strict privacy controls (opt-in only)</li>
              <li>You grant KubēGraf permission to access your Kubernetes clusters via kubeconfig</li>
              <li>Cluster operations (create, update, delete resources) require your explicit confirmation</li>
              <li>All security and vulnerability scans are performed locally on your device</li>
            </ul>
          </div>

          <div class="p-4 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
              <strong>Policy Updates:</strong> When we update our Terms or Privacy Policy (e.g., to add new features or clarify existing practices), you will be prompted to review and accept the new version before accessing cluster features. Your acceptance is stored locally in your database.
            </p>
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div class="card p-6 mb-6">
        <h2 class="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Data Retention & Backups
        </h2>
        <p class="mb-4" style={{ color: 'var(--text-text)' }}>
          You have full control over your data:
        </p>
        <ul class="list-disc list-inside space-y-2" style={{ color: 'var(--text-muted)' }}>
          <li><strong>Automatic Backups:</strong> Configurable automatic backups stored locally in <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>~/.kubegraf/backups/</code></li>
          <li><strong>Backup Retention:</strong> Old backups (older than 7 days) are automatically cleaned up</li>
          <li><strong>Manual Backups:</strong> Create backups on-demand from the Settings page</li>
          <li><strong>Data Deletion:</strong> You can delete all local data by removing the <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-primary)' }}>~/.kubegraf/</code> directory</li>
        </ul>
      </div>

      {/* Third-Party Services */}
      <div class="card p-6 mb-6">
        <h2 class="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Third-Party Services
        </h2>
        <p class="mb-4" style={{ color: 'var(--text-text)' }}>
          KubēGraf does not use any third-party analytics, tracking, or data collection services. The application is completely self-contained and operates independently.
        </p>
        <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
            <strong>Open Source:</strong> KubēGraf is open source, allowing you to review the code and verify our privacy claims. Visit our <a href="https://github.com/kubegraf/kubegraf" target="_blank" class="underline" style={{ color: 'var(--accent-primary)' }}>GitHub repository</a> to inspect the source code.
          </p>
        </div>
      </div>

      {/* Your Rights */}
      <div class="card p-6 mb-6">
        <h2 class="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Your Rights
        </h2>
        <p class="mb-4" style={{ color: 'var(--text-text)' }}>
          Since all data is stored locally on your device, you have complete control:
        </p>
        <ul class="list-disc list-inside space-y-2" style={{ color: 'var(--text-muted)' }}>
          <li><strong>Access:</strong> All your data is accessible in the local database</li>
          <li><strong>Export:</strong> You can export data using the backup functionality</li>
          <li><strong>Delete:</strong> Delete any or all data at any time</li>
          <li><strong>Modify:</strong> Update or change any stored information</li>
          <li><strong>Portability:</strong> Backups can be moved to other devices</li>
        </ul>
      </div>

      {/* Contact */}
      <div class="card p-6">
        <h2 class="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Questions or Concerns?
        </h2>
        <p class="mb-4" style={{ color: 'var(--text-text)' }}>
          If you have any questions about our privacy practices or data handling, please:
        </p>
        <ul class="list-disc list-inside space-y-2" style={{ color: 'var(--text-muted)' }}>
          <li>Review our <a href="https://github.com/kubegraf/kubegraf" target="_blank" class="underline" style={{ color: 'var(--accent-primary)' }}>source code</a> on GitHub</li>
          <li>Visit our <a href="https://kubegraf.io" target="_blank" class="underline" style={{ color: 'var(--accent-primary)' }}>website</a> for more information</li>
          <li>Open an issue on <a href="https://github.com/kubegraf/kubegraf/issues" target="_blank" class="underline" style={{ color: 'var(--accent-primary)' }}>GitHub</a> for questions</li>
        </ul>
      </div>

      {/* Footer Note */}
      <div class="mt-8 p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
        <p class="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          This privacy policy applies to the KubēGraf application. By using KubēGraf, you acknowledge that all data is stored locally on your device.
        </p>
        <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
          Policy Version: 2026-01-03 | Last Updated: January 3, 2026
        </p>
      </div>
    </div>
  );
};

export default Privacy;


