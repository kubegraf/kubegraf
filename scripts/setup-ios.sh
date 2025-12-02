#!/bin/bash
# Setup script for iOS mobile app

set -e

echo "🚀 Setting up KubeGraf iOS App..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ iOS development requires macOS. Please run this script on a Mac."
    exit 1
fi

cd "$(dirname "$0")/../ui/solid"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the Mac App Store."
    exit 1
fi

# Install Capacitor if not already installed
if [ ! -d "node_modules/@capacitor" ]; then
    echo "📦 Installing Capacitor..."
    npm install @capacitor/core @capacitor/cli @capacitor/ios
fi

# Initialize Capacitor if not already initialized
if [ ! -f "capacitor.config.ts" ]; then
    echo "⚙️  Initializing Capacitor..."
    npx cap init "KubeGraf" "io.kubegraf.app" --web-dir=dist
fi

# Add iOS platform if not exists
if [ ! -d "ios" ]; then
    echo "📱 Adding iOS platform..."
    npx cap add ios
fi

# Install CocoaPods if not installed
if ! command -v pod &> /dev/null; then
    echo "📦 Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Install pods
echo "📦 Installing CocoaPods dependencies..."
cd ios/App
pod install
cd ../..

# Build the web app
echo "🔨 Building web app..."
npm run build

# Sync to iOS
echo "🔄 Syncing to iOS..."
npx cap sync ios

echo "✅ iOS setup complete!"
echo ""
echo "Next steps:"
echo "1. Open in Xcode: npx cap open ios"
echo "2. Configure signing in Xcode (Signing & Capabilities)"
echo "3. Select your development team"
echo "4. Build and run on simulator or device"
echo ""
echo "For App Store release, see: docs/IOS_APP_SETUP.md"

