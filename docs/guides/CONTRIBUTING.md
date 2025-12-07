# Contributing to KubeGraf

Thank you for your interest in contributing to KubeGraf! 🎉

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/kubegraf.git
   cd kubegraf
   ```
3. **Create a branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

## Development Setup

### Prerequisites
- Go 1.24 or higher
- Node.js 18+ and npm (for UI development)
- kubectl with cluster access
- Git

### Development Environment Setup

#### 1. Build the UI (Solid.js)
```bash
cd ui/solid
npm install
npm run build
```

This builds the frontend assets to `ui/solid/dist/`.

#### 2. Copy UI Files to Web Directory
```bash
# From repository root
rm -rf web/dist/*
cp -r ui/solid/dist/* web/dist/
```

The Go server serves files from `web/dist/`, so the built UI files need to be copied there.

#### 3. Build the Go Binary
```bash
# From repository root
go build -o kubegraf .
```

#### 4. Run the Development Server
```bash
# Run on default port (8080)
./kubegraf --web

# Or run on custom port (e.g., 3000)
./kubegraf --web --port=3000
```

Then open your browser to:
- Dashboard: http://localhost:3000 (or http://localhost:8080)
- Topology: http://localhost:3000/topology

#### 5. Complete Development Workflow
```bash
# One-liner to rebuild everything and restart server
pkill -f kubegraf 2>/dev/null; \
rm -rf web/dist/* && \
cp -r ui/solid/dist/* web/dist/ && \
go build -o kubegraf . && \
./kubegraf --web --port=3000
```

#### 6. UI Development with Hot Reload
For active UI development with hot module replacement:
```bash
# Terminal 1: Run UI dev server
cd ui/solid
npm run dev
# UI will be available at http://localhost:5173 (Vite default)

# Terminal 2: Run backend server
cd ../..
./kubegraf --web --port=8080
```

Note: In dev mode, the UI runs separately. For production builds, use the workflow in step 5.

### Build and Run (Terminal UI Only)
```bash
# Build
go build -o kubegraf

# Run terminal UI
./kubegraf [namespace]

# Run tests
go test ./...
```

## Making Changes

### Code Style
- Follow standard Go conventions
- Run `go fmt` before committing
- Add comments for exported functions
- Keep functions focused and small

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove)
- Reference issues when applicable

Examples:
```
Add support for StatefulSets
Fix pod metrics display bug
Update README with new features
```

### Testing
- Test your changes thoroughly
- Ensure existing functionality works
- Test on different namespaces and clusters

## Submitting Changes

1. **Push your changes**
   ```bash
   git push origin feature/my-new-feature
   ```

2. **Create Pull Request**
   - Go to GitHub and create a PR
   - Provide clear description of changes
   - Reference any related issues

3. **Code Review**
   - Address feedback promptly
   - Keep discussions respectful
   - Be open to suggestions

## Areas to Contribute

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Tests

## Questions?

- Open an [issue](https://github.com/kubegraf/kubegraf/issues)
- Start a [discussion](https://github.com/kubegraf/kubegraf/discussions)

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build great tools for the community.

Thank you for contributing! 🙏
