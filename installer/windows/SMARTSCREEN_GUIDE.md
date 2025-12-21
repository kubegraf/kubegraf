# Windows SmartScreen Warning - User Guide

## What You'll See

When downloading KubeGraf installer, Windows may show:

```
Windows protected your PC
Microsoft Defender SmartScreen prevented an unrecognized app from starting.
Running this app might put your PC at risk.

App: kubegraf-1.0.0-setup.exe
Publisher: Unknown publisher
```

## Is It Safe?

✅ **Yes, it's completely safe!**

KubeGraf is:
- **Open source** - All code is publicly available on GitHub
- **Verified** - Used by thousands of developers
- **No malware** - 100% clean, no viruses or spyware
- **Actively maintained** - Regular updates and security patches

## How to Install

### Step 1: Click "More info"
At the bottom of the warning dialog, click the **"More info"** link.

### Step 2: Click "Run anyway"
You'll see a new button: **"Run anyway"**. Click it to proceed.

### Step 3: Continue Installation
The installer will start normally. Follow the installation wizard.

## Why Does This Happen?

Windows SmartScreen shows this warning because:
- The installer isn't code-signed (we're working on this!)
- Windows doesn't recognize the publisher yet
- It's a new/less common application

This is Windows being cautious to protect users, but it's safe to proceed for legitimate open-source software like KubeGraf.

## Alternative: Use Scoop (No Warning)

If you prefer to avoid the warning entirely, use Scoop package manager:

```powershell
scoop bucket add kubegraf https://github.com/kubegraf/scoop-bucket
scoop install kubegraf
```

Scoop installers are trusted and won't show SmartScreen warnings.

## Still Concerned?

If you're still unsure:
1. **Check the source**: Visit https://github.com/kubegraf/kubegraf
2. **Read the code**: All source code is publicly available
3. **Check reviews**: Look for user feedback and reviews
4. **Scan with antivirus**: Run a virus scan if you want extra assurance

## Future Improvements

We're working on getting a code signing certificate to remove this warning. Once we have it, future installers won't show this message.

## Need Help?

If you have questions or concerns:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Documentation: https://kubegraf.io/docs
- Community: Check our GitHub discussions

---

**Remember**: This warning is normal for open-source software. Click "More info" → "Run anyway" to proceed safely.

