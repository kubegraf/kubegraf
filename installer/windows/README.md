# KubeGraf Windows Installer

This directory contains the Inno Setup script to create a Windows installer for KubeGraf.

## What the Installer Does

✅ Installs `kubegraf.exe` to `Program Files\KubeGraf`
✅ Automatically adds KubeGraf to PATH
✅ Creates Start Menu shortcuts
✅ Optional desktop shortcut
✅ Includes professional uninstaller
✅ Modern wizard-style UI

## Prerequisites

1. **Download Inno Setup**
   - Download from: https://jrsoftware.org/isdl.php
   - Install Inno Setup 6.x or later
   - Free and open source

2. **Get kubegraf.exe**
   - Download the Windows binary from GitHub releases
   - Place it in this directory (`installer/windows/`)

3. **Optional: Icon File**
   - Create or place `kubegraf.ico` in this directory
   - If not present, installer will use default icon

## Building the Installer

### Method 1: Using Inno Setup GUI (Windows)

1. Open Inno Setup Compiler
2. File → Open → Select `kubegraf-setup.iss`
3. Build → Compile
4. The installer will be created in `dist/windows/`

### Method 2: Command Line (Windows)

```cmd
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" kubegraf-setup.iss
```

### Method 3: GitHub Actions (Automated)

We can add a GitHub Actions workflow to automatically build the installer on release.

## Output

The build process creates:
- `dist/windows/kubegraf-1.0.0-setup.exe` (or current version)
- This is the distributable installer

## Customization

Edit `kubegraf-setup.iss` to customize:
- `AppVersion` - Update version number
- `DefaultDirName` - Installation directory
- `SetupIconFile` - Custom icon
- `[Tasks]` - Installation options
- `[Files]` - Additional files to include

## Testing the Installer

1. Run the generated `.exe` file
2. Follow the installation wizard
3. Choose installation options:
   - Install location
   - Add to PATH (recommended)
   - Create desktop shortcut
4. After install, verify:
   - Open Command Prompt
   - Type `kubegraf --version`
   - Should show version info

## Distribution

Upload the installer to:
- GitHub Releases page
- Your website: https://kubegraf.io/downloads
- Update installation docs to link to the installer

## Advanced: Code Signing

For production, sign the installer with a code signing certificate:

1. Get a code signing certificate from a CA (DigiCert, Sectigo, etc.)
2. Uncomment signing lines in `.iss` file:
   ```ini
   SignTool=signtool
   SignedUninstaller=yes
   ```
3. Configure signtool with your certificate

Signed installers:
- Remove Windows SmartScreen warnings
- Build user trust
- Required for some enterprise deployments

## Troubleshooting

### "Cannot find file: kubegraf.exe"
- Make sure `kubegraf.exe` is in the `installer/windows/` directory
- Download it from GitHub releases first

### "Cannot find icon file"
- Create `kubegraf.ico` or remove the `SetupIconFile` line
- Or use a default icon

### PATH not updated after install
- Make sure "Add to PATH" was checked during install
- Restart terminal/command prompt after install
- Check PATH: `echo %PATH%`

## Example GitHub Actions Workflow

Add to `.github/workflows/release.yml`:

```yaml
name: Build Windows Installer

on:
  release:
    types: [published]

jobs:
  build-installer:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download Inno Setup
        run: |
          choco install innosetup -y

      - name: Download kubegraf.exe
        run: |
          curl -LO https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-windows-amd64.zip
          unzip kubegraf-windows-amd64.zip -d installer/windows/

      - name: Build Installer
        run: |
          & "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer/windows/kubegraf-setup.iss

      - name: Upload Installer to Release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./dist/windows/kubegraf-1.0.0-setup.exe
          asset_name: kubegraf-setup.exe
          asset_content_type: application/vnd.microsoft.portable-executable
```

## File Structure

```
installer/
└── windows/
    ├── kubegraf-setup.iss    # Inno Setup script
    ├── kubegraf.exe          # Main executable (download first)
    ├── kubegraf.ico          # Icon file (optional)
    └── README.md             # This file

dist/
└── windows/
    └── kubegraf-1.0.0-setup.exe  # Generated installer
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Documentation: https://kubegraf.io/docs
