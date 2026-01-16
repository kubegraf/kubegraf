# Desktop App Setup Guide

This guide explains how to set up desktop applications for macOS, Linux, and Windows using Electron.

## Overview

KubeGraf can be packaged as native desktop applications using **Electron**, which wraps the existing Solid.js web UI into standalone desktop apps. This approach:
- Reuses 100% of the existing web UI code
- Provides native desktop features (system tray, notifications, file system, etc.)
- Creates installers for all platforms (.dmg, .deb, .rpm, .exe, .msi)
- Allows distribution via GitHub Releases or app stores

## Prerequisites

1. **Node.js 18+** - Already required for the project
2. **Electron Builder** - For creating installers
3. **Platform-specific tools** (for local builds):
   - **macOS**: Xcode Command Line Tools
   - **Linux**: `dpkg`, `rpmbuild` (for Debian/RPM packages)
   - **Windows**: Windows SDK (for code signing)

## Step 1: Install Electron

```bash
cd ui/solid
npm install --save-dev electron electron-builder
npm install --save electron-updater
```

## Step 2: Create Electron Main Process

Create `ui/solid/electron/main.js`:

```javascript
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/logo.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-updater (optional)
if (process.env.NODE_ENV === 'production') {
  autoUpdater.checkForUpdatesAndNotify();
}
```

## Step 3: Create Preload Script

Create `ui/solid/electron/preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
  // Add any other APIs you need
});
```

## Step 4: Update package.json

Add to `ui/solid/package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "NODE_ENV=development electron .",
    "electron:build": "electron-builder",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:win": "electron-builder --win",
    "electron:build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "io.kubegraf.app",
    "productName": "KubeGraf",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "public/logo.png",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "electron/entitlements.mac.plist",
      "entitlementsInherit": "electron/entitlements.mac.plist"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "public/logo.png",
      "publisherName": "KubeGraf"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "rpm",
          "arch": ["x64"]
        },
        {
          "target": "tar.gz",
          "arch": ["x64"]
        }
      ],
      "category": "Development",
      "icon": "public/logo.png",
      "desktop": {
        "Name": "KubeGraf",
        "Comment": "Advanced Kubernetes Visualization Tool",
        "Categories": "Development;"
      }
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "dmg": {
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ]
    }
  }
}
```

## Step 5: Create macOS Entitlements

Create `ui/solid/electron/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

## Step 6: Build Locally

```bash
# Build web app first
cd ui/solid
npm run build

# Build desktop app for current platform
npm run electron:build

# Or build for specific platform
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:linux
```

Outputs will be in `ui/solid/release/`:
- **macOS**: `.dmg` and `.zip` files
- **Windows**: `.exe` installer and portable `.exe`
- **Linux**: `.AppImage`, `.deb`, `.rpm`, `.tar.gz`

## Step 7: Code Signing (Optional but Recommended)

### macOS

1. Get Apple Developer certificate
2. Add to `package.json` build config:
```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)"
}
```

### Windows

1. Get code signing certificate
2. Add to `package.json`:
```json
"win": {
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "password"
}
```

### Linux

No code signing required, but you can use GPG for package signing.

## Step 8: Auto-Updates

The app includes `electron-updater` for automatic updates. Configure in your build:

```json
"publish": {
  "provider": "github",
  "owner": "kubegraf",
  "repo": "kubegraf"
}
```

## Step 9: GitHub Actions Workflow

The workflow (`.github/workflows/desktop-release.yml`) automatically:
- Builds for all platforms (macOS, Windows, Linux)
- Creates installers for each platform
- Uploads to GitHub Releases
- Handles code signing (if configured)

## Step 10: Distribution

### GitHub Releases
- Automatically uploaded when you create a release tag
- Available for download from releases page

### App Stores (Optional)
- **macOS**: Mac App Store (requires additional setup)
- **Windows**: Microsoft Store (requires additional setup)
- **Linux**: Snap Store, Flathub (requires additional setup)

## Version Management

The version is automatically extracted from git tags (e.g., `v1.0.1`):
- Used for app version
- Used for auto-update checks
- Displayed in About dialog

## Troubleshooting

- **Build fails**: Check Node.js version (18+)
- **Signing fails**: Verify certificates are installed
- **App crashes**: Check Electron version compatibility
- **Auto-update fails**: Verify GitHub token permissions

## Development

Run in development mode:

```bash
# Terminal 1: Start web dev server
cd ui/solid
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

## Next Steps

1. Add system tray support
2. Add native notifications
3. Add keyboard shortcuts
4. Add file system access
5. Add auto-update notifications
6. Add crash reporting

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Updater](https://www.electron.build/auto-update)

