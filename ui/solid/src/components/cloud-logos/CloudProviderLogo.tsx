// Copyright 2025 KubeGraf Contributors
// Cloud Provider Logo Component - Uses real logos from official sources with theme-aware styling

import { Component, createSignal, Show, createEffect } from 'solid-js';
import { getCloudProviderLogo } from '../../utils/cloudProviderLogos';
import { currentTheme } from '../../stores/theme';

interface CloudProviderLogoProps {
  provider?: string | null;
  class?: string;
  size?: number;
  fallbackToSvg?: boolean;
}

const CloudProviderLogo: Component<CloudProviderLogoProps> = (props) => {
  const [imageError, setImageError] = createSignal(false);
  const [imageLoaded, setImageLoaded] = createSignal(false);
  
  const logoConfig = () => getCloudProviderLogo(props.provider);
  const size = () => props.size || 20;
  const useFallback = () => props.fallbackToSvg !== false;

  // Get current theme
  const theme = () => currentTheme();
  const isDarkTheme = () => {
    const t = theme();
    return (
      t === 'dark' ||
      t === 'midnight' ||
      t === 'cosmic' ||
      t === 'github-dark' ||
      t === 'terminal' ||
      t === 'terminal-pro'
    );
  };

  createEffect(() => {
    // Reset error state when provider changes
    setImageError(false);
    setImageLoaded(false);
    // React to theme changes
    theme();
  });

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Use official logo URL if available and no error
  const shouldUseImage = () => {
    const config = logoConfig();
    return config.logoUrl && !imageError() && useFallback();
  };

  // Use SVG fallback if image fails or no URL available
  const shouldUseSvg = () => {
    return !shouldUseImage() && logoConfig().svgContent;
  };

  // Get theme-aware container styles
  const getContainerStyles = () => {
    const dark = isDarkTheme();
    return {
      width: `${size()}px`,
      height: `${size()}px`,
      minWidth: `${size()}px`,
      minHeight: `${size()}px`,
      // White/light background for dark themes, white background for light themes
      background: dark 
        ? 'rgba(255, 255, 255, 0.95)' 
        : 'rgba(255, 255, 255, 0.98)',
      borderRadius: '6px',
      padding: '3px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: dark
        ? '1px solid rgba(255, 255, 255, 0.2)'
        : '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: dark
        ? '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        : '0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    };
  };

  return (
    <div 
      class={`inline-flex items-center justify-center ${props.class || ''}`} 
      style={getContainerStyles()}
    >
      <Show when={shouldUseImage()}>
        <img
          src={logoConfig().logoUrl}
          alt={logoConfig().altText}
          class="w-full h-full object-contain"
          style={{ 
            opacity: imageLoaded() ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            position: imageLoaded() ? 'relative' : 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
          decoding="async"
          crossorigin="anonymous"
        />
        {/* Show SVG placeholder while image loads */}
        <Show when={!imageLoaded() && !imageError() && logoConfig().svgContent}>
          <div 
            class="absolute w-full h-full flex items-center justify-center" 
            style={{ 
              opacity: 0.4,
              width: '100%',
              height: '100%',
            }}
            innerHTML={logoConfig().svgContent}
          />
        </Show>
      </Show>
      
      <Show when={shouldUseSvg()}>
        <div 
          class="w-full h-full flex items-center justify-center"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          innerHTML={logoConfig().svgContent}
        />
      </Show>
    </div>
  );
};

export default CloudProviderLogo;
