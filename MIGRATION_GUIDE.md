# Directory Structure Migration Guide

This guide outlines the steps to reorganize the KubeGraf codebase into a clean, maintainable structure.

## Prerequisites

- Create a backup branch: `git checkout -b feature/cleanup-directory-structure`
- Ensure all tests pass before starting
- Commit changes incrementally

## Phase 1: Consolidate Scripts (Low Risk)

### Step 1: Create new scripts subdirectories

```bash
mkdir -p scripts/build
mkdir -p scripts/docs
mkdir -p scripts/deployment
mkdir -p scripts/setup
```

### Step 2: Move and organize scripts

```bash
# Move documentation generation scripts
git mv script/generate-docs.ts scripts/docs/
git mv script/generate-sitemap.ts scripts/docs/
git mv script/build.ts scripts/build/

# Organize existing scripts
git mv scripts/setup-android.sh scripts/setup/
git mv scripts/setup-desktop.sh scripts/setup/
git mv scripts/setup-ios.sh scripts/setup/
git mv scripts/sign-windows-installer.ps1 scripts/deployment/

# Keep PR scripts in root of scripts/
# (new-pr.sh, push-pr.sh remain in scripts/)
```

### Step 3: Remove old script directory

```bash
rmdir script/
```

### Step 4: Update references

Search for and update any references to old script paths:
```bash
grep -r "script/" .github/ docs/ README.md
```

## Phase 2: Clean Up Web Assets (Medium Risk)

### Step 1: Verify web/dist structure

```bash
ls -la web/dist/
```

### Step 2: Update .gitignore

Add to `.gitignore`:
```
# Build artifacts
web/dist/*
!web/dist/.gitkeep
ui/solid/dist/*

# Keep embedded assets tracked
!web/dist/index.html
!web/dist/assets/
!web/dist/favicon.svg
```

### Step 3: Clean duplicate assets

```bash
# Remove any duplicate logos/assets in web/ that are in web/dist/
# (Manual review recommended)
```

## Phase 3: Remove Backup Files (Low Risk)

### Step 1: Find all backup files

```bash
find . -name "*.backup*" -type f
```

### Step 2: Review and remove

```bash
# Review each backup file before removing
git rm web_server.go.backup-crud-split
git rm web_server.go.backup-fix
git rm web_server.go.backup-split
git rm web_server.go.backup2
git rm web_server.go.before-delete
git rm web_server.go.before-gitops-security
git rm web_server.go.before-remove-duplicates
git rm web_server.go.gitops
git rm web_server.go.pre-split-backup
git rm web_server.go.security

# Remove backups directory if exists
git rm -r backups/ 2>/dev/null || true
```

### Step 3: Update .gitignore

Add to `.gitignore`:
```
# Backup files
*.backup
*.backup-*
*.bak
*~
```

## Phase 4: Organize Go Files (HIGH RISK - Do Last)

**⚠️ WARNING: This phase requires careful testing and may break builds**

### Preparation

1. Ensure all tests pass
2. Document current import paths
3. Plan module organization
4. Consider using `goimports` and `gofmt`

### Step 1: Create cmd/server structure

```bash
mkdir -p cmd/server
```

### Step 2: Move main.go

```bash
# Move main application entry point
git mv main.go cmd/server/
```

### Step 3: Update imports

This requires updating:
- `go.mod` module paths
- Import statements across all files
- Build scripts
- CI/CD pipelines

**Recommended Approach:**
```bash
# Use a tool like gomvpkg or manually update imports
# Test after each file move
go build -v ./cmd/server
go test -v ./...
```

## Phase 5: Consolidate Utils (Medium Risk)

### Step 1: Move brain utils

```bash
mkdir -p internal/brain/utils
git mv utils/brain/* internal/brain/utils/
rmdir utils/brain
rmdir utils 2>/dev/null || echo "utils/ still has content"
```

### Step 2: Update imports

```bash
# Find and replace import paths
grep -r "utils/brain" . --include="*.go" | cut -d: -f1 | sort -u
```

## Testing Strategy

### After Each Phase

1. **Run all tests**
   ```bash
   go test -v ./...
   ```

2. **Build all targets**
   ```bash
   go build -v ./...
   cd ui/solid && npm run build
   ```

3. **Test web server**
   ```bash
   ./kubegraf web --port 3003
   # Verify UI loads correctly
   ```

4. **Commit changes**
   ```bash
   git add -A
   git commit -m "refactor: Phase X - [description]"
   ```

## Rollback Strategy

If issues arise:

```bash
# Rollback last commit
git reset --hard HEAD~1

# Or rollback to specific commit
git reset --hard <commit-hash>

# Or abandon branch and start over
git checkout main
git branch -D feature/cleanup-directory-structure
```

## Post-Migration Tasks

1. **Update Documentation**
   - [ ] Update README.md with new structure
   - [ ] Update CONTRIBUTING.md
   - [ ] Update BUILD_COMMANDS.md

2. **Update CI/CD**
   - [ ] Update GitHub Actions workflows
   - [ ] Update build scripts
   - [ ] Update deployment scripts

3. **Update IDE/Editor Configs**
   - [ ] Update `.vscode/settings.json`
   - [ ] Update GoLand project settings

4. **Communicate Changes**
   - [ ] Create PR with detailed description
   - [ ] Update team documentation
   - [ ] Notify contributors

## Success Criteria

- [ ] All tests pass
- [ ] Application builds successfully
- [ ] Web UI loads and functions correctly
- [ ] No duplicate files or directories
- [ ] Clean `git status` (no untracked files)
- [ ] Improved project structure readability
- [ ] Faster file navigation

## Timeline

- **Phase 1 (Scripts)**: 30 minutes
- **Phase 2 (Web Assets)**: 30 minutes
- **Phase 3 (Backups)**: 15 minutes
- **Phase 4 (Go Files)**: 4-6 hours (includes testing)
- **Phase 5 (Utils)**: 1 hour

**Total Estimated Time**: 6-8 hours (spread over multiple commits)

## Notes

- Start with low-risk phases first
- Commit after each successful phase
- Test thoroughly before moving to next phase
- Phase 4 (Go files) should be done last as it has the highest impact
- Consider doing Phase 4 in a separate PR if needed
