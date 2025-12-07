package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/kubegraf/kubegraf/internal/database"
)

// Re-export User for convenience
type User = database.User

// IAM provides local identity and access management
type IAM struct {
	db      *database.Database
	enabled bool
}

// Role represents user permission level
type Role string

const (
	RoleAdmin     Role = "admin"
	RoleDeveloper Role = "developer"
	RoleViewer    Role = "viewer"
)

// Permission represents resource access level
type Permission struct {
	Resource  string   // pods, services, deployments, etc.
	Actions   []string // get, list, create, update, delete
	Namespace string   // * for all namespaces
}

// NewIAM creates a new IAM instance
func NewIAM(db *database.Database, enabled bool) *IAM {
	return &IAM{
		db:      db,
		enabled: enabled,
	}
}

// Register creates a new user account
func (iam *IAM) Register(username, password, email, role string) (*User, error) {
	if !iam.enabled {
		return nil, fmt.Errorf("IAM not enabled")
	}

	// Validate role
	if role != string(RoleAdmin) && role != string(RoleDeveloper) && role != string(RoleViewer) {
		return nil, fmt.Errorf("invalid role: %s", role)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	// Create user
	user, err := iam.db.CreateUser(username, string(hashedPassword), email, role)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	return user, nil
}

// Login authenticates a user and returns a session token
func (iam *IAM) Login(username, password string) (string, *User, error) {
	if !iam.enabled {
		return "", nil, fmt.Errorf("IAM not enabled")
	}

	// Get user
	user, err := iam.db.GetUser(username)
	if err != nil {
		return "", nil, fmt.Errorf("invalid credentials")
	}

	// Check if user is enabled
	if !user.Enabled {
		return "", nil, fmt.Errorf("user account disabled")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, fmt.Errorf("invalid credentials")
	}

	// Generate session token
	token := generateToken()
	session, err := iam.db.CreateSession(user.ID, token, 24*time.Hour)
	if err != nil {
		return "", nil, fmt.Errorf("create session: %w", err)
	}

	// Update last login
	iam.db.UpdateLastLogin(user.ID)

	return session.Token, user, nil
}

// Logout invalidates a session
func (iam *IAM) Logout(token string) error {
	if !iam.enabled {
		return nil
	}
	return iam.db.DeleteSession(token)
}

// ValidateSession checks if a token is valid and returns the user
func (iam *IAM) ValidateSession(token string) (*User, error) {
	if !iam.enabled {
		// Return default admin user when IAM disabled
		return &User{
			ID:       1,
			Username: "admin",
			Role:     string(RoleAdmin),
			Enabled:  true,
		}, nil
	}

	session, err := iam.db.GetSession(token)
	if err != nil {
		return nil, fmt.Errorf("invalid or expired session")
	}

	user, err := iam.db.GetUser(fmt.Sprintf("%d", session.UserID))
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	return user, nil
}

// CheckPermission verifies if user has permission to perform action
func (iam *IAM) CheckPermission(user *User, resource, action, namespace string) bool {
	if !iam.enabled {
		return true // Allow all when IAM disabled
	}

	permissions := iam.GetRolePermissions(Role(user.Role))

	for _, perm := range permissions {
		// Check resource match
		if perm.Resource != "*" && perm.Resource != resource {
			continue
		}

		// Check namespace match
		if perm.Namespace != "*" && perm.Namespace != namespace {
			continue
		}

		// Check action match
		for _, allowedAction := range perm.Actions {
			if allowedAction == "*" || allowedAction == action {
				return true
			}
		}
	}

	return false
}

// GetRolePermissions returns permissions for a role
func (iam *IAM) GetRolePermissions(role Role) []Permission {
	switch role {
	case RoleAdmin:
		return []Permission{
			{
				Resource:  "*",
				Actions:   []string{"*"},
				Namespace: "*",
			},
		}

	case RoleDeveloper:
		return []Permission{
			{
				Resource:  "*",
				Actions:   []string{"get", "list", "watch"},
				Namespace: "*",
			},
			{
				Resource:  "pods",
				Actions:   []string{"get", "list", "watch", "create", "update", "delete"},
				Namespace: "*",
			},
			{
				Resource:  "deployments",
				Actions:   []string{"get", "list", "watch", "create", "update", "delete", "scale"},
				Namespace: "*",
			},
			{
				Resource:  "services",
				Actions:   []string{"get", "list", "watch", "create", "update", "delete"},
				Namespace: "*",
			},
			{
				Resource:  "configmaps",
				Actions:   []string{"get", "list", "watch", "create", "update", "delete"},
				Namespace: "*",
			},
		}

	case RoleViewer:
		return []Permission{
			{
				Resource:  "*",
				Actions:   []string{"get", "list", "watch"},
				Namespace: "*",
			},
		}

	default:
		return []Permission{}
	}
}

// Middleware for HTTP authentication
func (iam *IAM) AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !iam.enabled {
			next(w, r)
			return
		}

		// Extract token from Authorization header or cookie
		token := extractToken(r)
		if token == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Validate session
		user, err := iam.ValidateSession(token)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Store user in context
		r.Header.Set("X-User-ID", fmt.Sprintf("%d", user.ID))
		r.Header.Set("X-User-Role", user.Role)

		next(w, r)
	}
}

// HTTP Handlers

// handleLogin handles user login
func (ws *WebServer) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	token, user, err := ws.iam.Login(req.Username, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// Set cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "kubegraf_session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteStrictMode,
		MaxAge:   86400, // 24 hours
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// handleLogout handles user logout
func (ws *WebServer) handleLogout(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	if token != "" {
		ws.iam.Logout(token)
	}

	// Clear cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "kubegraf_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})

	w.WriteHeader(http.StatusOK)
}

// handleRegister handles user registration (admin only)
func (ws *WebServer) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Email    string `json:"email"`
		Role     string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	// Check if this is the first user registration
	userCount, err := ws.db.CountUsers()
	if err != nil {
		http.Error(w, "database error", http.StatusInternalServerError)
		return
	}

	// If there are existing users, verify admin permission
	if userCount > 0 {
		// Extract token and validate session
		token := extractToken(r)
		if token == "" {
			http.Error(w, "unauthorized - admin authentication required", http.StatusUnauthorized)
			return
		}

		currentUser, err := ws.iam.ValidateSession(token)
		if err != nil || currentUser.Role != string(RoleAdmin) {
			http.Error(w, "forbidden - admin role required", http.StatusForbidden)
			return
		}
	} else {
		// First user must be admin
		if req.Role != string(RoleAdmin) {
			req.Role = string(RoleAdmin)
		}
	}

	user, err := ws.iam.Register(req.Username, req.Password, req.Email, req.Role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(user)
}

// handleGetCurrentUser returns current user info
func (ws *WebServer) handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	if token == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := ws.iam.ValidateSession(token)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(user)
}

// Helper functions

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func extractToken(r *http.Request) string {
	// Try Authorization header first
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	// Try cookie
	cookie, err := r.Cookie("kubegraf_session")
	if err == nil {
		return cookie.Value
	}

	return ""
}
