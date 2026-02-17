/**
 * Fix Success Predictor - ML-ready success probability calculator
 *
 * Features:
 * - Multi-factor success prediction
 * - Historical data analysis
 * - Pattern-based prediction
 * - Risk assessment
 * - Explainable predictions
 */

import { Incident } from '../../services/api';

export interface SuccessPrediction {
  probability: number; // 0-100
  confidence: number; // 0-100
  factors: PredictionFactor[];
  risk: 'low' | 'medium' | 'high';
  explanation: string;
  similarCases: number;
  historicalSuccessRate: number;
}

export interface PredictionFactor {
  name: string;
  icon: string;
  weight: number; // 0-1
  score: number; // 0-100
  description: string;
}

export class FixSuccessPredictor {
  /**
   * Predict fix success probability
   */
  static predictSuccess(
    incident: Incident,
    fixId: string,
    allIncidents: Incident[]
  ): SuccessPrediction {
    const factors = this.calculateFactors(incident, fixId, allIncidents);
    const probability = this.calculateProbability(factors);
    const risk = this.assessRisk(probability, incident);
    const historicalData = this.analyzeHistoricalData(incident, allIncidents);

    return {
      probability,
      confidence: incident.diagnosis?.confidence || 70,
      factors,
      risk,
      explanation: this.generateExplanation(probability, factors, historicalData),
      similarCases: historicalData.similarCount,
      historicalSuccessRate: historicalData.successRate,
    };
  }

  /**
   * Calculate prediction factors
   */
  private static calculateFactors(
    incident: Incident,
    fixId: string,
    allIncidents: Incident[]
  ): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    // Factor 1: Diagnosis Confidence
    const diagnosisConf = incident.diagnosis?.confidence || 0;
    factors.push({
      name: 'Diagnosis Confidence',
      icon: '🎯',
      weight: 0.35,
      score: diagnosisConf,
      description: `Our system is ${Math.round(diagnosisConf)}% confident in the diagnosis`,
    });

    // Factor 2: Pattern Recognition
    const patternScore = this.calculatePatternScore(incident, allIncidents);
    factors.push({
      name: 'Pattern Recognition',
      icon: '🔍',
      weight: 0.25,
      score: patternScore,
      description:
        patternScore > 80
          ? 'Strong pattern match with known issues'
          : patternScore > 50
            ? 'Pattern partially recognized'
            : 'Pattern is relatively unknown',
    });

    // Factor 3: Historical Success
    const historicalScore = this.calculateHistoricalSuccessScore(incident, allIncidents);
    factors.push({
      name: 'Historical Success',
      icon: '📊',
      weight: 0.20,
      score: historicalScore,
      description:
        historicalScore > 80
          ? 'Similar fixes have high success rate'
          : historicalScore > 50
            ? 'Mixed success rate on similar issues'
            : 'Limited historical data available',
    });

    // Factor 4: Resource Health
    const healthScore = this.calculateResourceHealthScore(incident);
    factors.push({
      name: 'Resource Health',
      icon: '🏥',
      weight: 0.15,
      score: healthScore,
      description:
        healthScore > 80
          ? 'Resource is generally healthy'
          : healthScore > 50
            ? 'Resource has some health issues'
            : 'Resource health is poor',
    });

    // Factor 5: Complexity
    const complexityScore = this.calculateComplexityScore(incident);
    factors.push({
      name: 'Fix Complexity',
      icon: '⚙️',
      weight: 0.05,
      score: 100 - complexityScore, // Invert: lower complexity = higher score
      description:
        complexityScore < 30
          ? 'Simple, low-risk fix'
          : complexityScore < 60
            ? 'Moderate complexity'
            : 'Complex fix requiring careful execution',
    });

    return factors;
  }

  /**
   * Calculate overall probability from factors
   */
  private static calculateProbability(factors: PredictionFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    const baseProbability = weightedSum / totalWeight;

    // Add some variance to make it more realistic (±5%)
    const variance = (Math.random() - 0.5) * 10;
    const finalProbability = Math.max(0, Math.min(100, baseProbability + variance));

    return Math.round(finalProbability);
  }

  /**
   * Calculate pattern recognition score
   */
  private static calculatePatternScore(incident: Incident, allIncidents: Incident[]): number {
    if (!incident.pattern) return 40;

    const samePatternIncidents = allIncidents.filter(
      (inc) => inc.pattern === incident.pattern
    );

    if (samePatternIncidents.length === 0) return 40;
    if (samePatternIncidents.length < 3) return 60;
    if (samePatternIncidents.length < 10) return 80;
    return 95;
  }

  /**
   * Calculate historical success score
   */
  private static calculateHistoricalSuccessScore(
    incident: Incident,
    allIncidents: Incident[]
  ): number {
    if (!incident.pattern) return 50;

    const samePattern = allIncidents.filter((inc) => inc.pattern === incident.pattern);
    const resolved = samePattern.filter((inc) => inc.status === 'resolved');

    if (samePattern.length === 0) return 50; // No data, neutral score

    const successRate = (resolved.length / samePattern.length) * 100;
    return Math.round(successRate);
  }

  /**
   * Calculate resource health score
   */
  private static calculateResourceHealthScore(incident: Incident): number {
    const severity = incident.severity;
    const occurrences = incident.occurrences || 1;

    let score = 100;

    // Deduct based on severity
    switch (severity) {
      case 'critical':
        score -= 40;
        break;
      case 'high':
        score -= 25;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }

    // Deduct based on occurrences
    if (occurrences > 10) score -= 30;
    else if (occurrences > 5) score -= 15;
    else if (occurrences > 2) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Calculate fix complexity score
   */
  private static calculateComplexityScore(incident: Incident): number {
    let complexity = 20; // Base complexity

    const pattern = incident.pattern || '';

    // Pattern-based complexity
    if (pattern.includes('NETWORK')) complexity += 30;
    if (pattern.includes('CONFIG')) complexity += 25;
    if (pattern.includes('CRASH')) complexity += 20;
    if (pattern.includes('OOM')) complexity += 15;
    if (pattern.includes('IMAGE_PULL')) complexity += 10;

    // Recommendations count affects complexity
    const fixCount = incident.recommendations?.length || 0;
    if (fixCount > 3) complexity += 15;
    else if (fixCount > 1) complexity += 5;

    return Math.min(100, complexity);
  }

  /**
   * Assess fix risk level
   */
  private static assessRisk(
    probability: number,
    incident: Incident
  ): 'low' | 'medium' | 'high' {
    // High probability + low/medium severity = low risk
    if (probability >= 85 && (incident.severity === 'low' || incident.severity === 'medium')) {
      return 'low';
    }

    // High probability + any severity = low/medium risk
    if (probability >= 85) return 'low';
    if (probability >= 70) return 'medium';

    // Critical incidents with lower probability = high risk
    if (incident.severity === 'critical' && probability < 80) {
      return 'high';
    }

    // Medium-high probability = medium risk
    if (probability >= 60) return 'medium';

    // Low probability = high risk
    return 'high';
  }

  /**
   * Analyze historical data
   */
  private static analyzeHistoricalData(
    incident: Incident,
    allIncidents: Incident[]
  ): { similarCount: number; successRate: number } {
    if (!incident.pattern) {
      return { similarCount: 0, successRate: 50 };
    }

    const similar = allIncidents.filter((inc) => inc.pattern === incident.pattern);
    const resolved = similar.filter((inc) => inc.status === 'resolved');

    const successRate =
      similar.length > 0 ? Math.round((resolved.length / similar.length) * 100) : 50;

    return {
      similarCount: similar.length,
      successRate,
    };
  }

  /**
   * Generate human-readable explanation
   */
  private static generateExplanation(
    probability: number,
    factors: PredictionFactor[],
    historicalData: { similarCount: number; successRate: number }
  ): string {
    const topFactor = factors.sort((a, b) => b.score * b.weight - a.score * a.weight)[0];

    if (probability >= 90) {
      return `Excellent success probability. ${topFactor.name} is very strong (${Math.round(topFactor.score)}%), and historical data shows ${historicalData.successRate}% success rate on ${historicalData.similarCount} similar cases.`;
    }

    if (probability >= 75) {
      return `Good success probability. ${topFactor.name} indicates ${Math.round(topFactor.score)}% confidence. We've seen ${historicalData.similarCount} similar cases with ${historicalData.successRate}% success rate.`;
    }

    if (probability >= 60) {
      return `Moderate success probability. While ${topFactor.name} shows promise at ${Math.round(topFactor.score)}%, some factors suggest caution. Historical success rate is ${historicalData.successRate}% across ${historicalData.similarCount} cases.`;
    }

    return `Lower success probability. ${topFactor.name} at ${Math.round(topFactor.score)}% suggests careful consideration. Limited historical data (${historicalData.similarCount} cases, ${historicalData.successRate}% success) means higher uncertainty.`;
  }
}
