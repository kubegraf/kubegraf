## 🚀 Automated Multi-Platform Releases

I've created a comprehensive GitHub Actions workflow that automatically builds KubeGraf for all platforms. Here's what you need to know:

---

## Current Setup (kubegraf.io repository)

### What Runs Automatically After Merging PR:

✅ **Website Deployment** (deploy.yml)
- Triggers: Push to `main` branch
- Builds: React website
- Deploys: To GitHub Pages (kubegraf.io)
- Platforms: N/A (it's a website)

❌ **Windows Installer** (build-installer.yml)
- Triggers: Manual only OR on release
- Does NOT run on PR merge
- Only builds Windows installer

---

## 📦 What You Need: Complete Multi-Platform Build System

For building the actual **KubeGraf binaries** (Go application), you need the comprehensive workflow in the **MAIN kubegraf repository** (not kubegraf.io).

### File Created: `release-all-platforms.yml`

This workflow should go in your **main kubegraf repository** at:
```
kubegraf/.github/workflows/release-all-platforms.yml
```

---

## 🎯 What the Complete Workflow Does

### 1. Build Binaries for ALL Platforms

Automatically builds for:
- ✅ **Linux AMD64** (x86_64)
- ✅ **Linux ARM64** (ARM servers, Raspberry Pi)
- ✅ **macOS Intel** (x86_64)
- ✅ **macOS Apple Silicon** (M1/M2/M3)
- ✅ **Windows AMD64** (x86_64)

### 2. Create Archives

For each platform:
- **Linux/macOS**: `.tar.gz` files
- **Windows**: `.zip` file
- **SHA256 checksums** for all files

### 3. Build Windows Installer

- Downloads Windows binary
- Builds professional `.exe` installer with Inno Setup
- Includes in release

### 4. Create GitHub Release

- Uploads all binaries
- Uploads all checksums
- Uploads Windows installer
- Auto-generates release notes

### 5. Update Package Managers

**Homebrew (macOS)**:
- Auto-updates formula in `kubegraf/homebrew-tap`
- Users can: `brew upgrade kubegraf`

**Scoop (Windows)**:
- Auto-updates manifest in `kubegraf/scoop-bucket`
- Users can: `scoop update kubegraf`

---

## 🔄 How It Works

### Automatic Triggers

**Option 1: Git Tag (Recommended)**
```bash
git tag v1.0.0
git push origin v1.0.0
```
✅ Automatically builds everything
✅ Creates release
✅ Updates package managers

**Option 2: GitHub Release**
1. Go to GitHub → Releases → "Draft a new release"
2. Create tag: `v1.0.0`
3. Click "Publish release"
✅ Automatically builds everything

**Option 3: Manual Trigger**
1. Go to Actions → "Build and Release All Platforms"
2. Click "Run workflow"
3. Enter version number
✅ Builds everything (but doesn't auto-release)

---

## 📋 Setup Instructions

### Step 1: Move Workflow to Main Repository

Copy `release-all-platforms.yml` to your **main kubegraf repository**:

```bash
# In your main kubegraf repository (not kubegraf.io)
mkdir -p .github/workflows
cp /path/to/kubegraf.io/.github/workflows/release-all-platforms.yml \
   .github/workflows/
```

### Step 2: Update Workflow Configuration

Edit the workflow file and update these values:

```yaml
# Line 45: Update to your main package path
go build ... ./cmd/kubegraf  # Change if different

# Line 130: Update repository name
repository: kubegraf/kubegraf.io  # Your actual repo

# Line 224: Update Homebrew tap repo
repository: kubegraf/homebrew-tap  # Create if needed

# Line 268: Update Scoop bucket repo
repository: kubegraf/scoop-bucket  # Create if needed
```

### Step 3: Create GitHub Tokens (Optional for Package Managers)

If you want auto-updates for Homebrew/Scoop:

1. **Create Personal Access Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Create token with `repo` scope
   - Name it: `HOMEBREW_TAP_TOKEN`

2. **Add to Repository Secrets**:
   - Go to your kubegraf repo → Settings → Secrets and variables → Actions
   - Add secrets:
     - `HOMEBREW_TAP_TOKEN`
     - `SCOOP_BUCKET_TOKEN`

3. **Create the tap/bucket repositories**:
   ```bash
   # Create Homebrew tap
   gh repo create kubegraf/homebrew-tap --public

   # Create Scoop bucket
   gh repo create kubegraf/scoop-bucket --public
   ```

### Step 4: Test the Workflow

**Test manually first:**
```bash
# In your main kubegraf repository
git checkout -b test-release
git tag v0.0.1-test
git push origin v0.0.1-test
```

Watch the Actions tab to see if everything builds correctly.

### Step 5: Create Your First Real Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will:
1. Build binaries (5-10 minutes)
2. Create Windows installer (2-3 minutes)
3. Create GitHub release (1 minute)
4. Update Homebrew/Scoop (1 minute)

**Total time: ~10-15 minutes**

---

## 📦 What Users Will Get

After the workflow completes, users can install KubeGraf:

### macOS
```bash
# Homebrew (automatically updated!)
brew tap kubegraf/tap
brew install kubegraf

# Or manual download
curl -LO https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-arm64.tar.gz
```

### Linux
```bash
# AMD64
curl -LO https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-amd64.tar.gz
tar xzf kubegraf-linux-amd64.tar.gz
sudo mv kubegraf /usr/local/bin/

# ARM64
curl -LO https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-arm64.tar.gz
```

### Windows
```bash
# Scoop (automatically updated!)
scoop bucket add kubegraf https://github.com/kubegraf/scoop-bucket
scoop install kubegraf

# Or download installer
# https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-setup.exe
```

---

## 🎯 Release Process (Your Perspective)

### Before Release
1. Merge all PRs to `main`
2. Update version in code (if you have a version file)
3. Update CHANGELOG.md

### Create Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Wait
- ☕ Grab coffee (10-15 minutes)
- 🎉 Everything builds automatically

### Verify
1. Check Actions tab - all jobs green ✅
2. Check Releases page - new release created ✅
3. Check downloads work ✅

### Announce
- Tweet/blog about the release
- Users can immediately install/upgrade

---

## 🔍 Troubleshooting

### Build Fails on Specific Platform

**Check the logs:**
```
Actions → Build and Release All Platforms → Failed job
```

**Common issues:**
- Missing Go dependencies: Update `go.mod`
- CGO required: Set `CGO_ENABLED: 1` in workflow
- Platform-specific code: Use build tags

### Windows Installer Fails

**Check:**
- Is `kubegraf.ico` present in `kubegraf.io/installer/windows/`?
- Is the Inno Setup script valid?
- Did the Windows binary build succeed?

### Package Manager Updates Fail

**Check:**
- Are the tokens configured correctly?
- Do the tap/bucket repositories exist?
- Do you have write access?

**Skip for now:**
- Remove the `update-homebrew` and `update-scoop` jobs
- Update package managers manually

---

## 📊 Workflow Comparison

### Before (Manual Process)

```
Time: 2-3 hours per release
Steps: 50+

1. Build for Linux AMD64 manually
2. Build for Linux ARM64 manually
3. Build for macOS Intel manually
4. Build for macOS ARM manually
5. Build for Windows manually
6. Test each binary
7. Create archives
8. Calculate checksums
9. Download Inno Setup
10. Build Windows installer
11. Test installer
12. Create GitHub release
13. Upload 10+ files manually
14. Update Homebrew formula
15. Update Scoop manifest
16. Update documentation
17. Announce release
```

### After (Automated)

```
Time: 1 minute (your time) + 15 minutes (automated)
Steps: 3

1. git tag v1.0.0
2. git push origin v1.0.0
3. ☕ Wait for automation

Everything else happens automatically!
```

---

## ✅ Summary

### Current State (kubegraf.io repository)
- ✅ Website deploys automatically on push to main
- ❌ No binary builds (this is just the website repo)
- ⚠️  Windows installer builds only on manual trigger or release

### Recommended Setup (main kubegraf repository)
- ✅ Binaries for ALL platforms build automatically
- ✅ Windows installer builds automatically
- ✅ GitHub release created automatically
- ✅ Package managers updated automatically
- ✅ Triggered by git tag or GitHub release
- ✅ Takes 10-15 minutes total
- ✅ Zero manual work after pushing tag

### To Get Full Automation

1. **Copy workflow** to main kubegraf repository
2. **Update configuration** (repo names, paths)
3. **Add secrets** (for package manager updates)
4. **Create first tag**: `git tag v1.0.0 && git push origin v1.0.0`
5. **Done!** Everything builds automatically

---

## 🎉 Result

After setup, your release process is:

```bash
# That's it!
git tag v1.0.0
git push origin v1.0.0
```

And 15 minutes later:
- ✅ 5 platform binaries built
- ✅ Windows installer created
- ✅ GitHub release published
- ✅ Homebrew updated
- ✅ Scoop updated
- ✅ Ready for users to install

**Professional, automated, zero-manual-work releases!** 🚀
