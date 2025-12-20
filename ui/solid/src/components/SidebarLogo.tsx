import { Component } from 'solid-js';
import { setCurrentView } from '../stores/ui';
import LogoIcon from './LogoIcon';

/**
 * Sidebar logo with persistent text and dashboard navigation.
 *
 * - Text label "KubeGraf" is always visible under the icon
 * - Click: navigates to the Dashboard view
 */
const SidebarLogo: Component = () => {
  const handleClick = () => {
    setCurrentView('dashboard');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      class="group flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60 rounded-md"
      title="KubēGraf Dashboard"
      style={{ width: '100%', 'margin-top': '-8px' }}
    >
      <LogoIcon class="w-24 h-auto object-contain" style={{ 'max-width': 'none' }} />
      <span class="mt-1 text-[10px] tracking-wide text-text-muted" style={{ 'text-transform': 'none' }}>
        KubēGraf
      </span>
    </button>
  );
};

export default SidebarLogo;


