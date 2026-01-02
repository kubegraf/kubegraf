import { Component, JSX, Show } from 'solid-js';
import SidebarV2 from './SidebarV2';
import Header from './Header';
import UpdateBanner from './UpdateNotification';
import { useWebSocket } from '../providers/WebSocketProvider';
import { sidebarCollapsed } from '../stores/ui';

interface AppShellProps {
  children: JSX.Element;
}

/**
 * AppShell - Root layout component
 * 
 * SCROLL STRATEGY:
 * - Root uses h-dvh (dynamic viewport height) to handle browser zoom correctly
 * - Root has overflow-hidden to prevent body scroll
 * - Sidebar has its own scroll container (overflow-y-auto)
 * - Main content area has its own scroll container (overflow-y-auto)
 * - Both sidebar and main use min-h-0 to allow flex children to shrink below content size
 * 
 * LAYOUT STRUCTURE:
 * - Root: flex flex-col h-dvh (full dynamic viewport height)
 *   - UpdateBanner: fixed overlay (doesn't affect layout flow)
 *   - Body: flex flex-1 min-h-0 (fills remaining space, can shrink)
 *     - SidebarV2: fixed width (w-14), has own scroll
 *     - Main: flex-1 flex flex-col min-h-0 min-w-0 (fills remaining, can shrink)
 *       - Header: fixed height (h-16), sticky top-0
 *       - Content: flex-1 overflow-auto min-h-0 (scrollable main content)
 */
const AppShell: Component<AppShellProps> = (props) => {
  const ws = useWebSocket();

  return (
    <div 
      class="flex flex-col overflow-hidden" 
      style={{ 
        background: 'var(--bg-primary)',
        height: '100dvh', // Use dynamic viewport height for zoom support
        'min-height': '100dvh',
      }}
    >
      {/* Update Banner - fixed position overlay */}
      <UpdateBanner />

      {/* Body: Sidebar + Main Content */}
      <div class="flex flex-1 min-h-0 overflow-hidden">
        {/* SidebarV2 - rail + flyout design */}
        <SidebarV2 />

        {/* Main content - ml-14 for the narrow rail width */}
        <div class="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden transition-all duration-300 ml-14">
          {/* Header - sticky, persistent */}
          <Header />

          {/* Main content area - only this changes on route transitions */}
          {props.children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;

