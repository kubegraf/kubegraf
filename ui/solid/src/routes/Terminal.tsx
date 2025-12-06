import { Component } from 'solid-js';
import LocalTerminal from '../components/LocalTerminal';

const TerminalPage: Component = () => {
  return (
    <div class="flex flex-col h-full" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Terminal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Local system terminal</p>
        </div>
      </div>

      {/* Terminal component - same as header terminal but without modal */}
      <LocalTerminal />
    </div>
  );
};

export default TerminalPage;

