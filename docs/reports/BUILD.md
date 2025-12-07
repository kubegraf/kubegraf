# KubeGraf Build Instructions

This document explains how to build both the frontend and backend components of KubeGraf.

## 📁 Project Structure

```
kubegraf/
├── ui/solid/          # Frontend (SolidJS)
│   └── dist/          # Frontend build output (DO NOT USE DIRECTLY)
├── web/dist/          # Frontend files for backend embedding (COPY FROM ui/solid/dist/)
└── kubegraf           # Backend binary (Go)
```

## 🔑 Key Concept

**The backend embeds the frontend files from `web/dist/` directory.**

- Frontend builds to: `ui/solid/dist/`
- Backend embeds from: `web/dist/`
- **You must copy files from `ui/solid/dist/` to `web/dist/` before building backend**

## 🎨 Frontend Build (SolidJS)

### Prerequisites
```bash
cd ui/solid
npm install  # First time only
```

### Build Frontend
```bash
cd ui/solid
npm run build
```

**Output:** Files are generated in `ui/solid/dist/`

### Development Mode (Optional)
```bash
cd ui/solid
npm run dev
```

## ⚙️ Backend Build (Go)

### Prerequisites
- Go 1.24+ installed
- Kubernetes client-go libraries (installed via `go mod download`)

### Build Backend
```bash
# From kubegraf/ directory
go build -o kubegraf .
```

**Output:** `kubegraf` binary in the current directory

## 🔄 Complete Build Process (Frontend + Backend)

### Step-by-Step

1. **Build Frontend**
   ```bash
   cd ui/solid
   npm run build
   ```

2. **Copy Frontend Build to Backend Directory**
   ```bash
   cd ../..  # Back to kubegraf/ directory
   rm -rf web/dist/*
   cp -r ui/solid/dist/* web/dist/
   ```

3. **Build Backend**
   ```bash
   go build -o kubegraf .
   ```

### One-Line Command (from kubegraf/ directory)
```bash
cd ui/solid && npm run build && cd ../.. && rm -rf web/dist/* && cp -r ui/solid/dist/* web/dist/ && go build -o kubegraf .
```

## 🚀 Running the Application

```bash
./kubegraf web --port 3003
```

The application will be available at:
- Web UI: `http://localhost:3001`
- Dashboard: `http://localhost:3000`

## 📝 Important Notes

### ⚠️ Common Mistakes

1. **Don't forget to copy files!**
   - Building frontend alone is not enough
   - You must copy `ui/solid/dist/*` to `web/dist/` before building backend
   - Otherwise, backend will serve old UI files

2. **Rebuild backend after UI changes**
   - After any frontend changes, rebuild the backend to embed new files
   - The `//go:embed web/dist/*` directive embeds files at compile time

3. **Check build timestamps**
   - Verify `web/dist/` files are recent (match `ui/solid/dist/`)
   - Verify `kubegraf` binary timestamp is after copying files

### ✅ Verification Checklist

After building, verify:
- [ ] `ui/solid/dist/` has new files (check timestamps)
- [ ] `web/dist/` has same files as `ui/solid/dist/` (check timestamps match)
- [ ] `kubegraf` binary timestamp is recent
- [ ] Application runs without errors

## 🔧 Development Workflow

### Making Frontend Changes

1. Edit files in `ui/solid/src/`
2. Build frontend: `cd ui/solid && npm run build`
3. Copy to backend: `cd ../.. && cp -r ui/solid/dist/* web/dist/`
4. Rebuild backend: `go build -o kubegraf .`
5. Restart application: `./kubegraf web --port 3003`

### Making Backend Changes

1. Edit Go files in `kubegraf/`
2. Rebuild backend: `go build -o kubegraf .`
3. Restart application: `./kubegraf web --port 3003`

**Note:** Backend changes don't require frontend rebuild unless you also changed frontend.

## 🐛 Troubleshooting

### Issue: UI changes not appearing

**Problem:** You see old UI even after making changes

**Solution:**
1. Check if `ui/solid/dist/` has new files
2. Check if `web/dist/` has the same files (copy if missing)
3. Rebuild backend: `go build -o kubegraf .`
4. Restart application

### Issue: Build errors

**Frontend build errors:**
```bash
cd ui/solid
rm -rf node_modules dist
npm install
npm run build
```

**Backend build errors:**
```bash
go clean -cache
go mod download
go build -o kubegraf .
```

## 📦 Quick Reference

| Task | Command |
|------|---------|
| Build frontend only | `cd ui/solid && npm run build` |
| Build backend only | `go build -o kubegraf .` |
| Copy UI to backend | `cp -r ui/solid/dist/* web/dist/` |
| Full build | See "One-Line Command" above |
| Run application | `./kubegraf web --port 3003` |

## 🔍 Understanding the Embed

The backend uses Go's `embed` directive to include UI files:

```go
//go:embed web/dist/*
var webDistFS embed.FS
```

This means:
- Files in `web/dist/` are embedded into the binary at compile time
- Changes to `web/dist/` after building won't affect the running binary
- You must rebuild the backend to include new UI files

---

**Last Updated:** December 6, 2025

