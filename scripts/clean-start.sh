#!/bin/bash
#
# KubeGraf Clean Start Script
# This script stops all servers, clears caches, rebuilds, and starts fresh.
#
# Usage: ./scripts/clean-start.sh [options]
#
# Options:
#   --no-frontend    Skip frontend rebuild
#   --no-cache       Clear all caches (including database)
#   --port PORT      Use custom port (default: 3003)
#   --help           Show this help
#

set -e

PORT=3003
SKIP_FRONTEND=false
CLEAR_CACHE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --no-cache)
            CLEAR_CACHE=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help)
            head -20 "$0" | tail -18
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=========================================="
echo "  KubeGraf Clean Start"
echo "=========================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 1. Stop any running servers
echo "[1/5] Stopping existing servers..."
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo "      Done."

# 2. Clean caches (optional)
if [ "$CLEAR_CACHE" = true ]; then
    echo "[2/5] Clearing all caches..."
    rm -rf ~/.kubegraf/cache/* 2>/dev/null || true
    rm -rf ~/.kubegraf/intelligence/embeddings/* 2>/dev/null || true
    rm -rf .gocache/* 2>/dev/null || true
    rm -rf ui/solid/node_modules/.vite 2>/dev/null || true
    echo "      Done."
else
    echo "[2/5] Clearing temporary caches..."
    rm -rf ui/solid/node_modules/.vite 2>/dev/null || true
    echo "      Done (use --no-cache to clear all caches)."
fi

# 3. Build frontend
if [ "$SKIP_FRONTEND" = false ]; then
    echo "[3/5] Building frontend..."
    cd ui/solid
    if [ ! -d "node_modules" ]; then
        echo "      Installing npm dependencies..."
        npm install
    fi
    npm run build
    cd "$PROJECT_ROOT"
    echo "      Done."
else
    echo "[3/5] Skipping frontend build (--no-frontend)."
fi

# 4. Build backend
echo "[4/5] Building Go backend..."
go build -o kubegraf .
echo "      Done."

# 5. Start server
echo "[5/5] Starting server on port $PORT..."
echo ""
echo "=========================================="
echo "  Server starting at http://localhost:$PORT"
echo "=========================================="
echo ""

exec ./kubegraf web --port $PORT
