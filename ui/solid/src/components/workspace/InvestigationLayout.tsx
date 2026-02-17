/**
 * InvestigationLayout - Investigation-first layout for lower confidence incidents (<95%)
 *
 * Features:
 * - Timeline & Events
 * - Resource Details
 * - Related Logs
 * - Hypothesis Testing
 * - Expanded Diagnosis
 * - Multiple Fix Suggestions
 * - Manual investigation workflow
 */

import { Component, Show, For, createSignal, createMemo } from 'solid-js';
import { Incident } from '../../services/api';
import IncidentStory from './IncidentStory';

interface InvestigationLayoutProps {
  incident: Incident;
  onApplyFix?: (fixId: string) => void;
  onSelectHypothesis?: (hypothesis: string) => void;
}

interface Hypothesis {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  tested: boolean;
}

const InvestigationLayout: Component<InvestigationLayoutProps> = (props) => {
  const [expandedSections, setExpandedSections] = createSignal({
    timeline: true,
    resourceDetails: false,
    logs: true,
    hypothesis: false,
    diagnosis: true,
    fixes: true,
  });

  const [selectedHypothesis, setSelectedHypothesis] = createSignal<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const confidence = () => props.incident.diagnosis?.confidence || 0;

  // Generate hypotheses based on incident pattern (mock - will be AI-based)
  const hypotheses = createMemo((): Hypothesis[] => {
    const pattern = props.incident.pattern || '';
    const hypotheses: Hypothesis[] = [];

    if (pattern.includes('CRASH')) {
      hypotheses.push({
        id: 'h1',
        title: 'Resource Limits Exceeded',
        description: 'Container may be hitting memory or CPU limits causing crashes',
        likelihood: 75,
        tested: false,
      });
      hypotheses.push({
        id: 'h2',
        title: 'Application Error',
        description: 'Internal application error causing crash loop',
        likelihood: 60,
        tested: false,
      });
    }

    if (pattern.includes('OOM')) {
      hypotheses.push({
        id: 'h3',
        title: 'Memory Leak',
        description: 'Application has a memory leak causing OOM kills',
        likelihood: 80,
        tested: false,
      });
    }

    if (hypotheses.length === 0) {
      hypotheses.push({
        id: 'h4',
        title: 'Configuration Issue',
        description: 'Misconfigured resource or deployment settings',
        likelihood: 50,
        tested: false,
      });
    }

    return hypotheses;
  });

  const handleHypothesisSelect = (hypothesisId: string) => {
    setSelectedHypothesis(hypothesisId);
    if (props.onSelectHypothesis) {
      const hypothesis = hypotheses().find((h) => h.id === hypothesisId);
      if (hypothesis) {
        props.onSelectHypothesis(hypothesis.title);
      }
    }
  };

  // Format timestamps
  const formatTimestamp = (date: string | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString();
  };

  return (
    <div class="investigation-layout">
      {/* Layout Mode Badge */}
      <div class="layout-mode-badge investigation">
        <span class="badge-icon">🔍</span>
        <span class="badge-text">Investigation Mode</span>
        <span class="badge-confidence">{Math.round(confidence())}%</span>
      </div>

      {/* Diagnosis Section - Expanded by default */}
      <div class="investigation-section expanded">
        <button
          class="investigation-section-header"
          onClick={() => toggleSection('diagnosis')}
        >
          <span class="expand-icon">{expandedSections().diagnosis ? '▼' : '▶'}</span>
          <span class="section-icon">💡</span>
          <span class="section-title">Diagnosis & Root Cause Analysis</span>
          <span class="section-badge">Primary</span>
        </button>
        <Show when={expandedSections().diagnosis}>
          <div class="investigation-section-content">
            <div class="diagnosis-content">
              <Show when={props.incident.diagnosis?.summary}>
                <div class="diagnosis-summary-text">
                  <p>{props.incident.diagnosis?.summary}</p>
                </div>
              </Show>
              <Show when={props.incident.diagnosis?.rootCause}>
                <div class="root-cause-box">
                  <div class="root-cause-header">
                    <span class="root-cause-icon">🎯</span>
                    <strong>Root Cause</strong>
                  </div>
                  <p>{props.incident.diagnosis?.rootCause}</p>
                </div>
              </Show>
              <Show when={!props.incident.diagnosis?.summary}>
                <p class="placeholder-text">
                  Analyzing incident patterns and generating diagnosis...
                </p>
              </Show>
              <div class="confidence-indicator">
                <span class="confidence-label">Diagnostic Confidence:</span>
                <div class="confidence-bar-large">
                  <div
                    class="confidence-bar-fill"
                    style={{ width: `${confidence()}%` }}
                  />
                </div>
                <span class="confidence-value">{Math.round(confidence())}%</span>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Incident Story */}
      <IncidentStory incident={props.incident} />

      {/* Timeline & Events */}
      <div class="investigation-section">
        <button
          class="investigation-section-header"
          onClick={() => toggleSection('timeline')}
        >
          <span class="expand-icon">{expandedSections().timeline ? '▼' : '▶'}</span>
          <span class="section-icon">⏱️</span>
          <span class="section-title">Timeline & Events</span>
          <Show when={props.incident.events && props.incident.events.length > 0}>
            <span class="section-count">{props.incident.events.length} events</span>
          </Show>
        </button>
        <Show when={expandedSections().timeline}>
          <div class="investigation-section-content">
            <div class="timeline-container">
              <Show
                when={props.incident.events && props.incident.events.length > 0}
                fallback={
                  <p class="placeholder-text">No events recorded for this incident</p>
                }
              >
                <div class="timeline-list">
                  <For each={props.incident.events}>
                    {(event) => (
                      <div class="timeline-item">
                        <div class="timeline-marker" />
                        <div class="timeline-content">
                          <div class="timeline-header">
                            <span class="timeline-timestamp">
                              {formatTimestamp(event.timestamp)}
                            </span>
                            <span class="timeline-type" data-type={event.type}>
                              {event.type || 'Info'}
                            </span>
                          </div>
                          <div class="timeline-message">{event.message}</div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>

      {/* Hypothesis Testing */}
      <div class="investigation-section">
        <button
          class="investigation-section-header"
          onClick={() => toggleSection('hypothesis')}
        >
          <span class="expand-icon">{expandedSections().hypothesis ? '▼' : '▶'}</span>
          <span class="section-icon">🧪</span>
          <span class="section-title">Hypothesis Testing</span>
          <span class="section-count">{hypotheses().length} hypotheses</span>
        </button>
        <Show when={expandedSections().hypothesis}>
          <div class="investigation-section-content">
            <div class="hypothesis-container">
              <p class="hypothesis-intro">
                Based on the incident pattern and available data, here are potential root causes:
              </p>
              <div class="hypothesis-list">
                <For each={hypotheses()}>
                  {(hypothesis) => (
                    <div
                      class="hypothesis-item"
                      classList={{ selected: selectedHypothesis() === hypothesis.id }}
                      onClick={() => handleHypothesisSelect(hypothesis.id)}
                    >
                      <div class="hypothesis-header">
                        <h5>{hypothesis.title}</h5>
                        <div class="likelihood-badge">
                          {hypothesis.likelihood}% likely
                        </div>
                      </div>
                      <p class="hypothesis-description">{hypothesis.description}</p>
                      <div class="hypothesis-likelihood-bar">
                        <div
                          class="hypothesis-likelihood-fill"
                          style={{ width: `${hypothesis.likelihood}%` }}
                        />
                      </div>
                      <button class="test-hypothesis-btn">
                        <span class="btn-icon">🧪</span>
                        <span class="btn-label">Test This Hypothesis</span>
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Resource Details */}
      <div class="investigation-section">
        <button
          class="investigation-section-header"
          onClick={() => toggleSection('resourceDetails')}
        >
          <span class="expand-icon">{expandedSections().resourceDetails ? '▼' : '▶'}</span>
          <span class="section-icon">📦</span>
          <span class="section-title">Resource Details</span>
        </button>
        <Show when={expandedSections().resourceDetails}>
          <div class="investigation-section-content">
            <div class="resource-details-grid">
              <div class="resource-detail-item">
                <span class="detail-label">Kind:</span>
                <span class="detail-value">{props.incident.resource?.kind || 'Unknown'}</span>
              </div>
              <div class="resource-detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{props.incident.resource?.name || 'Unknown'}</span>
              </div>
              <div class="resource-detail-item">
                <span class="detail-label">Namespace:</span>
                <span class="detail-value">
                  {props.incident.resource?.namespace || 'default'}
                </span>
              </div>
              <div class="resource-detail-item">
                <span class="detail-label">Pattern:</span>
                <span class="detail-value pattern">{props.incident.pattern || 'Unknown'}</span>
              </div>
              <div class="resource-detail-item">
                <span class="detail-label">Occurrences:</span>
                <span class="detail-value">{props.incident.occurrences || 0}</span>
              </div>
              <div class="resource-detail-item">
                <span class="detail-label">First Seen:</span>
                <span class="detail-value">{formatTimestamp(props.incident.firstSeen)}</span>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Related Logs */}
      <div class="investigation-section">
        <button
          class="investigation-section-header"
          onClick={() => toggleSection('logs')}
        >
          <span class="expand-icon">{expandedSections().logs ? '▼' : '▶'}</span>
          <span class="section-icon">📝</span>
          <span class="section-title">Related Logs</span>
        </button>
        <Show when={expandedSections().logs}>
          <div class="investigation-section-content">
            <div class="logs-container">
              <div class="logs-viewer">
                <Show when={props.incident.events && props.incident.events.length > 0}>
                  <For each={props.incident.events.slice(0, 10)}>
                    {(event) => (
                      <div class="log-entry">
                        <span class="log-timestamp">{formatTimestamp(event.timestamp)}</span>
                        <span class="log-level" data-level={event.type?.toLowerCase()}>
                          [{event.type || 'INFO'}]
                        </span>
                        <span class="log-message">{event.message}</span>
                      </div>
                    )}
                  </For>
                </Show>
                <Show when={!props.incident.events || props.incident.events.length === 0}>
                  <p class="placeholder-text">No logs available for this incident</p>
                </Show>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Fix Suggestions */}
      <div class="investigation-section">
        <button
          class="investigation-section-header"
          onClick={() => toggleSection('fixes')}
        >
          <span class="expand-icon">{expandedSections().fixes ? '▼' : '▶'}</span>
          <span class="section-icon">🔧</span>
          <span class="section-title">Suggested Fixes</span>
          <Show when={props.incident.recommendations && props.incident.recommendations.length > 0}>
            <span class="section-count">{props.incident.recommendations.length} suggestions</span>
          </Show>
        </button>
        <Show when={expandedSections().fixes}>
          <div class="investigation-section-content">
            <div class="fixes-container">
              <Show
                when={props.incident.recommendations && props.incident.recommendations.length > 0}
                fallback={
                  <p class="placeholder-text">
                    No automated fixes available. Manual investigation required.
                  </p>
                }
              >
                <div class="fixes-list">
                  <For each={props.incident.recommendations}>
                    {(fix, index) => (
                      <div class="fix-suggestion-item">
                        <div class="fix-suggestion-header">
                          <div class="fix-suggestion-title">
                            <span class="fix-rank">#{index() + 1}</span>
                            <h5>{fix.title || 'Suggested Fix'}</h5>
                          </div>
                          <div class="fix-suggestion-confidence">
                            {fix.confidence || 0}%
                          </div>
                        </div>
                        <p class="fix-suggestion-description">
                          {fix.description || 'Fix description will appear here'}
                        </p>
                        <div class="fix-suggestion-details">
                          <div class="detail-row">
                            <span class="detail-label">Expected Outcome:</span>
                            <span class="detail-text">
                              {fix.expectedOutcome || 'Resource will return to healthy state'}
                            </span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Risk Level:</span>
                            <span class="risk-badge" data-risk={fix.risk || 'low'}>
                              {(fix.risk || 'low').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <button
                          class="apply-fix-suggestion-btn"
                          onClick={() => props.onApplyFix?.(fix.id)}
                        >
                          <span class="btn-icon">🔧</span>
                          <span class="btn-label">Apply This Fix</span>
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default InvestigationLayout;
