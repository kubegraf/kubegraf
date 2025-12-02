#!/bin/bash
# Setup script for Android mobile app

set -e

echo "🚀 Setting up KubeGraf Android App..."

cd "$(dirname "$0")/../ui/solid"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Install Capacitor if not already installed
if [ ! -d "node_modules/@capacitor" ]; then
    echo "📦 Installing Capacitor..."
    npm install @capacitor/core @capacitor/cli @capacitor/android
fi

# Initialize Capacitor if not already initialized
if [ ! -f "capacitor.config.ts" ]; then
    echo "⚙️  Initializing Capacitor..."
    npx cap init "KubeGraf" "io.kubegraf.app" --web-dir=dist
fi

# Add Android platform if not exists
if [ ! -d "android" ]; then
    echo "📱 Adding Android platform..."
    npx cap add android
fi

# Build the web app
echo "🔨 Building web app..."
npm run build

# Sync to Android
echo "🔄 Syncing to Android..."
npx cap sync android

echo "✅ Android setup complete!"
echo ""
echo "Next steps:"
echo "1. Open Android Studio: npx cap open android"
echo "2. Or build APK: cd android && ./gradlew assembleRelease"
echo ""
echo "For Play Store release, see: docs/MOBILE_APP_SETUP.md"

