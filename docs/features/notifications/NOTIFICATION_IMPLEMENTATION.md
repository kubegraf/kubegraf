# Notification Center & Policy Gate Implementation

## Overview
This document describes the comprehensive implementation of the Notification Center, Policy Gate, and Announcements system for KubeGraf.

**Branch:** `feature/notification-center-policy-gate`

---

## ✅ COMPLETED: Backend Implementation (100%)

### 1. Database Schema (`internal/database/database.go`)

#### Notifications Table
```sql
CREATE TABLE notifications (
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
```

#### App State Table
```sql
CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Keys stored:**
- `last_seen_app_version` - For upgrade detection
- `accepted_policy_version` - For policy gate
- `announcements_opt_in` - User preference ("true"/"false")
- `last_announcements_fetch_at` - Rate limiting

#### Repository Methods Added
- `CreateNotificationIfNotExists(notification)` - Deduplicated insert
- `ListNotifications(filterRead, severity)` - Query with filters
- `MarkNotificationRead(id)` - Mark single as read
- `MarkAllNotificationsRead()` - Mark all as read
- `UnreadNotificationCount()` - Get unread count
- `DeleteExpiredNotifications()` - Cleanup expired
- `DeleteNotification(id)` - Delete single
- `GetAppState(key)` - Get state value
- `SetAppState(key, value)` - Upsert state value

---

### 2. Policy Service (`policy_service.go`)

**Constant:**
```go
const POLICY_VERSION = "2026-01-03"
```

**Key Methods:**
- `CheckPolicyOnStartup()` - Checks version mismatch, creates notification
- `IsPolicyRequired()` - Thread-safe policy gate check
- `AcceptPolicy()` - Marks policy as accepted
- `GetPolicyStatus()` - Returns current policy status

**Behavior:**
- On startup, compares `accepted_policy_version` with `POLICY_VERSION`
- If mismatch, sets `policy_required = true` and creates policy notification
- Blocks cluster operations until policy accepted

---

### 3. Announcements Service (`announcements_service.go`)

**URL:**
```go
const ANNOUNCEMENTS_URL = "https://kubegraf.io/announcements.json"
```

**Privacy Guarantees:**
- ✅ Default: OFF
- ✅ NO identifiers sent
- ✅ NO telemetry
- ✅ Simple GET request
- ✅ 24-hour rate limit
- ✅ Deduplication via `dedupe_key`

**Methods:**
- `IsOptedIn()` - Check opt-in status
- `SetOptIn(bool)` - Set preference
- `GetLastFetchTime()` - Get last fetch timestamp
- `CanFetch()` - Respects opt-in + 24h limit
- `FetchAnnouncements()` - Privacy-safe fetch
- `GetStatus()` - Current announcements status

**JSON Format:**
```json
{
  "version": 1,
  "items": [
    {
      "id": "2026-01-03-policy-update",
      "severity": "policy|security|info|warning",
      "title": "...",
      "body": "...markdown...",
      "link_url": "https://kubegraf.io/...",
      "expires_at": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

### 4. Web Handlers

#### Notifications API (`web_notifications.go`)
- `GET /api/notifications?filter=all|unread&severity=<optional>`
- `POST /api/notifications/mark-read` - `{id}`
- `POST /api/notifications/mark-all-read`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/delete` - `{id}`

#### Policy API (`web_policy.go`)
- `GET /api/policy/status` - Returns policy status
- `POST /api/policy/accept` - `{policy_version}` - Accept policy
- `policyRequiredMiddleware()` - Blocks endpoints with 403 POLICY_NOT_ACCEPTED

#### Announcements API (`web_announcements.go`)
- `GET /api/announcements/status`
- `POST /api/announcements/opt-in` - `{opt_in: boolean}`
- `POST /api/announcements/check` - Manual fetch trigger

---

### 5. WebServer Integration (`web_server.go`)

**Added Fields:**
```go
type WebServer struct {
  // ... existing fields
  policyService        *PolicyService
  announcementsService *AnnouncementsService
}
```

**Initialization (NewWebServer):**
```go
ws.policyService = NewPolicyService(ws.db)
ws.announcementsService = NewAnnouncementsService(ws.db)
ws.policyService.CheckPolicyOnStartup()
```

**Startup (Start method):**
```go
// Check version upgrade
ws.checkVersionUpgrade()

// Auto-fetch announcements (if opted in + 24h passed)
if canFetch {
  go ws.announcementsService.FetchAnnouncements()
}
```

**Upgrade Detection (`checkVersionUpgrade`):**
- Compares `GetVersion()` with `last_seen_app_version`
- Creates release notification if version changed
- Updates `last_seen_app_version`

**Routes Registered:**
- All notification endpoints
- All policy endpoints
- All announcements endpoints

---

### 6. Frontend API Service (`ui/solid/src/services/api.ts`)

**New Methods:**
```typescript
// Notifications
api.getNotifications(filter?: 'all'|'unread', severity?: string)
api.markNotificationRead(id: string)
api.markAllNotificationsRead()
api.getUnreadNotificationCount()
api.deleteNotification(id: string)

// Policy
api.getPolicyStatus()
api.acceptPolicy(policyVersion: string)

// Announcements
api.getAnnouncementsStatus()
api.setAnnouncementsOptIn(optIn: boolean)
api.checkAnnouncements()
```

**New Types:**
```typescript
export interface Notification {
  id: string;
  created_at: string;
  severity: 'info' | 'success' | 'warning' | 'error' | 'security' | 'policy';
  title: string;
  body: string;
  source: 'local' | 'release' | 'policy' | 'announcements';
  link_url?: string;
  is_read: boolean;
  dedupe_key: string;
  expires_at?: string;
  metadata_json?: string;
}

export interface PolicyStatus {
  policy_required: boolean;
  policy_version: string;
  accepted_policy_version: string;
}

export interface AnnouncementsStatus {
  opt_in: boolean;
  last_fetch_at?: string;
}
```

---

## 📋 TODO: Frontend Components

The following frontend components need to be implemented to complete the feature:

### 1. Move Bell to Header
**File:** `ui/solid/src/components/Header.tsx`
- Remove bell from `AppContent.tsx` footer (line 143)
- Add bell icon to top-right of Header (trailing actions area)
- Show unread badge count
- Click opens NotificationCenter panel
- Accessibility: aria-label, aria-haspopup, aria-expanded

### 2. Update NotificationCenter Component
**File:** `ui/solid/src/components/NotificationCenter.tsx`
- Replace localStorage with backend API calls
- Use `api.getNotifications()`, `api.markNotificationRead()`, etc.
- Add tabs: All / Unread
- Add "Mark all read" button
- Map severity to icons/colors
- Support link_url (external links)
- Support markdown in body (optional)
- Empty states

### 3. Create PolicyModal Component
**File:** `ui/solid/src/components/PolicyModal.tsx` (NEW)
- Blocking modal (focus trap, no close button initially)
- Title: "Updated Terms & Privacy"
- Summary bullets of changes
- Link to full policy text: `/policy` route
- Buttons:
  - Primary: "Accept" → calls `api.acceptPolicy()`
  - Secondary: "Exit" or "Close"
- Shows when `policy_required === true`
- On accept: close modal, show toast

### 4. Policy Interceptor
**File:** `ui/solid/src/services/api.ts` or new interceptor
- Check all API responses for 403 with `error_code === "POLICY_NOT_ACCEPTED"`
- If detected, show PolicyModal

### 5. Update Settings Component
**File:** `ui/solid/src/routes/Settings.tsx`
- Add "Announcements" section
- Toggle: "Fetch KubeGraf announcements (no telemetry)"
- Helper text: "Downloads a small announcements file. No identifiers or usage data are sent."
- "Check now" button (visible only when opted in)
- Show last fetched time

### 6. Create Policy Route
**File:** `ui/solid/src/routes/Policy.tsx` (NEW)
- Route: `/policy`
- Display full Terms & Privacy policy text
- Markdown support
- Link back to main app

---

## Privacy & Security

### Privacy Guarantees
✅ **Default: 100% Offline**
- No outbound network calls by default
- All data stored locally in SQLite

✅ **Announcements: Opt-In Only**
- User must explicitly enable
- Clear UI messaging: "No telemetry"
- Only downloads static JSON
- NO identifiers sent (no user ID, cluster info, kubeconfig, device info, IP)
- NO analytics or tracking

✅ **Policy Gate: Local Only**
- Policy acceptance stored locally
- No backend tracking of who accepted what
- Blocks cluster operations until accepted

### Security Features
- SQLite encryption (AES-256)
- Deduplication prevents spam
- Expiration cleanup
- Rate limiting (24h for announcements)

---

## Testing Checklist

### Backend Tests (Pending)
- [ ] Notification CRUD operations
- [ ] Deduplication works
- [ ] Unread count correct
- [ ] Policy gate blocks endpoints
- [ ] Announcements fetch respects opt-in
- [ ] Announcements 24h rate limit
- [ ] Upgrade detection creates notification

### Frontend Tests (Pending)
- [ ] Bell in header, not footer
- [ ] Badge shows unread count
- [ ] Click bell opens panel
- [ ] Policy modal appears when required
- [ ] Cluster action triggers policy modal on 403
- [ ] Settings toggle enables announcements
- [ ] "Check now" calls endpoint

---

## Files Created/Modified

### Created
1. `policy_service.go` - Policy gate service
2. `announcements_service.go` - Announcements fetch service
3. `web_notifications.go` - Notification API handlers
4. `web_policy.go` - Policy API handlers
5. `web_announcements.go` - Announcements API handlers
6. `NOTIFICATION_IMPLEMENTATION.md` - This file

### Modified
1. `internal/database/database.go` - Schema + repository methods
2. `web_server.go` - Service integration + routes + upgrade detection
3. `ui/solid/src/services/api.ts` - API methods + types

### To Be Created (Frontend)
1. `ui/solid/src/components/PolicyModal.tsx`
2. `ui/solid/src/routes/Policy.tsx`

### To Be Modified (Frontend)
1. `ui/solid/src/components/Header.tsx` - Add bell to top-right
2. `ui/solid/src/components/AppContent.tsx` - Remove bell from footer
3. `ui/solid/src/components/NotificationCenter.tsx` - Backend integration
4. `ui/solid/src/routes/Settings.tsx` - Announcements toggle

---

## Next Steps

1. **Move bell to header** - Highest priority, user-facing change
2. **Update NotificationCenter** - Backend integration
3. **Create PolicyModal** - Blocking policy gate
4. **Update Settings** - Announcements toggle
5. **Create /policy route** - Policy text page
6. **Add tests** - Backend + frontend
7. **Documentation** - User guide

---

## Deployment Notes

### Database Migration
- Tables created automatically on startup (CREATE TABLE IF NOT EXISTS)
- No manual migration needed
- Existing databases will get new tables on next startup

### Version Upgrade
- First run after deployment: no notification (no previous version)
- Subsequent upgrades: notification appears in bell

### Policy Gate
- First run: policy required (no accepted version)
- User must accept before accessing cluster features
- Acceptance persists across restarts

---

## Architecture Decisions

### Why SQLite?
- Already in use by KubeGraf
- Local-first, no network dependency
- Fast, reliable, encrypted
- Survives restarts

### Why Deduplication?
- Prevents duplicate notifications on restarts
- `dedupe_key` ensures idempotency
- Safe to call CreateNotificationIfNotExists multiple times

### Why 24h Rate Limit?
- Balances freshness with bandwidth
- Prevents excessive polling
- User can always "Check now" manually

### Why Blocking Modal?
- Policy acceptance is critical for legal compliance
- Must be explicit, not ignorable
- Focus trap ensures user engagement

---

## Future Enhancements

1. **Notification Categories** - Filter by source (release, policy, etc.)
2. **Notification Actions** - Buttons in notification (e.g., "Install Update")
3. **Rich Notifications** - Images, code blocks in markdown body
4. **Push Notifications** - Desktop notifications (optional)
5. **Notification History** - Archive beyond 24 hours
6. **Multi-Language Policy** - i18n support
7. **Policy Diff** - Show what changed between versions
8. **Announcements Preview** - See announcements before opting in

---

## Support & Troubleshooting

### Common Issues

**Q: Notifications not appearing?**
A: Check that database is initialized. Look for `~/.kubegraf/db.sqlite`.

**Q: Policy gate not working?**
A: Check `app_state` table for `accepted_policy_version`. Should be empty or old on first run.

**Q: Announcements not fetching?**
A: Verify opt-in is true: `SELECT value FROM app_state WHERE key='announcements_opt_in'`.

**Q: Upgrade notification not appearing?**
A: Check `last_seen_app_version` in `app_state`. Should be empty or different from current version.

### Debug Queries

```sql
-- View all notifications
SELECT * FROM notifications ORDER BY created_at DESC;

-- View unread count
SELECT COUNT(*) FROM notifications WHERE is_read = 0;

-- View app state
SELECT * FROM app_state;

-- Clear policy acceptance (for testing)
DELETE FROM app_state WHERE key = 'accepted_policy_version';

-- Clear all notifications
DELETE FROM notifications;
```

---

## License

Copyright 2025 KubeGraf Contributors

Licensed under the Apache License, Version 2.0
