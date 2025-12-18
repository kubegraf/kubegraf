// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

import { Component, createSignal, Show } from 'solid-js';
import { fetchAPI } from '../../services/api';

interface ImportResult {
  totalEntries: number;
  importedCount: number;
  skippedCount: number;
  updatedCount: number;
  errors?: string[];
  skippedReasons?: string[];
}

interface KnowledgeExportImportProps {
  onImportComplete?: () => void;
}

const KnowledgeExportImport: Component<KnowledgeExportImportProps> = (props) => {
  const [exporting, setExporting] = createSignal(false);
  const [importing, setImporting] = createSignal(false);
  const [importResult, setImportResult] = createSignal<ImportResult | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [description, setDescription] = createSignal('');
  const [overwrite, setOverwrite] = createSignal(false);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const desc = encodeURIComponent(description() || 'KubeGraf knowledge export');
      const response = await fetch(`/api/knowledge/export?description=${desc}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kubegraf-knowledge-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overwrite', overwrite() ? 'true' : 'false');

      const response = await fetch('/api/knowledge/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Import failed');
      }

      const result = await response.json();
      setImportResult(result);
      props.onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      // Reset the input
      input.value = '';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      'border-radius': '12px',
      padding: '20px',
    }}>
      <h2 style={{ margin: '0 0 20px', 'font-size': '16px', color: 'var(--text-primary)' }}>
        📚 Knowledge Bank
      </h2>

      <Show when={error()}>
        <div style={{
          background: '#ef444420',
          border: '1px solid #ef4444',
          'border-radius': '8px',
          padding: '16px',
          color: '#ef4444',
          'margin-bottom': '20px',
          'font-size': '12px',
        }}>
          {error()}
        </div>
      </Show>

      {/* Export Section */}
      <div style={{
        background: 'var(--bg-tertiary)',
        'border-radius': '8px',
        padding: '16px',
        'margin-bottom': '16px',
      }}>
        <h3 style={{ margin: '0 0 12px', 'font-size': '14px', color: 'var(--text-primary)' }}>
          📤 Export Knowledge
        </h3>
        <p style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '12px' }}>
          Export your incident knowledge to share with other KubeGraf installations
        </p>

        <input
          type="text"
          placeholder="Description (optional)"
          value={description()}
          onInput={(e) => setDescription(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            'border-radius': '6px',
            padding: '10px 12px',
            color: 'var(--text-primary)',
            'font-size': '13px',
            'margin-bottom': '12px',
            'box-sizing': 'border-box',
          }}
        />

        <button
          onClick={handleExport}
          disabled={exporting()}
          style={{
            background: 'var(--accent-primary)',
            color: '#000',
            border: 'none',
            'border-radius': '6px',
            padding: '10px 20px',
            'font-weight': '600',
            cursor: exporting() ? 'not-allowed' : 'pointer',
            opacity: exporting() ? 0.5 : 1,
            width: '100%',
          }}
        >
          {exporting() ? 'Exporting...' : '📤 Download Export File'}
        </button>
      </div>

      {/* Import Section */}
      <div style={{
        background: 'var(--bg-tertiary)',
        'border-radius': '8px',
        padding: '16px',
      }}>
        <h3 style={{ margin: '0 0 12px', 'font-size': '14px', color: 'var(--text-primary)' }}>
          📥 Import Knowledge
        </h3>
        <p style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '12px' }}>
          Import knowledge from another KubeGraf installation
        </p>

        <label style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          'margin-bottom': '12px',
          cursor: 'pointer',
          'font-size': '12px',
          color: 'var(--text-secondary)',
        }}>
          <input
            type="checkbox"
            checked={overwrite()}
            onChange={(e) => setOverwrite(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Overwrite existing entries with same fingerprint
        </label>

        <label style={{
          display: 'block',
          background: 'var(--bg-primary)',
          border: '2px dashed var(--border-color)',
          'border-radius': '8px',
          padding: '30px',
          'text-align': 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing()}
            style={{ display: 'none' }}
          />
          <div style={{ 'font-size': '32px', 'margin-bottom': '8px' }}>📁</div>
          <div style={{ 'font-size': '13px', color: 'var(--text-primary)', 'margin-bottom': '4px' }}>
            {importing() ? 'Importing...' : 'Click to select file or drag & drop'}
          </div>
          <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>
            JSON files only
          </div>
        </label>

        {/* Import Result */}
        <Show when={importResult()}>
          <div style={{
            'margin-top': '16px',
            background: '#22c55e20',
            border: '1px solid #22c55e',
            'border-radius': '8px',
            padding: '16px',
          }}>
            <h4 style={{ margin: '0 0 12px', 'font-size': '13px', color: '#22c55e' }}>
              ✅ Import Complete
            </h4>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(3, 1fr)',
              gap: '12px',
              'margin-bottom': '12px',
            }}>
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '20px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                  {importResult()!.importedCount}
                </div>
                <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Imported</div>
              </div>
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '20px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                  {importResult()!.updatedCount}
                </div>
                <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Updated</div>
              </div>
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '20px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                  {importResult()!.skippedCount}
                </div>
                <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Skipped</div>
              </div>
            </div>

            <Show when={importResult()!.errors && importResult()!.errors!.length > 0}>
              <details style={{ 'margin-top': '8px' }}>
                <summary style={{
                  cursor: 'pointer',
                  'font-size': '12px',
                  color: '#f59e0b',
                }}>
                  {importResult()!.errors!.length} errors
                </summary>
                <div style={{
                  'margin-top': '8px',
                  'font-size': '11px',
                  color: 'var(--text-muted)',
                  'max-height': '100px',
                  'overflow-y': 'auto',
                }}>
                  {importResult()!.errors!.map((err) => (
                    <div style={{ 'margin-bottom': '4px' }}>• {err}</div>
                  ))}
                </div>
              </details>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default KnowledgeExportImport;

