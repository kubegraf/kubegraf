import { createSignal } from 'solid-js';

// Brain panel state management
const [brainPanelOpen, setBrainPanelOpen] = createSignal<boolean>(false);
const [brainPanelPinned, setBrainPanelPinned] = createSignal<boolean>(false);

export function toggleBrainPanel(): void {
  setBrainPanelOpen(prev => !prev);
}

export function openBrainPanel(): void {
  setBrainPanelOpen(true);
}

export function closeBrainPanel(): void {
  if (!brainPanelPinned()) {
    setBrainPanelOpen(false);
  }
}

export function toggleBrainPanelPin(): void {
  setBrainPanelPinned(prev => !prev);
}

export function setBrainPanelPinnedState(pinned: boolean): void {
  setBrainPanelPinned(pinned);
  if (!pinned && !brainPanelOpen()) {
    setBrainPanelOpen(false);
  }
}

export { brainPanelOpen, brainPanelPinned };




