import { Component, Show, createSignal } from 'solid-js';
import { currentTheme, cycleTheme, setTheme, themes, type ThemeName } from '../stores/theme';

const ThemeToggle: Component = () => {
  const [showDropdown, setShowDropdown] = createSignal(false);

  const themeIcons: Record<ThemeName, JSX.Element> = {
    dark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    light: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    midnight: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    cyberpunk: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    ocean: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M2 12c2-2 4-4 6-4s4 2 6 4 4 4 6 4 4-2 6-4" />
        <path d="M2 6c2-2 4-4 6-4s4 2 6 4 4 4 6 4 4-2 6-4" />
        <path d="M2 18c2-2 4-4 6-4s4 2 6 4 4 4 6 4 4-2 6-4" />
      </svg>
    ),
  };

  return (
    <div class="relative" style={{ 'z-index': 100 }}>
      <button
        onClick={() => setShowDropdown(!showDropdown())}
        class="p-2.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all"
        title={`Theme: ${themes[currentTheme()].label}`}
      >
        {themeIcons[currentTheme()]}
      </button>

      <Show when={showDropdown()}>
        <div
          class="absolute right-0 mt-2 w-48 rounded-lg border border-[var(--border-color)] shadow-xl"
          style={{ background: 'var(--bg-secondary)', 'z-index': 9999 }}
        >
          {(Object.keys(themes) as ThemeName[]).map((themeName) => (
            <button
              onClick={() => {
                setTheme(themeName);
                setShowDropdown(false);
              }}
              class={`w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-tertiary)] ${
                currentTheme() === themeName ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
              } ${themeName === 'dark' ? 'rounded-t-lg' : ''} ${themeName === 'ocean' ? 'rounded-b-lg' : ''}`}
            >
              {themeIcons[themeName]}
              <span class="font-medium">{themes[themeName].label}</span>
              {currentTheme() === themeName && (
                <svg class="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </Show>

      {/* Click outside to close */}
      <Show when={showDropdown()}>
        <div
          class="fixed inset-0"
          style={{ 'z-index': 9998 }}
          onClick={() => setShowDropdown(false)}
        />
      </Show>
    </div>
  );
};

export default ThemeToggle;
