// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")
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

package cli

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// Safety guidelines for CLI commands:
//
// 1. Database Access:
//    - CLI uses read-only operations (List, Get)
//    - SQLite supports concurrent reads via RWMutex
//    - CLI never writes to the database (web UI handles writes)
//    - Database lock errors are handled gracefully with retry guidance
//
// 2. Kubernetes Client:
//    - Each CLI command creates its own independent clientset
//    - No shared state with web UI's Kubernetes connections
//    - Read-only operations (get, list) - no mutations
//
// 3. File System:
//    - CLI reads from ~/.kubegraf/incidents/knowledge.db (read-only)
//    - No file locks held - connections are opened and closed quickly
//    - SQLite handles concurrent access automatically
//
// 4. Error Handling:
//    - Database lock errors return clear messages
//    - Non-fatal errors allow partial results (scanned incidents even if DB fails)
//    - Timeouts prevent hanging operations

// isDatabaseLocked checks if the error is a SQLite database locked error
func isDatabaseLocked(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "database is locked") ||
		strings.Contains(errStr, "database locked") ||
		strings.Contains(errStr, "SQLITE_BUSY") ||
		errors.Is(err, sql.ErrTxDone)
}

// retryWithBackoff retries a function with exponential backoff for database operations
// This helps handle transient database lock errors when web UI is writing
func retryWithBackoff(ctx context.Context, maxRetries int, fn func() error) error {
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			// Exponential backoff: 100ms, 200ms, 400ms
			backoff := time.Duration(100*(1<<uint(i-1))) * time.Millisecond
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
		}

		lastErr = fn()
		if lastErr == nil {
			return nil
		}

		// Only retry on database lock errors
		if !isDatabaseLocked(lastErr) {
			return lastErr
		}
	}

	return lastErr
}
