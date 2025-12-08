# KubeGraf Release Guide

This document explains how to create a new release of KubeGraf with proper version numbering.

## 📋 Table of Contents

- [Version Numbering Scheme](#version-numbering-scheme)
- [Where Version is Defined](#where-version-is-defined)
- [Release Process](#release-process)
- [Step-by-Step Guide](#step-by-step-guide)
- [Automated Release (GoReleaser)](#automated-release-goreleaser)
- [Manual Release](#manual-release)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Version Numbering Scheme

KubeGraf follows [Semantic Versioning](https://semver.org/) (SemVer):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** (X.0.0): Breaking changes that are incompatible with previous versions
- **MINOR** (0.X.0): New features that are backward compatible
- **PATCH** (0.0.X): Bug fixes and minor improvements that are backward compatible

### Examples

- `v1.2.1` → `v1.2.2` (patch release - bug fix)
- `v1.2.1` → `v1.3.0` (minor release - new features)
- `v1.2.1` → `v2.0.0` (major release - breaking changes)

### Pre-release Versions

For testing before a stable release:

- `v1.3.0-rc1` (release candidate 1)
- `v1.3.0-rc2` (release candidate 2)
- `v1.3.0-beta1` (beta release)
- `v1.3.0-alpha1` (alpha release)

## Where Version is Defined

The version is defined in **`version.go`**:

```go
// Version is the current version of KubeGraf
// This can be set at build time using ldflags: -ldflags "-X main.version=1.0.0"
var version = "1.3.2"

// Version constant for backward compatibility
const Version = "1.3.2"
```

**Important:** Always update both `var version` and `const Version` to the same value.

## Release Process

### Prerequisites

1. Ensure you're on the `main` branch
2. Ensure all changes are committed
3. Ensure you have push access to the repository
4. Ensure tests pass (if applicable)

### Quick Checklist

- [ ] All features are complete and tested
- [ ] Version number updated in `version.go`
- [ ] CHANGELOG.md updated (if maintained)
- [ ] Release notes prepared
- [ ] Git tag created with proper version
- [ ] Tag pushed to remote
- [ ] GitHub release created (optional, can be automated)

## Step-by-Step Guide

### 1. Update Version Number

Edit `version.go` and update both the variable and constant:

```go
var version = "1.3.3"  // Update this
const Version = "1.3.3"  // Update this
```

**Example:**
```bash
# For a patch release (bug fix)
v1.3.2 → v1.3.3

# For a minor release (new features)
v1.3.2 → v1.4.0

# For a major release (breaking changes)
v1.3.2 → v2.0.0
```

### 2. Commit Version Change

```bash
git add version.go
git commit -m "chore: bump version to v1.3.3"
```

### 3. Create Git Tag

Create an annotated tag with release notes:

```bash
git tag -a v1.3.3 -m "Release v1.3.3

## 🎉 What's New

### Features
- ✨ New feature description
- 🎨 UI improvements

### Bug Fixes
- 🐛 Fixed issue description
- 🔧 Performance improvements

### Technical Improvements
- ⚡ Optimized performance
- 🛠️ Code refactoring"
```

**Or use a multi-line message:**

```bash
git tag -a v1.3.3
# This opens your editor to write the release message
```

### 4. Push Commits and Tag

```bash
# Push commits first
git push origin main

# Push the tag
git push origin v1.3.3
```

### 5. Verify Release

Check that the tag was created:

```bash
git tag -l | grep v1.3.3
git show v1.3.3
```

## Automated Release (GoReleaser)

If GoReleaser is configured, it will automatically:

1. Build binaries for all platforms (Linux, macOS, Windows, ARM64, AMD64)
2. Create a GitHub release
3. Upload release assets
4. Generate checksums

### Using GoReleaser

```bash
# Install GoReleaser (if not installed)
brew install goreleaser  # macOS
# or download from https://goreleaser.com/install/

# Create a release
goreleaser release --clean

# For a snapshot (testing)
goreleaser release --snapshot --clean
```

### GoReleaser Configuration

The configuration is in `.goreleaser.yml`. It automatically:
- Uses the git tag version
- Builds for multiple platforms
- Creates GitHub releases
- Generates checksums

## Manual Release

If you prefer to create releases manually:

### 1. Build Binaries

```bash
# Build for current platform
go build -ldflags "-X main.version=1.3.3" -o kubegraf .

# Build for multiple platforms
GOOS=linux GOARCH=amd64 go build -ldflags "-X main.version=1.3.3" -o kubegraf-linux-amd64 .
GOOS=darwin GOARCH=amd64 go build -ldflags "-X main.version=1.3.3" -o kubegraf-darwin-amd64 .
GOOS=darwin GOARCH=arm64 go build -ldflags "-X main.version=1.3.3" -o kubegraf-darwin-arm64 .
GOOS=windows GOARCH=amd64 go build -ldflags "-X main.version=1.3.3" -o kubegraf-windows-amd64.exe .
```

### 2. Create GitHub Release

1. Go to https://github.com/kubegraf/kubegraf/releases
2. Click "Draft a new release"
3. Select the tag (e.g., `v1.3.3`)
4. Add release title: `v1.3.3`
5. Add release notes (copy from tag message)
6. Upload binaries
7. Click "Publish release"

## Best Practices

### 1. Version Numbering

- **Always increment version** before creating a release
- **Use semantic versioning** (MAJOR.MINOR.PATCH)
- **Don't skip versions** (e.g., don't go from v1.2.1 to v1.4.0)
- **Use pre-release tags** for testing (e.g., `v1.3.0-rc1`)

### 2. Release Notes

Write clear, user-friendly release notes:

```markdown
## 🎉 What's New

### Features
- ✨ Feature name: Description of what it does
- 🎨 UI improvement: What changed

### Bug Fixes
- 🐛 Fixed: Description of the bug
- 🔧 Improved: What was improved

### Technical
- ⚡ Performance: What was optimized
- 🛠️ Refactoring: Code improvements
```

### 3. Commit Messages

Use conventional commit format:

```bash
chore: bump version to v1.3.3
feat: Add new feature
fix: Fix bug description
docs: Update documentation
```

### 4. Testing Before Release

- Test the new version locally
- Ensure all features work
- Check that version displays correctly
- Verify update mechanism works

### 5. Release Frequency

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Every few weeks for new features
- **Major releases**: When breaking changes are needed

## Complete Release Example

Here's a complete example for releasing v1.3.3:

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Update version.go
# Edit version.go: change "1.3.2" to "1.3.3" in both places

# 3. Commit version change
git add version.go
git commit -m "chore: bump version to v1.3.3"

# 4. Create tag with release notes
git tag -a v1.3.3 -m "Release v1.3.3

## 🎉 What's New

### Features
- ✨ Added Apply Update button with progress tracking
- 🔔 Added success notifications for updates

### Bug Fixes
- 🐛 Fixed version display in sidebar
- 🔧 Improved update process reliability"

# 5. Push everything
git push origin main
git push origin v1.3.3

# 6. Verify
git tag -l | grep v1.3.3
```

## Troubleshooting

### Tag Already Exists

If you get "tag already exists" error:

```bash
# Delete local tag
git tag -d v1.3.3

# Delete remote tag (if pushed)
git push origin --delete v1.3.3

# Create new tag
git tag -a v1.3.3 -m "Release v1.3.3"
```

### Wrong Version Number

If you need to fix the version:

```bash
# 1. Update version.go with correct version
# 2. Amend the commit
git add version.go
git commit --amend --no-edit

# 3. Force push (if not yet pushed)
git push origin main --force

# 4. Delete and recreate tag
git tag -d v1.3.3
git push origin --delete v1.3.3
git tag -a v1.3.3 -m "Release v1.3.3"
git push origin v1.3.3
```

### Version Not Updating After Release

If users don't see the new version:

1. Check that `version.go` was updated
2. Verify the tag was pushed
3. Check that GitHub release was created
4. Ensure the update check endpoint returns the correct version

## Version History

To see all releases:

```bash
# List all tags
git tag -l | sort -V

# Show latest tag
git describe --tags --abbrev=0

# Show all tags with messages
git tag -l -n9
```

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [GoReleaser Documentation](https://goreleaser.com/)
- [Git Tagging Guide](https://git-scm.com/book/en/v2/Git-Basics-Tagging)

## Questions?

If you have questions about the release process, please:
1. Check this document first
2. Review previous releases for examples
3. Ask in the team chat or create an issue

---

**Last Updated:** 2025-12-08  
**Current Version:** v1.3.2

