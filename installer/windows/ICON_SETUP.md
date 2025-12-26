# Desktop Shortcut Icon Setup

## Icon Files

The desktop shortcut now uses the color icon:
- **Source PNG**: `kubegraf_color_icon.png` (82 KB)
- **Generated ICO**: `kubegraf_color_icon.ico` (22 KB)

## Icon Locations

The icon is:
1. **Included in installer**: Copied to `{app}\kubegraf_color_icon.ico` during installation
2. **Used by shortcuts**: Desktop and Start Menu shortcuts use this icon
3. **Used by installer**: The installer itself uses this icon

## How It Works

### During Installation
- Inno Setup copies `kubegraf_color_icon.ico` to the installation directory
- Shortcuts are created with `IconFilename: "{app}\kubegraf_color_icon.ico"`

### During Updates
- Updater script detects icon at `{app}\kubegraf_color_icon.ico`
- Recreates shortcuts with the icon using PowerShell:
  ```powershell
  $shortcut.IconLocation = "$IconPath,0"
  ```

## Icon File Requirements

- **Format**: `.ico` (Windows icon format)
- **Sizes**: Multiple resolutions (16x16 to 256x256)
- **Location**: Must be in installation directory
- **Fallback**: If icon not found, Windows uses default executable icon

## Regenerating the Icon

If you need to regenerate the ICO file from the PNG:

```bash
cd installer/windows
python3 -c "
from PIL import Image
import os

png_path = 'kubegraf_color_icon.png'
ico_path = 'kubegraf_color_icon.ico'

img = Image.open(png_path)
if img.mode != 'RGBA':
    img = img.convert('RGBA')

icon_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
icon_images = []
for size in icon_sizes:
    resized = img.resize(size, Image.Resampling.LANCZOS)
    icon_images.append(resized)

img.save(ico_path, format='ICO', sizes=icon_sizes, append_images=icon_images[1:])
print(f'✓ Created {ico_path}')
"
```

Or use the existing `generate-icon.py` script:

```bash
cd installer/windows
python3 generate-icon.py kubegraf_color_icon.png
```

## Testing

After installation, verify:
1. Desktop shortcut shows the color icon
2. Start Menu shortcut shows the color icon
3. Icon appears correctly at all sizes (small, medium, large)

## Troubleshooting

### Icon Not Showing
- Check if `kubegraf_color_icon.ico` exists in installation directory
- Verify icon file is not corrupted
- Try regenerating the ICO file

### Icon Looks Blurry
- Ensure ICO file contains multiple resolutions
- Regenerate with all standard sizes (16, 24, 32, 48, 64, 128, 256)

### Icon Not Updating After Update
- Updater script should recreate shortcuts with icon
- Check updater script logs for icon path errors
- Verify icon file exists in installation directory

