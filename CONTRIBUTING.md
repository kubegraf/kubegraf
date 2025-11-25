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
- kubectl with cluster access
- Git

### Build and Run
```bash
# Build
go build -o kubegraf

# Run
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
