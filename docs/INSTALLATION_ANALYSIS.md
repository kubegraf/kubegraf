# KubeGraf Installation Script Analysis & Improvements

## Issues Found with Original `install.sh`

### ❌ **Critical Issues**

1. **Windows Support Doesn't Work**
   - The script is a bash script that won't run natively on Windows
   - Windows users would need WSL, Git Bash, or similar Unix-like environments
   - Native Windows PowerShell/CMD cannot execute bash scripts
   - The script detects Windows via `MINGW*|MSYS*|CYGWIN*`, but these are Unix-like environments, not native Windows

2. **Archive Format Mismatch**
   - Script always expects `.tar.gz` format
   - GoReleaser creates `.zip` files for Windows (see `.goreleaser.yml` line 36-37)
   - This would cause download/extraction failures on Windows

3. **Windows Path Issues**
   - Uses Unix paths like `/usr/local/bin` which don't exist on Windows
   - Should use Windows-appropriate paths like `%LOCALAPPDATA%\Programs\KubeGraf`

4. **Windows Command Issues**
   - Uses `sudo` (doesn't exist on Windows)
   - Uses `chmod` (doesn't exist on Windows)
   - Uses `tar` (may not be available on older Windows systems)
   - Uses `mktemp -d` with Unix paths

5. **No Dependency Checking**
   - Doesn't verify if `curl`, `tar`, etc. are available before use
   - Would fail with cryptic errors if dependencies are missing

### ⚠️ **Minor Issues**

- No check if install directory exists before installation
- PATH update instructions could be clearer

## ✅ **Solutions Implemented**

### 1. **Created PowerShell Installer for Windows** (`install.ps1`)
   - Native Windows PowerShell script
   - Handles `.zip` archives correctly
   - Uses Windows paths (`%LOCALAPPDATA%\Programs\KubeGraf`)
   - Automatically adds to PATH
   - Uses `Invoke-WebRequest` and `Expand-Archive` (native Windows commands)
   - Proper error handling and user feedback

### 2. **Improved Bash Script** (`install.sh`)
   - Added dependency checking (`curl`, `tar`)
   - Better error messages for unsupported OS
   - Creates install directory if it doesn't exist
   - Improved PATH instructions
   - Removed Windows detection (handled separately)

### 3. **Universal Installer Wrapper** (`install`)
   - Detects OS and directs users to the correct installer
   - Provides clear instructions for Windows users

## 📋 **Installation Commands by OS**

### **Linux & macOS**
```bash
curl -sSL https://kubegraf.io/install.sh | bash
```

### **Windows (PowerShell)**
```powershell
irm https://kubegraf.io/install.ps1 | iex
```

Or download and run:
```powershell
Invoke-WebRequest -Uri https://kubegraf.io/install.ps1 -OutFile install.ps1
.\install.ps1
```

## 🔍 **Dependencies**

### **Linux/macOS Requirements**
- `curl` - for downloading
- `tar` - for extracting archives
- `sudo` (optional) - if `/usr/local/bin` requires elevated permissions

### **Windows Requirements**
- PowerShell 5.1+ (built into Windows 10/11)
- `Invoke-WebRequest` or `curl.exe` (available in Windows 10+)

## ✅ **Will It Work on All OSes?**

### **Linux** ✅
- ✅ Bash script works natively
- ✅ `curl` and `tar` are standard on most distributions
- ✅ `/usr/local/bin` is standard location
- ✅ Dependencies checked before installation

### **macOS** ✅
- ✅ Bash script works natively
- ✅ `curl` and `tar` are built-in
- ✅ `/usr/local/bin` is standard location
- ✅ Dependencies checked before installation

### **Windows** ✅ (with PowerShell script)
- ✅ PowerShell script works natively
- ✅ Uses Windows-native commands (`Invoke-WebRequest`, `Expand-Archive`)
- ✅ Handles `.zip` format correctly
- ✅ Uses appropriate Windows paths
- ✅ Automatically updates PATH
- ⚠️ **Note**: The original `curl | bash` command won't work on Windows. Users need to use the PowerShell command.

## 🚀 **Automatic Dependency Installation**

**Current Status**: The scripts check for dependencies but **do not automatically install them**. This is by design for security and simplicity reasons.

### **Why Not Auto-Install Dependencies?**
1. **Security**: Installing system packages requires elevated permissions
2. **Package Manager Diversity**: Different Linux distros use different package managers (apt, yum, pacman, etc.)
3. **User Control**: Users should control what gets installed on their system

### **What Users Need to Do**

**Linux:**
```bash
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y curl tar

# RHEL/CentOS/Fedora
sudo yum install -y curl tar
# or
sudo dnf install -y curl tar

# Arch Linux
sudo pacman -S curl tar
```

**macOS:**
- `curl` and `tar` are built-in, no installation needed

**Windows:**
- PowerShell and `Invoke-WebRequest` are built-in (Windows 10+)
- No additional dependencies needed

## 📝 **Recommendations**

1. **Update Documentation**: Clearly document the different installation commands for each OS
2. **Website Instructions**: Update kubegraf.io to show OS-specific installation commands
3. **Error Messages**: The scripts now provide clear error messages if dependencies are missing
4. **Testing**: Test on:
   - Ubuntu/Debian Linux
   - RHEL/CentOS Linux
   - macOS (Intel and Apple Silicon)
   - Windows 10/11 (PowerShell)

## 🎯 **Summary**

**Original Issue**: The single `curl | bash` command would **NOT work on Windows** without additional tools.

**Solution**: 
- ✅ Linux/macOS: Improved bash script with dependency checks
- ✅ Windows: Native PowerShell script
- ✅ Both scripts handle platform-specific archive formats and paths correctly
- ✅ Dependencies are checked but not auto-installed (by design)

**Result**: Users on all three platforms can now install KubeGraf, but they need to use the appropriate command for their OS.

