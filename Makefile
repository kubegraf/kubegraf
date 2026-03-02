# KubeGraf Makefile
# Builds the frontend and Go binary in the correct order.

BINARY      := kubegraf
UI_DIR      := ui/solid
WEB_DIST    := web/dist
GO_FLAGS    := -ldflags="-s -w"
CGO_ENABLED := 0

.PHONY: all build ui go clean run help

## all: Build everything (UI + Go binary)
all: build

## build: Build UI then Go binary (CGO_ENABLED=0, pure-Go SQLite)
build: ui go

## ui: Build the SolidJS frontend (outputs to web/dist)
ui:
	@echo "==> Building frontend..."
	cd $(UI_DIR) && npm install && npm run build
	@echo "==> Frontend built → $(WEB_DIST)"

## go: Build the Go binary (requires web/dist to exist)
go:
	@if [ ! -d "$(WEB_DIST)" ]; then \
		echo "ERROR: $(WEB_DIST) not found. Run 'make ui' first."; \
		exit 1; \
	fi
	@echo "==> Building Go binary..."
	CGO_ENABLED=$(CGO_ENABLED) go build $(GO_FLAGS) -o $(BINARY) .
	@echo "==> Binary built: ./$(BINARY)"

## run: Build and run the server on port 3000
run: build
	./$(BINARY) web --port=3000

## clean: Remove build artifacts
clean:
	rm -f $(BINARY)
	rm -rf $(WEB_DIST)

## help: Show this help
help:
	@grep -E '^## ' Makefile | sed 's/## //'
