import { Component, JSX, Show } from 'solid-js';
import Sidebar from './Sidebar';
import Header from './Header';
import UpdateBanner from './UpdateNotification';
import { useWebSocket } from '../providers/WebSocketProvider';

interface AppShellProps {
  children: JSX.Element;
}

const AppShell: Component<AppShellProps> = (props) => {
  const ws = useWebSocket();

  return (
    <div class="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Update Banner */}
      <UpdateBanner />
      
      <div class="flex flex-1 overflow-hidden">
        {/* Sidebar - static, persistent */}
        <Sidebar />

        {/* Main content */}
        <div class="flex-1 flex flex-col overflow-hidden">
          {/* Header - static, persistent */}
          <Header />

          {/* Main content area - only this changes on route transitions */}
          <main class="flex-1 overflow-auto relative">
            {/* Subtle loading overlay when fetching */}
            <Show when={ws.connected()}>
              <div class="absolute inset-0 pointer-events-none z-10">
                {/* This can be enhanced with actual fetching state from queries */}
              </div>
            </Show>
            
            {/* Route content */}
            {props.children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
