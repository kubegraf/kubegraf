import { Component, JSX } from 'solid-js';
import { currentTheme } from '../stores/theme';

interface LogoIconProps {
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * Brand logo icon that adapts to the current theme.
 * Uses kubegraf.svg from kubegraf.io website.
 *
 * - Light theme: kubegraf.svg (works on light backgrounds)
 * - Dark themes: kubegraf.svg (works on dark backgrounds)
 */
const LogoIcon: Component<LogoIconProps> = (props) => {
  return (
    <img
      src="/assets/logos/kubegraf.svg"
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


