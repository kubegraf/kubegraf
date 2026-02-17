/**
 * IntelligenceAssistant - Right panel for AI insights and contextual intelligence
 *
 * Features:
 * - Real-time insights and pattern analysis
 * - Related incident discovery
 * - Quick actions with confidence scores
 * - Learning statistics and progress
 * - Cluster health monitoring
 * - Expandable sections
 */

import { Component, Show, For, createSignal, createMemo } from 'solid-js';
import { Incident } from '../../services/api';

interface IntelligenceAssistantProps {
  incident: Incident | null;
  allIncidents?: Incident[];
  clusterHealth?: number;
  onQuickAction?: (actionId: string) => void;
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  confidence: number;
  description: string;
}

interface Insight {
  icon: string;
  text: string;
  type: 'info' | 'warning' | 'success';
}

const IntelligenceAssistant: Component<IntelligenceAssistantProps> = (props) => {
  // Expandable sections state
  const [expandedSections, setExpandedSections] = createSignal({
    insights: true,
    related: true,
    actions: true,
    learning: true,
    health: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Generate insights based on incident (placeholder for Phase 3)
  const insights = createMemo((): Insight[] => {
    if (!props.incident) return [];

    const insights: Insight[] = [];
    const confidence = props.incident.diagnosis?.confidence || 0;

    if (confidence >= 95) {
      insights.push({
        icon: '✓',
        text: 'High confidence diagnosis - Safe to apply automated fix',
        type: 'success',
      });
    } else if (confidence >= 70) {
      insights.push({
        icon: '⚠️',
        text: 'Moderate confidence - Review fix before applying',
        type: 'warning',
      });
    } else {
      insights.push({
        icon: 'ℹ️',
        text: 'Low confidence - Manual investigation recommended',
        type: 'info',
      });
    }

    if (props.incident.occurrences && props.incident.occurrences > 5) {
      insights.push({
        icon: '🔄',
        text: `Recurring issue - ${props.incident.occurrences} occurrences detected`,
        type: 'warning',
      });
    }

    if (props.incident.pattern?.includes('CRASH')) {
      insights.push({
        icon: '💥',
        text: 'CrashLoop pattern detected - Check resource limits',
        type: 'info',
      });
    }

    return insights;
  });

  // Find related incidents (placeholder for Phase 3)
  const relatedIncidents = createMemo(() => {
    if (!props.incident || !props.allIncidents) return [];

    return props.allIncidents
      .filter((inc) => {
        // Filter out current incident
        if (inc.id === props.incident?.id) return false;

        // Match by pattern or resource namespace
        const samePattern = inc.pattern === props.incident?.pattern;
        const sameNamespace =
          inc.resource?.namespace === props.incident?.resource?.namespace;

        return samePattern || sameNamespace;
      })
      .slice(0, 5); // Limit to 5 related incidents
  });

  // Generate quick actions (placeholder for Phase 3)
  const quickActions = createMemo((): QuickAction[] => {
    if (!props.incident) return [];

    const actions: QuickAction[] = [];

    // Only show quick actions for high confidence incidents
    const confidence = props.incident.diagnosis?.confidence || 0;
    if (confidence >= 85) {
      actions.push({
        id: 'apply-fix',
        icon: '⚡',
        label: 'Apply Quick Fix',
        confidence: Math.round(confidence),
        description: 'Automated remediation with rollback',
      });
    }

    if (props.incident.recommendations && props.incident.recommendations.length > 0) {
      actions.push({
        id: 'review-fixes',
        icon: '🔧',
        label: 'Review All Fixes',
        confidence: Math.round(confidence),
        description: `${props.incident.recommendations.length} recommendations available`,
      });
    }

    return actions;
  });

  // Learning statistics
  const learningStats = createMemo(() => {
    const totalIncidents = props.allIncidents?.length || 0;
    const criticalCount =
      props.allIncidents?.filter((i) => i.severity === 'critical').length || 0;
    const autoFixedCount = 0; // Placeholder - will be tracked in Phase 4

    return {
      totalIncidents,
      criticalCount,
      autoFixedCount,
      successRate: totalIncidents > 0 ? Math.round((autoFixedCount / totalIncidents) * 100) : 0,
    };
  });

  // Health score (from props or calculate)
  const healthScore = createMemo(() => {
    if (props.clusterHealth !== undefined) {
      return Math.round(props.clusterHealth);
    }

    // Simple calculation based on incident severity
    const incidents = props.allIncidents || [];
    if (incidents.length === 0) return 100;

    const critical = incidents.filter((i) => i.severity === 'critical').length;
    const high = incidents.filter((i) => i.severity === 'high').length;

    return Math.max(0, 100 - critical * 10 - high * 5);
  });

  const getHealthColor = () => {
    const score = healthScore();
    if (score >= 80) return 'var(--confidence-high)';
    if (score >= 50) return 'var(--confidence-medium)';
    return 'var(--confidence-low)';
  };

  const getHealthLabel = () => {
    const score = healthScore();
    if (score >= 80) return 'Healthy';
    if (score >= 50) return 'Degraded';
    return 'Critical';
  };

  return (
    <aside class="intelligence-assistant" role="complementary" aria-label="Intelligence insights">
      <div class="panel-header">
        <h2>INTELLIGENCE</h2>
      </div>

      {/* Insights Section */}
      <div class="intelligence-section">
        <button
          class="section-toggle"
          onClick={() => toggleSection('insights')}
          aria-expanded={expandedSections().insights}
        >
          <span class="toggle-icon">{expandedSections().insights ? '▼' : '▶'}</span>
          <h3>💡 Insights</h3>
          <Show when={insights().length > 0}>
            <span class="section-badge">{insights().length}</span>
          </Show>
        </button>

        <Show when={expandedSections().insights}>
          <div class="section-content">
            <Show
              when={insights().length > 0}
              fallback={
                <p class="empty-message">
                  {props.incident
                    ? 'Analyzing incident patterns...'
                    : 'Select an incident to view insights'}
                </p>
              }
            >
              <div class="insights-list">
                <For each={insights()}>
                  {(insight) => (
                    <div class="insight-item" data-type={insight.type}>
                      <span class="insight-icon">{insight.icon}</span>
                      <span class="insight-text">{insight.text}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Related Incidents Section */}
      <div class="intelligence-section">
        <button
          class="section-toggle"
          onClick={() => toggleSection('related')}
          aria-expanded={expandedSections().related}
        >
          <span class="toggle-icon">{expandedSections().related ? '▼' : '▶'}</span>
          <h3>🔗 Related</h3>
          <Show when={relatedIncidents().length > 0}>
            <span class="section-badge">{relatedIncidents().length}</span>
          </Show>
        </button>

        <Show when={expandedSections().related}>
          <div class="section-content">
            <Show
              when={relatedIncidents().length > 0}
              fallback={
                <p class="empty-message">
                  {props.incident
                    ? 'No related incidents found'
                    : 'Select an incident to find related issues'}
                </p>
              }
            >
              <div class="related-list">
                <For each={relatedIncidents()}>
                  {(incident) => (
                    <div class="related-item">
                      <div class="related-header">
                        <span class="related-severity" data-severity={incident.severity}>
                          {incident.severity === 'critical' && '🔴'}
                          {incident.severity === 'high' && '🟠'}
                          {incident.severity === 'medium' && '🟡'}
                          {incident.severity === 'low' && '🔵'}
                        </span>
                        <span class="related-pattern">{incident.pattern || 'Unknown'}</span>
                      </div>
                      <div class="related-resource">
                        {incident.resource?.namespace || 'default'}/
                        {incident.resource?.name || 'unknown'}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Quick Actions Section */}
      <div class="intelligence-section">
        <button
          class="section-toggle"
          onClick={() => toggleSection('actions')}
          aria-expanded={expandedSections().actions}
        >
          <span class="toggle-icon">{expandedSections().actions ? '▼' : '▶'}</span>
          <h3>🎯 Actions</h3>
          <Show when={quickActions().length > 0}>
            <span class="section-badge">{quickActions().length}</span>
          </Show>
        </button>

        <Show when={expandedSections().actions}>
          <div class="section-content">
            <Show
              when={quickActions().length > 0}
              fallback={
                <p class="empty-message">
                  {props.incident
                    ? 'No quick actions available'
                    : 'Select an incident to view actions'}
                </p>
              }
            >
              <div class="actions-list">
                <For each={quickActions()}>
                  {(action) => (
                    <button
                      class="quick-action-btn"
                      onClick={() => props.onQuickAction?.(action.id)}
                    >
                      <div class="action-header">
                        <span class="action-icon">{action.icon}</span>
                        <span class="action-label">{action.label}</span>
                      </div>
                      <div class="action-description">{action.description}</div>
                      <div class="action-confidence-badge">
                        <span class="confidence-text">{action.confidence}%</span>
                        <span class="confidence-check">✓</span>
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Learning Section */}
      <div class="intelligence-section">
        <button
          class="section-toggle"
          onClick={() => toggleSection('learning')}
          aria-expanded={expandedSections().learning}
        >
          <span class="toggle-icon">{expandedSections().learning ? '▼' : '▶'}</span>
          <h3>📚 Learning</h3>
        </button>

        <Show when={expandedSections().learning}>
          <div class="section-content">
            <div class="learning-stats">
              <div class="stat-item">
                <span class="stat-icon">📊</span>
                <div class="stat-details">
                  <span class="stat-label">Total Incidents</span>
                  <span class="stat-value">{learningStats().totalIncidents}</span>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🔴</span>
                <div class="stat-details">
                  <span class="stat-label">Critical</span>
                  <span class="stat-value">{learningStats().criticalCount}</span>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🤖</span>
                <div class="stat-details">
                  <span class="stat-label">Auto-Fixed</span>
                  <span class="stat-value">{learningStats().autoFixedCount}</span>
                </div>
              </div>
              <div class="stat-item">
                <span class="stat-icon">✓</span>
                <div class="stat-details">
                  <span class="stat-label">Success Rate</span>
                  <span class="stat-value">{learningStats().successRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Health Score Section */}
      <div class="intelligence-section">
        <button
          class="section-toggle"
          onClick={() => toggleSection('health')}
          aria-expanded={expandedSections().health}
        >
          <span class="toggle-icon">{expandedSections().health ? '▼' : '▶'}</span>
          <h3>🏥 Cluster Health</h3>
        </button>

        <Show when={expandedSections().health}>
          <div class="section-content">
            <div class="health-display">
              <div class="health-score-large">{healthScore()}%</div>
              <div class="health-status" style={{ color: getHealthColor() }}>
                {getHealthLabel()}
              </div>
              <div class="health-gauge-container">
                <div class="health-gauge">
                  <div
                    class="health-gauge-fill"
                    style={{
                      width: `${healthScore()}%`,
                      background: getHealthColor(),
                    }}
                  />
                </div>
              </div>
              <div class="health-description">
                <Show when={healthScore() >= 80}>
                  <p>✓ Cluster is operating normally with no critical issues.</p>
                </Show>
                <Show when={healthScore() >= 50 && healthScore() < 80}>
                  <p>⚠️ Cluster has some issues that need attention.</p>
                </Show>
                <Show when={healthScore() < 50}>
                  <p>🚨 Cluster has critical issues requiring immediate action.</p>
                </Show>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </aside>
  );
};

export default IntelligenceAssistant;
