import { Component, Show, createResource } from 'solid-js';
import { brainPanelOpen, brainPanelPinned, toggleBrainPanel, toggleBrainPanelPin } from '../../stores/brain';
import { api } from '../../services/api';
import { brainMLService } from '../../services/brainML';
import ClusterTimeline from './ClusterTimeline';
import OOMInsights from './OOMInsights';
import Suggestions from './Suggestions';
import MLTimeline from './MLTimeline';
import MLPredictions from './MLPredictions';
import MLSummary from './MLSummary';
import { TimelineEvent } from './types';
import { OOMMetrics } from './types';
import { BrainSummary } from './types';

const BrainPanel: Component = () => {
  // Fetch timeline events
  const [timelineEvents] = createResource<TimelineEvent[]>(
    () => brainPanelOpen(),
    async () => {
      if (!brainPanelOpen()) return [];
      return await api.getBrainTimeline(72);
    }
  );

  // Fetch OOM insights
  const [oomMetrics] = createResource<OOMMetrics>(
    () => brainPanelOpen(),
    async () => {
      if (!brainPanelOpen()) return { incidents24h: 0, crashLoops24h: 0, topProblematic: [] };
      return await api.getBrainOOMInsights();
    }
  );

  // Fetch summary
  const [summary] = createResource<BrainSummary>(
    () => brainPanelOpen(),
    async () => {
      if (!brainPanelOpen()) {
        return {
          last24hSummary: '',
          topRiskAreas: [],
          recommendedActions: [],
          generatedAt: new Date().toISOString(),
        };
      }
      return await api.getBrainSummary();
    }
  );

  return (
    <Show when={brainPanelOpen()}>
      <div
        class="fixed right-0 z-50 flex"
        style={{ 
          top: '112px', // Header (64px) + Quick Access bar (48px)
          bottom: '0',
          pointerEvents: brainPanelOpen() ? 'auto' : 'none'
        }}
      >
        {/* Backdrop */}
        <div
          class="fixed inset-0 bg-black/50 transition-opacity"
          onClick={() => !brainPanelPinned() && toggleBrainPanel()}
          style={{ 
            opacity: brainPanelOpen() ? 1 : 0,
            pointerEvents: brainPanelOpen() ? 'auto' : 'none'
          }}
        />

        {/* Panel */}
        <div
          class="relative flex flex-col w-full max-w-2xl bg-gray-900 shadow-xl transition-transform duration-300 ease-in-out"
          style={{
            transform: brainPanelOpen() ? 'translateX(0)' : 'translateX(100%)',
            borderLeft: '1px solid #333333',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #161b22 100%)',
          }}
        >
          {/* Header */}
          <div class="flex items-center justify-between p-4 border-b" style={{ borderColor: '#333333' }}>
            <div class="flex items-center gap-3">
              <div class="text-2xl">🧠</div>
              <div>
                <h2 class="text-xl font-bold" style={{ 
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                  '-webkit-background-clip': 'text',
                  '-webkit-text-fill-color': 'transparent',
                  'background-clip': 'text'
                }}>
                  Brain
                </h2>
                <p class="text-xs" style={{ color: '#8b949e' }}>
                  Intelligent SRE insights for your cluster
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={toggleBrainPanelPin}
                class="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title={brainPanelPinned() ? 'Unpin panel' : 'Pin panel'}
                style={{ color: brainPanelPinned() ? '#0ea5e9' : '#8b949e' }}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {brainPanelPinned() ? (
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  ) : (
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="none" />
                  )}
                </svg>
              </button>
              <button
                onClick={toggleBrainPanel}
                class="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                style={{ color: '#8b949e' }}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-6 space-y-8" style={{ 
            'scrollbar-width': 'thin',
            'scrollbar-color': '#333333 #000000'
          }}>
            <Show
              when={!timelineEvents.loading && !oomMetrics.loading && !summary.loading && 
                    !mlTimeline.loading && !mlPredictions.loading && !mlSummary.loading}
              fallback={
                <div class="flex items-center justify-center h-64">
                <div class="text-center">
                  <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p style={{ color: '#8b949e' }}>Loading Brain insights...</p>
                </div>
                </div>
              }
            >
              <ClusterTimeline events={timelineEvents() || []} />
              <div class="border-t pt-8" style={{ borderColor: '#333333' }}>
                <OOMInsights metrics={oomMetrics() || { incidents24h: 0, crashLoops24h: 0, topProblematic: [] }} />
              </div>
              <div class="border-t pt-8" style={{ borderColor: '#333333' }}>
                <Suggestions summary={summary() || {
                  last24hSummary: '',
                  topRiskAreas: [],
                  recommendedActions: [],
                  generatedAt: new Date().toISOString(),
                }} />
              </div>
              
              {/* ML Insights Sections */}
              <div class="border-t pt-8" style={{ borderColor: '#333333' }}>
                <MLTimeline events={mlTimeline()?.events || []} />
              </div>
              <div class="border-t pt-8" style={{ borderColor: '#333333' }}>
                <MLPredictions predictions={mlPredictions()?.predictions || []} />
              </div>
              <div class="border-t pt-8" style={{ borderColor: '#333333' }}>
                <MLSummary summary={mlSummary() || {
                  summary: '',
                  keyInsights: [],
                  recommendations: [],
                  generatedAt: new Date().toISOString(),
                  timeRange: 'last 24 hours',
                }} />
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default BrainPanel;

