// Copyright 2025 KubeGraf Contributors
// Log Error Analysis - Groups logs by error pattern

import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { api } from '../../services/api';

interface LogErrorAnalysisProps {
  incidentId: string;
}

interface ErrorPattern {
  signature: string;
  count: number;
  sampleLine: string;
  firstSeen: string;
  lastSeen: string;
}

const LogErrorAnalysis: Component<LogErrorAnalysisProps> = (props) => {
  const [patterns, setPatterns] = createSignal<ErrorPattern[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [expandedPattern, setExpandedPattern] = createSignal<string | null>(null);

  // Load logs and analyze error patterns
  createEffect(async () => {
    if (!props.incidentId) return;

    setLoading(true);
    setError(null);

    try {
      const logsData = await api.getIncidentLogs(props.incidentId, 100);
      const errorPatterns: Map<string, ErrorPattern> = new Map();

      if (logsData.logs && Array.isArray(logsData.logs)) {
        for (const log of logsData.logs) {
          const message = (log as any).message || (log as any).content || (typeof log === 'string' ? log : JSON.stringify(log));
          const lowerMessage = message.toLowerCase();

          // Detect error patterns
          if (lowerMessage.includes('error') || lowerMessage.includes('fatal') || 
              lowerMessage.includes('exception') || lowerMessage.includes('panic') ||
              lowerMessage.match(/\d{3}\s+(error|fatal)/i)) {
            
            // Extract error signature (simplified - first meaningful line)
            const signature = extractErrorSignature(message);
            
            if (!errorPatterns.has(signature)) {
              errorPatterns.set(signature, {
                signature,
                count: 0,
                sampleLine: message.substring(0, 200),
                firstSeen: log.timestamp || log.time || new Date().toISOString(),
                lastSeen: log.timestamp || log.time || new Date().toISOString(),
              });
            }

            const pattern = errorPatterns.get(signature)!;
            pattern.count++;
            const logTime = (log as any).timestamp || (log as any).time || new Date().toISOString();
            if (new Date(logTime) < new Date(pattern.firstSeen)) {
              pattern.firstSeen = logTime;
            }
            if (new Date(logTime) > new Date(pattern.lastSeen)) {
              pattern.lastSeen = logTime;
            }
          }
        }
      }

      // Sort by count (most frequent first)
      const sortedPatterns = Array.from(errorPatterns.values())
        .sort((a, b) => b.count - a.count);

      setPatterns(sortedPatterns);
    } catch (err: any) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  });

  const extractErrorSignature = (message: string): string => {
    // Extract HTTP status codes
    const httpMatch = message.match(/(\d{3})\s+(error|fatal|exception)/i);
    if (httpMatch) {
      return `HTTP ${httpMatch[1]} Error`;
    }

    // Extract common error prefixes
    const errorMatch = message.match(/^(error|fatal|exception|panic)[:\s]+(.{0,60})/i);
    if (errorMatch) {
      return `${errorMatch[1].charAt(0).toUpperCase() + errorMatch[1].slice(1)}: ${errorMatch[2].trim()}`;
    }

    // Extract first meaningful sentence
    const sentences = message.split(/[.!?\n]/).filter(s => s.trim().length > 10);
    if (sentences.length > 0) {
      return sentences[0].trim().substring(0, 80);
    }

    // Fallback
    return message.trim().substring(0, 60);
  };

  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ 'font-size': '16px', 'font-weight': '600', 'margin-bottom': '16px', color: 'var(--text-primary)' }}>
        Log Error Analysis
      </div>

      <Show when={loading()}>
        <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
          Analyzing logs...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={patterns().length === 0}>
          <div style={{ padding: '16px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
            No error patterns detected in logs
          </div>
        </Show>

        <Show when={patterns().length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
            <For each={patterns()}>
              {(pattern) => (
                <div
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    'border-radius': '6px',
                    background: expandedPattern() === pattern.signature ? 'var(--bg-secondary)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => setExpandedPattern(expandedPattern() === pattern.signature ? null : pattern.signature)}
                >
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '8px' }}>
                    <span
                      style={{
                        'font-size': '12px',
                        'font-weight': '600',
                        padding: '4px 8px',
                        'border-radius': '4px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc3545',
                      }}
                    >
                      {pattern.count}x
                    </span>
                    <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--text-primary)', flex: 1 }}>
                      {pattern.signature}
                    </span>
                    <span style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>
                      {expandedPattern() === pattern.signature ? '▼' : '▶'}
                    </span>
                  </div>

                  <Show when={expandedPattern() === pattern.signature}>
                    <div
                      style={{
                        'margin-top': '12px',
                        padding: '12px',
                        background: 'var(--bg-secondary)',
                        'border-radius': '4px',
                        'font-size': '12px',
                        color: 'var(--text-secondary)',
                        'font-family': 'monospace',
                        'white-space': 'pre-wrap',
                        'word-break': 'break-word',
                      }}
                    >
                      {pattern.sampleLine}
                    </div>
                    <div style={{ 'margin-top': '8px', 'font-size': '11px', color: 'var(--text-muted)' }}>
                      First seen: {new Date(pattern.firstSeen).toLocaleString()} • 
                      Last seen: {new Date(pattern.lastSeen).toLocaleString()}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default LogErrorAnalysis;

