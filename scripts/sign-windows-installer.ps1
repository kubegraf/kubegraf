# Windows Installer Code Signing Script
# Usage: .\sign-windows-installer.ps1 -InstallerPath "path\to\installer.exe" -CertPath "path\to\cert.pfx" -CertPassword "password"

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallerPath,
    
    [Parameter(Mandatory=$true)]
    [string]$CertPath,
    
    [Parameter(Mandatory=$true)]
    [string]$CertPassword,
    
    [string]$TimestampUrl = "http://timestamp.digicert.com",
    
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if signtool is available
$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signtool) {
    # Try common locations
    $signtoolPaths = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
    )
    
    $found = $false
    foreach ($path in $signtoolPaths) {
        if (Test-Path $path) {
            $signtool = $path
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Error "signtool.exe not found. Please install Windows SDK or Visual Studio."
        Write-Info "Download: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/"
        exit 1
    }
}

Write-Info "Using signtool: $signtool"

# Verify installer exists
if (-not (Test-Path $InstallerPath)) {
    Write-Error "Installer not found: $InstallerPath"
    exit 1
}

# Verify certificate exists
if (-not (Test-Path $CertPath)) {
    Write-Error "Certificate not found: $CertPath"
    exit 1
}

if ($VerifyOnly) {
    Write-Info "Verifying signature..."
    & $signtool verify /pa "$InstallerPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Signature verified successfully"
    } else {
        Write-Error "Signature verification failed or file is not signed"
        exit 1
    }
    exit 0
}

# Sign the installer
Write-Info "Signing installer: $InstallerPath"
Write-Info "Certificate: $CertPath"
Write-Info "Timestamp URL: $TimestampUrl"

$signArgs = @(
    "sign",
    "/f", "`"$CertPath`"",
    "/p", "`"$CertPassword`"",
    "/t", "`"$TimestampUrl`"",
    "/fd", "SHA256",
    "/tr", "http://timestamp.digicert.com",
    "`"$InstallerPath`""
)

$signCommand = "$signtool " + ($signArgs -join " ")
Write-Info "Running: $signCommand"

& $signtool sign /f "$CertPath" /p "$CertPassword" /t "$TimestampUrl" /fd SHA256 "$InstallerPath"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Installer signed successfully"
    
    # Verify signature
    Write-Info "Verifying signature..."
    & $signtool verify /pa "$InstallerPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Signature verified successfully"
        Write-Success "Installer is ready for distribution"
    } else {
        Write-Error "Signature verification failed"
        exit 1
    }
} else {
    Write-Error "Signing failed with exit code: $LASTEXITCODE"
    exit 1
}

