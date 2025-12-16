// Copyright 2025 KubeGraf Contributors
// Command Palette Store

import { createSignal } from 'solid-js';

const [isOpen, setIsOpen] = createSignal(false);
const [buttonRef, setButtonRef] = createSignal<HTMLElement | null>(null);

export function openCommandPalette() {
  setIsOpen(true);
}

export function closeCommandPalette() {
  setIsOpen(false);
}

export function toggleCommandPalette() {
  setIsOpen((prev) => !prev);
}

export function setCommandPaletteButtonRef(ref: HTMLElement | null) {
  setButtonRef(ref);
}

export { isOpen, buttonRef };

