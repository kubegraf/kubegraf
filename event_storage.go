// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"time"

	"github.com/kubegraf/kubegraf/internal/database"
)

// EventStorage handles persistent storage of events and log errors
type EventStorage struct {
	db *database.Database
}

// NewEventStorage creates a new event storage instance
func NewEventStorage(db *database.Database) *EventStorage {
	if db == nil {
		return nil
	}
	return &EventStorage{db: db}
}

// StoreMonitoredEvent stores a monitored event in the database
func (es *EventStorage) StoreMonitoredEvent(event *MonitoredEvent) error {
	if es == nil || es.db == nil {
		return nil // Silently skip if database not available
	}

	detailsJSON, _ := json.Marshal(event.Details)

	query := `
		INSERT OR REPLACE INTO monitored_events 
		(id, timestamp, type, category, severity, title, description, namespace, resource, details, count, group_id, source, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := es.db.GetDB().Exec(query,
		event.ID,
		event.Timestamp,
		event.Type,
		event.Category,
		string(event.Severity),
		event.Title,
		event.Description,
		event.Namespace,
		event.Resource,
		string(detailsJSON),
		event.Count,
		event.GroupID,
		event.Source,
		time.Now(),
	)

	if err != nil {
		log.Printf("[EventStorage] Error storing monitored event: %v", err)
		return err
	}

	return nil
}

// StoreLogError stores a log error in the database
func (es *EventStorage) StoreLogError(logError *LogError) error {
	if es == nil || es.db == nil {
		return nil // Silently skip if database not available
	}

	query := `
		INSERT INTO log_errors 
		(timestamp, pod, namespace, container, status_code, method, path, message, error_type, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := es.db.GetDB().Exec(query,
		logError.Timestamp,
		logError.Pod,
		logError.Namespace,
		logError.Container,
		logError.StatusCode,
		logError.Method,
		logError.Path,
		logError.Message,
		logError.ErrorType,
		time.Now(),
	)

	if err != nil {
		log.Printf("[EventStorage] Error storing log error: %v", err)
		return err
	}

	return nil
}

// GetMonitoredEvents retrieves monitored events from the database with filters
func (es *EventStorage) GetMonitoredEvents(filter FilterOptions) ([]MonitoredEvent, error) {
	if es == nil || es.db == nil {
		return []MonitoredEvent{}, nil
	}

	query := `SELECT id, timestamp, type, category, severity, title, description, namespace, resource, details, count, group_id, source
		FROM monitored_events WHERE 1=1`
	args := []interface{}{}

	if filter.Namespace != "" {
		query += " AND namespace = ?"
		args = append(args, filter.Namespace)
	}

	if filter.Severity != "" {
		query += " AND severity = ?"
		args = append(args, filter.Severity)
	}

	if filter.Type != "" {
		query += " AND type = ?"
		args = append(args, filter.Type)
	}

	if !filter.Since.IsZero() {
		query += " AND timestamp >= ?"
		args = append(args, filter.Since)
	}

	query += " ORDER BY timestamp DESC"

	if filter.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, filter.Limit)
	} else {
		query += " LIMIT 1000" // Default limit
	}

	rows, err := es.db.GetDB().Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []MonitoredEvent
	for rows.Next() {
		var event MonitoredEvent
		var severityStr string
		var detailsJSON string

		err := rows.Scan(
			&event.ID,
			&event.Timestamp,
			&event.Type,
			&event.Category,
			&severityStr,
			&event.Title,
			&event.Description,
			&event.Namespace,
			&event.Resource,
			&detailsJSON,
			&event.Count,
			&event.GroupID,
			&event.Source,
		)
		if err != nil {
			continue
		}

		event.Severity = EventSeverity(severityStr)
		if detailsJSON != "" {
			json.Unmarshal([]byte(detailsJSON), &event.Details)
		}

		events = append(events, event)
	}

	return events, nil
}

// GetLogErrors retrieves log errors from the database with filters
// Only returns critical errors: 500, 502, 503, or POST calls
func (es *EventStorage) GetLogErrors(filter FilterOptions, criticalOnly bool) ([]LogError, error) {
	if es == nil || es.db == nil {
		return []LogError{}, nil
	}

	query := `SELECT id, timestamp, pod, namespace, container, status_code, method, path, message, error_type
		FROM log_errors WHERE 1=1`
	args := []interface{}{}

	// Filter for critical errors only: 500, 502, 503, or POST calls
	if criticalOnly {
		query += " AND (status_code IN (500, 502, 503) OR method = 'POST')"
	}

	if filter.Namespace != "" {
		query += " AND namespace = ?"
		args = append(args, filter.Namespace)
	}

	if !filter.Since.IsZero() {
		query += " AND timestamp >= ?"
		args = append(args, filter.Since)
	}

	query += " ORDER BY timestamp DESC"

	if filter.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, filter.Limit)
	} else {
		query += " LIMIT 500" // Default limit
	}

	rows, err := es.db.GetDB().Query(query, args...)
	if err != nil {
		log.Printf("[EventStorage] Error querying log errors: %v, query: %s, args: %v", err, query, args)
		return nil, err
	}
	defer rows.Close()

	var errors []LogError
	log.Printf("[EventStorage] Querying log errors: criticalOnly=%v, limit=%d, query: %s", criticalOnly, filter.Limit, query)
	for rows.Next() {
		var logError LogError
		var id int

		err := rows.Scan(
			&id,
			&logError.Timestamp,
			&logError.Pod,
			&logError.Namespace,
			&logError.Container,
			&logError.StatusCode,
			&logError.Method,
			&logError.Path,
			&logError.Message,
			&logError.ErrorType,
		)
		if err != nil {
			continue
		}

		errors = append(errors, logError)
	}

	log.Printf("[EventStorage] Found %d log errors from database (criticalOnly=%v)", len(errors), criticalOnly)
	return errors, nil
}

// CleanupOldEvents removes events older than the specified duration
func (es *EventStorage) CleanupOldEvents(olderThan time.Duration) error {
	if es == nil || es.db == nil {
		return nil
	}

	cutoff := time.Now().Add(-olderThan)

	// Cleanup monitored events
	_, err := es.db.GetDB().Exec("DELETE FROM monitored_events WHERE timestamp < ?", cutoff)
	if err != nil {
		log.Printf("[EventStorage] Error cleaning up monitored events: %v", err)
	}

	// Cleanup log errors
	_, err = es.db.GetDB().Exec("DELETE FROM log_errors WHERE timestamp < ?", cutoff)
	if err != nil {
		log.Printf("[EventStorage] Error cleaning up log errors: %v", err)
	}

	return nil
}

// GetEventStats calculates statistics from the database
func (es *EventStorage) GetEventStats() (map[string]interface{}, error) {
	if es == nil || es.db == nil {
		return map[string]interface{}{}, nil
	}

	stats := make(map[string]interface{})

	// Total events
	var totalEvents int
	err := es.db.GetDB().QueryRow("SELECT COUNT(*) FROM monitored_events").Scan(&totalEvents)
	if err == nil {
		stats["total_events"] = totalEvents
	}

	// Events by severity
	severityRows, err := es.db.GetDB().Query(`
		SELECT severity, COUNT(*) 
		FROM monitored_events 
		GROUP BY severity
	`)
	if err == nil {
		bySeverity := make(map[string]int)
		for severityRows.Next() {
			var severity string
			var count int
			if severityRows.Scan(&severity, &count) == nil {
				bySeverity[severity] = count
			}
		}
		severityRows.Close()
		stats["by_severity"] = bySeverity
	}

	// Total log errors (critical only: 500, 502, 503, POST)
	var totalErrors int
	err = es.db.GetDB().QueryRow(`
		SELECT COUNT(*) 
		FROM log_errors 
		WHERE status_code IN (500, 502, 503) OR method = 'POST'
	`).Scan(&totalErrors)
	if err == nil {
		stats["total_errors"] = totalErrors
	}

	return stats, nil
}

// DB returns the underlying database connection (for internal use)
func (es *EventStorage) DB() *sql.DB {
	if es == nil || es.db == nil {
		return nil
	}
	return es.db.GetDB()
}

