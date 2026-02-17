/**
 * Insights Engine - Advanced pattern matching and trend detection
 *
 * Features:
 * - Pattern matching across historical incidents
 * - Trend detection
 * - Cluster-wide impact analysis
 * - Time-based pattern recognition
 * - Proactive recommendations
 */

import { Incident } from '../../services/api';

export interface Insight {
  id: string;
  icon: string;
  text: string;
  type: 'info' | 'warning' | 'success' | 'trend' | 'recommendation';
  priority: number; // 1-10, higher is more important
  timestamp: Date;
}

export class InsightsEngine {
  /**
   * Generate insights for the current incident
   */
  static generateInsights(
    currentIncident: Incident,
    allIncidents: Incident[]
  ): Insight[] {
    const insights: Insight[] = [];

    // Confidence-based insights
    insights.push(...this.generateConfidenceInsights(currentIncident));

    // Pattern matching insights
    insights.push(...this.generatePatternInsights(currentIncident, allIncidents));

    // Trend detection insights
    insights.push(...this.generateTrendInsights(currentIncident, allIncidents));

    // Cluster health insights
    insights.push(...this.generateClusterHealthInsights(allIncidents));

    // Recurrence insights
    insights.push(...this.generateRecurrenceInsights(currentIncident));

    // Proactive recommendations
    insights.push(...this.generateProactiveRecommendations(currentIncident, allIncidents));

    // Sort by priority (descending) and limit to top insights
    return insights
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);
  }

  /**
   * Generate confidence-based insights
   */
  private static generateConfidenceInsights(incident: Incident): Insight[] {
    const insights: Insight[] = [];
    const confidence = incident.diagnosis?.confidence || 0;

    if (confidence >= 95) {
      insights.push({
        id: 'conf-high',
        icon: '✓',
        text: 'High confidence diagnosis - Safe to apply automated fix',
        type: 'success',
        priority: 10,
        timestamp: new Date(),
      });
    } else if (confidence >= 80) {
      insights.push({
        id: 'conf-good',
        icon: '✓',
        text: 'Good confidence level - Fix available with low risk',
        type: 'success',
        priority: 8,
        timestamp: new Date(),
      });
    } else if (confidence >= 70) {
      insights.push({
        id: 'conf-moderate',
        icon: '⚠️',
        text: 'Moderate confidence - Review fix before applying',
        type: 'warning',
        priority: 7,
        timestamp: new Date(),
      });
    } else if (confidence >= 50) {
      insights.push({
        id: 'conf-low',
        icon: '⚠️',
        text: 'Low confidence - Manual investigation recommended',
        type: 'warning',
        priority: 6,
        timestamp: new Date(),
      });
    } else {
      insights.push({
        id: 'conf-very-low',
        icon: 'ℹ️',
        text: 'Insufficient data - Gathering more information',
        type: 'info',
        priority: 5,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate pattern matching insights
   */
  private static generatePatternInsights(
    incident: Incident,
    allIncidents: Incident[]
  ): Insight[] {
    const insights: Insight[] = [];
    const pattern = incident.pattern || '';

    // Find similar patterns
    const similarIncidents = allIncidents.filter(
      (inc) => inc.id !== incident.id && inc.pattern === pattern
    );

    if (similarIncidents.length > 0) {
      const resolved = similarIncidents.filter((inc) => inc.status === 'resolved').length;
      if (resolved > 0) {
        insights.push({
          id: 'pattern-success',
          icon: '📊',
          text: `${resolved} similar incidents resolved successfully`,
          type: 'success',
          priority: 9,
          timestamp: new Date(),
        });
      }
    }

    // Pattern-specific insights
    if (pattern.includes('CRASH')) {
      insights.push({
        id: 'pattern-crash',
        icon: '💥',
        text: 'CrashLoop pattern detected - Check resource limits and logs',
        type: 'info',
        priority: 8,
        timestamp: new Date(),
      });
    }

    if (pattern.includes('OOM')) {
      insights.push({
        id: 'pattern-oom',
        icon: '💾',
        text: 'Memory exhaustion detected - Consider increasing limits',
        type: 'recommendation',
        priority: 9,
        timestamp: new Date(),
      });
    }

    if (pattern.includes('IMAGE_PULL')) {
      insights.push({
        id: 'pattern-image',
        icon: '📦',
        text: 'Image pull issue - Verify registry access and credentials',
        type: 'recommendation',
        priority: 8,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate trend detection insights
   */
  private static generateTrendInsights(
    incident: Incident,
    allIncidents: Incident[]
  ): Insight[] {
    const insights: Insight[] = [];
    const pattern = incident.pattern || '';
    const namespace = incident.resource?.namespace || 'default';

    // Time-based analysis (last 24 hours vs previous 24 hours)
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previous24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const recentIncidents = allIncidents.filter((inc) => {
      const firstSeen = new Date(inc.firstSeen || 0);
      return firstSeen >= last24h;
    });

    const previousIncidents = allIncidents.filter((inc) => {
      const firstSeen = new Date(inc.firstSeen || 0);
      return firstSeen >= previous24h && firstSeen < last24h;
    });

    // Trend: Increasing incidents
    if (recentIncidents.length > previousIncidents.length * 1.5) {
      insights.push({
        id: 'trend-increasing',
        icon: '📈',
        text: `Incident rate increasing - ${recentIncidents.length} in last 24h (up ${Math.round(((recentIncidents.length - previousIncidents.length) / Math.max(previousIncidents.length, 1)) * 100)}%)`,
        type: 'warning',
        priority: 9,
        timestamp: new Date(),
      });
    }

    // Trend: Decreasing incidents
    if (previousIncidents.length > 0 && recentIncidents.length < previousIncidents.length * 0.5) {
      insights.push({
        id: 'trend-decreasing',
        icon: '📉',
        text: `Incident rate decreasing - ${recentIncidents.length} in last 24h (down ${Math.round(((previousIncidents.length - recentIncidents.length) / previousIncidents.length) * 100)}%)`,
        type: 'success',
        priority: 7,
        timestamp: new Date(),
      });
    }

    // Same pattern occurring in multiple namespaces
    const affectedNamespaces = new Set(
      allIncidents
        .filter((inc) => inc.pattern === pattern)
        .map((inc) => inc.resource?.namespace || 'default')
    );

    if (affectedNamespaces.size > 1) {
      insights.push({
        id: 'trend-widespread',
        icon: '🌐',
        text: `Pattern affecting ${affectedNamespaces.size} namespaces - Possible cluster-wide issue`,
        type: 'warning',
        priority: 10,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate cluster health insights
   */
  private static generateClusterHealthInsights(allIncidents: Incident[]): Insight[] {
    const insights: Insight[] = [];

    const criticalCount = allIncidents.filter((inc) => inc.severity === 'critical').length;
    const highCount = allIncidents.filter((inc) => inc.severity === 'high').length;

    if (criticalCount > 5) {
      insights.push({
        id: 'cluster-critical',
        icon: '🚨',
        text: `${criticalCount} critical incidents active - Immediate attention required`,
        type: 'warning',
        priority: 10,
        timestamp: new Date(),
      });
    } else if (criticalCount > 0) {
      insights.push({
        id: 'cluster-critical-few',
        icon: '⚠️',
        text: `${criticalCount} critical incident${criticalCount !== 1 ? 's' : ''} require attention`,
        type: 'warning',
        priority: 9,
        timestamp: new Date(),
      });
    }

    if (highCount > 10) {
      insights.push({
        id: 'cluster-high-volume',
        icon: '📊',
        text: `High incident volume - ${highCount} high-priority incidents`,
        type: 'info',
        priority: 7,
        timestamp: new Date(),
      });
    }

    // Check for recent resolutions
    const recentlyResolved = allIncidents.filter((inc) => {
      if (inc.status !== 'resolved' || !inc.lastSeen) return false;
      const resolved = new Date(inc.lastSeen);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return resolved >= oneHourAgo;
    }).length;

    if (recentlyResolved > 3) {
      insights.push({
        id: 'cluster-recovery',
        icon: '✨',
        text: `Cluster recovering - ${recentlyResolved} incidents resolved in last hour`,
        type: 'success',
        priority: 8,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate recurrence insights
   */
  private static generateRecurrenceInsights(incident: Incident): Insight[] {
    const insights: Insight[] = [];
    const occurrences = incident.occurrences || 1;

    if (occurrences > 10) {
      insights.push({
        id: 'recurrence-high',
        icon: '🔄',
        text: `Highly recurring issue - ${occurrences} occurrences detected`,
        type: 'warning',
        priority: 9,
        timestamp: new Date(),
      });
    } else if (occurrences > 5) {
      insights.push({
        id: 'recurrence-moderate',
        icon: '🔄',
        text: `Recurring issue - ${occurrences} occurrences so far`,
        type: 'warning',
        priority: 7,
        timestamp: new Date(),
      });
    } else if (occurrences === 1) {
      insights.push({
        id: 'recurrence-first',
        icon: '🆕',
        text: 'First occurrence - Monitoring for pattern establishment',
        type: 'info',
        priority: 5,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate proactive recommendations
   */
  private static generateProactiveRecommendations(
    incident: Incident,
    allIncidents: Incident[]
  ): Insight[] {
    const insights: Insight[] = [];
    const pattern = incident.pattern || '';

    // Recommend preventive actions
    if (pattern.includes('OOM')) {
      insights.push({
        id: 'rec-memory-alerts',
        icon: '🔔',
        text: 'Recommendation: Set up memory usage alerts to catch issues early',
        type: 'recommendation',
        priority: 6,
        timestamp: new Date(),
      });
    }

    if (pattern.includes('CRASH')) {
      insights.push({
        id: 'rec-health-checks',
        icon: '🏥',
        text: 'Recommendation: Review and strengthen health check configurations',
        type: 'recommendation',
        priority: 6,
        timestamp: new Date(),
      });
    }

    // Check if this pattern has been resolved before
    const similarResolved = allIncidents.filter(
      (inc) => inc.pattern === pattern && inc.status === 'resolved'
    );

    if (similarResolved.length > 3 && incident.diagnosis?.confidence && incident.diagnosis.confidence < 80) {
      insights.push({
        id: 'rec-learn',
        icon: '🎓',
        text: 'System is learning from past resolutions - Confidence will improve',
        type: 'info',
        priority: 5,
        timestamp: new Date(),
      });
    }

    return insights;
  }
}
