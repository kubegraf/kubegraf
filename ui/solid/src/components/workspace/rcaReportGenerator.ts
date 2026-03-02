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

    if (incident.timeline && incident.timeline.length > 0) {
      incident.timeline.slice(0, 10).forEach((entry) => {
        timeline.push({
          timestamp: new Date(entry.timestamp),
          event: entry.title + ': ' + entry.description,
          type: entry.type === 'Warning' ? 'warning' : entry.type === 'Error' ? 'error' : 'info',
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
    const primaryCause = incident.diagnosis?.probableCauses?.[0] || this.inferRootCause(incident);
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
          result: rec.explanation || 'Fix applied',
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

    if (incident.timeline && incident.timeline.length > 0) {
      incident.timeline.forEach((entry) => {
        logs.push(`[${new Date(entry.timestamp).toLocaleString()}] ${entry.type}: ${entry.title}: ${entry.description}`);
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

  /**
   * Open a print-ready HTML in a new window and trigger the browser print dialog.
   * The user can "Save as PDF" from there — works in all major browsers.
   */
  static printAsPDF(report: RCAReport): void {
    const html = this.exportAsPrintHTML(report);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      // Popup blocked — fall back to blob download of the HTML
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RCA-${report.metadata.reportId}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    win.document.write(html);
    win.document.close();
    // Give browser time to render fonts before triggering print
    win.onload = () => { setTimeout(() => win.print(), 400); };
    // Fallback if onload doesn't fire (e.g. same-origin blob)
    setTimeout(() => { try { win.print(); } catch { /* already printed */ } }, 800);
  }

  private static exportAsHTML(report: RCAReport): string {
    return this.exportAsPrintHTML(report);
  }

  /** Generates a fully self-contained, print-ready HTML document. */
  private static exportAsPrintHTML(report: RCAReport): string {
    const md = report;
    const sevColor =
      md.metadata.severity === 'critical' ? '#DC2626' :
      md.metadata.severity === 'high' ? '#EA580C' :
      md.metadata.severity === 'medium' ? '#CA8A04' : '#16A34A';

    const factRow = (label: string, value: string) =>
      `<tr><td class="fact-label">${label}</td><td class="fact-value">${value}</td></tr>`;

    const step = (n: number, title: string, desc: string) =>
      `<div class="step"><div class="step-num">${n}</div><div class="step-body"><div class="step-title">${title}</div><div class="step-desc">${this.h(desc)}</div></div></div>`;

    const rec = (r: Recommendation, i: number) =>
      `<div class="rec-row"><span class="rec-pri ${r.priority}">${r.priority.toUpperCase()}</span><div><div class="rec-cat">${this.h(r.category)}</div><div class="rec-text">${this.h(r.recommendation)}</div><div class="rec-rat">${this.h(r.rationale)}</div></div></div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RCA — ${report.metadata.reportId}</title>
<style>
  @media print {
    @page { margin: 18mm 16mm; size: A4; }
    .no-print { display: none !important; }
    body { font-size: 11pt; }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; max-width: 860px; margin: 0 auto; padding: 32px 24px; line-height: 1.55; }
  /* ── Header ── */
  .rca-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${sevColor}; padding-bottom: 12px; margin-bottom: 22px; }
  .rca-title { font-size: 22pt; font-weight: 700; color: #0f172a; }
  .rca-sev { display: inline-block; background: ${sevColor}; color: #fff; font-size: 10pt; font-weight: 700; padding: 3px 12px; border-radius: 4px; letter-spacing: .04em; margin-top: 6px; }
  .rca-meta { text-align: right; font-size: 9pt; color: #64748b; line-height: 1.8; }
  .rca-id { font-family: monospace; font-weight: 700; font-size: 10pt; color: #374151; }
  /* ── Sections ── */
  h2 { font-size: 13pt; font-weight: 700; color: ${sevColor}; margin: 24px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 11pt; font-weight: 600; color: #1e293b; margin: 14px 0 6px; }
  p { margin-bottom: 8px; }
  /* ── Fact table ── */
  .fact-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .fact-table tr { border-bottom: 1px solid #f1f5f9; }
  .fact-label { width: 28%; font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: .05em; padding: 6px 8px 6px 0; vertical-align: top; }
  .fact-value { font-size: 10.5pt; color: #0f172a; padding: 6px 0; }
  /* ── Timeline ── */
  .tl-row { display: flex; gap: 12px; padding: 5px 0; font-size: 10pt; }
  .tl-time { min-width: 130px; color: #64748b; font-family: monospace; font-size: 9pt; }
  .tl-icon { flex-shrink: 0; }
  .tl-text { color: #1e293b; }
  /* ── Steps ── */
  .step { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
  .step-num { width: 24px; height: 24px; background: ${sevColor}; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .step-title { font-weight: 600; font-size: 10.5pt; color: #1e293b; }
  .step-desc { font-size: 10pt; color: #475569; margin-top: 2px; }
  /* ── Recommendations ── */
  .rec-row { display: flex; gap: 10px; margin-bottom: 8px; align-items: flex-start; }
  .rec-pri { flex-shrink: 0; font-size: 8pt; font-weight: 700; padding: 2px 7px; border-radius: 3px; margin-top: 2px; letter-spacing: .04em; }
  .rec-pri.high { background: #fee2e2; color: #b91c1c; }
  .rec-pri.medium { background: #fef3c7; color: #92400e; }
  .rec-pri.low { background: #dcfce7; color: #166534; }
  .rec-cat { font-weight: 600; font-size: 10pt; color: #1e293b; }
  .rec-text { font-size: 10pt; color: #374151; }
  .rec-rat { font-size: 9pt; color: #64748b; margin-top: 2px; }
  /* ── Confidence bar ── */
  .conf-bar-bg { background: #e2e8f0; border-radius: 3px; height: 6px; width: 100%; margin-top: 4px; }
  .conf-bar-fill { background: ${sevColor}; border-radius: 3px; height: 6px; }
  /* ── Footer ── */
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 8.5pt; color: #94a3b8; text-align: center; }
  /* ── Print button ── */
  .print-btn { no-print; position: fixed; top: 16px; right: 16px; background: ${sevColor}; color: #fff; border: none; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-size: 11pt; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF</button>

<div class="rca-header">
  <div>
    <div class="rca-title">Root Cause Analysis</div>
    <div class="rca-sev">${md.metadata.severity.toUpperCase()}</div>
  </div>
  <div class="rca-meta">
    <div class="rca-id">${md.metadata.reportId}</div>
    <div>Generated: ${md.metadata.generatedAt.toLocaleString()}</div>
    <div>By: ${md.metadata.generatedBy}</div>
    <div>Duration: ${md.metadata.duration}</div>
    <div>Status: ${md.metadata.status}</div>
  </div>
</div>

<h2>Executive Summary</h2>
<p>${this.h(md.executiveSummary)}</p>

<h2>Incident Details</h2>
<table class="fact-table">
  ${factRow('Incident ID', md.metadata.incidentId)}
  ${factRow('Severity', `<strong style="color:${sevColor}">${md.metadata.severity.toUpperCase()}</strong>`)}
  ${factRow('Duration', md.metadata.duration)}
  ${factRow('Status', md.metadata.status)}
  ${factRow('Affected Resource', md.impactAssessment.affectedResources.join(', '))}
  ${factRow('Estimated Downtime', md.impactAssessment.estimatedDowntime)}
</table>

<h2>Incident Timeline</h2>
${md.incidentTimeline.map(e => `<div class="tl-row"><div class="tl-time">${new Date(e.timestamp).toLocaleString()}</div><div class="tl-icon">${this.getTimelineIcon(e.type)}</div><div class="tl-text">${this.h(e.event)}</div></div>`).join('')}

<h2>Root Cause Analysis</h2>
<h3>Primary Cause</h3>
<p>${this.h(md.rootCauseAnalysis.primaryCause)}</p>
${md.rootCauseAnalysis.contributingFactors.length > 0 ? `
<h3>Contributing Factors</h3>
<ul style="margin:0 0 10px 20px">${md.rootCauseAnalysis.contributingFactors.map(f => `<li style="margin-bottom:4px">${this.h(f)}</li>`).join('')}</ul>
` : ''}
<h3>Technical Details</h3>
<p>${this.h(md.rootCauseAnalysis.technicalDetails)}</p>
<div style="margin-top:6px"><span style="font-size:9pt;color:#64748b">Confidence: ${md.rootCauseAnalysis.confidenceLevel}%</span>
<div class="conf-bar-bg"><div class="conf-bar-fill" style="width:${md.rootCauseAnalysis.confidenceLevel}%"></div></div></div>

<h2>Impact Assessment</h2>
<table class="fact-table">
  ${factRow('Affected Resources', md.impactAssessment.affectedResources.join('<br>'))}
  ${factRow('User Impact', md.impactAssessment.userImpact)}
  ${factRow('Business Impact', md.impactAssessment.businessImpact)}
  ${factRow('Estimated Downtime', md.impactAssessment.estimatedDowntime)}
</table>

<h2>Resolution Steps</h2>
${md.resolutionSteps.map((s, i) => step(i + 1, s.action, s.result)).join('')}

<h2>Recommendations</h2>
${md.recommendations.map((r, i) => rec(r, i)).join('')}

${md.supportingEvidence.logs.length > 0 ? `
<h2>Supporting Evidence</h2>
<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:9pt;overflow-x:auto;white-space:pre-wrap">${md.supportingEvidence.logs.slice(0, 15).map(l => this.h(l)).join('\n')}</pre>
` : ''}

<div class="footer">
  Generated by KubeGraf Incident Intelligence · ${md.metadata.generatedAt.toLocaleDateString()}
</div>

</body>
</html>`;
  }

  /** HTML-escape a string */
  private static h(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
