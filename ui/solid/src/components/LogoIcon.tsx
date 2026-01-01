import { Component, JSX, createMemo } from 'solid-js';
import { currentTheme } from '../stores/theme';

interface LogoIconProps {
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * Brand logo icon that adapts to the current theme.
 * Uses logos from kubegraf.io website.
 *
 * - Light theme: kubegraf.svg (light background version)
 * - Dark themes: kubegraf-dark-new-bg.svg (dark background version)
 */
const LogoIcon: Component<LogoIconProps> = (props) => {
  // Use createMemo for efficient reactive updates
  const logoSrc = createMemo(() => {
    const themeName = currentTheme();
    // Light theme: use kubegraf.svg
    if (themeName === 'light') {
      return '/assets/logos/kubegraf.svg';
    }
    // All dark themes: use kubegraf-dark-new-bg.svg
    return '/assets/logos/kubegraf-dark-new-bg.svg';
  });

  return (
    <img
      src={logoSrc()}
      alt="KubēGraf"
      class={props.class ?? 'w-14 h-auto object-contain'}
      loading="eager"
      style={{
        filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))',
        ...(props.style || {}),
      }}
    />
  );
};

export default LogoIcon;


