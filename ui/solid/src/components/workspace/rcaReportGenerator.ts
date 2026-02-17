/**
 * RCA Report Generator - Root Cause Analysis PDF/Document export
 *
 * Features:
 * - Comprehensive RCA report generation
 * - Professional document formatting
 * - Multiple export formats (JSON, Markdown, HTML)
 * - Template-based generation
 */

import { Incident } from '../../services/api';

export interface RCAReport {
  metadata: RCAMetadata;
  executiveSummary: string;
  incidentTimeline: TimelineEvent[];
  rootCauseAnalysis: RootCauseSection;
  impactAssessment: ImpactSection;
  resolutionSteps: ResolutionStep[];
  recommendations: Recommendation[];
  supportingEvidence: EvidenceSection;
  appendix: AppendixSection;
}

interface RCAMetadata {
  reportId: string;
  generatedAt: Date;
  generatedBy: string;
  incidentId: string;
  severity: string;
  duration: string;
  status: string;
}

interface TimelineEvent {
  timestamp: Date;
  event: string;
  type: 'info' | 'warning' | 'error' | 'action';
}

interface RootCauseSection {
  primaryCause: string;
  contributingFactors: string[];
  technicalDetails: string;
  confidenceLevel: number;
}

interface ImpactSection {
  affectedResources: string[];
  userImpact: string;
  businessImpact: string;
  estimatedDowntime: string;
}

interface ResolutionStep {
  step: number;
  action: string;
  result: string;
  timestamp?: Date;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  recommendation: string;
  rationale: string;
}

interface EvidenceSection {
  logs: string[];
  metrics: string[];
  screenshots: string[];
}

interface AppendixSection {
  resourceConfiguration: any;
  environmentDetails: any;
  additionalNotes: string[];
}

export class RCAReportGenerator {
  /**
   * Generate complete RCA report
   */
  static generateReport(incident: Incident): RCAReport {
    return {
      metadata: this.generateMetadata(incident),
      executiveSummary: this.generateExecutiveSummary(incident),
      incidentTimeline: this.generateTimeline(incident),
      rootCauseAnalysis: this.generateRootCause(incident),
      impactAssessment: this.generateImpact(incident),
      resolutionSteps: this.generateResolutionSteps(incident),
      recommendations: this.generateRecommendations(incident),
      supportingEvidence: this.generateEvidence(incident),
      appendix: this.generateAppendix(incident),
    };
  }

  /**
   * Export report as Markdown
   */
  static exportAsMarkdown(report: RCAReport): string {
    let markdown = '';

    // Title
    markdown += `# Root Cause Analysis Report\n\n`;
    markdown += `**Report ID:** ${report.metadata.reportId}\n`;
    markdown += `**Generated:** ${report.metadata.generatedAt.toLocaleString()}\n`;
    markdown += `**Incident ID:** ${report.metadata.incidentId}\n`;
    markdown += `**Severity:** ${report.metadata.severity.toUpperCase()}\n`;
    markdown += `**Status:** ${report.metadata.status}\n\n`;
    markdown += `---\n\n`;

    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `${report.executiveSummary}\n\n`;

    // Timeline
    markdown += `## Incident Timeline\n\n`;
    report.incidentTimeline.forEach((event) => {
      const icon = this.getTimelineIcon(event.type);
      markdown += `- **${event.timestamp.toLocaleString()}** ${icon} ${event.event}\n`;
    });
    markdown += `\n`;

    // Root Cause Analysis
    markdown += `## Root Cause Analysis\n\n`;
    markdown += `### Primary Cause\n`;
    markdown += `${report.rootCauseAnalysis.primaryCause}\n\n`;

    if (report.rootCauseAnalysis.contributingFactors.length > 0) {
      markdown += `### Contributing Factors\n`;
      report.rootCauseAnalysis.contributingFactors.forEach((factor) => {
        markdown += `- ${factor}\n`;
      });
      markdown += `\n`;
    }

    markdown += `### Technical Details\n`;
    markdown += `${report.rootCauseAnalysis.technicalDetails}\n\n`;
    markdown += `**Confidence Level:** ${report.rootCauseAnalysis.confidenceLevel}%\n\n`;

    // Impact Assessment
    markdown += `## Impact Assessment\n\n`;
    markdown += `### Affected Resources\n`;
    report.impactAssessment.affectedResources.forEach((resource) => {
      markdown += `- ${resource}\n`;
    });
    markdown += `\n`;
    markdown += `### User Impact\n${report.impactAssessment.userImpact}\n\n`;
    markdown += `### Business Impact\n${report.impactAssessment.businessImpact}\n\n`;
    markdown += `### Estimated Downtime\n${report.impactAssessment.estimatedDowntime}\n\n`;

    // Resolution Steps
    markdown += `## Resolution Steps\n\n`;
    report.resolutionSteps.forEach((step) => {
      markdown += `### Step ${step.step}: ${step.action}\n`;
      markdown += `**Result:** ${step.result}\n`;
      if (step.timestamp) {
        markdown += `**Time:** ${step.timestamp.toLocaleString()}\n`;
      }
      markdown += `\n`;
    });

    // Recommendations
    markdown += `## Recommendations\n\n`;
    const highPriority = report.recommendations.filter((r) => r.priority === 'high');
    const mediumPriority = report.recommendations.filter((r) => r.priority === 'medium');
    const lowPriority = report.recommendations.filter((r) => r.priority === 'low');

    if (highPriority.length > 0) {
      markdown += `### High Priority\n`;
      highPriority.forEach((rec, i) => {
        markdown += `${i + 1}. **${rec.category}:** ${rec.recommendation}\n`;
        markdown += `   - *Rationale:* ${rec.rationale}\n\n`;
      });
    }

    if (mediumPriority.length > 0) {
      markdown += `### Medium Priority\n`;
      mediumPriority.forEach((rec, i) => {
        markdown += `${i + 1}. **${rec.category}:** ${rec.recommendation}\n`;
        markdown += `   - *Rationale:* ${rec.rationale}\n\n`;
      });
    }

    if (lowPriority.length > 0) {
      markdown += `### Low Priority\n`;
      lowPriority.forEach((rec, i) => {
        markdown += `${i + 1}. **${rec.category}:** ${rec.recommendation}\n`;
        markdown += `   - *Rationale:* ${rec.rationale}\n\n`;
      });
    }

    // Supporting Evidence
    markdown += `## Supporting Evidence\n\n`;
    if (report.supportingEvidence.logs.length > 0) {
      markdown += `### Key Log Entries\n`;
      markdown += `\`\`\`\n`;
      report.supportingEvidence.logs.slice(0, 10).forEach((log) => {
        markdown += `${log}\n`;
      });
      markdown += `\`\`\`\n\n`;
    }

    // Footer
    markdown += `---\n\n`;
    markdown += `*This report was automatically generated by KubeGraf Incident Intelligence System*\n`;

    return markdown;
  }

  /**
   * Download report as file
   */
  static downloadReport(report: RCAReport, format: 'markdown' | 'json' | 'html' = 'markdown') {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'markdown':
        content = this.exportAsMarkdown(report);
        filename = `RCA-${report.metadata.reportId}.md`;
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify(report, null, 2);
        filename = `RCA-${report.metadata.reportId}.json`;
        mimeType = 'application/json';
        break;
      case 'html':
        content = this.exportAsHTML(report);
        filename = `RCA-${report.metadata.reportId}.html`;
        mimeType = 'text/html';
        break;
    }

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Private helper methods

  private static generateMetadata(incident: Incident): RCAMetadata {
    const now = new Date();
    const firstSeen = incident.firstSeen ? new Date(incident.firstSeen) : now;
    const duration = this.calculateDuration(firstSeen, now);

    return {
      reportId: `RCA-${Date.now()}-${incident.id.substring(0, 8)}`,
      generatedAt: now,
      generatedBy: 'KubeGraf AI System',
      incidentId: incident.id,
      severity: incident.severity || 'unknown',
      duration,
      status: incident.status || 'open',
    };
  }

  private static generateExecutiveSummary(incident: Incident): string {
    const severity = incident.severity || 'unknown';
    const pattern = incident.pattern || 'Unknown Issue';
    const resource = incident.resource?.name || 'unknown resource';
    const namespace = incident.resource?.namespace || 'default';

    return `This Root Cause Analysis (RCA) report documents a ${severity}-severity incident involving ${pattern.toLowerCase().replace(/_/g, ' ')} affecting ${resource} in the ${namespace} namespace. The incident was detected by KubeGraf's automated monitoring system and has been analyzed using pattern recognition and historical data correlation. This report provides a comprehensive analysis of the root cause, impact assessment, resolution steps, and recommendations to prevent future occurrences.`;
  }

  private static generateTimeline(incident: Incident): TimelineEvent[] {
    const timeline: TimelineEvent[] = [];
    const firstSeen = incident.firstSeen ? new Date(incident.firstSeen) : new Date();

    timeline.push({
      timestamp: firstSeen,
      event: 'Incident first detected by monitoring system',
      type: 'error',
    });

    if (incident.events && incident.events.length > 0) {
      incident.events.slice(0, 10).forEach((event) => {
        timeline.push({
          timestamp: new Date(event.timestamp),
          event: event.message,
          type: event.type === 'Warning' ? 'warning' : event.type === 'Error' ? 'error' : 'info',
        });
      });
    }

    timeline.push({
      timestamp: new Date(),
      event: 'RCA report generated',
      type: 'action',
    });

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private static generateRootCause(incident: Incident): RootCauseSection {
    const primaryCause = incident.diagnosis?.rootCause || this.inferRootCause(incident);
    const contributingFactors = this.identifyContributingFactors(incident);
    const technicalDetails = incident.diagnosis?.summary || 'Technical analysis in progress';
    const confidenceLevel = incident.diagnosis?.confidence || 50;

    return {
      primaryCause,
      contributingFactors,
      technicalDetails,
      confidenceLevel,
    };
  }

  private static generateImpact(incident: Incident): ImpactSection {
    const resource = incident.resource;
    const affectedResources = [
      `${resource?.kind}/${resource?.name} (${resource?.namespace})`,
    ];

    const severity = incident.severity || 'unknown';
    const userImpact = this.assessUserImpact(severity, incident.pattern);
    const businessImpact = this.assessBusinessImpact(severity);
    const estimatedDowntime = this.estimateDowntime(incident);

    return {
      affectedResources,
      userImpact,
      businessImpact,
      estimatedDowntime,
    };
  }

  private static generateResolutionSteps(incident: Incident): ResolutionStep[] {
    const steps: ResolutionStep[] = [];

    if (incident.recommendations && incident.recommendations.length > 0) {
      incident.recommendations.forEach((rec, index) => {
        steps.push({
          step: index + 1,
          action: rec.title || 'Apply remediation',
          result: rec.description || 'Fix applied',
        });
      });
    } else {
      steps.push({
        step: 1,
        action: 'Manual investigation and remediation required',
        result: 'Awaiting resolution',
      });
    }

    return steps;
  }

  private static generateRecommendations(incident: Incident): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const pattern = incident.pattern || '';

    // Pattern-specific recommendations
    if (pattern.includes('OOM')) {
      recommendations.push({
        priority: 'high',
        category: 'Resource Management',
        recommendation: 'Increase memory limits and implement memory monitoring alerts',
        rationale: 'Prevent future OOM incidents through proactive resource management',
      });
    }

    if (pattern.includes('CRASH')) {
      recommendations.push({
        priority: 'high',
        category: 'Health Checks',
        recommendation: 'Review and strengthen liveness/readiness probes',
        rationale: 'Earlier detection and automatic recovery from crash situations',
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'medium',
      category: 'Monitoring',
      recommendation: 'Enhance monitoring coverage for similar resources',
      rationale: 'Faster detection and response to similar incidents',
    });

    recommendations.push({
      priority: 'low',
      category: 'Documentation',
      recommendation: 'Update runbooks with lessons learned',
      rationale: 'Improve team knowledge and response procedures',
    });

    return recommendations;
  }

  private static generateEvidence(incident: Incident): EvidenceSection {
    const logs: string[] = [];

    if (incident.events && incident.events.length > 0) {
      incident.events.forEach((event) => {
        logs.push(`[${new Date(event.timestamp).toLocaleString()}] ${event.type}: ${event.message}`);
      });
    }

    return {
      logs,
      metrics: [],
      screenshots: [],
    };
  }

  private static generateAppendix(incident: Incident): AppendixSection {
    return {
      resourceConfiguration: incident.resource || {},
      environmentDetails: {
        cluster: 'Production',
        namespace: incident.resource?.namespace || 'default',
      },
      additionalNotes: [
        'This report was automatically generated by KubeGraf AI',
        'Confidence scores are based on pattern matching and historical data',
      ],
    };
  }

  private static inferRootCause(incident: Incident): string {
    const pattern = incident.pattern || '';

    if (pattern.includes('CRASH')) {
      return 'Application crashes due to runtime errors or resource constraints';
    }
    if (pattern.includes('OOM')) {
      return 'Container memory limit exceeded causing OOM kills';
    }
    if (pattern.includes('IMAGE_PULL')) {
      return 'Unable to pull container image from registry';
    }
    if (pattern.includes('NETWORK')) {
      return 'Network connectivity or DNS resolution failure';
    }
    if (pattern.includes('CONFIG')) {
      return 'Configuration error preventing normal operation';
    }

    return 'Root cause analysis in progress';
  }

  private static identifyContributingFactors(incident: Incident): string[] {
    const factors: string[] = [];

    if (incident.occurrences && incident.occurrences > 5) {
      factors.push('Recurring issue indicating systematic problem');
    }

    if (incident.severity === 'critical' || incident.severity === 'high') {
      factors.push('High severity impact on system availability');
    }

    return factors;
  }

  private static assessUserImpact(severity: string, pattern?: string): string {
    if (severity === 'critical') {
      return 'Complete service unavailability. Users unable to access application features.';
    }
    if (severity === 'high') {
      return 'Significant degradation in service quality. Users experiencing errors and timeouts.';
    }
    return 'Minimal user impact. Service remains functional with reduced performance.';
  }

  private static assessBusinessImpact(severity: string): string {
    if (severity === 'critical') {
      return 'High business impact with potential revenue loss and customer satisfaction impact.';
    }
    if (severity === 'high') {
      return 'Moderate business impact affecting user experience and operational metrics.';
    }
    return 'Low business impact with minimal operational disruption.';
  }

  private static estimateDowntime(incident: Incident): string {
    if (incident.firstSeen) {
      const duration = Date.now() - new Date(incident.firstSeen).getTime();
      const minutes = Math.floor(duration / 60000);

      if (minutes < 60) {
        return `${minutes} minutes`;
      }
      const hours = Math.floor(minutes / 60);
      return `${hours} hours ${minutes % 60} minutes`;
    }
    return 'Unknown';
  }

  private static calculateDuration(start: Date, end: Date): string {
    const duration = end.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);

    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hours ${minutes % 60} minutes`;
    }
    const days = Math.floor(hours / 24);
    return `${days} days ${hours % 24} hours`;
  }

  private static getTimelineIcon(type: string): string {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'action': return '🔧';
      default: return 'ℹ️';
    }
  }

  private static exportAsHTML(report: RCAReport): string {
    // Convert markdown to HTML (simplified version)
    const markdown = this.exportAsMarkdown(report);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RCA Report - ${report.metadata.reportId}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #4F46E5; border-bottom: 3px solid #4F46E5; padding-bottom: 10px; }
    h2 { color: #6366F1; margin-top: 30px; }
    h3 { color: #818CF8; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    .metadata { background: #EEF2FF; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    ul { margin-left: 20px; }
  </style>
</head>
<body>
  <pre>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
  }
}
