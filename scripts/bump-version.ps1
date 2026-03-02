# scripts/bump-version.ps1 — Windows equivalent of bump-version.sh
#
# Usage:
#   .\scripts\bump-version.ps1 0.80.0             # bump + commit + tag + push
#   .\scripts\bump-version.ps1 0.80.0 -DryRun     # preview only, no git changes
#
# FIRST-TIME SETUP (if scripts are blocked):
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Strip leading 'v' if user passes v0.80.0
$Version = $Version.TrimStart('v')
$Tag = "v$Version"

# Move to repo root
$RepoRoot = git rev-parse --show-toplevel
Set-Location $RepoRoot

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Bumping KubeGraf to $Tag" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 1. version.go ────────────────────────────────────────────────────────────
Write-Host "  → version.go"
(Get-Content version.go -Raw) `
    -replace 'var version = "[^"]+"',  "var version = `"$Version`"" `
    -replace 'const Version = "[^"]+"', "const Version = `"$Version`"" |
    Set-Content version.go -NoNewline

# ── 2. cli/cmd/version.go ────────────────────────────────────────────────────
Write-Host "  → cli/cmd/version.go"
(Get-Content cli\cmd\version.go -Raw) `
    -replace 'var cliVersion = "[^"]+"', "var cliVersion = `"$Version`"" |
    Set-Content cli\cmd\version.go -NoNewline

# ── 3. ui/solid/package.json ─────────────────────────────────────────────────
Write-Host "  → ui/solid/package.json"
(Get-Content ui\solid\package.json -Raw) `
    -replace '"version": "[^"]+"', "`"version`": `"$Version`"" |
    Set-Content ui\solid\package.json -NoNewline

Write-Host ""
Write-Host "  Files updated — verifying..." -ForegroundColor Yellow

# ── 4. Verify Go still compiles ──────────────────────────────────────────────
Write-Host "  → Verifying Go build..."
$env:CGO_ENABLED = "0"
go build -ldflags='-s -w' -o kubegraf-version-check.exe .
Remove-Item kubegraf-version-check.exe -Force -ErrorAction SilentlyContinue
Write-Host "     ✅ Build OK" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "  ⚠️  Dry run — stopping here. No git changes made." -ForegroundColor Yellow
    Write-Host "     Run without -DryRun to commit, tag, and push."
    git checkout -- version.go cli\cmd\version.go ui\solid\package.json
    exit 0
}

# ── 5. Commit ────────────────────────────────────────────────────────────────
Write-Host "  → Committing..."
git add version.go cli\cmd\version.go ui\solid\package.json
git commit -m "chore: bump version to $Version"

# ── 6. Tag ───────────────────────────────────────────────────────────────────
Write-Host "  → Tagging $Tag..."
git tag -a $Tag -m "Release $Tag"

# ── 7. Push ──────────────────────────────────────────────────────────────────
Write-Host "  → Pushing commit and tag..."
git push origin main
git push origin $Tag

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅  Released $Tag" -ForegroundColor Green
Write-Host ""
Write-Host "  GoReleaser will now build binaries for:"
Write-Host "    linux/amd64   linux/arm64"
Write-Host "    darwin/amd64  darwin/arm64"
Write-Host "    windows/amd64 windows/arm64"
Write-Host ""
Write-Host "  Track the release at:"
Write-Host "    https://github.com/kubegraf/kubegraf/releases/tag/$Tag"
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
