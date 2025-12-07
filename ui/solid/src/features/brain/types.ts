// Types for Brain panel data structures

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'incident' | 'event_spike' | 'scaling' | 'deployment';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  resource?: {
    kind: string;
    name: string;
    namespace: string;
  };
  link?: string;
}

export interface ProblematicWorkload {
  name: string;
  namespace: string;
  kind: string;
  issues: {
    oomKilled: number;
    restarts: number;
    crashLoops: number;
  };
  score: number; // Higher = more problematic
}

export interface OOMMetrics {
  incidents24h: number;
  crashLoops24h: number;
  topProblematic: ProblematicWorkload[];
}

export interface BrainSummary {
  last24hSummary: string;
  topRiskAreas: string[];
  recommendedActions: string[];
  generatedAt: string;
}



