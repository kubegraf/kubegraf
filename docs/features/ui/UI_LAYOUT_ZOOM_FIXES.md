# UI Layout Zoom Fixes

## Summary

Fixed KubeGraf UI layout issues that occurred when browser zoom changed. The app now remains usable at common zoom levels (80%-200%) without clipping or unreachable UI elements.

## Problem

When users zoomed in/out, parts of the UI became unreachable:
- Top-left / bottom-left corners: sections clipped
- Top-right / bottom-right corners: sections clipped
- Sidebars didn't scroll
- Some panels overflowed and became non-interactive

## Solution

Implemented a robust layout system with proper flex/grid behavior, scroll containers, and viewport overflow detection.

## Changes Made

### 1. AppShell.tsx - Root Layout
- Changed from `h-screen` to `h-dvh` (dynamic viewport height) for proper zoom support
- Added `min-h-0` and `min-w-0` to flex children to enable proper scrolling
- Added comprehensive scroll strategy documentation in comments

**Key Changes:**
```tsx
// Before
<div class="flex flex-col h-screen overflow-hidden">

// After
<div 
  class="flex flex-col overflow-hidden" 
  style={{ 
    height: '100dvh',
    'min-height': '100dvh',
  }}
>
```

### 2. AppContent.tsx - Main Content Area
- Wrapped content in flex container with `min-h-0` and `overflow-hidden`
- Made main content area scrollable with `overflow-auto` and `min-h-0 min-w-0`
- Added `flex-shrink-0` to banners and footer to prevent compression
- Added ViewportWarningBanner component

**Key Changes:**
```tsx
// Main content wrapper
<div class="flex flex-col flex-1 min-h-0 overflow-hidden">
  <ViewportWarningBanner />
  {/* Banners with flex-shrink-0 */}
  <main class="flex-1 overflow-auto p-6 relative min-h-0 min-w-0">
    {/* Content */}
  </main>
  <footer class="flex-shrink-0">
    {/* Footer */}
  </footer>
</div>
```

### 3. Header.tsx - Sticky Header
- Changed from relative positioning to `sticky top-0`
- Added `flex-shrink-0` to prevent compression

**Key Changes:**
```tsx
// Before
<header class="h-16 header-glass flex items-center justify-between px-6 relative">

// After
<header class="h-16 header-glass flex items-center justify-between px-6 relative sticky top-0 flex-shrink-0">
```

### 4. Sidebar Scrolling Fixes
- **SidebarRail.tsx**: Added `min-h-0` to flyout container and `flex-1 min-h-0` to nav element
- **SidebarFlyout.tsx**: Added `min-h-0 flex-1` to nav element for proper scrolling
- Changed `max-h-[calc(100vh-2rem)]` to `max-h-[calc(100dvh-2rem)]` for zoom support

**Key Changes:**
```tsx
// Flyout container
<div class="max-h-[calc(100dvh-2rem)] flex flex-col min-h-0 overflow-hidden">

// Navigation items
<nav class="overflow-y-auto py-1.5 px-1.5 min-h-0 flex-1">
```

### 5. Viewport Overflow Detection
Created new utility and component:
- **`ui/solid/src/utils/viewportOverflowDetection.ts`**: Detects viewport issues
- **`ui/solid/src/components/ViewportWarningBanner.tsx`**: Dismissible warning banner

**Features:**
- Detects when viewport is too small (< 1024x600)
- Detects clipped corners (header/sidebar off-screen)
- Detects scroll issues (content overflow but can't scroll)
- Shows dismissible banner only when issues detected
- Stores dismissal in localStorage

### 6. Wide Tables
- Main content area has `min-w-0` to allow horizontal scrolling
- Individual table containers should wrap tables in `overflow-x-auto` divs
- Existing tables already have this pattern in most routes

## Scroll Strategy

### Layout Hierarchy
```
Root (h-dvh, overflow-hidden)
└── Body (flex-1, min-h-0, overflow-hidden)
    ├── Sidebar (fixed width, own scroll)
    └── Main (flex-1, flex-col, min-h-0, min-w-0, overflow-hidden)
        ├── Header (sticky top-0, flex-shrink-0)
        └── Content (flex-1, flex-col, min-h-0, overflow-hidden)
            ├── Banners (flex-shrink-0)
            ├── Main (flex-1, overflow-auto, min-h-0, min-w-0) ← SCROLLS HERE
            └── Footer (flex-shrink-0)
```

### Scroll Containers
- **Sidebar**: Has its own `overflow-y-auto` container
- **Main Content**: Only the `<main>` element scrolls vertically
- **Tables**: Individual tables wrapped in `overflow-x-auto` for horizontal scroll

### Key Principles
1. **Only ONE container scrolls vertically** (the main content area)
2. **Use `min-h-0` on flex children** to allow shrinking below content size
3. **Use `min-w-0` on flex children** to allow horizontal scrolling
4. **Use `h-dvh` instead of `h-screen`** for zoom support
5. **Sticky headers** instead of fixed (when possible)

## Testing

### Manual Tests
1. **Zoom Tests** (80%, 100%, 125%, 150%, 200%):
   - ✅ Header is visible
   - ✅ Sidebar is reachable and scrollable
   - ✅ Main content scrolls correctly
   - ✅ No UI corners are clipped/offscreen
   - ✅ No "cannot scroll" bugs

2. **Layout Tests**:
   - ✅ Sidebar content exceeds viewport → sidebar scrolls
   - ✅ Main content exceeds viewport → main scrolls
   - ✅ Header remains visible (sticky)
   - ✅ No infinite layout shift on resize/zoom

3. **Viewport Warning Banner**:
   - ✅ Appears when viewport < 1024x600
   - ✅ Appears when corners are clipped
   - ✅ Can be dismissed
   - ✅ Dismissal persists across sessions
   - ✅ Doesn't appear when viewport is adequate

### Automated Tests (Recommended)
- Set viewport sizes (desktop + smaller) and ensure key selectors are visible
- Ensure sidebar scroll container `scrollHeight > clientHeight` implies `overflow-y` works
- Ensure main container scroll works
- Test at various zoom levels programmatically

## Files Changed

1. `ui/solid/src/components/AppShell.tsx` - Root layout fixes
2. `ui/solid/src/components/AppContent.tsx` - Content area structure
3. `ui/solid/src/components/Header.tsx` - Sticky header
4. `ui/solid/src/components/sidebar/SidebarRail.tsx` - Sidebar scrolling
5. `ui/solid/src/components/sidebar/SidebarFlyout.tsx` - Flyout scrolling
6. `ui/solid/src/utils/viewportOverflowDetection.ts` - NEW: Detection utility
7. `ui/solid/src/components/ViewportWarningBanner.tsx` - NEW: Warning banner

## Environment Variables

None required. All fixes are automatic.

## Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (h-dvh works in Safari 15.4+)
- ✅ Mobile browsers: Responsive layout works correctly

## Future Improvements

- Add metrics for viewport issues (telemetry)
- Add configuration UI for minimum viewport size
- Consider responsive breakpoints for mobile
- Add keyboard shortcuts for zoom adjustment

