# iOS App Setup Guide

This guide explains how to set up iOS and App Store releases for KubeGraf.

## Overview

KubeGraf can be packaged as an iOS app using **Capacitor**, which wraps the existing Solid.js web UI into a native iOS app. This approach:
- Reuses 100% of the existing web UI code
- Provides native iOS features (notifications, file system, etc.)
- Allows publishing to Apple App Store

## Prerequisites

1. **macOS** - Required for iOS development (Xcode only runs on macOS)
2. **Xcode** - Latest version from Mac App Store
3. **Apple Developer Account** - $99/year for App Store publishing
4. **CocoaPods** - Dependency manager for iOS
5. **Node.js 18+** - Already required for the project

## Step 1: Install Capacitor iOS

```bash
cd ui/solid
npm install @capacitor/ios
npx cap add ios
```

This creates an `ios/` directory in `ui/solid/`.

## Step 2: Configure iOS App

Edit `ui/solid/ios/App/App/Info.plist` to customize:
- App name
- Bundle identifier
- Version
- Required permissions

Edit `ui/solid/ios/App/App.xcodeproj/project.pbxproj` or use Xcode to set:
- **Bundle Identifier**: `io.kubegraf.app`
- **Version**: `1.0.1`
- **Build Number**: `1` (increment for each release)

## Step 3: Update Capacitor Configuration

Edit `ui/solid/capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.kubegraf.app',
  appName: 'KubeGraf',
  webDir: 'dist',
  server: {
    iosScheme: 'https',
    // For development, you can use:
    // url: 'http://YOUR_IP:3000',
    // cleartext: true
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0e27",
    },
  },
};

export default config;
```

## Step 4: Build and Sync

```bash
# Build the web app
npm run build

# Sync to iOS
npx cap sync ios
```

## Step 5: Open in Xcode

```bash
npx cap open ios
```

This opens the project in Xcode where you can:
- Configure signing certificates
- Set up provisioning profiles
- Test on simulator or device
- Archive for App Store

## Step 6: Configure Signing & Certificates

1. **In Xcode:**
   - Select the project in navigator
   - Go to "Signing & Capabilities"
   - Enable "Automatically manage signing"
   - Select your Team (Apple Developer account)

2. **For App Store distribution:**
   - Select "Any iOS Device" as target
   - Product → Archive
   - Distribute App → App Store Connect

## Step 7: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app:
   - **Platform**: iOS
   - **Name**: KubeGraf
   - **Primary Language**: English
   - **Bundle ID**: `io.kubegraf.app`
   - **SKU**: `kubegraf-ios`

3. Fill in app information:
   - Description
   - Screenshots (required for App Store)
   - App icon
   - Privacy policy URL
   - Category

## Step 8: GitHub Actions Workflow

The workflow (`.github/workflows/ios-release.yml`) automatically:
- Builds the web app
- Creates iOS archive
- Uploads to App Store Connect
- Submits for review (optional)

## Step 9: GitHub Secrets Setup

Add these secrets to your GitHub repository:

1. **APPLE_ID**: Your Apple ID email
2. **APPLE_APP_SPECIFIC_PASSWORD**: App-specific password (create at appleid.apple.com)
3. **APPLE_TEAM_ID**: Your Apple Developer Team ID (found in Apple Developer account)
4. **APPLE_CERTIFICATE_BASE64**: Base64-encoded .p12 certificate
5. **APPLE_CERTIFICATE_PASSWORD**: Password for the certificate
6. **APPLE_PROVISIONING_PROFILE_BASE64**: Base64-encoded provisioning profile

### Creating Certificates and Profiles

1. **Create App Store Distribution Certificate:**
   - Go to Apple Developer → Certificates
   - Create "Apple Distribution" certificate
   - Download and install in Keychain
   - Export as .p12 with password

2. **Create Provisioning Profile:**
   - Go to Apple Developer → Profiles
   - Create "App Store" profile
   - Select your app and certificate
   - Download profile

3. **Encode for GitHub Secrets:**
   ```bash
   # Certificate
   base64 -i certificate.p12 | pbcopy
   
   # Provisioning profile
   base64 -i profile.mobileprovision | pbcopy
   ```

## Step 10: Build IPA for Testing

```bash
# In Xcode
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Distribute App → Ad Hoc or Development
```

Or use command line:
```bash
cd ui/solid/ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ExportOptions.plist
```

## Step 11: TestFlight Beta Testing

1. Upload build to App Store Connect
2. Go to TestFlight tab
3. Add internal/external testers
4. Testers receive email invitation

## Step 12: Submit for App Store Review

1. Complete all required metadata in App Store Connect
2. Upload screenshots (required sizes):
   - iPhone 6.7" (1290 x 2796)
   - iPhone 6.5" (1284 x 2778)
   - iPad Pro 12.9" (2048 x 2732)
3. Submit for review
4. Wait for approval (typically 24-48 hours)

## Version Management

The version is automatically extracted from git tags (e.g., `v1.0.1`):
- **CFBundleShortVersionString**: `1.0.1` (user-visible)
- **CFBundleVersion**: Incremental build number

## Troubleshooting

- **Build fails**: Check Xcode version and iOS SDK
- **Signing errors**: Verify certificates and provisioning profiles
- **Upload fails**: Check App Store Connect API access
- **App crashes**: Check iOS logs in Xcode Organizer
- **Capacitor sync fails**: Ensure `npm run build` completed successfully

## Common Issues

1. **"No signing certificate found"**
   - Install certificate in Keychain
   - Verify Team ID in Xcode

2. **"Provisioning profile doesn't match"**
   - Regenerate profile with correct bundle ID
   - Download and install new profile

3. **"App Store Connect API error"**
   - Verify App Store Connect API key
   - Check permissions for the key

## Next Steps

1. Set up push notifications (APNs)
2. Add iOS-specific features (Face ID, Touch ID)
3. Add app extensions (widgets, shortcuts)
4. Implement in-app purchases (if needed)
5. Add analytics (Firebase, etc.)

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)

