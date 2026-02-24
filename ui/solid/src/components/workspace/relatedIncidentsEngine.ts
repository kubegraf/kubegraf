/**
 * Related Incidents Engine - Advanced similarity matching
 *
 * Features:
 * - Pattern similarity scoring
 * - Namespace correlation
 * - Time-window proximity
 * - Resource type matching
 * - Severity pattern matching
 */

import { Incident } from '../../services/api';

export interface RelatedIncident {
  incident: Incident;
  similarityScore: number; // 0-100
  matchReasons: string[];
  correlationConfidence: number; // 0-100
}

export class RelatedIncidentsEngine {
  /**
   * Find related incidents with similarity scoring
   */
  static findRelatedIncidents(
    currentIncident: Incident,
    allIncidents: Incident[],
    limit: number = 5
  ): RelatedIncident[] {
    const relatedIncidents: RelatedIncident[] = [];

    for (const incident of allIncidents) {
      // Skip the current incident
      if (incident.id === currentIncident.id) continue;

      // Calculate similarity
      const similarity = this.calculateSimilarity(currentIncident, incident);

      if (similarity.score > 30) {
        // Only include if similarity is above threshold
        relatedIncidents.push({
          incident,
          similarityScore: similarity.score,
          matchReasons: similarity.reasons,
          correlationConfidence: this.calculateCorrelationConfidence(similarity.score),
        });
      }
    }

    // Sort by similarity score (descending) and limit
    return relatedIncidents
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two incidents
   */
  private static calculateSimilarity(
    incident1: Incident,
    incident2: Incident
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Pattern matching (highest weight: 40 points)
    if (incident1.pattern === incident2.pattern && incident1.pattern) {
      score += 40;
      reasons.push('Same failure pattern');
    } else if (this.patternsAreSimilar(incident1.pattern, incident2.pattern)) {
      score += 20;
      reasons.push('Similar failure pattern');
    }

    // Namespace matching (20 points)
    if (
      incident1.resource?.namespace &&
      incident2.resource?.namespace &&
      incident1.resource.namespace === incident2.resource.namespace
    ) {
      score += 20;
      reasons.push('Same namespace');
    }

    // Resource kind matching (15 points)
    if (
      incident1.resource?.kind &&
      incident2.resource?.kind &&
      incident1.resource.kind === incident2.resource.kind
    ) {
      score += 15;
      reasons.push('Same resource type');
    }

    // Severity matching (10 points)
    if (incident1.severity === incident2.severity) {
      score += 10;
      reasons.push('Same severity level');
    }

    // Time proximity (15 points max)
    const timeScore = this.calculateTimeProximityScore(incident1, incident2);
    if (timeScore > 0) {
      score += timeScore;
      reasons.push('Occurred around the same time');
    }

    // Resource name similarity (bonus 10 points)
    if (this.resourceNamesAreSimilar(incident1.resource?.name, incident2.resource?.name)) {
      score += 10;
      reasons.push('Similar resource names');
    }

    return { score: Math.min(100, score), reasons };
  }

  /**
   * Check if patterns are similar
   */
  private static patternsAreSimilar(pattern1?: string, pattern2?: string): boolean {
    if (!pattern1 || !pattern2) return false;

    // Extract base pattern (e.g., "CRASH_LOOP" from "CRASH_LOOP_BACKOFF")
    const base1 = pattern1.split('_')[0];
    const base2 = pattern2.split('_')[0];

    return base1 === base2;
  }

  /**
   * Calculate time proximity score
   */
  private static calculateTimeProximityScore(incident1: Incident, incident2: Incident): number {
    if (!incident1.firstSeen || !incident2.firstSeen) return 0;

    const time1 = new Date(incident1.firstSeen).getTime();
    const time2 = new Date(incident2.firstSeen).getTime();
    const diffMs = Math.abs(time1 - time2);
    const diffHours = diffMs / (1000 * 60 * 60);

    // Score based on time proximity
    if (diffHours < 1) return 15; // Within 1 hour
    if (diffHours < 6) return 10; // Within 6 hours
    if (diffHours < 24) return 5; // Within 24 hours
    return 0;
  }

  /**
   * Check if resource names are similar
   */
  private static resourceNamesAreSimilar(name1?: string, name2?: string): boolean {
    if (!name1 || !name2) return false;

    // Remove common suffixes and compare
    const clean1 = name1.replace(/(-[a-z0-9]{8,}|-\d+)$/i, '');
    const clean2 = name2.replace(/(-[a-z0-9]{8,}|-\d+)$/i, '');

    return clean1 === clean2;
  }

  /**
   * Calculate correlation confidence based on similarity score
   */
  private static calculateCorrelationConfidence(score: number): number {
    // Map similarity score to confidence percentage
    if (score >= 80) return 95;
    if (score >= 70) return 85;
    if (score >= 60) return 75;
    if (score >= 50) return 65;
    if (score >= 40) return 55;
    return 45;
  }

  /**
   * Get summary statistics about related incidents
   */
  static getRelatedIncidentStats(relatedIncidents: RelatedIncident[]): {
    totalRelated: number;
    averageSimilarity: number;
    mostCommonPattern: string | null;
    resolvedCount: number;
  } {
    if (relatedIncidents.length === 0) {
      return {
        totalRelated: 0,
        averageSimilarity: 0,
        mostCommonPattern: null,
        resolvedCount: 0,
      };
    }

    const avgSimilarity =
      relatedIncidents.reduce((sum, ri) => sum + ri.similarityScore, 0) /
      relatedIncidents.length;

    // Find most common pattern
    const patternCounts: Record<string, number> = {};
    relatedIncidents.forEach((ri) => {
      const pattern = ri.incident.pattern || 'unknown';
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });

    const mostCommonPattern =
      Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const resolvedCount = relatedIncidents.filter(
      (ri) => ri.incident.status === 'resolved'
    ).length;

    return {
      totalRelated: relatedIncidents.length,
      averageSimilarity: Math.round(avgSimilarity),
      mostCommonPattern,
      resolvedCount,
    };
  }
}
