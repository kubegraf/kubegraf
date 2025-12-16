# KubeGraf Installers

This directory contains installers for all platforms.

## 📦 What's Here

### Windows Installer (`windows/`)
Professional Windows installer with GUI using Inno Setup:
- Automatic PATH configuration
- Start Menu shortcuts
- Desktop shortcut (optional)
- Professional uninstaller
- Multi-resolution icon

See `windows/README.md` for build instructions.

### Automated Releases

The `.github/workflows/release-all-platforms.yml` workflow automatically:
- ✅ Builds binaries for ALL platforms (Linux, macOS, Windows)
- ✅ Creates Windows installer
- ✅ Generates checksums
- ✅ Publishes GitHub release
- ✅ Updates Homebrew tap
- ✅ Updates Scoop bucket

## 🚀 Creating a Release

Simply create and push a git tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will automatically build everything (~15 minutes).

## 📚 Documentation

- `WINDOWS_INSTALLER.md` - Windows installer details
- `AUTOMATED_RELEASES.md` - Complete release automation guide
- `INSTALLER_PREVIEW.md` - Visual preview of installer UI

## 🎯 Platform Support

| Platform | Format | Automatic Build |
|----------|--------|-----------------|
| Linux AMD64 | .tar.gz | ✅ Yes |
| Linux ARM64 | .tar.gz | ✅ Yes |
| macOS Intel | .tar.gz | ✅ Yes |
| macOS ARM | .tar.gz | ✅ Yes |
| Windows | .zip + .exe installer | ✅ Yes |

## 📥 Installation Methods

### Windows
- **Installer (Recommended)**: Download `kubegraf-setup.exe` from releases
- **Scoop**: `scoop install kubegraf`
- **Manual**: Download `.zip` from releases

### macOS
- **Homebrew (Recommended)**: `brew install kubegraf`
- **Manual**: Download `.tar.gz` from releases

### Linux
- **Manual**: Download `.tar.gz` from releases
- **Package managers**: Coming soon (deb, rpm, snap)

## 🔧 Building Locally

### Windows Installer

Requirements:
- Windows PC
- Inno Setup 6+
- `kubegraf.exe` binary

Steps:
```bash
cd installer/windows
# Place kubegraf.exe here
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" kubegraf-setup.iss
```

Output: `../../dist/windows/kubegraf-setup.exe`

See `windows/README.md` for details.

## 🤝 Contributing

To add installers for other package managers:
1. Create directory (e.g., `installer/linux/` for deb/rpm)
2. Add build scripts
3. Update the release workflow
4. Submit PR

## 📞 Support

Issues with installers:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Label: `installer`
