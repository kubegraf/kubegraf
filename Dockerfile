# Multi-stage Dockerfile for KubeGraf
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/ui/solid

# Copy package files
COPY ui/solid/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY ui/solid/ ./

# Build frontend
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.24-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/ui/solid/dist ./web/dist

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags "-X main.version=${VERSION:-1.6.0}" -o kubegraf .

# Stage 3: Runtime image
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    sqlite \
    curl \
    && update-ca-certificates

# Create non-root user
RUN addgroup -g 1000 kubegraf && \
    adduser -D -u 1000 -G kubegraf kubegraf

WORKDIR /app

# Copy binary from builder
COPY --from=backend-builder /app/kubegraf /app/kubegraf

# Create necessary directories
RUN mkdir -p /app/.kubegraf && \
    chown -R kubegraf:kubegraf /app

# Switch to non-root user
USER kubegraf

# Expose default port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

# Run the application
ENTRYPOINT ["/app/kubegraf", "web", "--port=3000"]

