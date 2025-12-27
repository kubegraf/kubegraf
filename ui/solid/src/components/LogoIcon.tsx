import { Component, JSX } from 'solid-js';
import { currentTheme } from '../stores/theme';

interface LogoIconProps {
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * Brand logo icon that adapts to the current theme.
 * Uses the new binary-matrix logo design matching kubegraf.io website.
 *
 * - Light theme: favicon.svg (cyan background with black icon)
 * - Dark themes: logo-binary-matrix-cyan.svg (cyan icon on transparent)
 */
const LogoIcon: Component<LogoIconProps> = (props) => {
  const getSrc = () => {
    const themeName = currentTheme();

    // Light theme: use favicon.svg (cyan background with black icon) for clarity
    if (themeName === 'light') {
      return '/assets/logos/binary-matrix/favicon.svg';
    }

    // All other (dark) themes: use the cyan logo on transparent background
    return '/assets/logos/binary-matrix/logo-binary-matrix-cyan.svg';
  };

  return (
    <img
      src={getSrc()}
      alt="KubēGraf"
      class={props.class ?? 'w-14 h-auto object-contain'}
      style={{
        filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))',
        ...(props.style || {}),
      }}
    />
  );
};

export default LogoIcon;


