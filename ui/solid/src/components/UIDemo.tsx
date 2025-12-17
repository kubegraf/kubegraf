import { Component, createSignal } from 'solid-js';
import Skeleton, { DashboardCardSkeleton, TableRowSkeleton } from './Skeleton';
import EmptyState, { NoDataEmptyState, ErrorEmptyState, NoResultsEmptyState } from './EmptyState';
import { startExecution } from '../stores/executionPanel';

const UIDemo: Component = () => {
  const [loading, setLoading] = createSignal(true);
  const [hasError, setHasError] = createSignal(false);
  const [hasData, setHasData] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');

  // Simulate loading state
  setTimeout(() => {
    setLoading(false);
    setHasError(false);
    setHasData(true);
  }, 2000);

  return (
    <div class="p-6 space-y-8">
      <div>
        <h2 class="text-2xl font-bold mb-4 gradient-text">UI/UX Improvements Demo</h2>
        <p class="text-gray-400 mb-6">
          This demo showcases the UI/UX improvements implemented for KubeGraf.
        </p>
      </div>

      {/* Loading Skeletons Demo */}
      <section class="card p-6 card-hover-enhanced">
        <h3 class="text-xl font-semibold mb-4">Loading Skeletons</h3>
        <p class="text-gray-400 mb-6">
          Enhanced loading states with pulse and shimmer effects for better perceived performance.
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <h4 class="font-medium">Text Skeletons</h4>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" count={3} />
          </div>
          
          <div class="space-y-4">
            <h4 class="font-medium">Shape Skeletons</h4>
            <div class="flex items-center gap-4">
              <Skeleton variant="circle" width="40px" height="40px" />
              <Skeleton variant="rect" width="100px" height="40px" rounded="8px" />
            </div>
            <Skeleton variant="card" width="100%" height="120px" />
          </div>
        </div>

        <div class="mt-6">
          <h4 class="font-medium mb-4">Dashboard Card Skeletons</h4>
          <DashboardCardSkeleton count={3} />
        </div>

        <div class="mt-6">
          <h4 class="font-medium mb-4">Table Row Skeletons</h4>
          <table class="w-full">
            <thead>
              <tr>
                <th class="text-left p-3">Name</th>
                <th class="text-left p-3">Status</th>
                <th class="text-left p-3">Age</th>
                <th class="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <TableRowSkeleton columns={4} rows={3} />
            </tbody>
          </table>
        </div>
      </section>

      {/* Empty States Demo */}
      <section class="card p-6 card-hover-enhanced">
        <h3 class="text-xl font-semibold mb-4">Enhanced Empty States</h3>
        <p class="text-gray-400 mb-6">
          Informative empty states with appropriate icons, colors, and actions.
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 class="font-medium mb-3">No Data</h4>
            <NoDataEmptyState resource="Pods" />
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Error State</h4>
            <ErrorEmptyState 
              title="Failed to Load"
              description="Unable to fetch cluster data. Please check your connection."
            />
          </div>
          
          <div>
            <h4 class="font-medium mb-3">No Results</h4>
            <NoResultsEmptyState searchQuery="production" />
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-medium mb-3">Custom Empty State</h4>
            <EmptyState
              title="Welcome to KubeGraf!"
              description="Get started by connecting to your Kubernetes cluster."
              variant="info"
              size="lg"
              actions={
                <button class="btn-accent px-4 py-2 rounded-lg">
                  Connect Cluster
                </button>
              }
            />
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Success State</h4>
            <EmptyState
              title="All Systems Operational"
              description="All services are running smoothly."
              variant="success"
              actions={
                <button class="btn-secondary px-4 py-2 rounded-lg">
                  View Details
                </button>
              }
            />
          </div>
        </div>
      </section>

      {/* Interactive Components Demo */}
      <section class="card p-6 card-hover-enhanced">
        <h3 class="text-xl font-semibold mb-4">Interactive Feedback</h3>
        <p class="text-gray-400 mb-6">
          Enhanced hover states, focus states, and animations.
        </p>
        
        <div class="space-y-6">
          <div>
            <h4 class="font-medium mb-3">Enhanced Buttons</h4>
            <div class="flex flex-wrap gap-4">
              <button class="btn-accent px-6 py-3 rounded-lg btn-ripple">
                Primary Button
              </button>
              <button class="btn-secondary px-6 py-3 rounded-lg btn-ripple">
                Secondary Button
              </button>
              <button class="px-6 py-3 rounded-lg focus-visible-enhanced" 
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                Focus Visible
              </button>
              <button
                class="btn-accent px-6 py-3 rounded-lg btn-ripple"
                onClick={() =>
                  startExecution({
                    label: 'Example: echo dry-run',
                    command: 'echo',
                    args: ['[kubegraf] This is a real shell command executed via the streaming panel.'],
                    mode: 'dry-run',
                    kubernetesEquivalent: false,
                  })
                }
              >
                Run ExecutionPanel Demo
              </button>
            </div>
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Enhanced Cards</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div class="card card-hover-enhanced p-4">
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-medium">Card {i}</span>
                    <span class="status-indicator status-indicator-running">
                      Running
                    </span>
                  </div>
                  <p class="text-sm text-gray-400">
                    Hover over this card to see the enhanced hover effect with shimmer animation.
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Enhanced Inputs</h4>
            <div class="space-y-4 max-w-md">
              <input
                type="text"
                placeholder="Search resources..."
                class="w-full input-enhanced"
              />
              <textarea
                placeholder="Enter description..."
                class="w-full input-enhanced"
                rows={3}
              />
              <select class="w-full input-enhanced">
                <option value="">Select an option</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </select>
            </div>
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Enhanced Status Indicators</h4>
            <div class="flex flex-wrap gap-4">
              <span class="status-indicator status-indicator-running">
                Running
              </span>
              <span class="status-indicator status-indicator-pending">
                Pending
              </span>
              <span class="status-indicator status-indicator-failed">
                Failed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Utility Classes Demo */}
      <section class="card p-6 card-hover-enhanced">
        <h3 class="text-xl font-semibold mb-4">Utility Classes</h3>
        <p class="text-gray-400 mb-6">
          Additional utility classes for common UI patterns.
        </p>
        
        <div class="space-y-6">
          <div>
            <h4 class="font-medium mb-3">Text Truncation</h4>
            <div class="space-y-2 max-w-md">
              <div class="line-clamp-1 p-2 bg-gray-800 rounded">
                This is a very long text that will be truncated with an ellipsis when it exceeds the container width.
              </div>
              <div class="truncate-2 p-2 bg-gray-800 rounded">
                This is a multi-line text that will be truncated after two lines. The text continues here but will be hidden with an ellipsis at the end of the second line.
              </div>
            </div>
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Gradient Text & Borders</h4>
            <div class="space-y-4">
              <h2 class="text-3xl font-bold text-gradient">
                Gradient Text Example
              </h2>
              <div class="border-gradient p-6 rounded-lg">
                <p>This card has a gradient border using CSS border-image.</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Enhanced Tooltips</h4>
            <div class="flex gap-4">
              <button 
                class="px-4 py-2 rounded-lg bg-gray-800 tooltip-enhanced"
                data-tooltip="This is an enhanced tooltip"
              >
                Hover for Tooltip
              </button>
              <button 
                class="px-4 py-2 rounded-lg bg-gray-800 tooltip-enhanced"
                data-tooltip="Tooltip with arrow and shadow"
              >
                Another Tooltip
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive Demo */}
      <section class="card p-6 card-hover-enhanced">
        <h3 class="text-xl font-semibold mb-4">Responsive Improvements</h3>
        <p class="text-gray-400 mb-6">
          Responsive grid layouts that adapt to different screen sizes.
        </p>
        
        <div class="responsive-grid gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div class="card p-4 text-center">
              <div class="text-lg font-medium">Item {i}</div>
              <div class="text-sm text-gray-400">Resize window to see responsive behavior</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UIDemo;
