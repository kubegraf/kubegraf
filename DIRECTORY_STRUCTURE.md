# KubeGraf Directory Structure

## Current Issues Identified

1. **117 Go files in root directory** - Should be organized into packages
2. **Duplicate script directories** - `script/` and `scripts/`
3. **Web assets scattered** - `web/`, `web/dist/`, `web/assets/`
4. **Backup files in repository** - Multiple `.backup` files

## Proposed Directory Structure

```
kubegraf/
├── cmd/                          # Command-line applications
│   ├── cli/                      # CLI commands
│   ├── kubegraf-tui/            # TUI application
│   └── server/                   # Web server (NEW - move main.go here)
│
├── internal/                     # Private application code
│   ├── api/                      # API handlers and routes
│   ├── brain/                    # AI/ML brain functionality
│   ├── cache/                    # Caching implementations
│   ├── changes/                  # Change tracking
│   ├── cli/                      # CLI internal logic
│   ├── cluster/                  # Cluster management
│   ├── clusters/                 # Multi-cluster support
│   ├── core/                     # Core business logic
│   ├── database/                 # Database operations
│   ├── explain/                  # Explanation engine
│   ├── feast/                    # Feast integration
│   ├── fuzzy/                    # Fuzzy matching
│   ├── gpu/                      # GPU management
│   ├── history/                  # History tracking
│   ├── inference/                # ML inference
│   ├── knowledge/                # Knowledge base
│   ├── ml/                       # Machine learning
│   ├── security/                 # Security features
│   ├── update/                   # Update management
│   ├── validation/               # Validation logic
│   ├── web/                      # Web server internals
│   └── workload/                 # Workload management
│
├── pkg/                          # Public library code (reusable)
│   ├── capabilities/             # Capability detection
│   ├── incidents/                # Incident management
│   ├── instrumentation/          # Instrumentation
│   ├── metrics/                  # Metrics collection
│   ├── telemetry/                # Telemetry
│   └── update/                   # Update utilities
│
├── ui/                           # User interface applications
│   └── solid/                    # SolidJS web UI
│       ├── dist/                 # Build output
│       ├── src/                  # Source code
│       └── public/               # Static assets
│
├── web/                          # Embedded web assets (Go embed)
│   └── dist/                     # Production build (embedded)
│       ├── assets/               # JS/CSS/Images
│       ├── index.html            # Entry point
│       └── favicon.svg           # Favicon
│
├── manifests/                    # Kubernetes manifests
│   └── helm/                     # Helm charts
│
├── scripts/                      # Build and utility scripts (CONSOLIDATE)
│   ├── build/                    # Build scripts
│   ├── deployment/               # Deployment scripts
│   ├── docs/                     # Documentation generation (from script/)
│   └── setup/                    # Setup scripts
│
├── docs/                         # Documentation
│   ├── app_inventory/            # App inventory docs
│   ├── getting-started/          # Getting started guides
│   ├── guides/                   # User guides
│   ├── introduction/             # Introduction
│   ├── reports/                  # Reports
│   ├── roadmap/                  # Roadmap
│   └── workflows/                # Workflow documentation
│
├── test-resources/               # Test fixtures and resources
│   ├── helm-charts/              # Test Helm charts
│   └── manifests/                # Test manifests
│
├── mcp/                          # Model Context Protocol
│   ├── registry/                 # MCP registry
│   ├── server/                   # MCP server
│   ├── tools/                    # MCP tools
│   └── types/                    # MCP types
│
├── plugins/                      # Plugin system
├── installer/                    # Installation packages
│   └── windows/                  # Windows installers
│
├── homebrew-tap/                 # Homebrew tap
├── benchmarks/                   # Performance benchmarks
├── backups/                      # REMOVE - Use git for backups
├── client/                       # Client libraries
├── cost/                         # Cost analysis
│   └── pricing/                  # Pricing models
├── brain/                        # Brain/AI utilities
├── kiali/                        # Kiali integration
└── utils/                        # CONSOLIDATE into internal/ or pkg/
    └── brain/                    # Move to internal/brain/utils/
```

## Reorganization Plan

### Phase 1: Consolidate Scripts
- [ ] Move all scripts from `script/` to `scripts/` subdirectories
- [ ] Create `scripts/build/`, `scripts/docs/`, `scripts/deployment/`
- [ ] Remove empty `script/` directory

### Phase 2: Organize Root Go Files
- [ ] Create `cmd/server/` for main application entry point
- [ ] Move web handlers to `internal/web/handlers/`
- [ ] Move business logic to appropriate `internal/` packages
- [ ] Keep only `main.go` in cmd/server/

### Phase 3: Clean Web Assets
- [ ] Keep only `web/dist/` for embedded assets
- [ ] Move `web/assets/` contents to `web/dist/assets/`
- [ ] Ensure proper `.gitignore` for build artifacts

### Phase 4: Remove Backups
- [ ] Delete `backups/` directory
- [ ] Remove `.backup` files from repository
- [ ] Add `*.backup` to `.gitignore`

### Phase 5: Consolidate Utils
- [ ] Move `utils/brain/` to `internal/brain/utils/`
- [ ] Remove `utils/` directory

## Benefits

1. **Clear Separation of Concerns**
   - `cmd/` - Entry points
   - `internal/` - Private code
   - `pkg/` - Public libraries
   - `ui/` - Frontend code

2. **Better Organization**
   - No more 117 Go files in root
   - Single scripts directory
   - Clean web assets structure

3. **Easier Maintenance**
   - Find files quickly
   - Understand project structure
   - Onboard new developers faster

4. **Go Best Practices**
   - Follows standard Go project layout
   - Clear public vs private APIs
   - Proper package organization
