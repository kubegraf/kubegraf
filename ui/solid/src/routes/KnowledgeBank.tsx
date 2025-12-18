import { Component, createSignal, Show, For } from 'solid-js';
import { addNotification } from '../stores/ui';

interface KnowledgeImportResult {
  totalEntries: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

const KnowledgeBank: Component = () => {
  const [exportLoading, setExportLoading] = createSignal(false);
  const [importLoading, setImportLoading] = createSignal(false);
  const [importFile, setImportFile] = createSignal<File | null>(null);
  const [importResult, setImportResult] = createSignal<KnowledgeImportResult | null>(null);
  const [importError, setImportError] = createSignal<string | null>(null);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/api/knowledge/export');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API error: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'kubegraf_knowledge.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification('Knowledge exported successfully!', 'success');
    } catch (err: any) {
      addNotification(`Failed to export: ${err.message}`, 'error');
      console.error('Export error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      setImportFile(input.files[0]);
      setImportError(null);
      setImportResult(null);
    } else {
      setImportFile(null);
    }
  };

  const handleImport = async () => {
    if (!importFile()) {
      setImportError('Please select a file to import.');
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile()!);

      const response = await fetch('/api/knowledge/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API error: ${response.status}`);
      }

      const result = await response.json();
      setImportResult(result);
      addNotification(`Knowledge imported: ${result.importedCount} entries.`, 'success');
    } catch (err: any) {
      setImportError(err.message || 'Failed to import knowledge');
      addNotification(`Failed to import: ${err.message}`, 'error');
      console.error('Import error:', err);
    } finally {
      setImportLoading(false);
      setImportFile(null);
      const input = document.getElementById('import-file-input') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
    <div style={{ padding: '24px', 'max-width': '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '32px' }}>
        <h1 style={{ 
          margin: '0 0 8px', 
          'font-size': '24px', 
          'font-weight': '600',
          color: 'var(--text-primary)',
          display: 'flex',
          'align-items': 'center',
          gap: '12px'
        }}>
          🧠 Knowledge Bank
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', 'font-size': '14px' }}>
          Export and import learned incident patterns, root causes, and fix outcomes.
          Share knowledge across teams or bootstrap new installations.
        </p>
      </div>

      {/* Export Section */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        'border-radius': '12px',
        padding: '24px',
        'margin-bottom': '24px'
      }}>
        <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--accent-primary)20',
            'border-radius': '12px',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'font-size': '24px',
            'flex-shrink': 0
          }}>
            📤
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', 'font-size': '16px' }}>
              Export Knowledge
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', 'font-size': '13px' }}>
              Download a JSON file containing all learned patterns, confirmed root causes, 
              applied fixes, and their outcomes from your local Knowledge Bank. 
              This file can be shared with other team members or used to bootstrap new installations.
            </p>
            
            <div style={{
              background: 'var(--bg-secondary)',
              'border-radius': '8px',
              padding: '12px 16px',
              'margin-bottom': '16px',
              'font-size': '12px',
              color: 'var(--text-muted)'
            }}>
              <strong style={{ color: 'var(--text-secondary)' }}>What's included:</strong>
              <ul style={{ margin: '8px 0 0', 'padding-left': '20px' }}>
                <li>Incident fingerprints and patterns</li>
                <li>Confirmed root causes</li>
                <li>Applied fix summaries</li>
                <li>Success/failure outcomes</li>
                <li>Confidence scores</li>
              </ul>
            </div>

            <button
              onClick={handleExport}
              disabled={exportLoading()}
              style={{
                padding: '10px 20px',
                background: 'var(--accent-primary)',
                color: '#000',
                border: 'none',
                'border-radius': '8px',
                'font-weight': '600',
                'font-size': '14px',
                cursor: exportLoading() ? 'not-allowed' : 'pointer',
                opacity: exportLoading() ? 0.7 : 1,
                display: 'flex',
                'align-items': 'center',
                gap: '8px'
              }}
            >
              <Show when={!exportLoading()} fallback={<>⏳ Exporting...</>}>
                📥 Download Knowledge JSON
              </Show>
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        'border-radius': '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--success-color, #10b981)20',
            'border-radius': '12px',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'font-size': '24px',
            'flex-shrink': 0
          }}>
            📥
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', 'font-size': '16px' }}>
              Import Knowledge
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', 'font-size': '13px' }}>
              Upload a previously exported JSON file to import knowledge entries into your local Knowledge Bank.
              This helps bootstrap learning with shared team knowledge or migrate between installations.
            </p>

            <div style={{
              background: 'var(--bg-secondary)',
              'border-radius': '8px',
              padding: '12px 16px',
              'margin-bottom': '16px',
              'font-size': '12px',
              color: 'var(--text-muted)',
              border: '1px dashed var(--border-color)'
            }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> Imported entries 
              will be merged with existing knowledge. Duplicate fingerprints will be skipped.
            </div>

            {/* File Input */}
            <div style={{ 'margin-bottom': '16px' }}>
              <input
                id="import-file-input"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '2px dashed var(--border-color)',
                  'border-radius': '8px',
                  color: 'var(--text-primary)',
                  'font-size': '14px',
                  cursor: 'pointer'
                }}
              />
            </div>

            <Show when={importFile()}>
              <div style={{
                background: 'var(--bg-secondary)',
                'border-radius': '6px',
                padding: '8px 12px',
                'margin-bottom': '16px',
                'font-size': '13px',
                color: 'var(--text-primary)',
                display: 'flex',
                'align-items': 'center',
                gap: '8px'
              }}>
                📄 {importFile()!.name} ({(importFile()!.size / 1024).toFixed(1)} KB)
              </div>
            </Show>

            <button
              onClick={handleImport}
              disabled={importLoading() || !importFile()}
              style={{
                padding: '10px 20px',
                background: importFile() ? 'var(--success-color, #10b981)' : 'var(--bg-secondary)',
                color: importFile() ? '#fff' : 'var(--text-muted)',
                border: 'none',
                'border-radius': '8px',
                'font-weight': '600',
                'font-size': '14px',
                cursor: importLoading() || !importFile() ? 'not-allowed' : 'pointer',
                opacity: importLoading() ? 0.7 : 1,
                display: 'flex',
                'align-items': 'center',
                gap: '8px'
              }}
            >
              <Show when={!importLoading()} fallback={<>⏳ Importing...</>}>
                📤 Import Knowledge
              </Show>
            </button>

            {/* Import Error */}
            <Show when={importError()}>
              <div style={{
                'margin-top': '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                'border-radius': '8px',
                padding: '12px 16px',
                color: 'var(--error-color)'
              }}>
                <strong>Error:</strong> {importError()}
              </div>
            </Show>

            {/* Import Result */}
            <Show when={importResult()}>
              <div style={{
                'margin-top': '16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                'border-radius': '8px',
                padding: '16px'
              }}>
                <h4 style={{ margin: '0 0 12px', color: 'var(--success-color)', 'font-size': '14px' }}>
                  ✅ Import Complete
                </h4>
                <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{ 'font-size': '24px', 'font-weight': '700', color: 'var(--success-color)' }}>
                      {importResult()!.importedCount}
                    </div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Imported</div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{ 'font-size': '24px', 'font-weight': '700', color: 'var(--text-secondary)' }}>
                      {importResult()!.skippedCount}
                    </div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Skipped</div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{ 'font-size': '24px', 'font-weight': '700', color: 'var(--error-color)' }}>
                      {importResult()!.errorCount}
                    </div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Errors</div>
                  </div>
                </div>

                <Show when={importResult()!.errors && importResult()!.errors.length > 0}>
                  <div style={{ 'margin-top': '12px', 'font-size': '12px', color: 'var(--error-color)' }}>
                    <strong>Errors:</strong>
                    <ul style={{ margin: '4px 0 0', 'padding-left': '20px' }}>
                      <For each={importResult()!.errors.slice(0, 5)}>
                        {(error) => <li>{error}</li>}
                      </For>
                    </ul>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div style={{
        'margin-top': '24px',
        padding: '16px',
        background: 'var(--bg-secondary)',
        'border-radius': '8px',
        'font-size': '12px',
        color: 'var(--text-muted)'
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>💡 How the Knowledge Bank Works:</strong>
        <p style={{ margin: '8px 0 0' }}>
          The Knowledge Bank stores learnings from incidents you encounter. As you confirm root causes 
          and apply fixes, KubeGraf learns which patterns are most common and which fixes work best.
          This information is used to improve diagnosis confidence and rank recommendations.
          Export your knowledge to share with your team or backup before upgrades.
        </p>
      </div>
    </div>
  );
};

export default KnowledgeBank;

