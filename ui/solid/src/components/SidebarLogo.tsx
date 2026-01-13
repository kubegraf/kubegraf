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
      style={{ width: '100%', 'margin-top': '-4px' }}
    >
      <LogoIcon class="w-12 h-auto object-contain" style={{ 'max-width': 'none' }} />
      <span class="mt-1 text-[11px] tracking-wide font-bold transition-colors duration-200 group-hover:text-[#f59e0b]" style={{ 'text-transform': 'none', color: 'var(--text-primary)', opacity: '0.95' }}>
        KubēGraf
      </span>
    </button>
  );
};

export default SidebarLogo;


