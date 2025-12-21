# Windows Installer Setup Guide

This document explains the Windows installer setup for KubeGraf.

## 📦 What Was Created

### 1. Inno Setup Script
**File**: `installer/windows/kubegraf-setup.iss`

A professional installer script that creates a wizard-style `.exe` installer with:
- ✅ Automatic PATH configuration
- ✅ Start Menu shortcuts (Web Dashboard & Terminal)
- ✅ Optional desktop shortcut
- ✅ Professional uninstaller
- ✅ Modern Windows 11 compatible UI

### 2. Build Instructions
**File**: `installer/windows/README.md`

Complete guide for building the installer including:
- Prerequisites (Inno Setup)
- Step-by-step build instructions
- Customization options
- Testing procedures
- Code signing guide

### 3. GitHub Actions Workflow
**File**: `.github/workflows/build-installer.yml`

Automated workflow that:
- ✅ Builds installer automatically on release
- ✅ Can be triggered manually for any version
- ✅ Downloads kubegraf.exe from GitHub releases
- ✅ Compiles the installer using Inno Setup
- ✅ Uploads to GitHub releases
- ✅ Creates build summary

### 4. Updated Documentation
**File**: `docs/installation.html`

Updated installation page now shows installer as the **recommended** method for Windows users.

## 🚀 How to Build the Installer

### Option 1: Using GitHub Actions (Recommended)

1. Go to **Actions** tab on GitHub
2. Select **"Build Windows Installer"**
3. Click **"Run workflow"**
4. Enter version (e.g., "1.0.0" or "latest")
5. Download from Artifacts

### Option 2: Manual Build (Windows PC)

1. **Download Inno Setup**: https://jrsoftware.org/isdl.php
2. **Get kubegraf.exe**:
   ```cmd
   curl -LO https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-windows-amd64.zip
   tar -xf kubegraf-windows-amd64.zip
   move kubegraf.exe installer\windows\
   ```
3. **Compile**:
   - Open `installer/windows/kubegraf-setup.iss` in Inno Setup
   - Click Build → Compile
   - Installer created in `dist/windows/`

## 📥 User Installation Experience

Users will:

1. **Download** `kubegraf-setup.exe` from your releases page
2. **Run** the installer (modern wizard UI)
3. **Choose options**:
   - Installation directory (default: `C:\Program Files\KubeGraf`)
   - Add to PATH (checked by default - recommended)
   - Create desktop shortcut (optional)
4. **Click Install** - automatic installation
5. **Done!** - Can immediately run `kubegraf` from any terminal

## 🎯 Benefits Over Manual Installation

### For Users:
- ✅ No PATH configuration needed
- ✅ Graphical wizard interface
- ✅ Start Menu shortcuts
- ✅ Proper uninstaller
- ✅ No PowerShell commands needed
- ✅ Works on locked-down corporate PCs

### For You:
- ✅ Fewer support requests about PATH issues
- ✅ More professional appearance
- ✅ Better user experience
- ✅ Automated builds with GitHub Actions
- ✅ Easier updates (users just run new installer)

## 📋 Next Steps

### Before First Release:

1. **Create Icon** (optional but recommended):
   - Create `kubegraf.ico` file (256x256 or multi-resolution)
   - Place in `installer/windows/`
   - Gives professional look to installer and shortcuts

2. **Test the Installer**:
   - Build locally or via GitHub Actions
   - Test on a clean Windows VM
   - Verify PATH is added correctly
   - Test Start Menu shortcuts
   - Test uninstaller

3. **Update Version Numbers**:
   - Edit `kubegraf-setup.iss`: Update `#define AppVersion`
   - Keep in sync with actual KubeGraf releases

4. **Optional: Code Signing**:
   - Get code signing certificate ($200-500/year)
   - Removes Windows SmartScreen warnings
   - Builds trust with enterprise users
   - Follow guide in `installer/windows/README.md`

### For Each Release:

**Automatic** (if you have kubegraf binary releases):
1. Create new GitHub release
2. Workflow automatically builds installer
3. Installer uploaded to release assets
4. Users download `kubegraf-setup.exe`

**Manual**:
1. Go to Actions → Build Windows Installer
2. Run workflow with version number
3. Download from Artifacts
4. Upload to GitHub releases

## 📚 Documentation Updates

The installation page now shows three Windows options:

1. **Installer (GUI)** - ⭐ Recommended for most users
   - Easy graphical installation
   - Automatic PATH setup
   - No command-line knowledge needed

2. **Scoop** - For power users who use Scoop
   - Command-line package manager
   - Easy updates: `scoop update kubegraf`

3. **Manual (PowerShell)** - For advanced users or automation
   - Direct control over installation
   - Useful for CI/CD or scripts

## 🔧 Maintenance

### Updating the Installer Script

Common changes in `kubegraf-setup.iss`:

- **Update version**: Line 7 - `#define AppVersion`
- **Add files**: `[Files]` section
- **Change install location**: Line 21 - `DefaultDirName`
- **Add shortcuts**: `[Icons]` section
- **Modify PATH logic**: `[Code]` section

### Testing Checklist

Before releasing new installer:
- [ ] Installer builds without errors
- [ ] Installation completes successfully
- [ ] PATH is updated correctly
- [ ] Start Menu shortcuts work
- [ ] Desktop shortcut works (if selected)
- [ ] `kubegraf --version` works from any terminal
- [ ] Web dashboard launches from shortcuts
- [ ] Uninstaller removes everything cleanly
- [ ] Uninstaller removes PATH entry

## 🆘 Troubleshooting

### Build Fails: "Cannot find kubegraf.exe"
**Solution**: Download kubegraf.exe to `installer/windows/` first

### Users See SmartScreen Warning
**Normal**: Unsigned executables trigger warnings

**Solutions**:
1. **Immediate (User Instructions)**: 
   - See `docs/windows-smartscreen.md` for user guide
   - Add instructions to installation page
   - Users click "More info" → "Run anyway"

2. **Short-term (Code Signing)**:
   - Get code signing certificate ($200-500/year)
   - See `WINDOWS_CODE_SIGNING.md` for complete guide
   - Use `scripts/sign-windows-installer.ps1` to sign installers

3. **Alternative (Scoop)**:
   - Recommend Scoop installation (no warnings)
   - `scoop install kubegraf`

### PATH Not Updated After Install
**Check**: Did user select "Add to PATH" during install?
**Solution**: Run installer again or manually add PATH

### Multiple Versions Installed
**Cause**: Installer doesn't remove old versions automatically
**Solution**: Uninstall old version first, or update installer script to handle upgrades

## 📞 Support

For issues with the installer:
- Check `installer/windows/README.md` for detailed troubleshooting
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Label issues with "installer" and "Windows"

## 🎉 Summary

You now have:
- ✅ Professional Windows installer script
- ✅ Automated GitHub Actions workflow
- ✅ Complete documentation
- ✅ Updated installation instructions

The installer provides the **best installation experience** for Windows users and will significantly reduce support requests!
