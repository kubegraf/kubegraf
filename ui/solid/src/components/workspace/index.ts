/**
 * Workspace Components
 * Intelligent 3-panel incident investigation UI
 */

export { default as IntelligentWorkspace } from './IntelligentWorkspace';
export { default as ContextNavigator } from './ContextNavigator';
export { default as InvestigationWorkspace } from './InvestigationWorkspace';
export { default as IntelligenceAssistant } from './IntelligenceAssistant';

// Adaptive Layout Components
export { default as HighConfidenceLayout } from './HighConfidenceLayout';
export { default as InvestigationLayout } from './InvestigationLayout';

// Intelligence Components
export { default as IncidentStory } from './IncidentStory';

// Workflow Components
export { default as FixExecutionModal } from './FixExecutionModal';
export { default as WorkspaceErrorBoundary } from './ErrorBoundary';

// Intelligence Engines & Utilities
export { InsightsEngine } from './insightsEngine';
export { RelatedIncidentsEngine } from './relatedIncidentsEngine';
export { FixSuccessPredictor } from './fixSuccessPredictor';
export { RCAReportGenerator } from './rcaReportGenerator';
export {
  useAsyncError,
  createSafeAsyncHandler,
  categorizeError,
  ErrorCategory,
  CategorizedError,
} from './ErrorBoundary';
export {
  debounce,
  throttle,
  createDeepMemo,
  useVirtualList,
  memoize,
  PerformanceMonitor,
  globalPerformanceMonitor,
  CacheManager,
  deepEqual,
  shallowEqual,
  requestIdleTask,
  cancelIdleTask,
} from './performanceUtils';
export {
  FocusManager,
  globalFocusManager,
  ScreenReaderAnnouncer,
  globalAnnouncer,
  createKeyboardNavigation,
  createSkipLink,
  getContrastRatio,
  createAriaAttributes,
  setupFocusVisible,
  RovingTabIndex,
  prefersReducedMotion,
  prefersHighContrast,
  setupAccessibleModal,
} from './accessibilityUtils';

// Export types
export type { FilterState } from './ContextNavigator';
export type { Insight } from './insightsEngine';
export type { RelatedIncident } from './relatedIncidentsEngine';
export type { SuccessPrediction } from './fixSuccessPredictor';
export type { RCAReport } from './rcaReportGenerator';
