# Windows Code Signing Guide

## Problem: "Unknown Publisher" Warning

When users download and run the KubeGraf installer (`.exe` file), Windows SmartScreen may show a warning:

```
Windows protected your PC
Microsoft Defender SmartScreen prevented an unrecognized app from starting.
Running this app might put your PC at risk.
```

This happens because the installer is not code-signed. This is **normal and safe** for open-source software, but it can confuse users.

## Solutions

### Solution 1: Code Signing (Recommended for Production)

Code signing removes the SmartScreen warning and builds user trust.

#### Step 1: Get a Code Signing Certificate

**Option A: Commercial Certificate (Recommended)**
- **DigiCert**: https://www.digicert.com/code-signing/ ($200-500/year)
- **Sectigo (formerly Comodo)**: https://sectigo.com/ssl-certificates-tls/code-signing ($200-400/year)
- **GlobalSign**: https://www.globalsign.com/en/code-signing-certificate ($200-500/year)

**Option B: Extended Validation (EV) Certificate**
- More expensive ($400-800/year) but provides immediate reputation
- Requires hardware token (USB key)
- Best for enterprise/established projects

**Option C: Open Source Code Signing (Free)**
- **Sigstore**: https://sigstore.dev/ (Free, but requires setup)
- **Let's Encrypt** (for websites, not code signing)

#### Step 2: Install Certificate

1. Download certificate from CA
2. Install in Windows Certificate Store:
   ```powershell
   # Import PFX certificate
   Import-PfxCertificate -FilePath "certificate.pfx" -CertStoreLocation Cert:\LocalMachine\My -Password (Read-Host -AsSecureString)
   ```

#### Step 3: Configure Inno Setup

Update `installer/windows/kubegraf-setup.iss`:

```ini
[Setup]
; ... existing settings ...

; Code Signing
SignTool=signtool
SignedUninstaller=yes

[Code]
procedure InitializeWizard();
begin
  // Custom message about code signing
end;
```

#### Step 4: Configure SignTool

Create `signtool.config` or configure in Inno Setup:

```ini
[SignTool]
signtool=signtool.exe sign /f "certificate.pfx" /p "password" /t "http://timestamp.digicert.com" $f
```

Or use Inno Setup's built-in signing:

```pascal
[Setup]
SignTool=default sign /f $qC:\path\to\certificate.pfx$q /p $qYourPassword$q /t http://timestamp.digicert.com $f
```

#### Step 5: Build Signed Installer

```bash
# Inno Setup will automatically sign during build
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\windows\kubegraf-setup.iss
```

### Solution 2: User Instructions (Immediate Solution)

Add clear instructions for users on how to bypass the warning safely.

#### Update Installation Documentation

Add to `docs/installation.html` or installation page:

```html
<div class="alert alert-info">
  <h4>Windows SmartScreen Warning</h4>
  <p>If you see a "Windows protected your PC" warning:</p>
  <ol>
    <li>Click <strong>"More info"</strong></li>
    <li>Click <strong>"Run anyway"</strong></li>
    <li>The installer is safe - it's open source and verified on GitHub</li>
  </ol>
  <p><small>This warning appears because the installer isn't code-signed. 
  We're working on getting a code signing certificate to remove this warning.</small></p>
</div>
```

#### Add to Installer Script

Update `installer/windows/kubegraf-setup.iss` to show a custom message:

```pascal
[Code]
procedure InitializeWizard();
begin
  // Show info about SmartScreen warning
  MsgBox('If Windows SmartScreen shows a warning:' + #13#10 +
         '1. Click "More info"' + #13#10 +
         '2. Click "Run anyway"' + #13#10 +
         '3. The installer is safe and open source' + #13#10 + #13#10 +
         'This is normal for unsigned installers.',
         mbInformation, MB_OK);
end;
```

### Solution 3: Build Reputation (Long-term)

Even without code signing, Windows will eventually trust your installer if:
- Many users download and run it
- No malware reports
- Consistent publisher information

This takes time (weeks to months) but is free.

### Solution 4: Alternative Distribution Methods

#### Use Scoop (Already Supported)
- Scoop installers are trusted
- Users can: `scoop install kubegraf`
- No SmartScreen warnings

#### Use Microsoft Store (Future)
- Requires Microsoft partnership
- Automatic updates
- No SmartScreen warnings
- More complex setup

## Implementation Steps

### Immediate (No Code Signing)

1. ✅ Add user instructions to documentation
2. ✅ Add message to installer (optional)
3. ✅ Update installation page with SmartScreen guidance

### Short-term (With Code Signing)

1. Purchase code signing certificate
2. Configure Inno Setup signing
3. Update build process
4. Sign all releases

### Long-term

1. Build reputation (many downloads)
2. Consider EV certificate for immediate trust
3. Explore Microsoft Store distribution

## Cost-Benefit Analysis

### Code Signing Certificate
- **Cost**: $200-500/year
- **Benefits**:
  - ✅ Removes SmartScreen warning
  - ✅ Builds user trust
  - ✅ Required for enterprise
  - ✅ Professional appearance

### No Code Signing
- **Cost**: $0
- **Drawbacks**:
  - ⚠️ SmartScreen warning
  - ⚠️ Some users may be hesitant
  - ⚠️ Not ideal for enterprise

## Recommended Approach

1. **Immediate**: Add clear user instructions
2. **Short-term**: Get standard code signing certificate ($200-300/year)
3. **Long-term**: Consider EV certificate if project grows

## Code Signing Setup Script

Create `scripts/sign-installer.ps1`:

```powershell
# Sign installer with code signing certificate
param(
    [string]$InstallerPath,
    [string]$CertPath,
    [string]$CertPassword,
    [string]$TimestampUrl = "http://timestamp.digicert.com"
)

if (-not (Test-Path $InstallerPath)) {
    Write-Error "Installer not found: $InstallerPath"
    exit 1
}

# Sign the installer
$signCommand = "signtool.exe sign /f `"$CertPath`" /p `"$CertPassword`" /t `"$TimestampUrl`" `"$InstallerPath`""
Invoke-Expression $signCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Installer signed successfully" -ForegroundColor Green
    
    # Verify signature
    $verifyCommand = "signtool.exe verify /pa `"$InstallerPath`""
    Invoke-Expression $verifyCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Signature verified" -ForegroundColor Green
    } else {
        Write-Warning "Signature verification failed"
    }
} else {
    Write-Error "Signing failed"
    exit 1
}
```

## GitHub Actions Integration

Add to `.github/workflows/release.yml`:

```yaml
- name: Sign Windows Installer
  if: runner.os == 'Windows'
  run: |
    # Import certificate from secret
    $cert = [Convert]::FromBase64String("${{ secrets.CODE_SIGNING_CERT }}")
    $password = ConvertTo-SecureString "${{ secrets.CODE_SIGNING_PASSWORD }}" -AsPlainText -Force
    Import-PfxCertificate -FilePath cert.pfx -CertStoreLocation Cert:\LocalMachine\My -Password $password
    
    # Sign installer
    signtool.exe sign /f cert.pfx /p "${{ secrets.CODE_SIGNING_PASSWORD }}" /t http://timestamp.digicert.com installer.exe
```

## User-Facing Documentation

Create `docs/windows-smartscreen.md`:

```markdown
# Windows SmartScreen Warning

## What is this warning?

Windows SmartScreen may show a warning when you download KubeGraf because the installer isn't code-signed. This is **normal and safe** for open-source software.

## Is it safe?

✅ **Yes!** KubeGraf is:
- Open source (view code on GitHub)
- Verified by thousands of users
- No malware or viruses
- Actively maintained

## How to proceed

1. Click **"More info"**
2. Click **"Run anyway"**
3. Continue with installation

## Why does this happen?

Windows SmartScreen shows warnings for:
- New/unknown publishers
- Unsigned software
- Software not yet trusted by many users

This is Windows' way of protecting users, but it can be overly cautious for legitimate open-source software.

## Future improvements

We're working on getting a code signing certificate to remove this warning. In the meantime, you can safely click "Run anyway".
```

## Summary

- **Immediate**: Add user instructions (free, quick)
- **Short-term**: Get code signing certificate ($200-300/year)
- **Long-term**: Build reputation or get EV certificate

The SmartScreen warning is normal for unsigned software and can be safely bypassed by clicking "More info" → "Run anyway".

