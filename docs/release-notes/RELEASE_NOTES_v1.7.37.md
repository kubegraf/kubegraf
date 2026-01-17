# KubeGraf v1.7.37 - Windows Terminal Support Hotfix

**Release Date:** December 29, 2025

## Overview

This hotfix release enables Windows terminal support in the KubeGraf UI, allowing Windows users to access local terminal functionality through PowerShell, CMD, WSL, or Git Bash.

## What's New

### Windows Terminal Support

- **Feature**: Windows users can now use the terminal icon in the app UI
- **Shells Supported**: PowerShell, CMD, WSL (Windows Subsystem for Linux), Git Bash
- **Auto-detection**: Backend automatically detects and uses the best available shell
- **Shell Selection**: Users can optionally specify their preferred shell

### Technical Implementation

**Backend Changes** (`web_server.go`):
- Enabled pipe-based terminal implementation for Windows
- Auto-detects available shells on the system
- Uses `StdinPipe()`, `StdoutPipe()`, `StderrPipe()` for I/O communication
- WebSocket handler routes input/output between browser and shell

**Frontend Changes** (`ui/solid/src/components/LocalTerminal.tsx`):
- Removed Windows platform detection blocking
- Removed Windows-specific error UI (70+ lines)
- Terminal component now works uniformly across all platforms
- Simplified error handling

## Known Limitations

Due to Windows pipe-based approach (vs PTY on Unix):
- **No ANSI colors**: Output is plain text without color formatting
- **Buffered output**: Shell buffers output (4KB buffer size)
- **No interactive prompt**: Prompt may not display as in native terminal
- **No input echo**: Typed characters may not echo in pipe mode

**Important**: Despite these limitations, commands execute properly and output is displayed correctly.

## Upgrade Instructions

### From v1.7.36 or earlier:

1. **Download the new release**:
   - Windows: Download the Windows installer or portable executable
   - macOS: `brew upgrade kubegraf` (after formula update)
   - Linux: Download appropriate package for your distribution

2. **No configuration changes required** - Terminal works automatically

3. **Verify**: Click the terminal icon in the app UI and you should see a working terminal

## What Was Fixed

- **Issue**: Windows users saw "Interactive Terminal Not Available on Windows" error message
- **Root Cause**: Terminal implementation was completely disabled for Windows in v1.7.36
- **Fix**: Enabled existing pipe-based Windows terminal implementation
- **Result**: Windows users can now execute shell commands through the app UI

## Files Changed

- `web_server.go` - Uncommented Windows terminal WebSocket handler
- `ui/solid/src/components/LocalTerminal.tsx` - Removed Windows blocking logic
- `version.go` - Version bump to 1.7.37
- `ui/solid/package.json` - Version bump to 1.7.37

## For Developers

If you're building from source:

```bash
# Clone the repository
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf

# Checkout v1.7.37 tag
git checkout v1.7.37

# Build frontend
cd ui/solid
npm install
npm run build
cd ../..

# Build backend
go build -ldflags="-X main.version=1.7.37" -o kubegraf .

# Run
./kubegraf web
```

## Feedback

If you encounter issues with Windows terminal support:

1. Check available shells on your system (PowerShell, CMD, WSL, Git Bash)
2. Review application logs for shell detection errors
3. Report issues at: https://github.com/kubegraf/kubegraf/issues

## Credits

This release addresses user feedback requesting functional Windows terminal support while maintaining the production logging and error handling improvements from v1.7.36.

---

**Full Changelog**: https://github.com/kubegraf/kubegraf/compare/v1.7.36...v1.7.37
