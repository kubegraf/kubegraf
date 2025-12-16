import { Component, JSX } from 'solid-js';
import { currentTheme } from '../stores/theme';

interface LogoIconProps {
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * Brand logo icon that adapts to the current theme.
 *
 * - Uses the monochrome (black) icon on the light theme for better contrast.
 * - Uses the color icon on all dark-style themes.
 */
const LogoIcon: Component<LogoIconProps> = (props) => {
  const getSrc = () => {
    const themeName = currentTheme();

    // Light theme: use monochrome black icon for clarity on bright backgrounds
    if (themeName === 'light') {
      return '/assets/logos/kubegraf_black_icon.png';
    }

    // All other (dark) themes: use the full-color icon
    return '/assets/logos/kubegraf_color_icon.png';
  };

  return (
    <img
      src={getSrc()}
      alt="KubeGraf"
      class={props.class ?? 'w-14 h-auto object-contain'}
      style={{
        filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))',
        ...(props.style || {}),
      }}
    />
  );
};

export default LogoIcon;


