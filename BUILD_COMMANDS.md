# KubeGraf Build Commands

## Current Build Process

The backend embeds the frontend files from `web/dist/` directory using Go's `embed` directive.

### Step-by-Step Commands

**1. Build Frontend:**
```bash
cd /Users/itsmine/Documents/repos/kubegraf/kubegraf/ui/solid && npm run build
```

**2. Copy Frontend to Backend Directory:**
```bash
cd /Users/itsmine/Documents/repos/kubegraf/kubegraf && rm -rf web/dist/* && cp -r ui/solid/dist/* web/dist/
```

**3. Build Backend:**
```bash
cd /Users/itsmine/Documents/repos/kubegraf/kubegraf && go build -o kubegraf .
```

### All-in-One Command

```bash
cd /Users/itsmine/Documents/repos/kubegraf/kubegraf/ui/solid && npm run build && cd ../.. && rm -rf web/dist/* && cp -r ui/solid/dist/* web/dist/ && go build -o kubegraf .
```

### Quick Reference (from kubegraf/ directory)

```bash
# Build frontend
cd ui/solid && npm run build && cd ../..

# Copy to web/dist
rm -rf web/dist/* && cp -r ui/solid/dist/* web/dist/

# Build backend
go build -o kubegraf .
```

## Notes

- Frontend builds to: `ui/solid/dist/`
- Backend embeds from: `web/dist/`
- You **must** copy files from `ui/solid/dist/` to `web/dist/` before building the backend
- The backend uses `//go:embed web/dist` to include UI files at compile time

