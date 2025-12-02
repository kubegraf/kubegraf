import { Component } from 'solid-js';

interface PlaceholderProps {
  title: string;
  description: string;
  icon?: string;
  features?: string[];
  comingSoon?: boolean;
}

const Placeholder: Component<PlaceholderProps> = (props) => {
  return (
    <div class="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div class="max-w-2xl mx-auto p-8 text-center">
        <div class="mb-6">
          {props.icon && (
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ background: 'var(--bg-secondary)' }}>
              <svg class="w-10 h-10" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={props.icon} />
              </svg>
            </div>
          )}
          <h1 class="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{props.title}</h1>
          <p class="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>{props.description}</p>
        </div>

        {props.comingSoon && (
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'var(--bg-secondary)' }}>
            <svg class="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Coming Soon</span>
          </div>
        )}

        {props.features && props.features.length > 0 && (
          <div class="text-left space-y-3">
            <h2 class="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Planned Features:</h2>
            <ul class="space-y-2">
              {props.features.map((feature) => (
                <li class="flex items-start gap-3">
                  <svg class="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div class="mt-8 pt-8 border-t" style={{ 'border-color': 'var(--border-color)' }}>
          <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
            This feature is under active development. Check back soon for updates!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Placeholder;

