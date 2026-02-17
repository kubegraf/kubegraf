/**
 * HighConfidenceLayout - Action-first layout for high confidence incidents (≥95%)
 *
 * Features:
 * - Prominent Quick Fix card
 * - One-click apply with confirmation
 * - Expected outcome preview
 * - Rollback plan visibility
 * - Success predictor
 * - Collapsed diagnosis details
 */

import { Component, Show, For, createSignal, createMemo } from 'solid-js';
import { Incident } from '../../services/api';
import IncidentStory from './IncidentStory';
import { FixSuccessPredictor } from './fixSuccessPredictor';
import FixExecutionModal from './FixExecutionModal';

interface HighConfidenceLayoutProps {
  incident: Incident;
  allIncidents?: Incident[];
  onApplyFix?: (fixId: string) => void;
  onViewDetails?: () => void;
}

const HighConfidenceLayout: Component<HighConfidenceLayoutProps> = (props) => {
  const [showFixExecutionModal, setShowFixExecutionModal] = createSignal(false);
  const [selectedFix, setSelectedFix] = createSignal<any>(null);
  const [expandedSections, setExpandedSections] = createSignal({
    diagnosis: false,
    evidence: false,
    alternativeFixes: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const confidence = () => props.incident.diagnosis?.confidence || 0;
  const primaryFix = () => props.incident.recommendations?.[0];
  const alternativeFixes = () => props.incident.recommendations?.slice(1) || [];

  const handleApplyClick = (fix: any) => {
    setSelectedFix(fix);
    setShowFixExecutionModal(true);
  };

  const handleFixSuccess = () => {
    console.log('Fix applied successfully');
    setShowFixExecutionModal(false);
    setSelectedFix(null);
    if (props.onApplyFix) {
      props.onApplyFix(selectedFix()?.id || 'primary-fix');
    }
  };

  const handleFixFailure = (error: string) => {
    console.error('Fix application failed:', error);
    // Keep modal open to show failure state
  };

  const handleCloseModal = () => {
    setShowFixExecutionModal(false);
    setSelectedFix(null);
  };

  // Calculate success probability using ML-ready predictor
  const successPrediction = createMemo(() => {
    const fixId = primaryFix()?.id || 'primary-fix';
    return FixSuccessPredictor.predictSuccess(
      props.incident,
      fixId,
      props.allIncidents || []
    );
  });

  const successProbability = () => successPrediction().probability;

  return (
    <div class="high-confidence-layout">
      {/* Layout Mode Badge */}
      <div class="layout-mode-badge high-confidence">
        <span class="badge-icon">⚡</span>
        <span class="badge-text">High Confidence Mode</span>
        <span class="badge-confidence">{Math.round(confidence())}%</span>
      </div>

      {/* Quick Fix Card - Prominent */}
      <Show when={primaryFix()}>
        <div class="quick-fix-card">
          <div class="quick-fix-header">
            <div class="quick-fix-title">
              <span class="fix-icon">🔧</span>
              <h3>Recommended Fix</h3>
            </div>
            <div class="success-indicator">
              <div class="success-probability">
                <span class="probability-value">{successProbability()}%</span>
                <span class="probability-label">Success Rate</span>
              </div>
              <div class="success-gauge-mini">
                <div
                  class="success-gauge-fill"
                  style={{ width: `${successProbability()}%` }}
                />
              </div>
            </div>
          </div>

          <div class="quick-fix-content">
            <div class="fix-description">
              <h4>{primaryFix()?.title || 'Apply Automated Fix'}</h4>
              <p>{primaryFix()?.description || 'System has identified a high-confidence solution for this incident.'}</p>
            </div>

            {/* Expected Outcome */}
            <div class="fix-outcome">
              <div class="outcome-label">
                <span class="outcome-icon">✓</span>
                <span>Expected Outcome</span>
              </div>
              <div class="outcome-details">
                <Show when={primaryFix()?.expectedOutcome}>
                  <p>{primaryFix()?.expectedOutcome}</p>
                </Show>
                <Show when={!primaryFix()?.expectedOutcome}>
                  <p>Pod will restart successfully and enter Running state</p>
                </Show>
              </div>
            </div>

            {/* Rollback Plan */}
            <div class="fix-rollback">
              <div class="rollback-label">
                <span class="rollback-icon">↩️</span>
                <span>Rollback Available</span>
              </div>
              <div class="rollback-details">
                <Show when={primaryFix()?.rollbackPlan}>
                  <p>{primaryFix()?.rollbackPlan}</p>
                </Show>
                <Show when={!primaryFix()?.rollbackPlan}>
                  <p>Automatic rollback within 30 seconds if health checks fail</p>
                </Show>
              </div>
            </div>

            {/* Apply Button - Prominent */}
            <div class="fix-actions">
              <button
                class="apply-fix-btn primary"
                onClick={() => handleApplyClick(primaryFix())}
              >
                <span class="btn-icon">⚡</span>
                <span class="btn-label">Apply Fix Now</span>
              </button>
              <button
                class="view-details-btn secondary"
                onClick={props.onViewDetails}
              >
                <span class="btn-label">View Full Details</span>
                <span class="btn-icon">→</span>
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Fix Execution Modal */}
      <Show when={showFixExecutionModal()}>
        <FixExecutionModal
          incident={props.incident}
          fixId={selectedFix()?.id || 'primary-fix'}
          fixTitle={selectedFix()?.title || 'Apply Automated Fix'}
          fixDescription={selectedFix()?.description || 'System has identified a high-confidence solution for this incident.'}
          onClose={handleCloseModal}
          onSuccess={handleFixSuccess}
          onFailure={handleFixFailure}
        />
      </Show>

      {/* Incident Story */}
      <IncidentStory incident={props.incident} />

      {/* Alternative Fixes - Collapsed */}
      <Show when={alternativeFixes().length > 0}>
        <div class="collapsible-section">
          <button
            class="section-header"
            onClick={() => toggleSection('alternativeFixes')}
          >
            <span class="expand-icon">
              {expandedSections().alternativeFixes ? '▼' : '▶'}
            </span>
            <span class="section-title">Alternative Fixes ({alternativeFixes().length})</span>
          </button>
          <Show when={expandedSections().alternativeFixes}>
            <div class="section-content">
              <div class="alternative-fixes-list">
                <For each={alternativeFixes()}>
                  {(fix) => (
                    <div class="alternative-fix-item">
                      <div class="fix-item-header">
                        <h5>{fix.title || 'Alternative Solution'}</h5>
                        <span class="fix-confidence">{fix.confidence || 0}%</span>
                      </div>
                      <p class="fix-item-description">
                        {fix.description || 'Alternative fix approach'}
                      </p>
                      <button
                        class="apply-alternative-btn"
                        onClick={() => handleApplyClick(fix)}
                      >
                        Apply This Fix
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Diagnosis Summary - Collapsed */}
      <div class="collapsible-section">
        <button
          class="section-header"
          onClick={() => toggleSection('diagnosis')}
        >
          <span class="expand-icon">
            {expandedSections().diagnosis ? '▼' : '▶'}
          </span>
          <span class="section-title">Diagnosis Summary</span>
        </button>
        <Show when={expandedSections().diagnosis}>
          <div class="section-content">
            <div class="diagnosis-summary">
              <Show when={props.incident.diagnosis?.summary}>
                <p>{props.incident.diagnosis?.summary}</p>
              </Show>
              <Show when={!props.incident.diagnosis?.summary}>
                <p class="placeholder-text">
                  Detailed diagnosis information will appear here
                </p>
              </Show>
              <Show when={props.incident.diagnosis?.rootCause}>
                <div class="root-cause">
                  <strong>Root Cause:</strong>
                  <p>{props.incident.diagnosis?.rootCause}</p>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>

      {/* Supporting Evidence - Collapsed */}
      <div class="collapsible-section">
        <button
          class="section-header"
          onClick={() => toggleSection('evidence')}
        >
          <span class="expand-icon">
            {expandedSections().evidence ? '▼' : '▶'}
          </span>
          <span class="section-title">Supporting Evidence</span>
        </button>
        <Show when={expandedSections().evidence}>
          <div class="section-content">
            <div class="evidence-list">
              <Show when={props.incident.events && props.incident.events.length > 0}>
                <For each={props.incident.events?.slice(0, 5)}>
                  {(event) => (
                    <div class="evidence-item">
                      <span class="evidence-timestamp">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span class="evidence-message">{event.message}</span>
                    </div>
                  )}
                </For>
              </Show>
              <Show when={!props.incident.events || props.incident.events.length === 0}>
                <p class="placeholder-text">
                  Event logs and supporting evidence will appear here
                </p>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default HighConfidenceLayout;
