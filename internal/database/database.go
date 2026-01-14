package database

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Database provides encrypted storage for credentials and sessions
type Database struct {
	db      *sql.DB
	gcm     cipher.AEAD
	enabled bool
	dbPath  string // Store database path for restore operations
}

// User represents a local user with RBAC
type User struct {
	ID           int       `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"` // Never expose
	Email        string    `json:"email"`
	Role         string    `json:"role"` // admin, developer, viewer
	CreatedAt    time.Time `json:"created_at"`
	LastLogin    time.Time `json:"last_login"`
	Enabled      bool      `json:"enabled"`
}

// Session represents an active user session
type Session struct {
	ID        string    `json:"id"`
	UserID    int       `json:"user_id"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// CloudCredential represents encrypted cloud provider credentials
type CloudCredential struct {
	ID           int       `json:"id"`
	Provider     string    `json:"provider"` // gcp, aws, azure
	Name         string    `json:"name"`
	AccessToken  string    `json:"-"` // Encrypted
	RefreshToken string    `json:"-"` // Encrypted
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
}

// Notification represents a persistent in-app notification
type Notification struct {
	ID           string     `json:"id"`
	CreatedAt    time.Time  `json:"created_at"`
	Severity     string     `json:"severity"` // info, success, warning, error, security, policy
	Title        string     `json:"title"`
	Body         string     `json:"body"`
	Source       string     `json:"source"` // local, release, policy, announcements
	LinkURL      *string    `json:"link_url,omitempty"`
	IsRead       bool       `json:"is_read"`
	DedupeKey    string     `json:"dedupe_key"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	MetadataJSON *string    `json:"metadata_json,omitempty"`
}

// NewDatabase creates or opens the SQLite database
func NewDatabase(dbPath, encryptionKey string) (*Database, error) {
	// Create directory if not exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("create db directory: %w", err)
	}

	// Open database with corruption prevention settings
	// WAL mode: Write-Ahead Logging for better concurrency and crash recovery
	// busy_timeout: Wait up to 5 seconds for locks (prevents "database is locked" errors)
	// foreign_keys: Enable foreign key constraints for data integrity
	// synchronous: NORMAL mode balances safety and performance
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=1&_synchronous=NORMAL")
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(1) // SQLite works best with single connection
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0) // Don't close connections

	// Verify database integrity on startup
	if err := verifyDatabaseIntegrity(db); err != nil {
		return nil, fmt.Errorf("database integrity check failed: %w", err)
	}

	// Initialize encryption
	key := sha256.Sum256([]byte(encryptionKey))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create GCM: %w", err)
	}

	database := &Database{
		db:      db,
		gcm:     gcm,
		enabled: true,
		dbPath:  dbPath,
	}

	// Initialize schema
	if err := database.initSchema(); err != nil {
		return nil, fmt.Errorf("init schema: %w", err)
	}

	return database, nil
}

// initSchema creates tables if they don't exist
func (d *Database) initSchema() error {
	// First, run migrations for existing tables
	if err := d.migrateSchema(); err != nil {
		return fmt.Errorf("migrate schema: %w", err)
	}

	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		email TEXT,
		role TEXT NOT NULL DEFAULT 'viewer',
		created_at DATETIME NOT NULL,
		last_login DATETIME,
		enabled BOOLEAN NOT NULL DEFAULT 1
	);

	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id INTEGER NOT NULL,
		token TEXT NOT NULL,
		expires_at DATETIME NOT NULL,
		created_at DATETIME NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS cloud_credentials (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		provider TEXT NOT NULL,
		name TEXT NOT NULL,
		access_token TEXT NOT NULL,
		refresh_token TEXT,
		expires_at DATETIME,
		created_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		action TEXT NOT NULL,
		resource_type TEXT,
		resource_name TEXT,
		namespace TEXT,
		status TEXT NOT NULL,
		details TEXT,
		timestamp DATETIME NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS app_installations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		app_name TEXT NOT NULL,
		display_name TEXT NOT NULL,
		version TEXT NOT NULL,
		namespace TEXT NOT NULL,
		status TEXT NOT NULL, -- 'pending', 'in_progress', 'success', 'failed'
		progress INTEGER DEFAULT 0, -- 0-100
		error_message TEXT,
		started_at DATETIME NOT NULL,
		completed_at DATETIME,
		created_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS cluster_sources (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL, -- 'default', 'file', 'inline'
		path TEXT, -- For 'file' type, the kubeconfig file path
		content_path TEXT, -- For 'inline' type, path to saved file in .kubegraf
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL,
		UNIQUE(name, type)
	);

	CREATE TABLE IF NOT EXISTS clusters (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		cluster_id TEXT NOT NULL UNIQUE, -- Stable hash ID (sourceId + contextName)
		name TEXT NOT NULL,
		context_name TEXT NOT NULL,
		source_id INTEGER,
		provider TEXT,
		environment TEXT, -- 'prod', 'staging', 'dev', 'local'
		kubeconfig_path TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'UNKNOWN', -- UNKNOWN, CONNECTING, CONNECTED, DEGRADED, DISCONNECTED, AUTH_ERROR
		connected BOOLEAN NOT NULL DEFAULT 0, -- Legacy field, kept for compatibility
		active BOOLEAN NOT NULL DEFAULT 0, -- Whether this is the current active cluster
		last_used DATETIME,
		last_checked DATETIME,
		last_error TEXT,
		consecutive_failures INTEGER NOT NULL DEFAULT 0,
		consecutive_successes INTEGER NOT NULL DEFAULT 0,
		error TEXT, -- Legacy field
		is_default BOOLEAN NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL,
		FOREIGN KEY (source_id) REFERENCES cluster_sources(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS workspace_context (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		payload TEXT NOT NULL,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS notifications (
		id TEXT PRIMARY KEY,
		created_at DATETIME NOT NULL,
		severity TEXT NOT NULL, -- info, success, warning, error, security, policy
		title TEXT NOT NULL,
		body TEXT NOT NULL,
		source TEXT NOT NULL, -- local, release, policy, announcements
		link_url TEXT,
		is_read BOOLEAN NOT NULL DEFAULT 0,
		dedupe_key TEXT UNIQUE NOT NULL,
		expires_at DATETIME,
		metadata_json TEXT
	);

	CREATE TABLE IF NOT EXISTS app_state (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS monitored_events (
		id TEXT PRIMARY KEY,
		timestamp DATETIME NOT NULL,
		type TEXT NOT NULL,
		category TEXT NOT NULL,
		severity TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		namespace TEXT,
		resource TEXT,
		details TEXT,
		count INTEGER NOT NULL DEFAULT 1,
		group_id TEXT,
		source TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS log_errors (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME NOT NULL,
		pod TEXT NOT NULL,
		namespace TEXT NOT NULL,
		container TEXT NOT NULL,
		status_code INTEGER NOT NULL,
		method TEXT,
		path TEXT,
		message TEXT,
		error_type TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
	CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
	CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
	CREATE INDEX IF NOT EXISTS idx_cloud_credentials_provider ON cloud_credentials(provider);
	CREATE INDEX IF NOT EXISTS idx_app_installations_status ON app_installations(status);
	CREATE INDEX IF NOT EXISTS idx_app_installations_app_name ON app_installations(app_name);
	CREATE INDEX IF NOT EXISTS idx_clusters_connected ON clusters(connected);
	CREATE INDEX IF NOT EXISTS idx_clusters_last_used ON clusters(last_used);
	CREATE INDEX IF NOT EXISTS idx_clusters_cluster_id ON clusters(cluster_id);
	CREATE INDEX IF NOT EXISTS idx_clusters_status ON clusters(status);
	CREATE INDEX IF NOT EXISTS idx_clusters_active ON clusters(active);
	CREATE INDEX IF NOT EXISTS idx_clusters_source_id ON clusters(source_id);
	CREATE INDEX IF NOT EXISTS idx_cluster_sources_type ON cluster_sources(type);
	CREATE INDEX IF NOT EXISTS idx_monitored_events_timestamp ON monitored_events(timestamp);
	CREATE INDEX IF NOT EXISTS idx_monitored_events_severity ON monitored_events(severity);
	CREATE INDEX IF NOT EXISTS idx_monitored_events_namespace ON monitored_events(namespace);
	CREATE INDEX IF NOT EXISTS idx_log_errors_timestamp ON log_errors(timestamp);
	CREATE INDEX IF NOT EXISTS idx_log_errors_status_code ON log_errors(status_code);
	CREATE INDEX IF NOT EXISTS idx_log_errors_namespace ON log_errors(namespace);
	CREATE INDEX IF NOT EXISTS idx_log_errors_method ON log_errors(method);
	CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
	CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity);
	CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
	CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key);

	INSERT OR IGNORE INTO workspace_context (id, payload, updated_at)
	VALUES (1, '{"selectedNamespaces":[],"selectedCluster":"","filters":{}}', CURRENT_TIMESTAMP);
	`

	_, err := d.db.Exec(schema)
	return err
}

// migrateSchema handles schema migrations for existing databases
func (d *Database) migrateSchema() error {
	// Check if clusters table exists
	var tableInfo string
	err := d.db.QueryRow("SELECT sql FROM sqlite_master WHERE type='table' AND name='clusters'").Scan(&tableInfo)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("check clusters table: %w", err)
	}

	// If clusters table exists, check if it needs migration
	if err == nil && tableInfo != "" {
		// Check if cluster_id column exists by trying to query it
		_, err = d.db.Exec("SELECT cluster_id FROM clusters LIMIT 1")
		if err != nil {
			// Column doesn't exist, need to migrate
			fmt.Printf("⚠️  Migrating clusters table schema...\n")
			
			// Drop old table (data will be lost, but this is for new schema)
			if _, err := d.db.Exec("DROP TABLE IF EXISTS clusters"); err != nil {
				return fmt.Errorf("drop old clusters table: %w", err)
			}
			fmt.Printf("✅ Dropped old clusters table\n")
		}
	}

	return nil
}

// Encrypt encrypts data using AES-256-GCM
func (d *Database) Encrypt(plaintext string) (string, error) {
	nonce := make([]byte, d.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := d.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts data using AES-256-GCM
func (d *Database) Decrypt(encrypted string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return "", err
	}

	nonceSize := d.gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := d.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// User operations
func (d *Database) CreateUser(username, passwordHash, email, role string) (*User, error) {
	result, err := d.db.Exec(
		"INSERT INTO users (username, password_hash, email, role, created_at) VALUES (?, ?, ?, ?, ?)",
		username, passwordHash, email, role, time.Now(),
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()
	return &User{
		ID:           int(id),
		Username:     username,
		PasswordHash: passwordHash,
		Email:        email,
		Role:         role,
		CreatedAt:    time.Now(),
		Enabled:      true,
	}, nil
}

func (d *Database) GetUser(username string) (*User, error) {
	var user User
	err := d.db.QueryRow(
		"SELECT id, username, password_hash, email, role, created_at, last_login, enabled FROM users WHERE username = ?",
		username,
	).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.Email, &user.Role, &user.CreatedAt, &user.LastLogin, &user.Enabled)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return &user, err
}

func (d *Database) CountUsers() (int, error) {
	var count int
	err := d.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	return count, err
}

func (d *Database) UpdateLastLogin(userID int) error {
	_, err := d.db.Exec("UPDATE users SET last_login = ? WHERE id = ?", time.Now(), userID)
	return err
}

// Session operations
func (d *Database) CreateSession(userID int, token string, duration time.Duration) (*Session, error) {
	session := &Session{
		ID:        generateSessionID(),
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(duration),
		CreatedAt: time.Now(),
	}

	_, err := d.db.Exec(
		"INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
		session.ID, session.UserID, session.Token, session.ExpiresAt, session.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return session, nil
}

func (d *Database) GetSession(token string) (*Session, error) {
	var session Session
	err := d.db.QueryRow(
		"SELECT id, user_id, token, expires_at, created_at FROM sessions WHERE token = ? AND expires_at > ?",
		token, time.Now(),
	).Scan(&session.ID, &session.UserID, &session.Token, &session.ExpiresAt, &session.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found or expired")
	}
	return &session, err
}

func (d *Database) DeleteSession(token string) error {
	_, err := d.db.Exec("DELETE FROM sessions WHERE token = ?", token)
	return err
}

func (d *Database) CleanExpiredSessions() error {
	_, err := d.db.Exec("DELETE FROM sessions WHERE expires_at <= ?", time.Now())
	return err
}

// Cloud Credential operations
func (d *Database) SaveCloudCredential(provider, name, accessToken, refreshToken string, expiresAt time.Time) error {
	encryptedAccess, err := d.Encrypt(accessToken)
	if err != nil {
		return err
	}

	encryptedRefresh := ""
	if refreshToken != "" {
		encryptedRefresh, err = d.Encrypt(refreshToken)
		if err != nil {
			return err
		}
	}

	_, err = d.db.Exec(
		"INSERT OR REPLACE INTO cloud_credentials (provider, name, access_token, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		provider, name, encryptedAccess, encryptedRefresh, expiresAt, time.Now(),
	)
	return err
}

func (d *Database) GetCloudCredential(provider, name string) (*CloudCredential, error) {
	var cred CloudCredential
	var encryptedAccess, encryptedRefresh string

	err := d.db.QueryRow(
		"SELECT id, provider, name, access_token, refresh_token, expires_at, created_at FROM cloud_credentials WHERE provider = ? AND name = ?",
		provider, name,
	).Scan(&cred.ID, &cred.Provider, &cred.Name, &encryptedAccess, &encryptedRefresh, &cred.ExpiresAt, &cred.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("credential not found")
	}
	if err != nil {
		return nil, err
	}

	// Decrypt tokens
	cred.AccessToken, err = d.Decrypt(encryptedAccess)
	if err != nil {
		return nil, fmt.Errorf("decrypt access token: %w", err)
	}

	if encryptedRefresh != "" {
		cred.RefreshToken, err = d.Decrypt(encryptedRefresh)
		if err != nil {
			return nil, fmt.Errorf("decrypt refresh token: %w", err)
		}
	}

	return &cred, nil
}

// Audit Log operations
func (d *Database) LogAudit(userID int, action, resourceType, resourceName, namespace, status string, details interface{}) error {
	detailsJSON, _ := json.Marshal(details)
	_, err := d.db.Exec(
		"INSERT INTO audit_logs (user_id, action, resource_type, resource_name, namespace, status, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID, action, resourceType, resourceName, namespace, status, string(detailsJSON), time.Now(),
	)
	return err
}

// Settings operations
func (d *Database) GetSetting(key string) (string, error) {
	var value string
	err := d.db.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (d *Database) SetSetting(key, value string) error {
	_, err := d.db.Exec(
		"INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
		key, value, time.Now(),
	)
	return err
}

// Close closes the database connection
func (d *Database) Close() error {
	return d.db.Close()
}

// AppInstallation represents an app installation record
type AppInstallation struct {
	ID           int       `json:"id"`
	AppName      string    `json:"app_name"`
	DisplayName  string    `json:"display_name"`
	Version      string    `json:"version"`
	Namespace    string    `json:"namespace"`
	Status       string    `json:"status"`   // 'pending', 'in_progress', 'success', 'failed'
	Progress     int       `json:"progress"` // 0-100
	ErrorMessage string    `json:"error_message,omitempty"`
	StartedAt    time.Time `json:"started_at"`
	CompletedAt  time.Time `json:"completed_at,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// App installation operations
func (d *Database) CreateAppInstallation(appName, displayName, version, namespace string) (*AppInstallation, error) {
	now := time.Now()
	result, err := d.db.Exec(
		"INSERT INTO app_installations (app_name, display_name, version, namespace, status, progress, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		appName, displayName, version, namespace, "pending", 0, now, now,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()
	return &AppInstallation{
		ID:          int(id),
		AppName:     appName,
		DisplayName: displayName,
		Version:     version,
		Namespace:   namespace,
		Status:      "pending",
		Progress:    0,
		StartedAt:   now,
		CreatedAt:   now,
	}, nil
}

func (d *Database) UpdateAppInstallation(id int, status string, progress int, errorMessage string) error {
	var query string
	var args []interface{}

	if status == "success" || status == "failed" {
		// Update with completion time
		query = "UPDATE app_installations SET status = ?, progress = ?, error_message = ?, completed_at = ? WHERE id = ?"
		args = []interface{}{status, progress, errorMessage, time.Now(), id}
	} else {
		// Update without completion time
		query = "UPDATE app_installations SET status = ?, progress = ?, error_message = ? WHERE id = ?"
		args = []interface{}{status, progress, errorMessage, id}
	}

	_, err := d.db.Exec(query, args...)
	return err
}

func (d *Database) GetAppInstallation(id int) (*AppInstallation, error) {
	var installation AppInstallation
	var completedAt sql.NullTime

	err := d.db.QueryRow(
		"SELECT id, app_name, display_name, version, namespace, status, progress, error_message, started_at, completed_at, created_at FROM app_installations WHERE id = ?",
		id,
	).Scan(&installation.ID, &installation.AppName, &installation.DisplayName, &installation.Version, &installation.Namespace, &installation.Status, &installation.Progress, &installation.ErrorMessage, &installation.StartedAt, &completedAt, &installation.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("installation not found")
	}
	if err != nil {
		return nil, err
	}

	if completedAt.Valid {
		installation.CompletedAt = completedAt.Time
	}

	return &installation, nil
}

func (d *Database) GetAppInstallations(limit int) ([]AppInstallation, error) {
	query := "SELECT id, app_name, display_name, version, namespace, status, progress, error_message, started_at, completed_at, created_at FROM app_installations ORDER BY created_at DESC"
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var installations []AppInstallation
	for rows.Next() {
		var installation AppInstallation
		var completedAt sql.NullTime

		err := rows.Scan(&installation.ID, &installation.AppName, &installation.DisplayName, &installation.Version, &installation.Namespace, &installation.Status, &installation.Progress, &installation.ErrorMessage, &installation.StartedAt, &completedAt, &installation.CreatedAt)
		if err != nil {
			return nil, err
		}

		if completedAt.Valid {
			installation.CompletedAt = completedAt.Time
		}

		installations = append(installations, installation)
	}

	return installations, nil
}

// Helper function to generate session ID
func generateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// GetDB returns the underlying sql.DB for advanced operations
// This allows other packages to work with the database when needed
func (d *Database) GetDB() *sql.DB {
	return d.db
}

// verifyDatabaseIntegrity checks if the database is corrupted
func verifyDatabaseIntegrity(db *sql.DB) error {
	var result string
	err := db.QueryRow("PRAGMA integrity_check").Scan(&result)
	if err != nil {
		return fmt.Errorf("integrity check query failed: %w", err)
	}

	if result != "ok" {
		return fmt.Errorf("database integrity check failed: %s", result)
	}

	return nil
}

// CheckIntegrity performs an integrity check on the database
func (d *Database) CheckIntegrity() error {
	if d.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return verifyDatabaseIntegrity(d.db)
}

// Backup creates a backup of the database to the specified path
// Uses VACUUM INTO for safe, atomic backup (SQLite 3.27+)
func (d *Database) Backup(backupPath string) error {
	if d.db == nil {
		return fmt.Errorf("database not initialized")
	}

	// Create backup directory if needed
	dir := filepath.Dir(backupPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("create backup directory: %w", err)
	}

	// Use VACUUM INTO for safe backup (SQLite 3.27+)
	// This creates an atomic backup that's guaranteed to be consistent
	_, err := d.db.Exec(fmt.Sprintf("VACUUM INTO %q", backupPath))
	if err != nil {
		// Fallback: use file copy if VACUUM INTO not supported
		return d.fileCopyBackup(backupPath)
	}

	// Verify backup integrity
	backupDB, err := sql.Open("sqlite3", backupPath+"?_journal_mode=WAL")
	if err != nil {
		return fmt.Errorf("open backup for verification: %w", err)
	}
	defer backupDB.Close()

	if err := verifyDatabaseIntegrity(backupDB); err != nil {
		os.Remove(backupPath) // Remove corrupted backup
		return fmt.Errorf("backup integrity check failed: %w", err)
	}

	return nil
}

// fileCopyBackup performs a file-based backup (fallback method)
func (d *Database) fileCopyBackup(backupPath string) error {
	// Get the database path from the connection string
	// This is a simplified approach - in production you'd store the path
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Use SQLite backup API via connection
	conn, err := d.db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("get database connection: %w", err)
	}
	defer conn.Close()

	// For now, we'll use a simple approach: create a checkpoint and copy
	// In production, use sqlite3_backup API for proper backup
	_, err = d.db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
	if err != nil {
		return fmt.Errorf("checkpoint failed: %w", err)
	}

	// Note: File copy backup requires knowing the source path
	// This is a simplified implementation
	return fmt.Errorf("file copy backup requires source path - use VACUUM INTO instead")
}

// RestoreFromBackup restores the database from a backup file
// WARNING: This will overwrite the current database
func (d *Database) RestoreFromBackup(backupPath, dbPath string) error {
	// Verify backup integrity first
	backupDB, err := sql.Open("sqlite3", backupPath+"?_journal_mode=WAL")
	if err != nil {
		return fmt.Errorf("open backup database: %w", err)
	}
	defer backupDB.Close()

	if err := verifyDatabaseIntegrity(backupDB); err != nil {
		return fmt.Errorf("backup integrity check failed: %w", err)
	}

	// Close current database connection
	if err := d.db.Close(); err != nil {
		return fmt.Errorf("close current database: %w", err)
	}

	// Copy backup file to database location
	sourceFile, err := os.Open(backupPath)
	if err != nil {
		return fmt.Errorf("open backup file: %w", err)
	}
	defer sourceFile.Close()

	// Remove existing database file if it exists
	if _, err := os.Stat(dbPath); err == nil {
		if err := os.Remove(dbPath); err != nil {
			return fmt.Errorf("remove existing database: %w", err)
		}
	}

	destFile, err := os.Create(dbPath)
	if err != nil {
		return fmt.Errorf("create database file: %w", err)
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	if err != nil {
		return fmt.Errorf("copy backup file: %w", err)
	}

	// Reopen database
	newDB, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=1&_synchronous=NORMAL")
	if err != nil {
		return fmt.Errorf("reopen database: %w", err)
	}

	// Set connection pool settings
	newDB.SetMaxOpenConns(1)
	newDB.SetMaxIdleConns(1)
	newDB.SetConnMaxLifetime(0)

	// Verify restored database
	if err := verifyDatabaseIntegrity(newDB); err != nil {
		return fmt.Errorf("restored database integrity check failed: %w", err)
	}

	d.db = newDB
	d.dbPath = dbPath
	return nil
}

// AutoBackup creates automatic backups on a schedule
func (d *Database) AutoBackup(ctx context.Context, backupDir string, interval time.Duration) error {
	if err := os.MkdirAll(backupDir, 0700); err != nil {
		return fmt.Errorf("create backup directory: %w", err)
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			backupPath := filepath.Join(backupDir, fmt.Sprintf("backup-%s.db", time.Now().Format("20060102-150405")))
			if err := d.Backup(backupPath); err != nil {
				fmt.Printf("⚠️  Backup failed: %v\n", err)
				continue
			}
			fmt.Printf("✅ Database backup created: %s\n", backupPath)

			// Clean up old backups (keep last 7 days)
			d.cleanupOldBackups(backupDir, 7*24*time.Hour)
		}
	}
}

// cleanupOldBackups removes backup files older than the specified duration
func (d *Database) cleanupOldBackups(backupDir string, olderThan time.Duration) {
	files, err := os.ReadDir(backupDir)
	if err != nil {
		return
	}

	cutoff := time.Now().Add(-olderThan)
	for _, file := range files {
		if file.IsDir() {
			continue
		}

		info, err := file.Info()
		if err != nil {
			continue
		}

		if info.ModTime().Before(cutoff) {
			os.Remove(filepath.Join(backupDir, file.Name()))
		}
	}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Notification Management
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// CreateNotificationIfNotExists creates a notification only if the dedupe_key doesn't exist
func (d *Database) CreateNotificationIfNotExists(notification *Notification) error {
	query := `
		INSERT OR IGNORE INTO notifications (
			id, created_at, severity, title, body, source, link_url,
			is_read, dedupe_key, expires_at, metadata_json
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := d.db.Exec(
		query,
		notification.ID,
		notification.CreatedAt,
		notification.Severity,
		notification.Title,
		notification.Body,
		notification.Source,
		notification.LinkURL,
		notification.IsRead,
		notification.DedupeKey,
		notification.ExpiresAt,
		notification.MetadataJSON,
	)
	return err
}

// ListNotifications retrieves notifications with optional filtering
func (d *Database) ListNotifications(filterRead *bool, severity *string) ([]*Notification, error) {
	query := `
		SELECT id, created_at, severity, title, body, source, link_url,
		       is_read, dedupe_key, expires_at, metadata_json
		FROM notifications
		WHERE 1=1
	`
	args := []interface{}{}

	if filterRead != nil {
		query += " AND is_read = ?"
		args = append(args, *filterRead)
	}

	if severity != nil && *severity != "" {
		query += " AND severity = ?"
		args = append(args, *severity)
	}

	query += " ORDER BY created_at DESC"

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []*Notification
	for rows.Next() {
		n := &Notification{}
		err := rows.Scan(
			&n.ID,
			&n.CreatedAt,
			&n.Severity,
			&n.Title,
			&n.Body,
			&n.Source,
			&n.LinkURL,
			&n.IsRead,
			&n.DedupeKey,
			&n.ExpiresAt,
			&n.MetadataJSON,
		)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}

	return notifications, rows.Err()
}

// MarkNotificationRead marks a single notification as read
func (d *Database) MarkNotificationRead(id string) error {
	_, err := d.db.Exec("UPDATE notifications SET is_read = 1 WHERE id = ?", id)
	return err
}

// MarkAllNotificationsRead marks all notifications as read
func (d *Database) MarkAllNotificationsRead() error {
	_, err := d.db.Exec("UPDATE notifications SET is_read = 1")
	return err
}

// UnreadNotificationCount returns the count of unread notifications
func (d *Database) UnreadNotificationCount() (int, error) {
	var count int
	err := d.db.QueryRow("SELECT COUNT(*) FROM notifications WHERE is_read = 0").Scan(&count)
	return count, err
}

// DeleteExpiredNotifications removes notifications past their expiration date
func (d *Database) DeleteExpiredNotifications() error {
	_, err := d.db.Exec("DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < ?", time.Now())
	return err
}

// DeleteNotification removes a single notification
func (d *Database) DeleteNotification(id string) error {
	_, err := d.db.Exec("DELETE FROM notifications WHERE id = ?", id)
	return err
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// App State Management
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GetAppState retrieves a value from app_state
func (d *Database) GetAppState(key string) (string, error) {
	var value string
	err := d.db.QueryRow("SELECT value FROM app_state WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

// SetAppState sets a value in app_state (upsert)
func (d *Database) SetAppState(key, value string) error {
	_, err := d.db.Exec(`
		INSERT INTO app_state (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, key, value)
	return err
}
