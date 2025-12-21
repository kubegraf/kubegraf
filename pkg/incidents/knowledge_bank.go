// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// KnowledgeBank stores incident knowledge for learning and pattern recognition
type KnowledgeBank struct {
	db     *sql.DB
	dbPath string
	mu     sync.RWMutex
}

// IncidentRecord represents a stored incident record for learning
type IncidentRecord struct {
	ID             string                 `json:"id"`
	Fingerprint    string                 `json:"fingerprint"`
	Pattern        FailurePattern         `json:"pattern"`
	Severity       Severity               `json:"severity"`
	Resource       KubeResourceRef        `json:"resource"`
	ClusterContext string                 `json:"clusterContext"`
	Title          string                 `json:"title"`
	Description    string                 `json:"description"`
	Occurrences    int                    `json:"occurrences"`
	FirstSeen      time.Time              `json:"firstSeen"`
	LastSeen       time.Time              `json:"lastSeen"`
	ResolvedAt     *time.Time             `json:"resolvedAt,omitempty"`
	Resolution     string                 `json:"resolution,omitempty"`
	EvidencePack   *EvidencePack          `json:"evidencePack,omitempty"`
	Diagnosis      *CitedDiagnosis        `json:"diagnosis,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt      time.Time              `json:"createdAt"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

// FixRecord represents a stored fix execution record
type FixRecord struct {
	ID              string          `json:"id"`
	IncidentID      string          `json:"incidentId"`
	RunbookID       string          `json:"runbookId"`
	RunbookName     string          `json:"runbookName"`
	ExecutedAt      time.Time       `json:"executedAt"`
	CompletedAt     *time.Time      `json:"completedAt,omitempty"`
	InitiatedBy     string          `json:"initiatedBy"`
	DryRun          bool            `json:"dryRun"`
	Success         bool            `json:"success"`
	Error           string          `json:"error,omitempty"`
	Changes         []string        `json:"changes,omitempty"`
	RollbackCmd     string          `json:"rollbackCmd,omitempty"`
	RolledBack      bool            `json:"rolledBack"`
	TargetResource  KubeResourceRef `json:"targetResource"`
	VerificationOK  bool            `json:"verificationOk"`
}

// UserFeedback represents user feedback on an incident or fix
type UserFeedback struct {
	ID         string    `json:"id"`
	IncidentID string    `json:"incidentId"`
	FixID      string    `json:"fixId,omitempty"`
	Type       string    `json:"type"` // resolved, root_cause_confirmed, fix_worked, fix_failed, note
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
	CreatedBy  string    `json:"createdBy"`
}

// KnowledgePatternStats contains statistics for a failure pattern (from knowledge bank)
type KnowledgePatternStats struct {
	Pattern         FailurePattern `json:"pattern"`
	TotalIncidents  int            `json:"totalIncidents"`
	ResolvedCount   int            `json:"resolvedCount"`
	AvgResolutionMs int64          `json:"avgResolutionMs"`
	TopRunbooks     []RunbookStats `json:"topRunbooks"`
	LastSeen        time.Time      `json:"lastSeen"`
}

// RunbookStats contains statistics for a runbook
type RunbookStats struct {
	RunbookID    string  `json:"runbookId"`
	RunbookName  string  `json:"runbookName"`
	ExecutionCount int   `json:"executionCount"`
	SuccessCount   int   `json:"successCount"`
	SuccessRate    float64 `json:"successRate"`
}

// NewKnowledgeBank creates a new knowledge bank with SQLite storage
func NewKnowledgeBank(dataDir string) (*KnowledgeBank, error) {
	// Ensure data directory exists
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	dbPath := filepath.Join(dataDir, "knowledge.db")
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	kb := &KnowledgeBank{
		db:     db,
		dbPath: dbPath,
	}

	if err := kb.initSchema(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return kb, nil
}

// initSchema creates the database schema
func (kb *KnowledgeBank) initSchema() error {
	schema := `
	-- Incident records
	CREATE TABLE IF NOT EXISTS incidents (
		id TEXT PRIMARY KEY,
		fingerprint TEXT NOT NULL,
		pattern TEXT NOT NULL,
		severity TEXT NOT NULL,
		resource_json TEXT NOT NULL,
		cluster_context TEXT,
		title TEXT NOT NULL,
		description TEXT,
		occurrences INTEGER DEFAULT 1,
		first_seen DATETIME NOT NULL,
		last_seen DATETIME NOT NULL,
		resolved_at DATETIME,
		resolution TEXT,
		evidence_pack_json TEXT,
		diagnosis_json TEXT,
		metadata_json TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_incidents_fingerprint ON incidents(fingerprint);
	CREATE INDEX IF NOT EXISTS idx_incidents_pattern ON incidents(pattern);
	CREATE INDEX IF NOT EXISTS idx_incidents_first_seen ON incidents(first_seen);

	-- Fix execution records
	CREATE TABLE IF NOT EXISTS fixes (
		id TEXT PRIMARY KEY,
		incident_id TEXT NOT NULL,
		runbook_id TEXT NOT NULL,
		runbook_name TEXT NOT NULL,
		executed_at DATETIME NOT NULL,
		completed_at DATETIME,
		initiated_by TEXT NOT NULL,
		dry_run BOOLEAN NOT NULL,
		success BOOLEAN NOT NULL,
		error TEXT,
		changes_json TEXT,
		rollback_cmd TEXT,
		rolled_back BOOLEAN DEFAULT FALSE,
		target_resource_json TEXT NOT NULL,
		verification_ok BOOLEAN DEFAULT FALSE,
		FOREIGN KEY (incident_id) REFERENCES incidents(id)
	);
	CREATE INDEX IF NOT EXISTS idx_fixes_incident ON fixes(incident_id);
	CREATE INDEX IF NOT EXISTS idx_fixes_runbook ON fixes(runbook_id);

	-- User feedback
	CREATE TABLE IF NOT EXISTS feedback (
		id TEXT PRIMARY KEY,
		incident_id TEXT NOT NULL,
		fix_id TEXT,
		type TEXT NOT NULL,
		content TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_by TEXT,
		FOREIGN KEY (incident_id) REFERENCES incidents(id),
		FOREIGN KEY (fix_id) REFERENCES fixes(id)
	);
	CREATE INDEX IF NOT EXISTS idx_feedback_incident ON feedback(incident_id);

	-- Pattern statistics cache
	CREATE TABLE IF NOT EXISTS pattern_stats (
		pattern TEXT PRIMARY KEY,
		total_incidents INTEGER DEFAULT 0,
		resolved_count INTEGER DEFAULT 0,
		avg_resolution_ms INTEGER DEFAULT 0,
		last_seen DATETIME,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- Runbook statistics cache
	CREATE TABLE IF NOT EXISTS runbook_stats (
		runbook_id TEXT NOT NULL,
		pattern TEXT NOT NULL,
		execution_count INTEGER DEFAULT 0,
		success_count INTEGER DEFAULT 0,
		last_executed DATETIME,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (runbook_id, pattern)
	);

	-- Similar incident clusters
	CREATE TABLE IF NOT EXISTS incident_clusters (
		cluster_id TEXT NOT NULL,
		incident_id TEXT NOT NULL,
		similarity_score REAL NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (cluster_id, incident_id),
		FOREIGN KEY (incident_id) REFERENCES incidents(id)
	);

	-- Incident fingerprint statistics (for learning)
	CREATE TABLE IF NOT EXISTS incident_fingerprint_stats (
		fingerprint TEXT PRIMARY KEY,
		pattern TEXT NOT NULL,
		namespace TEXT NOT NULL,
		resource_kind TEXT NOT NULL,
		container TEXT,
		seen_count INTEGER DEFAULT 1,
		last_seen_ts INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_fingerprint_stats_pattern ON incident_fingerprint_stats(pattern);
	CREATE INDEX IF NOT EXISTS idx_fingerprint_stats_namespace ON incident_fingerprint_stats(namespace);

	-- Incident outcomes (for learning from feedback)
	CREATE TABLE IF NOT EXISTS incident_outcomes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		fingerprint TEXT NOT NULL,
		incident_id TEXT NOT NULL,
		ts INTEGER NOT NULL,
		proposed_primary_cause TEXT,
		proposed_confidence REAL,
		applied_fix_id TEXT,
		applied_fix_type TEXT,
		outcome TEXT CHECK(outcome IN ('worked','not_worked','unknown')) NOT NULL,
		time_to_recovery_sec INTEGER,
		notes TEXT,
		FOREIGN KEY (incident_id) REFERENCES incidents(id)
	);
	CREATE INDEX IF NOT EXISTS idx_outcomes_fingerprint ON incident_outcomes(fingerprint);
	CREATE INDEX IF NOT EXISTS idx_outcomes_incident ON incident_outcomes(incident_id);
	CREATE INDEX IF NOT EXISTS idx_outcomes_ts ON incident_outcomes(ts);

	-- Feature weights (for confidence scoring)
	CREATE TABLE IF NOT EXISTS feature_weights (
		key TEXT PRIMARY KEY,
		weight REAL NOT NULL,
		updated_ts INTEGER NOT NULL
	);

	-- Cause priors (for root cause ranking)
	CREATE TABLE IF NOT EXISTS cause_priors (
		cause_key TEXT PRIMARY KEY,
		prior REAL NOT NULL,
		updated_ts INTEGER NOT NULL
	);
	`

	_, err := kb.db.Exec(schema)
	if err != nil {
		return err
	}

	// Seed default feature weights if they don't exist
	return kb.seedDefaultWeights()
}

// seedDefaultWeights seeds default feature weights and cause priors
func (kb *KnowledgeBank) seedDefaultWeights() error {
	defaultWeights := map[string]float64{
		"signal.logs":    0.4,
		"signal.events":  0.3,
		"signal.metrics": 0.2,
		"signal.changes": 0.1,
	}

	defaultPriors := map[string]float64{
		"cause.app_crash":     0.25,
		"cause.oom":           0.25,
		"cause.probe_failure": 0.25,
		"cause.image_pull":    0.25,
	}

	now := time.Now().Unix()

	// Insert default weights
	for key, weight := range defaultWeights {
		_, err := kb.db.Exec(`
			INSERT OR IGNORE INTO feature_weights (key, weight, updated_ts)
			VALUES (?, ?, ?)
		`, key, weight, now)
		if err != nil {
			return fmt.Errorf("failed to seed weight %s: %w", key, err)
		}
	}

	// Insert default priors
	for key, prior := range defaultPriors {
		_, err := kb.db.Exec(`
			INSERT OR IGNORE INTO cause_priors (cause_key, prior, updated_ts)
			VALUES (?, ?, ?)
		`, key, prior, now)
		if err != nil {
			return fmt.Errorf("failed to seed prior %s: %w", key, err)
		}
	}

	return nil
}

// Close closes the database connection
func (kb *KnowledgeBank) Close() error {
	kb.mu.Lock()
	defer kb.mu.Unlock()
	return kb.db.Close()
}

// StoreIncident stores an incident record
func (kb *KnowledgeBank) StoreIncident(incident *Incident, evidencePack *EvidencePack, diagnosis *CitedDiagnosis) error {
	kb.mu.Lock()
	defer kb.mu.Unlock()

	resourceJSON, _ := json.Marshal(incident.Resource)
	evidenceJSON, _ := json.Marshal(evidencePack)
	diagnosisJSON, _ := json.Marshal(diagnosis)
	metadataJSON, _ := json.Marshal(incident.Metadata)

	query := `
	INSERT INTO incidents (
		id, fingerprint, pattern, severity, resource_json, cluster_context,
		title, description, occurrences, first_seen, last_seen,
		resolved_at, resolution, evidence_pack_json, diagnosis_json, metadata_json
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		occurrences = ?,
		last_seen = ?,
		resolved_at = ?,
		resolution = ?,
		evidence_pack_json = ?,
		diagnosis_json = ?,
		updated_at = CURRENT_TIMESTAMP
	`

	_, err := kb.db.Exec(query,
		incident.ID, incident.Fingerprint, incident.Pattern, incident.Severity,
		string(resourceJSON), incident.ClusterContext, incident.Title, incident.Description,
		incident.Occurrences, incident.FirstSeen, incident.LastSeen,
		incident.ResolvedAt, incident.Resolution, string(evidenceJSON), string(diagnosisJSON), string(metadataJSON),
		// Update values
		incident.Occurrences, incident.LastSeen, incident.ResolvedAt, incident.Resolution,
		string(evidenceJSON), string(diagnosisJSON),
	)

	if err != nil {
		return fmt.Errorf("failed to store incident: %w", err)
	}

	// Update pattern stats
	kb.updatePatternStats(incident.Pattern)

	return nil
}

// GetIncident retrieves an incident record by ID
func (kb *KnowledgeBank) GetIncident(id string) (*IncidentRecord, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT id, fingerprint, pattern, severity, resource_json, cluster_context,
		title, description, occurrences, first_seen, last_seen,
		resolved_at, resolution, evidence_pack_json, diagnosis_json, metadata_json,
		created_at, updated_at
	FROM incidents WHERE id = ?
	`

	row := kb.db.QueryRow(query, id)
	return kb.scanIncidentRow(row)
}

// scanIncidentRow scans a single incident row
func (kb *KnowledgeBank) scanIncidentRow(row *sql.Row) (*IncidentRecord, error) {
	var record IncidentRecord
	var resourceJSON, evidenceJSON, diagnosisJSON, metadataJSON string
	var resolvedAt sql.NullTime

	err := row.Scan(
		&record.ID, &record.Fingerprint, &record.Pattern, &record.Severity,
		&resourceJSON, &record.ClusterContext, &record.Title, &record.Description,
		&record.Occurrences, &record.FirstSeen, &record.LastSeen,
		&resolvedAt, &record.Resolution, &evidenceJSON, &diagnosisJSON, &metadataJSON,
		&record.CreatedAt, &record.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	json.Unmarshal([]byte(resourceJSON), &record.Resource)
	if evidenceJSON != "" {
		var ep EvidencePack
		json.Unmarshal([]byte(evidenceJSON), &ep)
		record.EvidencePack = &ep
	}
	if diagnosisJSON != "" {
		var cd CitedDiagnosis
		json.Unmarshal([]byte(diagnosisJSON), &cd)
		record.Diagnosis = &cd
	}
	if metadataJSON != "" {
		json.Unmarshal([]byte(metadataJSON), &record.Metadata)
	}
	if resolvedAt.Valid {
		record.ResolvedAt = &resolvedAt.Time
	}

	return &record, nil
}

// FindSimilarIncidents finds incidents with similar fingerprints
func (kb *KnowledgeBank) FindSimilarIncidents(fingerprint string, limit int) ([]*IncidentRecord, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT id, fingerprint, pattern, severity, resource_json, cluster_context,
		title, description, occurrences, first_seen, last_seen,
		resolved_at, resolution, evidence_pack_json, diagnosis_json, metadata_json,
		created_at, updated_at
	FROM incidents 
	WHERE fingerprint = ?
	ORDER BY last_seen DESC
	LIMIT ?
	`

	rows, err := kb.db.Query(query, fingerprint, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return kb.scanIncidentRows(rows)
}

// FindIncidentsByPattern finds incidents by pattern
func (kb *KnowledgeBank) FindIncidentsByPattern(pattern FailurePattern, limit int) ([]*IncidentRecord, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT id, fingerprint, pattern, severity, resource_json, cluster_context,
		title, description, occurrences, first_seen, last_seen,
		resolved_at, resolution, evidence_pack_json, diagnosis_json, metadata_json,
		created_at, updated_at
	FROM incidents 
	WHERE pattern = ?
	ORDER BY last_seen DESC
	LIMIT ?
	`

	rows, err := kb.db.Query(query, pattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return kb.scanIncidentRows(rows)
}

// scanIncidentRows scans multiple incident rows
func (kb *KnowledgeBank) scanIncidentRows(rows *sql.Rows) ([]*IncidentRecord, error) {
	var records []*IncidentRecord

	for rows.Next() {
		var record IncidentRecord
		var resourceJSON, evidenceJSON, diagnosisJSON, metadataJSON string
		var resolvedAt sql.NullTime

		err := rows.Scan(
			&record.ID, &record.Fingerprint, &record.Pattern, &record.Severity,
			&resourceJSON, &record.ClusterContext, &record.Title, &record.Description,
			&record.Occurrences, &record.FirstSeen, &record.LastSeen,
			&resolvedAt, &record.Resolution, &evidenceJSON, &diagnosisJSON, &metadataJSON,
			&record.CreatedAt, &record.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal([]byte(resourceJSON), &record.Resource)
		if evidenceJSON != "" {
			var ep EvidencePack
			json.Unmarshal([]byte(evidenceJSON), &ep)
			record.EvidencePack = &ep
		}
		if diagnosisJSON != "" {
			var cd CitedDiagnosis
			json.Unmarshal([]byte(diagnosisJSON), &cd)
			record.Diagnosis = &cd
		}
		if metadataJSON != "" {
			json.Unmarshal([]byte(metadataJSON), &record.Metadata)
		}
		if resolvedAt.Valid {
			record.ResolvedAt = &resolvedAt.Time
		}

		records = append(records, &record)
	}

	return records, rows.Err()
}

// StoreFix stores a fix execution record
func (kb *KnowledgeBank) StoreFix(fix *FixRecord) error {
	kb.mu.Lock()
	defer kb.mu.Unlock()

	changesJSON, _ := json.Marshal(fix.Changes)
	targetJSON, _ := json.Marshal(fix.TargetResource)

	query := `
	INSERT INTO fixes (
		id, incident_id, runbook_id, runbook_name, executed_at, completed_at,
		initiated_by, dry_run, success, error, changes_json, rollback_cmd,
		rolled_back, target_resource_json, verification_ok
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		completed_at = ?,
		success = ?,
		error = ?,
		rolled_back = ?,
		verification_ok = ?
	`

	_, err := kb.db.Exec(query,
		fix.ID, fix.IncidentID, fix.RunbookID, fix.RunbookName, fix.ExecutedAt, fix.CompletedAt,
		fix.InitiatedBy, fix.DryRun, fix.Success, fix.Error, string(changesJSON), fix.RollbackCmd,
		fix.RolledBack, string(targetJSON), fix.VerificationOK,
		// Update values
		fix.CompletedAt, fix.Success, fix.Error, fix.RolledBack, fix.VerificationOK,
	)

	if err != nil {
		return fmt.Errorf("failed to store fix: %w", err)
	}

	// Update runbook stats
	if !fix.DryRun {
		kb.updateRunbookStats(fix.RunbookID, fix.Success)
	}

	return nil
}

// GetFixesForIncident retrieves all fixes for an incident
func (kb *KnowledgeBank) GetFixesForIncident(incidentID string) ([]*FixRecord, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT id, incident_id, runbook_id, runbook_name, executed_at, completed_at,
		initiated_by, dry_run, success, error, changes_json, rollback_cmd,
		rolled_back, target_resource_json, verification_ok
	FROM fixes WHERE incident_id = ?
	ORDER BY executed_at DESC
	`

	rows, err := kb.db.Query(query, incidentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fixes []*FixRecord
	for rows.Next() {
		var fix FixRecord
		var changesJSON, targetJSON string
		var completedAt sql.NullTime

		err := rows.Scan(
			&fix.ID, &fix.IncidentID, &fix.RunbookID, &fix.RunbookName, &fix.ExecutedAt, &completedAt,
			&fix.InitiatedBy, &fix.DryRun, &fix.Success, &fix.Error, &changesJSON, &fix.RollbackCmd,
			&fix.RolledBack, &targetJSON, &fix.VerificationOK,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal([]byte(changesJSON), &fix.Changes)
		json.Unmarshal([]byte(targetJSON), &fix.TargetResource)
		if completedAt.Valid {
			fix.CompletedAt = &completedAt.Time
		}

		fixes = append(fixes, &fix)
	}

	return fixes, rows.Err()
}

// StoreFeedback stores user feedback
func (kb *KnowledgeBank) StoreFeedback(feedback *UserFeedback) error {
	kb.mu.Lock()
	defer kb.mu.Unlock()

	query := `
	INSERT INTO feedback (id, incident_id, fix_id, type, content, created_at, created_by)
	VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	_, err := kb.db.Exec(query,
		feedback.ID, feedback.IncidentID, feedback.FixID, feedback.Type,
		feedback.Content, feedback.CreatedAt, feedback.CreatedBy,
	)

	return err
}

// GetFeedbackForIncident retrieves feedback for an incident
func (kb *KnowledgeBank) GetFeedbackForIncident(incidentID string) ([]*UserFeedback, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT id, incident_id, fix_id, type, content, created_at, created_by
	FROM feedback WHERE incident_id = ?
	ORDER BY created_at DESC
	`

	rows, err := kb.db.Query(query, incidentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var feedbacks []*UserFeedback
	for rows.Next() {
		var fb UserFeedback
		var fixID sql.NullString

		err := rows.Scan(
			&fb.ID, &fb.IncidentID, &fixID, &fb.Type,
			&fb.Content, &fb.CreatedAt, &fb.CreatedBy,
		)
		if err != nil {
			return nil, err
		}

		if fixID.Valid {
			fb.FixID = fixID.String
		}

		feedbacks = append(feedbacks, &fb)
	}

	return feedbacks, rows.Err()
}

// updatePatternStats updates pattern statistics
func (kb *KnowledgeBank) updatePatternStats(pattern FailurePattern) {
	query := `
	INSERT INTO pattern_stats (pattern, total_incidents, last_seen, updated_at)
	VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	ON CONFLICT(pattern) DO UPDATE SET
		total_incidents = total_incidents + 1,
		last_seen = CURRENT_TIMESTAMP,
		updated_at = CURRENT_TIMESTAMP
	`
	kb.db.Exec(query, pattern)
}

// updateRunbookStats updates runbook statistics
func (kb *KnowledgeBank) updateRunbookStats(runbookID string, success bool) {
	successInc := 0
	if success {
		successInc = 1
	}

	query := `
	INSERT INTO runbook_stats (runbook_id, pattern, execution_count, success_count, last_executed, updated_at)
	VALUES (?, '', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	ON CONFLICT(runbook_id, pattern) DO UPDATE SET
		execution_count = execution_count + 1,
		success_count = success_count + ?,
		last_executed = CURRENT_TIMESTAMP,
		updated_at = CURRENT_TIMESTAMP
	`
	kb.db.Exec(query, runbookID, successInc, successInc)
}

// GetPatternStats retrieves statistics for a pattern
func (kb *KnowledgeBank) GetPatternStats(pattern FailurePattern) (*KnowledgePatternStats, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT pattern, total_incidents, resolved_count, avg_resolution_ms, last_seen
	FROM pattern_stats WHERE pattern = ?
	`

	var stats KnowledgePatternStats
	err := kb.db.QueryRow(query, pattern).Scan(
		&stats.Pattern, &stats.TotalIncidents, &stats.ResolvedCount,
		&stats.AvgResolutionMs, &stats.LastSeen,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Get top runbooks for this pattern
	rbQuery := `
	SELECT runbook_id, execution_count, success_count
	FROM runbook_stats
	WHERE pattern = ? OR pattern = ''
	ORDER BY execution_count DESC
	LIMIT 5
	`

	rows, err := kb.db.Query(rbQuery, pattern)
	if err != nil {
		return &stats, nil
	}
	defer rows.Close()

	for rows.Next() {
		var rb RunbookStats
		var execCount, successCount int
		err := rows.Scan(&rb.RunbookID, &execCount, &successCount)
		if err != nil {
			continue
		}
		rb.ExecutionCount = execCount
		rb.SuccessCount = successCount
		if execCount > 0 {
			rb.SuccessRate = float64(successCount) / float64(execCount)
		}
		stats.TopRunbooks = append(stats.TopRunbooks, rb)
	}

	return &stats, nil
}

// GetRunbookSuccessRate calculates the success rate for a runbook
func (kb *KnowledgeBank) GetRunbookSuccessRate(runbookID string) (float64, int) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT SUM(execution_count), SUM(success_count)
	FROM runbook_stats WHERE runbook_id = ?
	`

	var totalExec, totalSuccess int
	err := kb.db.QueryRow(query, runbookID).Scan(&totalExec, &totalSuccess)
	if err != nil || totalExec == 0 {
		return 0.0, 0
	}

	return float64(totalSuccess) / float64(totalExec), totalExec
}

// GetRecentIncidents retrieves recent incidents
func (kb *KnowledgeBank) GetRecentIncidents(limit int) ([]*IncidentRecord, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT id, fingerprint, pattern, severity, resource_json, cluster_context,
		title, description, occurrences, first_seen, last_seen,
		resolved_at, resolution, evidence_pack_json, diagnosis_json, metadata_json,
		created_at, updated_at
	FROM incidents
	ORDER BY last_seen DESC
	LIMIT ?
	`

	rows, err := kb.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return kb.scanIncidentRows(rows)
}

// GetUnresolvedIncidents retrieves unresolved incidents
func (kb *KnowledgeBank) GetUnresolvedIncidents(limit int) ([]*IncidentRecord, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	query := `
	SELECT id, fingerprint, pattern, severity, resource_json, cluster_context,
		title, description, occurrences, first_seen, last_seen,
		resolved_at, resolution, evidence_pack_json, diagnosis_json, metadata_json,
		created_at, updated_at
	FROM incidents
	WHERE resolved_at IS NULL
	ORDER BY last_seen DESC
	LIMIT ?
	`

	rows, err := kb.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return kb.scanIncidentRows(rows)
}

