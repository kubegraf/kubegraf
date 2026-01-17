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

## Local Development

### Prerequisites
- Go 1.21 or higher
- Node.js 20+ and npm (for UI development)
- kubectl with cluster access
- Git

### Build and Run

#### Backend (Go)
```bash
# Build the binary
go build -o kubegraf .

# Run the web server
./kubegraf web --port 3003
```

#### Frontend (Solid.js)
```bash
# Install dependencies
cd ui/solid
npm install

# Build for production
npm run build

# Copy to web/dist (required for Go server)
cd ../..
cp -r ui/solid/dist/* web/dist/
```

#### Development Workflow
```bash
# Rebuild everything and restart
pkill -f kubegraf 2>/dev/null; \
rm -rf web/dist/* && \
cp -r ui/solid/dist/* web/dist/ && \
go build -o kubegraf . && \
./kubegraf web --port 3003
```

### Testing
```bash
# Run Go tests
go test ./...

# Run with coverage
go test -cover ./...
```

## Code Style

- Follow standard Go conventions
- Run `go fmt` before committing
- Add comments for exported functions
- Keep functions focused and small
- For Solid.js: follow existing component patterns

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Tests pass (`go test ./...`)
- [ ] Code is formatted (`go fmt ./...`)
- [ ] No linting errors (if applicable)
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear and descriptive
- [ ] Changes are focused and well-tested

## Communication

- **No Slack/Discord** - We use GitHub Issues for all discussions
- Open an [issue](https://github.com/kubegraf/kubegraf/issues) for bugs or features
- Start a [discussion](https://github.com/kubegraf/kubegraf/discussions) for questions
- Email contact@kubegraf.io for support

## Areas to Contribute

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Tests

Thank you for contributing! 🙏

