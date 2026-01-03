package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/kubegraf/kubegraf/internal/database"
)

// Announcements URL - configurable
const ANNOUNCEMENTS_URL = "https://kubegraf.io/announcements.json"

// AnnouncementsService manages fetching and storing announcements
type AnnouncementsService struct {
	db *database.Database
}

// NewAnnouncementsService creates a new announcements service
func NewAnnouncementsService(db *database.Database) *AnnouncementsService {
	return &AnnouncementsService{db: db}
}

// AnnouncementItem represents a single announcement from the remote JSON
type AnnouncementItem struct {
	ID        string     `json:"id"`
	Severity  string     `json:"severity"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	LinkURL   *string    `json:"link_url,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// AnnouncementsResponse represents the remote announcements JSON structure
type AnnouncementsResponse struct {
	Version int                 `json:"version"`
	Items   []AnnouncementItem `json:"items"`
}

// IsOptedIn checks if user has opted in to announcements
func (as *AnnouncementsService) IsOptedIn() (bool, error) {
	optIn, err := as.db.GetAppState("announcements_opt_in")
	if err != nil {
		return false, err
	}
	return optIn == "true", nil
}

// SetOptIn sets the opt-in preference
func (as *AnnouncementsService) SetOptIn(optIn bool) error {
	value := "false"
	if optIn {
		value = "true"
	}
	return as.db.SetAppState("announcements_opt_in", value)
}

// GetLastFetchTime returns the last time announcements were fetched
func (as *AnnouncementsService) GetLastFetchTime() (time.Time, error) {
	lastFetch, err := as.db.GetAppState("last_announcements_fetch_at")
	if err != nil {
		return time.Time{}, err
	}
	if lastFetch == "" {
		return time.Time{}, nil
	}
	return time.Parse(time.RFC3339, lastFetch)
}

// SetLastFetchTime sets the last fetch time
func (as *AnnouncementsService) SetLastFetchTime(t time.Time) error {
	return as.db.SetAppState("last_announcements_fetch_at", t.Format(time.RFC3339))
}

// CanFetch checks if announcements can be fetched (respects 24h rate limit)
func (as *AnnouncementsService) CanFetch() (bool, error) {
	// Check opt-in
	optedIn, err := as.IsOptedIn()
	if err != nil {
		return false, err
	}
	if !optedIn {
		return false, nil
	}

	// Check last fetch time (24h rate limit)
	lastFetch, err := as.GetLastFetchTime()
	if err != nil {
		return false, err
	}

	if !lastFetch.IsZero() && time.Since(lastFetch) < 24*time.Hour {
		return false, nil
	}

	return true, nil
}

// FetchAnnouncements fetches announcements from the remote URL
// IMPORTANT: This does NOT send any identifiers or telemetry
func (as *AnnouncementsService) FetchAnnouncements() error {
	// Verify opt-in
	optedIn, err := as.IsOptedIn()
	if err != nil {
		return err
	}
	if !optedIn {
		return fmt.Errorf("announcements not opted in")
	}

	// Simple unauthenticated GET request
	// NO headers with identifiers, NO query parameters, NO telemetry
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(ANNOUNCEMENTS_URL)
	if err != nil {
		return fmt.Errorf("fetch announcements: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch announcements: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read announcements response: %w", err)
	}

	var announcementsResp AnnouncementsResponse
	if err := json.Unmarshal(body, &announcementsResp); err != nil {
		return fmt.Errorf("parse announcements JSON: %w", err)
	}

	// Store announcements as notifications
	for _, item := range announcementsResp.Items {
		notification := &database.Notification{
			ID:           uuid.New().String(),
			CreatedAt:    time.Now(),
			Severity:     item.Severity,
			Title:        item.Title,
			Body:         item.Body,
			Source:       "announcements",
			LinkURL:      item.LinkURL,
			IsRead:       false,
			DedupeKey:    fmt.Sprintf("announcements:%s", item.ID),
			ExpiresAt:    item.ExpiresAt,
			MetadataJSON: nil,
		}

		// Insert only if not exists (dedupe)
		if err := as.db.CreateNotificationIfNotExists(notification); err != nil {
			// Log error but continue with other announcements
			fmt.Printf("Warning: Failed to store announcement %s: %v\n", item.ID, err)
		}
	}

	// Update last fetch time
	if err := as.SetLastFetchTime(time.Now()); err != nil {
		return fmt.Errorf("set last fetch time: %w", err)
	}

	// Clean up expired notifications
	if err := as.db.DeleteExpiredNotifications(); err != nil {
		fmt.Printf("Warning: Failed to delete expired notifications: %v\n", err)
	}

	return nil
}

// GetAnnouncementsStatus returns the current announcements status
type AnnouncementsStatus struct {
	OptIn       bool      `json:"opt_in"`
	LastFetchAt time.Time `json:"last_fetch_at,omitempty"`
}

func (as *AnnouncementsService) GetStatus() (*AnnouncementsStatus, error) {
	optIn, err := as.IsOptedIn()
	if err != nil {
		return nil, err
	}

	lastFetch, err := as.GetLastFetchTime()
	if err != nil {
		return nil, err
	}

	return &AnnouncementsStatus{
		OptIn:       optIn,
		LastFetchAt: lastFetch,
	}, nil
}
