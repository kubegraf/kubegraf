/**
 * IncidentStory - Human-readable narrative generation for incidents
 *
 * Features:
 * - Auto-generated story from technical data
 * - Timeline-based narrative structure
 * - Cause and effect explanation
 * - Impact assessment
 * - Resolution pathway
 * - Natural language processing
 */

import { Component, Show, createMemo } from 'solid-js';
import { Incident } from '../../services/api';

interface IncidentStoryProps {
  incident: Incident;
  expanded?: boolean;
  onExpand?: () => void;
}

interface StorySection {
  title: string;
  icon: string;
  content: string;
  severity?: 'info' | 'warning' | 'critical';
}

const IncidentStory: Component<IncidentStoryProps> = (props) => {
  // Generate story sections from incident data
  const storySections = createMemo((): StorySection[] => {
    const sections: StorySection[] = [];
    const incident = props.incident;

    // What Happened
    const whatHappened = generateWhatHappened(incident);
    if (whatHappened) {
      sections.push({
        title: 'What Happened',
        icon: '📖',
        content: whatHappened,
        severity: 'info',
      });
    }

    // When It Started
    const whenStarted = generateWhenStarted(incident);
    if (whenStarted) {
      sections.push({
        title: 'When It Started',
        icon: '⏰',
        content: whenStarted,
        severity: 'info',
      });
    }

    // Why It Happened (Root Cause)
    const whyHappened = generateWhyHappened(incident);
    if (whyHappened) {
      sections.push({
        title: 'Why It Happened',
        icon: '🎯',
        content: whyHappened,
        severity: 'warning',
      });
    }

    // Impact Assessment
    const impact = generateImpact(incident);
    if (impact) {
      sections.push({
        title: 'Impact',
        icon: '⚠️',
        content: impact,
        severity: incident.severity === 'critical' ? 'critical' : 'warning',
      });
    }

    // What's Being Done
    const resolution = generateResolution(incident);
    if (resolution) {
      sections.push({
        title: 'Resolution Path',
        icon: '🔧',
        content: resolution,
        severity: 'info',
      });
    }

    return sections;
  });

  // Generate story title
  const storyTitle = createMemo(() => {
    const pattern = props.incident.pattern || 'Unknown Issue';
    const resource = props.incident.resource?.name || 'resource';
    const severity = props.incident.severity || 'unknown';

    return `${getSeverityAdjective(severity)} ${pattern.replace(/_/g, ' ').toLowerCase()} affecting ${resource}`;
  });

  const getSeverityAdjective = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'Urgent';
      case 'medium':
        return 'Notable';
      case 'low':
        return 'Minor';
      default:
        return 'Incident';
    }
  };

  return (
    <div class="incident-story">
      <div class="story-header">
        <div class="story-icon">📚</div>
        <div class="story-title-section">
          <h3 class="story-main-title">Incident Story</h3>
          <p class="story-subtitle">{storyTitle()}</p>
        </div>
      </div>

      <div class="story-content">
        <Show
          when={storySections().length > 0}
          fallback={
            <p class="story-placeholder">
              Generating incident narrative from available data...
            </p>
          }
        >
          {storySections().map((section) => (
            <div class="story-section" data-severity={section.severity}>
              <div class="story-section-header">
                <span class="story-section-icon">{section.icon}</span>
                <h4 class="story-section-title">{section.title}</h4>
              </div>
              <p class="story-section-content">{section.content}</p>
            </div>
          ))}
        </Show>
      </div>

      <Show when={props.incident.recommendations && props.incident.recommendations.length > 0}>
        <div class="story-footer">
          <div class="story-footer-icon">💡</div>
          <p class="story-footer-text">
            {props.incident.recommendations.length} solution
            {props.incident.recommendations.length !== 1 ? 's' : ''} available to resolve this
            incident.
          </p>
        </div>
      </Show>
    </div>
  );
};

// Story generation functions

function generateWhatHappened(incident: Incident): string {
  const pattern = incident.pattern || 'Unknown Issue';
  const resourceKind = incident.resource?.kind || 'resource';
  const resourceName = incident.resource?.name || 'unknown';
  const namespace = incident.resource?.namespace || 'default';

  if (pattern.includes('CRASH')) {
    return `The ${resourceKind} "${resourceName}" in namespace "${namespace}" has been experiencing repeated crashes. The container is stuck in a CrashLoopBackOff state, indicating it starts up but fails shortly after.`;
  }

  if (pattern.includes('OOM')) {
    return `The ${resourceKind} "${resourceName}" in namespace "${namespace}" has been terminated due to running out of memory. The container exceeded its memory limits and was killed by the system.`;
  }

  if (pattern.includes('IMAGE_PULL')) {
    return `The ${resourceKind} "${resourceName}" in namespace "${namespace}" cannot start because the container image cannot be pulled. This is preventing the pod from running.`;
  }

  if (pattern.includes('NETWORK')) {
    return `The ${resourceKind} "${resourceName}" in namespace "${namespace}" is experiencing network connectivity issues. Services may be unreachable or experiencing timeouts.`;
  }

  if (pattern.includes('CONFIG')) {
    return `The ${resourceKind} "${resourceName}" in namespace "${namespace}" has a configuration problem. Invalid or missing configuration is preventing normal operation.`;
  }

  return `The ${resourceKind} "${resourceName}" in namespace "${namespace}" is experiencing issues that require attention.`;
}

function generateWhenStarted(incident: Incident): string {
  if (!incident.firstSeen) {
    return 'The exact start time is unknown, but the incident has been detected recently.';
  }

  const firstSeen = new Date(incident.firstSeen);
  const now = new Date();
  const diffMs = now.getTime() - firstSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeAgo = '';
  if (diffDays > 0) {
    timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffMins > 0) {
    timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else {
    timeAgo = 'just now';
  }

  const occurrences = incident.occurrences || 1;
  const occurrenceText =
    occurrences > 1
      ? ` It has occurred ${occurrences} times since then.`
      : ' This is the first occurrence.';

  return `This incident was first detected ${timeAgo} (${firstSeen.toLocaleString()}).${occurrenceText}`;
}

function generateWhyHappened(incident: Incident): string {
  // Use diagnosis root cause if available
  if (incident.diagnosis?.rootCause) {
    return incident.diagnosis.rootCause;
  }

  // Generate based on pattern
  const pattern = incident.pattern || '';

  if (pattern.includes('CRASH')) {
    return 'The container is likely crashing due to application errors, misconfiguration, or insufficient resources. The application may be failing health checks or encountering fatal errors during startup or runtime.';
  }

  if (pattern.includes('OOM')) {
    return 'The container is being killed because it consumed more memory than allocated. This could be due to memory leaks, insufficient memory limits, or unexpected load causing higher memory usage than anticipated.';
  }

  if (pattern.includes('IMAGE_PULL')) {
    return 'The image cannot be pulled due to authentication issues, incorrect image name/tag, network problems, or the image not existing in the specified registry.';
  }

  if (pattern.includes('NETWORK')) {
    return 'Network issues can be caused by DNS resolution failures, firewall rules, service misconfiguration, or connectivity problems between components.';
  }

  if (pattern.includes('CONFIG')) {
    return 'Configuration problems typically stem from invalid configuration values, missing required settings, incorrect environment variables, or incompatible configuration combinations.';
  }

  return 'The root cause is being analyzed based on available logs, events, and system metrics.';
}

function generateImpact(incident: Incident): string {
  const severity = incident.severity || 'unknown';
  const resourceKind = incident.resource?.kind || 'resource';
  const pattern = incident.pattern || '';

  let impactText = '';

  // Severity-based impact
  switch (severity) {
    case 'critical':
      impactText = 'This is a critical incident causing service disruption. ';
      break;
    case 'high':
      impactText = 'This is a high-priority incident with significant impact. ';
      break;
    case 'medium':
      impactText = 'This incident has moderate impact on operations. ';
      break;
    case 'low':
      impactText = 'This is a low-priority incident with minimal immediate impact. ';
      break;
  }

  // Pattern-specific impact
  if (pattern.includes('CRASH')) {
    impactText += `The ${resourceKind} is unavailable and cannot serve requests. Users may experience errors or timeouts when trying to access the service.`;
  } else if (pattern.includes('OOM')) {
    impactText += `The ${resourceKind} is repeatedly restarting, causing intermittent service availability and potential data loss.`;
  } else if (pattern.includes('IMAGE_PULL')) {
    impactText += `The ${resourceKind} cannot start, resulting in complete service unavailability.`;
  } else if (pattern.includes('NETWORK')) {
    impactText += `Communication between services is impaired, which may cause cascading failures across the system.`;
  } else {
    impactText += `Normal operations are disrupted and require manual intervention.`;
  }

  return impactText;
}

function generateResolution(incident: Incident): string {
  const confidence = incident.diagnosis?.confidence || 0;
  const hasRecommendations = incident.recommendations && incident.recommendations.length > 0;

  if (confidence >= 95 && hasRecommendations) {
    return `Our system has identified a high-confidence solution with ${Math.round(confidence)}% certainty. An automated fix is available and ready to apply. The fix includes automatic rollback if health checks fail, ensuring safe remediation.`;
  }

  if (confidence >= 70 && hasRecommendations) {
    return `The system has identified ${incident.recommendations!.length} potential solution${incident.recommendations!.length !== 1 ? 's' : ''} with ${Math.round(confidence)}% confidence. Review and approval are recommended before applying any fixes.`;
  }

  if (hasRecommendations) {
    return `Several remediation approaches are suggested, but require careful evaluation. Manual investigation is recommended to determine the best course of action.`;
  }

  return 'The incident is under investigation. Manual remediation steps may be required based on the findings.';
}

export default IncidentStory;
