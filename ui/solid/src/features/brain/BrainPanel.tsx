import { Component, Show, createResource, createMemo, onMount, onCleanup } from 'solid-js';
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

// Cache for Brain data with TTL (60 seconds)
let brainDataCache: { data: BrainData | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 60000; // 60 seconds

const BrainPanel: Component = () => {
  // Make theme reactive
  const theme = createMemo(() => getTheme());
  
  // Auto-refresh interval (5 minutes)
  let refreshInterval: number | undefined;
  
  // Fetch all Brain data in parallel using a single resource with timeout and caching
  const [brainData, { refetch: refetchBrainData }] = createResource<BrainData>(
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
      
      // Check cache first
      const now = Date.now();
      if (brainDataCache.data && (now - brainDataCache.timestamp) < CACHE_TTL) {
        console.log('[Brain] Using cached data');
        return brainDataCache.data;
      }
      
      // Fetch all data in parallel with timeout (90 seconds max to match backend timeout)
      try {
        console.log('[Brain] Fetching fresh data...');
        const timeoutPromise = new Promise<BrainData>((_, reject) => {
          setTimeout(() => reject(new Error('Brain data fetch timeout')), 90000);
        });
        const data = await Promise.race([
          fetchBrainDataInParallel(),
          timeoutPromise
        ]);
        
        // Update cache
        brainDataCache = {
          data,
          timestamp: now,
        };
        
        return data;
      } catch (error) {
        console.error('[Brain] Brain data fetch error:', error);
        // If we have cached data, use it even if expired
        if (brainDataCache.data) {
          console.log('[Brain] Using expired cache due to fetch error');
          return brainDataCache.data;
        }
        
        // Even on error, try to fetch with individual fallbacks
        try {
          const data = await fetchBrainDataInParallel();
          brainDataCache = {
            data,
            timestamp: now,
          };
          return data;
        } catch (fallbackError) {
          console.error('[Brain] Brain data fallback fetch also failed:', fallbackError);
          // Return structure with helpful message
          return {
            timelineEvents: [],
            oomMetrics: { incidents24h: 0, crashLoops24h: 0, topProblematic: [] },
            summary: {
              last24hSummary: 'Unable to load brain insights. The cluster may be unavailable or the request timed out. Please check your cluster connection and try again.',
              topRiskAreas: ['Cluster connection may be unavailable', 'Request may have timed out'],
              recommendedActions: ['Verify cluster connection', 'Check if cluster is accessible', 'Try refreshing the panel'],
              generatedAt: new Date().toISOString(),
            },
          };
        }
      }
    }
  );

  // Set up auto-refresh when panel is open
  onMount(() => {
    if (brainPanelOpen()) {
      // Refresh every 5 minutes (300000ms)
      refreshInterval = setInterval(() => {
        if (brainPanelOpen()) {
          console.log('[Brain] Auto-refreshing data...');
          // Clear cache to force fresh fetch
          brainDataCache.timestamp = 0;
          refetchBrainData();
        }
      }, 300000) as unknown as number;
    }
  });

  onCleanup(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

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
                onClick={() => {
                  // Clear cache and force refresh
                  brainDataCache.timestamp = 0;
                  refetchBrainData();
                }}
                class="p-2 rounded-lg transition-colors"
                title="Refresh Brain insights"
                style={{ 
                  color: 'var(--text-muted)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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

