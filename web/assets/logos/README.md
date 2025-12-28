# KubeGraf Logo Assets

This directory contains all KubeGraf logo variants in multiple formats and resolutions for different use cases.

## Logo Variants

### 1. **Cyan Background Logos** (Primary Brand)
Perfect for dark themes, documentation, and primary branding.

**Files:**
- `logo-cyan-bg.svg` - Vector format
- `logo-cyan-bg-512.png` - 512x512 PNG (11 KB)
- `logo-cyan-bg-1024.png` - 1024x1024 PNG (72 KB)
- `logo-cyan-bg-2048.png` - 2048x2048 PNG (249 KB)

**Colors:**
- Background: `#06b6d4` (Cyan 500)
- Icon: `#000000` (Black)

**Use Cases:**
- App icons
- Browser favicons
- Social media profiles
- Dark theme UIs

---

### 2. **Black Background Logos**
Excellent for light backgrounds and inverted color schemes.

**Files:**
- `logo-black-bg.svg` - Vector format
- `logo-black-bg-512.png` - 512x512 PNG (11 KB)
- `logo-black-bg-1024.png` - 1024x1024 PNG (66 KB)
- `logo-black-bg-2048.png` - 2048x2048 PNG (236 KB)

**Colors:**
- Background: `#000000` (Black)
- Icon: `#06b6d4` (Cyan 500)

**Use Cases:**
- Light theme contrast
- Print materials on white paper
- Presentations
- T-shirts and merchandise

---

### 3. **White Background Logos**
Clean and professional for light backgrounds.

**Files:**
- `logo-white-bg.svg` - Vector format
- `logo-white-bg-512.png` - 512x512 PNG (4.2 KB)
- `logo-white-bg-1024.png` - 1024x1024 PNG (26 KB)
- `logo-white-bg-2048.png` - 2048x2048 PNG (87 KB)

**Colors:**
- Background: `#FFFFFF` (White)
- Icon: `#000000` (Black)

**Use Cases:**
- Documentation
- Email signatures
- Light theme UIs
- PDF exports

---

### 4. **Transparent Black Icons**
Versatile logo without background for overlays.

**Files:**
- `logo-transparent-black.svg` - Vector format
- `logo-transparent-black-512.png` - 512x512 PNG (4.2 KB)
- `logo-transparent-black-1024.png` - 1024x1024 PNG (26 KB)
- `logo-transparent-black-2048.png` - 2048x2048 PNG (87 KB)

**Colors:**
- Background: Transparent
- Icon: `#000000` (Black)

**Use Cases:**
- Watermarks
- Light backgrounds
- Compositing
- Video overlays

---

### 5. **Transparent White Icons**
For dark backgrounds and special effects.

**Files:**
- `logo-transparent-white.svg` - Vector format
- `logo-transparent-white-512.png` - 512x512 PNG (488 B)
- `logo-transparent-white-1024.png` - 1024x1024 PNG (885 B)
- `logo-transparent-white-2048.png` - 2048x2048 PNG (4.1 KB)

**Colors:**
- Background: Transparent
- Icon: `#FFFFFF` (White)

**Use Cases:**
- Dark video backgrounds
- Dark presentations
- Night mode UIs
- Terminal splash screens

---

## Binary Matrix Variants

### Theme-Aware Logos
Located in `binary-matrix/` subdirectory:

- `logo-binary-matrix-cyan.svg` - Cyan version for dark themes
- `logo-binary-matrix-black.svg` - Black version for light themes
- `favicon.svg` - Simplified favicon version

---

## Size Guidelines

### Resolution Recommendations

| Size | Use Case |
|------|----------|
| **512px** | Small icons, favicons, mobile apps |
| **1024px** | Standard app icons, social media |
| **2048px** | High-DPI displays, print, large posters |

### File Size Reference

- **Transparent logos**: Smallest file size (< 5 KB for 512px)
- **Solid backgrounds**: Moderate size (10-12 KB for 512px)
- **High-res (2048px)**: 87-249 KB depending on complexity

---

## Design Specifications

### Icon Structure
The KubeGraf logo features:
- **Central matrix**: 4 nodes in 2x2 grid representing Kubernetes cluster nodes
- **Connection lines**: Dashed lines indicating network connectivity
- **Rounded corners**: Modern, friendly aesthetic (rx="24" for 512px versions)

### Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| Cyan 500 | `#06b6d4` | Primary brand color |
| Black | `#000000` | Dark icons and text |
| White | `#FFFFFF` | Light backgrounds |

### Opacity Variations
- Full opacity: `1.0` (solid nodes)
- Half opacity: `0.5` (secondary nodes for depth)

---

## Usage Examples

### HTML Favicon
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### React/SolidJS Component
```tsx
<img src="/assets/logos/logo-cyan-bg-512.png" alt="KubeGraf" width="64" height="64" />
```

### CSS Background
```css
.logo {
  background-image: url('/assets/logos/logo-transparent-black-512.png');
  background-size: contain;
}
```

### Theme Switching
```typescript
const logo = theme === 'dark'
  ? '/assets/logos/logo-cyan-bg-512.png'
  : '/assets/logos/logo-white-bg-512.png';
```

---

## Legacy Assets

The following assets are kept for backward compatibility:

- `logo-dark.png` - Legacy dark theme logo (86 KB)
- `logo-light.png` - Legacy light theme logo (104 KB)
- `kubegraf_black_icon.png` - Original black icon
- `kubegraf_color_icon.png` - Original colored icon
- `favicon.ico` - Multi-resolution ICO format
- `favicon-48x48.png` - 48px PNG favicon
- `favicon-96x96.png` - 96px PNG favicon

---

## Contribution Guidelines

When adding new logo variants:

1. **SVG First**: Always create the SVG version first
2. **Consistent Sizing**: Use 512px base with 8:1 scale to original 64px design
3. **Maintain Proportions**: Keep stroke widths and element sizes proportional
4. **Test on Backgrounds**: Verify visibility on light, dark, and colored backgrounds
5. **Optimize PNGs**: Use tools like `pngquant` or `optipng` for smaller file sizes
6. **Document**: Update this README with new variants and use cases

### Generating New Resolutions
```bash
# Using ImageMagick
magick logo-cyan-bg.svg -resize 512x512 logo-cyan-bg-512.png
magick logo-cyan-bg.svg -resize 1024x1024 logo-cyan-bg-1024.png
magick logo-cyan-bg.svg -resize 2048x2048 logo-cyan-bg-2048.png
```

---

## License

All KubeGraf logos and brand assets are Copyright 2025 KubeGraf Contributors.

Licensed under Apache License 2.0. See project LICENSE file for details.

---

## Brand Guidelines

For official brand usage guidelines, color specifications, and trademark information, please refer to the main project documentation.

**Questions?** Contact the KubeGraf maintainers for brand asset usage approval.

---

*Last Updated: 2025-01-27*
*Generated with Claude Code*
