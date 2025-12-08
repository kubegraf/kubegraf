import { createSignal, createEffect } from 'solid-js';
import type { View } from './ui';

const FAVORITES_STORAGE_KEY = 'kubegraf-favorites';

// Get initial favorites from localStorage
function getInitialFavorites(): View[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as View[];
      } catch {
        return [];
      }
    }
  }
  return [];
}

const [favorites, setFavoritesInternal] = createSignal<View[]>(getInitialFavorites());

// Save to localStorage whenever favorites change
createEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites()));
  }
});

export function addFavorite(view: View) {
  setFavoritesInternal(prev => {
    if (!prev.includes(view)) {
      return [...prev, view];
    }
    return prev;
  });
}

export function removeFavorite(view: View) {
  setFavoritesInternal(prev => prev.filter(v => v !== view));
}

export function toggleFavorite(view: View) {
  if (isFavorite(view)) {
    removeFavorite(view);
  } else {
    addFavorite(view);
  }
}

export function isFavorite(view: View): boolean {
  return favorites().includes(view);
}

export { favorites };

