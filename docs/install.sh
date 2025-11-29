#!/bin/bash
# KubeGraf Installation Script
# Usage: curl -sSL https://kubegraf.io/install.sh | bash

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

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS="linux";;
        Darwin*)    OS="darwin";;
        MINGW*|MSYS*|CYGWIN*) OS="windows";;
        *)          error "Unsupported operating system: $(uname -s)";;
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
    VERSION=$(curl -sSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$VERSION" ]; then
        error "Failed to fetch latest version"
    fi
}

# Download and install
install() {
    local DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}-${OS}-${ARCH}.tar.gz"
    local TMP_DIR=$(mktemp -d)

    info "Downloading KubeGraf ${VERSION} for ${OS}/${ARCH}..."

    if ! curl -sSL "$DOWNLOAD_URL" -o "${TMP_DIR}/${BINARY_NAME}.tar.gz"; then
        error "Failed to download from ${DOWNLOAD_URL}"
    fi

    info "Extracting..."
    tar xzf "${TMP_DIR}/${BINARY_NAME}.tar.gz" -C "$TMP_DIR"

    info "Installing to ${INSTALL_DIR}..."
    if [ -w "$INSTALL_DIR" ]; then
        mv "${TMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/"
    else
        sudo mv "${TMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/"
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
    fi
}

main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║     KubeGraf Installation Script      ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

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
