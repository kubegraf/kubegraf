# Mobile App Setup Guide

This guide explains how to set up Android and Play Store releases for KubeGraf.

## Overview

KubeGraf can be packaged as a mobile app using **Capacitor**, which wraps the existing Solid.js web UI into a native Android app. This approach:
- Reuses 100% of the existing web UI code
- Provides native Android features (notifications, file system, etc.)
- Allows publishing to Google Play Store

## Prerequisites

1. **Android Studio** - For building and testing
2. **Java Development Kit (JDK)** - Version 17 or higher
3. **Android SDK** - Installed via Android Studio
4. **Google Play Console Account** - For publishing to Play Store
5. **Node.js 18+** - Already required for the project

## Step 1: Install Capacitor

```bash
cd ui/solid
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npx cap init
```

When prompted:
- **App name**: KubeGraf
- **App ID**: io.kubegraf.app
- **Web dir**: dist

## Step 2: Add Android Platform

```bash
npx cap add android
```

This creates an `android/` directory in `ui/solid/`.

## Step 3: Configure Android App

Edit `ui/solid/android/app/build.gradle`:

```gradle
android {
    namespace "io.kubegraf.app"
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "io.kubegraf.app"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.1"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 4: Update Capacitor Configuration

Edit `ui/solid/capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.kubegraf.app',
  appName: 'KubeGraf',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, you can use:
    // url: 'http://YOUR_IP:3000',
    // cleartext: true
  },
  android: {
    allowMixedContent: true,
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

## Step 5: Build and Sync

```bash
# Build the web app
npm run build

# Sync to Android
npx cap sync android
```

## Step 6: Test Locally

```bash
# Open in Android Studio
npx cap open android

# Or build APK directly
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Step 7: Generate Signed AAB for Play Store

1. **Create a keystore** (one-time):
```bash
keytool -genkey -v -keystore kubegraf-release.keystore -alias kubegraf -keyalg RSA -keysize 2048 -validity 10000
```

2. **Create `android/key.properties`**:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=kubegraf
storeFile=../kubegraf-release.keystore
```

3. **Update `android/app/build.gradle`**:
```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

4. **Build AAB**:
```bash
cd android
./gradlew bundleRelease
```

AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Step 8: GitHub Actions Workflow

Create `.github/workflows/android-release.yml`:

```yaml
name: Android Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-android:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: ui/solid/package-lock.json

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Set up Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies
        run: |
          cd ui/solid
          npm ci

      - name: Build SolidJS UI
        run: |
          cd ui/solid
          npm run build

      - name: Install Capacitor CLI
        run: |
          cd ui/solid
          npm install -g @capacitor/cli

      - name: Sync Capacitor
        run: |
          cd ui/solid
          npx cap sync android

      - name: Extract version from tag
        id: version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          VERSION_CODE=$(echo $VERSION | sed 's/\./0/g' | sed 's/^0*//')
          echo "version_code=$VERSION_CODE" >> $GITHUB_OUTPUT

      - name: Update version in build.gradle
        run: |
          cd ui/solid/android/app
          sed -i "s/versionName \".*\"/versionName \"${{ steps.version.outputs.version }}\"/" build.gradle
          sed -i "s/versionCode [0-9]*/versionCode ${{ steps.version.outputs.version_code }}/" build.gradle

      - name: Decode keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 -d > ui/solid/android/kubegraf-release.keystore

      - name: Create key.properties
        env:
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          cat > ui/solid/android/key.properties << EOF
          storePassword=$KEYSTORE_PASSWORD
          keyPassword=$KEY_PASSWORD
          keyAlias=kubegraf
          storeFile=../kubegraf-release.keystore
          EOF

      - name: Build AAB
        run: |
          cd ui/solid/android
          ./gradlew bundleRelease

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: ui/solid/android/app/build/outputs/bundle/release/app-release.aab

      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: io.kubegraf.app
          releaseFiles: ui/solid/android/app/build/outputs/bundle/release/app-release.aab
          track: production
          status: completed
```

## Step 9: GitHub Secrets Setup

Add these secrets to your GitHub repository:

1. **ANDROID_KEYSTORE_BASE64**: Base64-encoded keystore file
   ```bash
   base64 -i kubegraf-release.keystore | pbcopy
   ```

2. **ANDROID_KEYSTORE_PASSWORD**: Password for the keystore

3. **ANDROID_KEY_PASSWORD**: Password for the key alias

4. **GOOGLE_PLAY_SERVICE_ACCOUNT_JSON**: Service account JSON from Google Play Console

## Step 10: Google Play Console Setup

1. **Create a service account**:
   - Go to Google Cloud Console
   - Create a service account
   - Download JSON key
   - Add to GitHub secrets as `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

2. **Link service account to Play Console**:
   - Go to Play Console → Setup → API access
   - Link the service account
   - Grant "Release Manager" role

3. **Create the app**:
   - Create new app in Play Console
   - Fill in app details, screenshots, etc.
   - Complete store listing

## Step 11: Update .gitignore

Add to `.gitignore`:
```
# Android
ui/solid/android/
*.keystore
*.jks
key.properties
local.properties
```

## Alternative: React Native Approach

If you prefer a fully native experience, you can create a React Native app:

```bash
npx react-native init KubeGrafMobile --template react-native-template-typescript
```

Then create API client to connect to your KubeGraf backend.

## Testing

1. **Local testing**: Use Android Studio emulator or physical device
2. **Internal testing**: Upload to Play Console internal testing track
3. **Beta testing**: Use closed/open beta tracks
4. **Production**: Release to production track

## Version Management

The version is automatically extracted from git tags (e.g., `v1.0.1`):
- `versionName`: `1.0.1` (user-visible)
- `versionCode`: `101` (incremental integer for Play Store)

## Troubleshooting

- **Build fails**: Check Java version (must be 17+)
- **Sync fails**: Ensure `npm run build` completed successfully
- **Play Store upload fails**: Verify service account permissions
- **App crashes**: Check Android logs: `adb logcat`

## Next Steps

1. Set up iOS app (similar process with Capacitor iOS)
2. Add push notifications
3. Add offline support
4. Add biometric authentication
5. Add app shortcuts/widgets

