#!/usr/bin/env bash
# scripts/bump-version.sh — bump all version strings and cut a release tag
#
# Usage:
#   ./scripts/bump-version.sh 0.80.0       # bump + commit + tag + push
#   ./scripts/bump-version.sh 0.80.0 --dry-run  # preview only, no git changes
#
# What it does:
#   1. Updates version in version.go (var + const)
#   2. Updates version in cli/cmd/version.go (var cliVersion)
#   3. Updates version in ui/solid/package.json
#   4. Runs `go build` to verify it still compiles
#   5. Commits all three files
#   6. Creates an annotated git tag  (vX.Y.Z)
#   7. Pushes commit + tag to origin/main

set -euo pipefail

NEW_VERSION="${1:-}"
DRY_RUN="${2:-}"

if [[ -z "$NEW_VERSION" ]]; then
  echo "Usage: ./scripts/bump-version.sh <version> [--dry-run]"
  echo "  e.g. ./scripts/bump-version.sh 0.80.0"
  echo "  e.g. ./scripts/bump-version.sh 0.80.0 --dry-run"
  exit 1
fi

# Strip leading 'v' if user passes v0.80.0
NEW_VERSION="${NEW_VERSION#v}"
TAG="v${NEW_VERSION}"

# Detect repo root (works whether you run from root or scripts/)
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo ""
echo "════════════════════════════════════════"
echo "  Bumping KubeGraf to ${TAG}"
echo "════════════════════════════════════════"
echo ""

# ── 1. version.go ────────────────────────────────────────────────────────────
echo "  → version.go"
perl -pi -e "s/var version = \"[^\"]+\"/var version = \"${NEW_VERSION}\"/" version.go
perl -pi -e "s/const Version = \"[^\"]+\"/const Version = \"${NEW_VERSION}\"/" version.go

# ── 2. cli/cmd/version.go ────────────────────────────────────────────────────
echo "  → cli/cmd/version.go"
perl -pi -e "s/var cliVersion = \"[^\"]+\"/var cliVersion = \"${NEW_VERSION}\"/" cli/cmd/version.go
# Also update the ldflag example comments so they stay accurate
perl -pi -e "s/cliVersion=[0-9]+\.[0-9]+\.[0-9]+/cliVersion=${NEW_VERSION}/g" cli/cmd/version.go
perl -pi -e "s/main\.version=[0-9]+\.[0-9]+\.[0-9]+/main.version=${NEW_VERSION}/g" cli/cmd/version.go

# ── 3. ui/solid/package.json ─────────────────────────────────────────────────
echo "  → ui/solid/package.json"
perl -pi -e "s/\"version\": \"[^\"]+\"/\"version\": \"${NEW_VERSION}\"/" ui/solid/package.json

echo ""
echo "  Files updated:"
grep -n "version" version.go | head -4
grep -n "cliVersion\s*=" cli/cmd/version.go
grep '"version"' ui/solid/package.json

echo ""

# ── 4. Verify Go still compiles ──────────────────────────────────────────────
echo "  → Verifying Go build..."
go build -o /tmp/kubegraf-version-check .
rm -f /tmp/kubegraf-version-check
echo "     ✅ Build OK"
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "  ⚠️  Dry run — stopping here. No git changes made."
  echo "     Run without --dry-run to commit, tag, and push."
  # Restore files
  git checkout -- version.go cli/cmd/version.go ui/solid/package.json
  exit 0
fi

# ── 5. Commit ────────────────────────────────────────────────────────────────
echo "  → Committing..."
git add version.go cli/cmd/version.go ui/solid/package.json
git commit -m "chore: bump version to ${NEW_VERSION}"

# ── 6. Tag ───────────────────────────────────────────────────────────────────
echo "  → Tagging ${TAG}..."
git tag -a "${TAG}" -m "Release ${TAG}"

# ── 7. Push ──────────────────────────────────────────────────────────────────
echo "  → Pushing commit and tag..."
git push origin main
git push origin "${TAG}"

echo ""
echo "════════════════════════════════════════"
echo "  ✅  Released ${TAG}"
echo ""
echo "  GoReleaser will now build binaries for:"
echo "    linux/amd64   linux/arm64"
echo "    darwin/amd64  darwin/arm64"
echo "    windows/amd64 windows/arm64"
echo ""
echo "  Track the release at:"
echo "    https://github.com/kubegraf/kubegraf/releases/tag/${TAG}"
echo "════════════════════════════════════════"
echo ""
