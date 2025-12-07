#!/bin/bash
# KubeGraf Installation Script for Linux and macOS
# Usage: curl -sSL https://kubegraf.io/install.sh | bash
# Alternative: curl -sSL https://raw.githubusercontent.com/kubegraf/kubegraf/main/docs/install.sh | bash

set -e

REPO="kubegraf/kubegraf"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="kubegraf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check for required commands
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v tar &> /dev/null; then
        missing_deps+=("tar")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}. Please install them first."
    fi
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS="linux";;
        Darwin*)    OS="darwin";;
        *)          error "Unsupported operating system: $(uname -s). For Windows, use: irm https://kubegraf.io/install.ps1 | iex";;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)   ARCH="amd64";;
        aarch64|arm64)  ARCH="arm64";;
        *)              error "Unsupported architecture: $(uname -m)";;
    esac
}

# Get latest release version
get_latest_version() {
    local api_response
    api_response=$(curl -sSL "https://api.github.com/repos/${REPO}/releases/latest" 2>&1)
    
    if [ $? -ne 0 ] || [ -z "$api_response" ]; then
        error "Failed to fetch latest version from GitHub API"
    fi
    
    VERSION=$(echo "$api_response" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/' | head -1)
    
    if [ -z "$VERSION" ]; then
        error "Failed to parse version from GitHub API response"
    fi
    
    # Remove 'v' prefix if present
    VERSION="${VERSION#v}"
}

# Download and install
install() {
    local DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION}/${BINARY_NAME}-${OS}-${ARCH}.tar.gz"
    local TMP_DIR=$(mktemp -d)
    local download_file="${TMP_DIR}/${BINARY_NAME}.tar.gz"

    info "Downloading KubeGraf v${VERSION} for ${OS}/${ARCH}..."
    info "URL: ${DOWNLOAD_URL}"

    if ! curl -f -sSL "$DOWNLOAD_URL" -o "$download_file"; then
        error "Failed to download from ${DOWNLOAD_URL}"
    fi

    if [ ! -f "$download_file" ] || [ ! -s "$download_file" ]; then
        error "Downloaded file is empty or missing"
    fi

    info "Extracting..."
    if ! tar xzf "$download_file" -C "$TMP_DIR" 2>/dev/null; then
        error "Failed to extract archive"
    fi

    if [ ! -f "${TMP_DIR}/${BINARY_NAME}" ]; then
        error "Binary not found in archive"
    fi

    info "Installing to ${INSTALL_DIR}..."
    
    # Create install directory if it doesn't exist
    if [ ! -d "$INSTALL_DIR" ]; then
        if [ -w "$(dirname "$INSTALL_DIR")" ]; then
            mkdir -p "$INSTALL_DIR"
        else
            sudo mkdir -p "$INSTALL_DIR"
        fi
    fi
    
    if [ -w "$INSTALL_DIR" ]; then
        mv "${TMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/"
    else
        sudo mv "${TMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/"
    fi

    if [ $? -ne 0 ]; then
        error "Failed to install binary to ${INSTALL_DIR}"
    fi

    chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

    # Cleanup
    rm -rf "$TMP_DIR"
}

# Verify installation
verify() {
    if command -v "$BINARY_NAME" &> /dev/null; then
        success "KubeGraf installed successfully!"
        echo ""
        info "Get started:"
        echo "  ${BINARY_NAME}          # Terminal UI"
        echo "  ${BINARY_NAME} --web    # Web Dashboard"
        echo ""
        info "Documentation: https://kubegraf.io"
    else
        warn "Installation completed, but '${BINARY_NAME}' not found in PATH"
        warn "You may need to add ${INSTALL_DIR} to your PATH"
        warn "Add this to your ~/.bashrc or ~/.zshrc:"
        echo "  export PATH=\"\${PATH}:${INSTALL_DIR}\""
    fi
}

main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║     KubeGraf Installation Script      ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    check_dependencies
    detect_os
    detect_arch
    get_latest_version

    info "Detected: ${OS}/${ARCH}"
    info "Version: ${VERSION}"
    echo ""

    install
    verify
}

main
