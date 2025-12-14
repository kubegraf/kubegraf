# Homebrew Installation Fix

## Permission Error Fix

If you encounter this error:
```
Error: The following directories are not writable by your user:
/usr/local/share/man/man8
```

### Solution 1: Fix Permissions (Recommended)

```bash
# Fix ownership
sudo chown -R $(whoami) /usr/local/share/man/man8

# Add write permissions
chmod u+w /usr/local/share/man/man8

# Then try installing again
brew tap kubegraf/tap
brew install kubegraf
```

### Solution 2: Use Homebrew's Default Location

If you're using Homebrew installed via the official installer, it should use `/opt/homebrew` (Apple Silicon) or `/usr/local` (Intel). If you're getting permission errors, try:

```bash
# Check your Homebrew prefix
brew --prefix

# If it's /usr/local, you might need to fix permissions for the entire Homebrew directory
sudo chown -R $(whoami) /usr/local

# Then try installing
brew tap kubegraf/tap
brew install kubegraf
```

### Solution 3: Alternative Installation (No Homebrew)

If Homebrew continues to have issues, use the direct download method:

#### macOS (Apple Silicon - M1/M2/M3)
```bash
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
chmod +x /usr/local/bin/kubegraf
```

#### macOS (Intel)
```bash
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
chmod +x /usr/local/bin/kubegraf
```

### Solution 4: Install to User Directory (No sudo)

```bash
# Create local bin directory
mkdir -p ~/bin

# Download and extract
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-arm64.tar.gz | tar xz

# Move to user bin
mv kubegraf ~/bin/

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
kubegraf --version
```

## Verify Installation

After installation, verify it works:

```bash
kubegraf --version
```

Then start the web UI:

```bash
kubegraf web --port 3003
```

Open http://localhost:3003 in your browser.
