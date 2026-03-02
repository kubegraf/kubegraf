# KubeGraf build script for Windows (PowerShell)
# Usage:
#   .\build.ps1          # Build UI + Go binary (same as 'make build')
#   .\build.ps1 ui       # Build frontend only
#   .\build.ps1 go       # Build Go binary only (requires web\dist to exist)
#   .\build.ps1 clean    # Remove build artifacts
#   .\build.ps1 run      # Build and run the server on port 3000
#
# FIRST-TIME SETUP (Windows execution policy):
#   If you see "running scripts is disabled on this system", run ONE of:
#     powershell -ExecutionPolicy Bypass -File .\build.ps1
#   Or permanently for your user account (recommended):
#     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

param([string]$Target = "build")

$ErrorActionPreference = "Stop"

$BINARY   = "kubegraf.exe"
$UI_DIR   = "ui\solid"
$WEB_DIST = "web\dist"

function Build-UI {
    Write-Host "==> Building frontend..." -ForegroundColor Cyan
    Push-Location $UI_DIR
    npm install
    npm run build
    Pop-Location
    Write-Host "==> Frontend built -> $WEB_DIST" -ForegroundColor Green
}

function Build-Go {
    if (-not (Test-Path $WEB_DIST)) {
        Write-Error "ERROR: $WEB_DIST not found. Run '.\build.ps1 ui' first."
        exit 1
    }
    Write-Host "==> Building Go binary..." -ForegroundColor Cyan
    $env:CGO_ENABLED = "0"
    go build -ldflags='-s -w' -o $BINARY .
    Write-Host "==> Binary built: .\$BINARY" -ForegroundColor Green
}

function Clean {
    Write-Host "==> Cleaning build artifacts..." -ForegroundColor Cyan
    if (Test-Path $BINARY)   { Remove-Item $BINARY -Force }
    if (Test-Path $WEB_DIST) { Remove-Item $WEB_DIST -Recurse -Force }
    Write-Host "==> Clean done" -ForegroundColor Green
}

switch ($Target) {
    "ui"    { Build-UI }
    "go"    { Build-Go }
    "clean" { Clean }
    "run"   { Build-UI; Build-Go; & ".\$BINARY" web --port=3000 }
    "build" { Build-UI; Build-Go }
    default {
        Write-Host "Usage: .\build.ps1 [build|ui|go|clean|run]"
        Write-Host "  build  Build UI + Go binary (default)"
        Write-Host "  ui     Build frontend only"
        Write-Host "  go     Build Go binary only"
        Write-Host "  clean  Remove build artifacts"
        Write-Host "  run    Build and run on port 3000"
    }
}
