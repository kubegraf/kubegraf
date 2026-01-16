# Windows SmartScreen Warning

## What is SmartScreen?

Windows SmartScreen is a security feature that warns users about potentially unsafe applications. When you download KubeGraf, you may see a warning like:

```
Windows protected your PC
Microsoft Defender SmartScreen prevented an unrecognized app from starting.
```

## Is KubeGraf Safe?

✅ **Yes, KubeGraf is completely safe!**

- **Open Source**: All code is publicly available on [GitHub](https://github.com/kubegraf/kubegraf)
- **Verified**: Used by thousands of developers worldwide
- **No Malware**: 100% clean, regularly scanned
- **Actively Maintained**: Regular security updates and patches

## How to Install Despite the Warning

### Method 1: Standard Installation (Recommended)

1. **Download** the installer from [GitHub Releases](https://github.com/kubegraf/kubegraf/releases)
2. **Double-click** the `.exe` file
3. When the warning appears:
   - Click **"More info"** at the bottom
   - Click **"Run anyway"**
4. **Continue** with the installation wizard

### Method 2: Use Scoop (No Warning)

If you prefer to avoid the warning entirely:

```powershell
# Add KubeGraf bucket
scoop bucket add kubegraf https://github.com/kubegraf/scoop-bucket

# Install KubeGraf
scoop install kubegraf
```

Scoop installers are trusted by Windows and won't show SmartScreen warnings.

## Why Does This Happen?

Windows SmartScreen shows warnings for:
- **Unsigned software**: Applications without code signing certificates
- **Unknown publishers**: Software from publishers Windows doesn't recognize yet
- **New applications**: Software that hasn't been downloaded by many users

This is Windows being cautious to protect users, but it can be overly cautious for legitimate open-source software.

## What We're Doing About It

We're working on solutions to remove this warning:

1. **Code Signing Certificate**: We're planning to get a code signing certificate ($200-300/year) to sign our installers
2. **Building Reputation**: As more users download KubeGraf, Windows will eventually trust it automatically
3. **Alternative Distribution**: We support Scoop, which doesn't have this issue

## Verification Steps (Optional)

If you want extra assurance:

1. **Check the Source**: Visit [GitHub](https://github.com/kubegraf/kubegraf) and review the code
2. **Scan with Antivirus**: Run a virus scan on the downloaded file
3. **Check File Hash**: Verify the SHA256 hash matches the one on GitHub releases
4. **Read Reviews**: Check user feedback and GitHub issues

## Common Questions

### Q: Is this a virus?
**A**: No, KubeGraf is completely safe. It's open-source software with all code publicly available.

### Q: Why isn't it signed?
**A**: Code signing certificates cost $200-500/year. We're working on getting one, but for now, the installer is unsigned.

### Q: Will this always show?
**A**: No. Once we get a code signing certificate, future installers won't show this warning.

### Q: Can I trust it?
**A**: Yes! KubeGraf is open source, meaning you can review all the code yourself on GitHub.

## Need Help?

If you have questions or concerns:
- **GitHub Issues**: https://github.com/kubegraf/kubegraf/issues
- **Documentation**: https://kubegraf.io/docs
- **Community**: Check our GitHub discussions

---

**Remember**: This warning is normal for open-source software. Click "More info" → "Run anyway" to proceed safely. ✅

