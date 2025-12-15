import { Component, JSX, Show } from 'solid-js';
import SidebarV2 from './SidebarV2';
import Header from './Header';
import UpdateBanner from './UpdateNotification';
import { useWebSocket } from '../providers/WebSocketProvider';
import { sidebarCollapsed } from '../stores/ui';

interface AppShellProps {
  children: JSX.Element;
}

const AppShell: Component<AppShellProps> = (props) => {
  const ws = useWebSocket();

  return (
    <div class="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Update Banner - fixed position overlay */}
      <UpdateBanner />

      <div class="flex flex-1 overflow-hidden">
        {/* SidebarV2 - rail + flyout design */}
        <SidebarV2 />

        {/* Main content - ml-14 for the narrow rail width */}
        <div class="flex-1 flex flex-col overflow-hidden transition-all duration-300 ml-14">
          {/* Header - static, persistent */}
          <Header />

          {/* Main content area - only this changes on route transitions */}
          {props.children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;

