/**
 * InvestigationWorkspace - Center panel for detailed incident investigation
 *
 * Features:
 * - Incident header with severity, resource info, timeline
 * - Adaptive content area (layout changes based on confidence)
 * - Action footer with navigation and resolution buttons
 * - Loading and empty states
 * - Keyboard navigation support
 */

import { Component, Show, createMemo } from 'solid-js';
import { Incident } from '../../services/api';

interface InvestigationWorkspaceProps {
  incident: Incident | null;
  isLoading?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onResolve?: () => void;
  onDownloadRCA?: () => void;
  canNavigatePrevious?: boolean;
  canNavigateNext?: boolean;
  currentIndex?: number;
  totalIncidents?: number;
}

const InvestigationWorkspace: Component<InvestigationWorkspaceProps> = (props) => {
  // Get confidence level for adaptive layout (Phase 2)
  const confidence = createMemo(() => {
    return props.incident?.diagnosis?.confidence || 0;
  });

  // Determine if this is a high-confidence incident
  const isHighConfidence = createMemo(() => confidence() >= 95);

  // Format date helper
  const formatDate = (date: string | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString();
  };

  return (
    <main class="investigation-workspace" role="main" aria-label="Incident details">
      <Show
        when={!props.isLoading && props.incident}
        fallback={
          <div class="workspace-loading">
            <div class="loading-spinner" />
            <p>Loading incident details...</p>
          </div>
        }
      >
        <Show
          when={props.incident}
          fallback={
            <div class="workspace-empty">
              <div class="empty-icon">📭</div>
              <h3>No Incident Selected</h3>
              <p>Select an incident from the context navigator to view details</p>
            </div>
          }
        >
          <div class="workspace-content">
            {/* Incident Header */}
            <header class="incident-header">
              <div class="incident-title-row">
                <div class="incident-badges">
                  <span class="severity-badge" data-severity={props.incident?.severity}>
                    {props.incident?.severity?.toUpperCase()}
                  </span>
                  <Show when={isHighConfidence()}>
                    <span class="confidence-badge high-confidence">
                      ✓ {Math.round(confidence())}% Confident
                    </span>
                  </Show>
                </div>
                <div class="incident-title">
                  <h2>{props.incident?.title || props.incident?.pattern || 'Unknown Incident'}</h2>
                </div>
              </div>

              <div class="incident-meta-section">
                <div class="meta-row">
                  <div class="meta-item">
                    <span class="meta-icon">📦</span>
                    <span class="meta-label">Resource:</span>
                    <span class="meta-value">
                      {props.incident?.resource?.kind || 'Unknown'}/
                      <strong>{props.incident?.resource?.name || 'unknown'}</strong>
                    </span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-icon">🏷️</span>
                    <span class="meta-label">Namespace:</span>
                    <span class="meta-value">
                      {props.incident?.resource?.namespace || 'default'}
                    </span>
                  </div>
                </div>

                <div class="meta-row">
                  <div class="meta-item">
                    <span class="meta-icon">⏱️</span>
                    <span class="meta-label">First Seen:</span>
                    <span class="meta-value">{formatDate(props.incident?.firstSeen)}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-icon">🔄</span>
                    <span class="meta-label">Occurrences:</span>
                    <span class="meta-value">{props.incident?.occurrences || 0}</span>
                  </div>
                  <Show when={props.incident?.lastSeen}>
                    <div class="meta-item">
                      <span class="meta-icon">🕐</span>
                      <span class="meta-label">Last Seen:</span>
                      <span class="meta-value">{formatDate(props.incident?.lastSeen)}</span>
                    </div>
                  </Show>
                </div>

                <Show when={props.incident?.pattern}>
                  <div class="meta-row">
                    <div class="meta-item full-width">
                      <span class="meta-icon">🎯</span>
                      <span class="meta-label">Pattern:</span>
                      <span class="meta-value pattern-value">
                        {props.incident?.pattern}
                      </span>
                    </div>
                  </div>
                </Show>
              </div>

              {/* Progress Indicator */}
              <Show when={props.currentIndex !== undefined && props.totalIncidents !== undefined}>
                <div class="incident-progress">
                  <div class="progress-text">
                    Incident {(props.currentIndex || 0) + 1} of {props.totalIncidents || 0}
                  </div>
                  <div class="progress-bar-container">
                    <div
                      class="progress-bar-fill"
                      style={{
                        width: `${((props.currentIndex || 0) + 1) / (props.totalIncidents || 1) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </Show>
            </header>

            {/* Content Area - Adaptive Layouts (Phase 2) */}
            <div class="incident-content-area">
              <Show
                when={isHighConfidence()}
                fallback={
                  // Investigation Mode Layout (< 95% confidence)
                  <div class="investigation-layout">
                    <div class="layout-badge">
                      <span class="badge-icon">🔍</span>
                      <span class="badge-text">Investigation Mode</span>
                      <span class="badge-confidence">{Math.round(confidence())}%</span>
                    </div>
                    <div class="content-placeholder">
                      <p>📊 Investigation layout will be rendered here (Phase 2)</p>
                      <ul>
                        <li>Timeline & Events</li>
                        <li>Resource Details</li>
                        <li>Related Logs</li>
                        <li>Hypothesis Testing</li>
                        <li>Diagnosis Information</li>
                        <li>Suggested Fixes</li>
                      </ul>
                    </div>
                  </div>
                }
              >
                {/* High Confidence Mode Layout (≥ 95% confidence) */}
                <div class="high-confidence-layout">
                  <div class="layout-badge">
                    <span class="badge-icon">✓</span>
                    <span class="badge-text">High Confidence</span>
                    <span class="badge-confidence">{Math.round(confidence())}%</span>
                  </div>
                  <div class="content-placeholder">
                    <p>⚡ Action-first layout will be rendered here (Phase 2)</p>
                    <ul>
                      <li>Quick Fix Card (prominent)</li>
                      <li>One-Click Apply</li>
                      <li>Expected Outcome</li>
                      <li>Rollback Plan</li>
                      <li>Diagnosis Summary (collapsed)</li>
                      <li>Supporting Evidence (collapsed)</li>
                    </ul>
                  </div>
                </div>
              </Show>

              {/* Placeholder Info Sections */}
              <div class="info-sections">
                <div class="info-section">
                  <h3>
                    <span class="section-icon">💡</span>
                    Diagnosis
                  </h3>
                  <div class="section-content">
                    <Show when={props.incident?.diagnosis?.summary}>
                      <p>{props.incident?.diagnosis?.summary}</p>
                    </Show>
                    <Show when={!props.incident?.diagnosis?.summary}>
                      <p class="placeholder-text">Diagnosis information will appear here</p>
                    </Show>
                  </div>
                </div>

                <Show when={props.incident?.recommendations && props.incident.recommendations.length > 0}>
                  <div class="info-section">
                    <h3>
                      <span class="section-icon">🔧</span>
                      Recommended Fixes ({props.incident.recommendations.length})
                    </h3>
                    <div class="section-content">
                      <p class="placeholder-text">
                        Fix recommendations will be displayed here (Phase 2)
                      </p>
                    </div>
                  </div>
                </Show>

                <div class="info-section">
                  <h3>
                    <span class="section-icon">📚</span>
                    Related Incidents & Learning
                  </h3>
                  <div class="section-content">
                    <p class="placeholder-text">
                      Related incidents and historical patterns (Phase 2)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <footer class="action-footer">
              <div class="footer-navigation">
                <button
                  class="action-btn secondary"
                  onClick={props.onPrevious}
                  disabled={!props.canNavigatePrevious}
                  aria-label="Previous incident"
                >
                  <span class="btn-icon">◄</span>
                  <span class="btn-label">Previous</span>
                </button>
                <button
                  class="action-btn secondary"
                  onClick={props.onNext}
                  disabled={!props.canNavigateNext}
                  aria-label="Next incident"
                >
                  <span class="btn-label">Next</span>
                  <span class="btn-icon">►</span>
                </button>
              </div>

              <div class="footer-actions">
                <button
                  class="action-btn secondary"
                  onClick={props.onDownloadRCA}
                  aria-label="Download RCA report"
                >
                  <span class="btn-icon">📄</span>
                  <span class="btn-label">Download RCA</span>
                </button>
                <button
                  class="action-btn primary"
                  onClick={props.onResolve}
                  aria-label="Mark incident as resolved"
                >
                  <span class="btn-icon">✓</span>
                  <span class="btn-label">Mark Resolved</span>
                </button>
              </div>
            </footer>
          </div>
        </Show>
      </Show>
    </main>
  );
};

export default InvestigationWorkspace;
