#!/bin/bash
# Setup script for desktop applications

set -e

echo "🚀 Setting up KubeGraf Desktop Apps..."

cd "$(dirname "$0")/../ui/solid"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Install Electron if not already installed
if [ ! -d "node_modules/electron" ]; then
    echo "📦 Installing Electron..."
    npm install --save-dev electron electron-builder
    npm install --save electron-updater
fi

# Create electron directory if it doesn't exist
if [ ! -d "electron" ]; then
    echo "📁 Creating electron directory..."
    mkdir -p electron
fi

# Create main.js if it doesn't exist
if [ ! -f "electron/main.js" ]; then
    echo "📝 Creating electron/main.js..."
    cat > electron/main.js << 'EOF'
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
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

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

if (process.env.NODE_ENV === 'production') {
  autoUpdater.checkForUpdatesAndNotify();
}
EOF
fi

# Create preload.js if it doesn't exist
if [ ! -f "electron/preload.js" ]; then
    echo "📝 Creating electron/preload.js..."
    cat > electron/preload.js << 'EOF'
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
});
EOF
fi

# Create entitlements.mac.plist if it doesn't exist
if [ ! -f "electron/entitlements.mac.plist" ]; then
    echo "📝 Creating electron/entitlements.mac.plist..."
    cat > electron/entitlements.mac.plist << 'EOF'
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
EOF
fi

# Update package.json if needed
if ! grep -q '"electron"' package.json; then
    echo "📝 Updating package.json..."
    # This would require more complex JSON manipulation
    echo "⚠️  Please manually add electron scripts to package.json"
    echo "   See docs/DESKTOP_APP_SETUP.md for details"
fi

# Build the web app
echo "🔨 Building web app..."
npm run build

echo "✅ Desktop app setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and update package.json build configuration"
echo "2. Test locally: npm run electron:dev"
echo "3. Build for current platform: npm run electron:build"
echo ""
echo "For detailed setup, see: docs/DESKTOP_APP_SETUP.md"

