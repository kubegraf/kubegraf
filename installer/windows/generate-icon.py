#!/usr/bin/env python3
"""
Generate kubegraf.ico from the existing PNG logo
Requires: Pillow (pip install Pillow)
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Error: Pillow not installed")
    print("Install with: pip install Pillow")
    sys.exit(1)

def create_icon_from_png(png_path, ico_path):
    """Convert PNG to ICO with multiple resolutions"""
    print(f"Loading image: {png_path}")

    try:
        # Open the source PNG
        img = Image.open(png_path)

        # Convert to RGBA if needed
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        print(f"Original size: {img.size}")

        # Standard Windows icon sizes
        icon_sizes = [
            (16, 16),    # Small icons (taskbar, file explorer)
            (24, 24),    # Small icons (high DPI)
            (32, 32),    # Standard icons
            (48, 48),    # Large icons
            (64, 64),    # Extra large icons
            (128, 128),  # Jumbo icons
            (256, 256),  # Jumbo icons (high DPI)
        ]

        # Create resized versions
        icon_images = []
        for size in icon_sizes:
            print(f"Creating {size[0]}x{size[1]} version...")
            resized = img.resize(size, Image.Resampling.LANCZOS)
            icon_images.append(resized)

        # Save as ICO
        print(f"Saving icon: {ico_path}")
        img.save(
            ico_path,
            format='ICO',
            sizes=icon_sizes,
            append_images=icon_images[1:]  # Skip first as it's already in img
        )

        print(f"✓ Successfully created {ico_path}")
        print(f"  File size: {os.path.getsize(ico_path) / 1024:.1f} KB")
        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def create_simple_icon(ico_path):
    """Create a simple KubeGraf icon from scratch"""
    print("Creating icon from scratch...")

    # Kubernetes blue and cyan colors
    k8s_blue = (50, 108, 229)      # #326ce5
    k8s_cyan = (0, 212, 170)       # #00d4aa
    k8s_dark = (39, 86, 184)       # #2756b8

    icon_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    images = []

    for size in icon_sizes:
        width, height = size
        print(f"Creating {width}x{height} version...")

        # Create new image with transparent background
        img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Calculate sizes based on icon size
        padding = max(2, width // 16)
        center_x = width // 2
        center_y = height // 2

        # Draw 3D cube/hexagon inspired by Kubernetes logo
        # This creates a simple geometric shape

        # Top diamond (blue)
        top_size = width // 4
        top_points = [
            (center_x, padding),                           # Top
            (center_x + top_size, center_y - top_size//2), # Right
            (center_x, center_y),                          # Bottom
            (center_x - top_size, center_y - top_size//2), # Left
        ]
        draw.polygon(top_points, fill=k8s_blue + (255,))

        # Right face (cyan)
        right_points = [
            (center_x + top_size, center_y - top_size//2), # Top
            (center_x + top_size, height - padding),       # Bottom right
            (center_x, height - padding),                  # Bottom center
            (center_x, center_y),                          # Top center
        ]
        draw.polygon(right_points, fill=k8s_cyan + (255,))

        # Left face (dark blue)
        left_points = [
            (center_x - top_size, center_y - top_size//2), # Top
            (center_x, center_y),                          # Top center
            (center_x, height - padding),                  # Bottom center
            (center_x - top_size, height - padding),       # Bottom left
        ]
        draw.polygon(left_points, fill=k8s_dark + (255,))

        # Add outline for clarity (for small sizes)
        if width <= 32:
            # Draw thin outline
            outline_color = (255, 255, 255, 80)
            draw.polygon(top_points, outline=outline_color)
            draw.polygon(right_points, outline=outline_color)
            draw.polygon(left_points, outline=outline_color)

        images.append(img)

    # Save as ICO with all sizes
    print(f"Saving icon: {ico_path}")
    images[0].save(
        ico_path,
        format='ICO',
        sizes=icon_sizes,
        append_images=images[1:]
    )

    print(f"✓ Successfully created {ico_path}")
    print(f"  File size: {os.path.getsize(ico_path) / 1024:.1f} KB")
    return True

def main():
    script_dir = Path(__file__).parent

    # Try to find the PNG logo
    possible_png_paths = [
        script_dir / 'kubegraf-logo.png',
        script_dir.parent.parent / 'kubegraf-logo.png',
        script_dir.parent.parent / 'client' / 'public' / 'kubegraf-logo.png',
    ]

    ico_path = script_dir / 'kubegraf.ico'

    # Try to use existing PNG first
    for png_path in possible_png_paths:
        if png_path.exists():
            print(f"Found PNG logo: {png_path}")
            if create_icon_from_png(png_path, ico_path):
                return 0
            break

    # If PNG conversion failed or not found, create simple icon
    print("\nPNG logo not found or conversion failed.")
    print("Creating a simple geometric icon instead...")

    if create_simple_icon(ico_path):
        print("\n✓ Icon created successfully!")
        print(f"  Location: {ico_path}")
        print(f"\nTo use a custom icon:")
        print(f"  1. Place kubegraf-logo.png in {script_dir}")
        print(f"  2. Run this script again")
        return 0
    else:
        return 1

if __name__ == '__main__':
    sys.exit(main())
