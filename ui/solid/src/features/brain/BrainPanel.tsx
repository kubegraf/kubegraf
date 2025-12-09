import { Component, Show, createResource, createMemo } from 'solid-js';
import { brainPanelOpen, brainPanelPinned, toggleBrainPanel, toggleBrainPanelPin } from '../../stores/brain';
import { fetchBrainDataInParallel } from '../../services/brainService';
import { settings } from '../../stores/settings';
import { getTheme, currentTheme } from '../../stores/theme';
import ClusterTimeline from './ClusterTimeline';
import OOMInsights from './OOMInsights';
import Suggestions from './Suggestions';
import MLTimeline from './MLTimeline';
import MLPredictions from './MLPredictions';
import MLSummary from './MLSummary';
import { BrainData } from '../../services/brainService';

const BrainPanel: Component = () => {
  // Make theme reactive
  const theme = createMemo(() => getTheme());
  // Fetch all Brain data in parallel using a single resource
  const [brainData] = createResource<BrainData>(
    () => brainPanelOpen(),
    async () => {
      if (!brainPanelOpen()) {
        // Return empty data structure when panel is closed
        return {
          timelineEvents: [],
          oomMetrics: { incidents24h: 0, crashLoops24h: 0, topProblematic: [] },
          summary: {
            last24hSummary: '',
            topRiskAreas: [],
            recommendedActions: [],
            generatedAt: new Date().toISOString(),
          },
        };
      }
      // Fetch all data in parallel for faster loading
      return await fetchBrainDataInParallel();
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
        {/* Backdrop - semi-transparent overlay */}
        <div
          class="fixed inset-0 transition-opacity"
          onClick={() => !brainPanelPinned() && toggleBrainPanel()}
          style={{ 
            background: 'rgba(0, 0, 0, 0.5)',
            opacity: brainPanelOpen() ? 1 : 0,
            pointerEvents: brainPanelOpen() ? 'auto' : 'none'
          }}
        />

        {/* Panel */}
        <div
          class="relative flex flex-col w-full max-w-2xl shadow-xl transition-transform duration-300 ease-in-out"
          style={{
            transform: brainPanelOpen() ? 'translateX(0)' : 'translateX(100%)',
            borderLeft: '1px solid var(--border-color)',
            background: theme().colors.bgCard,
            color: theme().colors.textPrimary,
          }}
        >
          {/* Header */}
          <div class="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div class="flex items-center gap-3">
              <div class="text-2xl">🧠</div>
              <div>
                <h2 class="text-xl font-bold" style={{ 
                  background: 'var(--accent-gradient)',
                  '-webkit-background-clip': 'text',
                  '-webkit-text-fill-color': 'transparent',
                  'background-clip': 'text'
                }}>
                  Brain
                </h2>
                <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Intelligent SRE insights for your cluster
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={toggleBrainPanelPin}
                class="p-2 rounded-lg transition-colors"
                title={brainPanelPinned() ? 'Unpin panel' : 'Pin panel'}
                style={{ 
                  color: brainPanelPinned() ? 'var(--accent-primary)' : 'var(--text-muted)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                class="p-2 rounded-lg transition-colors"
                style={{ 
                  color: 'var(--text-muted)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
            'scrollbar-color': 'var(--border-color) var(--bg-primary)'
          }}>
            <Show
              when={!brainData.loading && brainData()}
              fallback={
                <div class="flex items-center justify-center h-64">
                <div class="text-center">
                  <div class="inline-block w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" style={{ 
                    borderColor: 'var(--accent-primary)',
                    borderTopColor: 'transparent'
                  }} />
                  <p style={{ color: 'var(--text-muted)' }}>Loading Brain insights...</p>
                </div>
                </div>
              }
            >
              {(() => {
                const data = brainData()!;
                return (
                  <>
                    <ClusterTimeline events={data.timelineEvents || []} />
                    <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                      <OOMInsights metrics={data.oomMetrics || { incidents24h: 0, crashLoops24h: 0, topProblematic: [] }} />
                    </div>
                    <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                      <Suggestions summary={data.summary || {
                        last24hSummary: '',
                        topRiskAreas: [],
                        recommendedActions: [],
                        generatedAt: new Date().toISOString(),
                      }} />
                    </div>
                    
                    {/* ML Insights Sections - Only show if enabled in settings */}
                    <Show when={settings().showMLTimelineInBrain && data.mlTimeline && data.mlPredictions && data.mlSummary}>
                      <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                        <MLTimeline events={data.mlTimeline?.events || []} />
                      </div>
                      <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                        <MLPredictions predictions={data.mlPredictions?.predictions || []} />
                      </div>
                      <div class="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                        <MLSummary summary={data.mlSummary || {
                          summary: '',
                          keyInsights: [],
                          recommendations: [],
                          generatedAt: new Date().toISOString(),
                          timeRange: 'last 24 hours',
                        }} />
                      </div>
                    </Show>
                  </>
                );
              })()}
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default BrainPanel;

