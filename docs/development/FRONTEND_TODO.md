# Frontend Implementation TODO

This document provides detailed steps to complete the frontend implementation of the Notification Center, Policy Gate, and Announcements system.

## Status: Backend 100% Complete ✅ | Frontend 0% Complete ⏳

---

## Task 1: Move Bell Icon to Header ⭐ HIGHEST PRIORITY

### Files to Modify
1. `ui/solid/src/components/Header.tsx`
2. `ui/solid/src/components/AppContent.tsx`

### Steps

#### Step 1.1: Remove Bell from Footer
**File:** `ui/solid/src/components/AppContent.tsx`
- **Line 143:** Remove `<NotificationCenter />` component
- **Line 8:** Remove import: `import NotificationCenter from './NotificationCenter';`

#### Step 1.2: Add Bell to Header
**File:** `ui/solid/src/components/Header.tsx`

Add import at top:
```typescript
import NotificationCenter from './NotificationCenter';
```

Find the trailing actions section (right side of header, after theme toggle, help menu, etc.)

Add NotificationCenter component:
```tsx
{/* Around line 900-1000, in the right-side actions */}
<NotificationCenter />
```

**Expected Result:**
- Bell icon appears in top-right of header
- Footer no longer has bell icon
- Bell shows unread badge
- Clicking bell opens notification panel

---

## Task 2: Update NotificationCenter Component

### File to Modify
`ui/solid/src/components/NotificationCenter.tsx`

### Current Implementation
- Uses localStorage
- Has bell button + panel
- Shows notifications list
- Mark as read functionality

### Required Changes

#### Step 2.1: Add Backend API Integration
Replace localStorage calls with API calls:

```typescript
import { api, type Notification } from '../services/api';
import { createResource, createSignal } from 'solid-js';

// Replace loadPersistentNotifications() with:
const [notifications, { refetch: refreshNotifications }] = createResource(
  () => api.getNotifications('all')
);

// Unread count:
const [unreadCountData] = createResource(
  () => api.getUnreadNotificationCount()
);
const unreadCount = () => unreadCountData()?.unread_count || 0;
```

#### Step 2.2: Update Mark Read Handler
```typescript
const handleNotificationClick = async (notification: Notification) => {
  if (!notification.is_read) {
    await api.markNotificationRead(notification.id);
    refreshNotifications();
  }
};
```

#### Step 2.3: Update Mark All Read Handler
```typescript
const handleMarkAllRead = async () => {
  await api.markAllNotificationsRead();
  refreshNotifications();
};
```

#### Step 2.4: Update Delete Handler
```typescript
const handleDelete = async (id: string, e: Event) => {
  e.stopPropagation();
  await api.deleteNotification(id);
  refreshNotifications();
};
```

#### Step 2.5: Add Tabs (All / Unread)
```tsx
const [activeTab, setActiveTab] = createSignal<'all' | 'unread'>('unread');

// In the panel header:
<div class="flex gap-2 border-b">
  <button
    onClick={() => setActiveTab('all')}
    class={activeTab() === 'all' ? 'active' : ''}
  >
    All
  </button>
  <button
    onClick={() => setActiveTab('unread')}
    class={activeTab() === 'unread' ? 'active' : ''}
  >
    Unread
  </button>
</div>

// Filter notifications:
const filteredNotifications = () => {
  const all = notifications()?.notifications || [];
  if (activeTab() === 'unread') {
    return all.filter(n => !n.is_read);
  }
  return all;
};
```

#### Step 2.6: Update Severity Icons
Map new severity types:
```typescript
const getSeverityIcon = (severity: Notification['severity']) => {
  switch (severity) {
    case 'success': return '✓';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    case 'security': return '🔒';
    case 'policy': return '📋';
    default: return 'ℹ️';
  }
};
```

#### Step 2.7: Add Link Support
```tsx
<Show when={notification.link_url}>
  <a
    href={notification.link_url}
    target="_blank"
    rel="noopener noreferrer"
    class="text-sm text-accent-primary hover:underline"
  >
    View more →
  </a>
</Show>
```

---

## Task 3: Create Policy Modal Component

### File to Create
`ui/solid/src/components/PolicyModal.tsx`

### Implementation

```typescript
import { Component, Show, createSignal, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import { api, type PolicyStatus } from '../services/api';

interface PolicyModalProps {
  policyStatus: PolicyStatus;
  onAccept: () => void;
}

const PolicyModal: Component<PolicyModalProps> = (props) => {
  const [accepting, setAccepting] = createSignal(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.acceptPolicy(props.policyStatus.policy_version);
      props.onAccept();
      // Show toast: "Policy accepted"
    } catch (err) {
      console.error('Failed to accept policy:', err);
      alert('Failed to accept policy. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Show when={props.policyStatus.policy_required}>
      <Portal>
        <div
          class="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <div
            class="rounded-lg border p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            style={{
              background: 'var(--bg-card)',
              'border-color': 'var(--border-color)'
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
          >
            <h2
              id="policy-modal-title"
              class="text-2xl font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              📋 Updated Terms & Privacy Policy
            </h2>

            <div class="mb-6 space-y-3" style={{ color: 'var(--text-secondary)' }}>
              <p>
                KubeGraf has updated its Terms of Service and Privacy Policy.
                Please review and accept to continue using cluster features.
              </p>

              <h3 class="font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>
                What's new:
              </h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Clarified data collection practices (local-only by default)</li>
                <li>Added optional announcements feature with privacy controls</li>
                <li>Updated security and liability terms</li>
              </ul>

              <a
                href="/policy"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block mt-4 px-4 py-2 rounded text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#000'
                }}
              >
                Read Full Policy →
              </a>
            </div>

            <div class="flex justify-end gap-3">
              <button
                onClick={() => window.location.href = '/'}
                class="px-4 py-2 rounded text-sm font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-secondary)' }}
                disabled={accepting()}
              >
                Exit
              </button>
              <button
                onClick={handleAccept}
                class="px-6 py-2 rounded text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#000'
                }}
                disabled={accepting()}
              >
                {accepting() ? 'Accepting...' : 'Accept & Continue'}
              </button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default PolicyModal;
```

---

## Task 4: Add Policy Gate to App

### File to Modify
`ui/solid/src/components/AppShell.tsx` or `App.tsx` (root component)

### Implementation

```typescript
import { createResource, Show } from 'solid-js';
import { api } from './services/api';
import PolicyModal from './components/PolicyModal';

// In root component:
const [policyStatus, { refetch: refetchPolicyStatus }] = createResource(
  () => api.getPolicyStatus()
);

return (
  <>
    <Show when={policyStatus()}>
      {(status) => (
        <PolicyModal
          policyStatus={status()}
          onAccept={() => refetchPolicyStatus()}
        />
      )}
    </Show>

    {/* Rest of app */}
  </>
);
```

---

## Task 5: Add API Interceptor for 403 Policy Errors

### File to Modify
`ui/solid/src/services/api.ts`

### Implementation

Update `fetchAPI` function to handle policy errors:

```typescript
export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // ... existing code

  if (!response.ok) {
    const contentType = response.headers.get('content-type');

    // Check for policy gate error
    if (response.status === 403 && contentType?.includes('application/json')) {
      const errorData = await response.json();
      if (errorData.error_code === 'POLICY_NOT_ACCEPTED') {
        // Trigger policy modal (you might use a global signal or event)
        window.dispatchEvent(new CustomEvent('policy-required', {
          detail: { policyVersion: errorData.policy_version }
        }));
      }
    }

    // ... rest of error handling
  }

  // ... rest of function
}
```

Listen for event in root component:
```typescript
onMount(() => {
  window.addEventListener('policy-required', () => {
    refetchPolicyStatus();
  });
});
```

---

## Task 6: Update Settings Component

### File to Modify
`ui/solid/src/routes/Settings.tsx`

### Implementation

Add announcements section:

```tsx
import { createResource, createSignal, Show } from 'solid-js';
import { api } from '../services/api';

// In Settings component:
const [announcementsStatus] = createResource(() => api.getAnnouncementsStatus());
const [checking, setChecking] = createSignal(false);

const handleToggleAnnouncements = async (enabled: boolean) => {
  await api.setAnnouncementsOptIn(enabled);
  // Refetch status
};

const handleCheckNow = async () => {
  setChecking(true);
  try {
    await api.checkAnnouncements();
    // Show toast: "Announcements fetched successfully"
  } catch (err) {
    // Show error toast
  } finally {
    setChecking(false);
  }
};

// In settings UI:
<section>
  <h3 class="font-semibold mb-2">Announcements</h3>
  <div class="flex items-start gap-3">
    <input
      type="checkbox"
      checked={announcementsStatus()?.opt_in || false}
      onChange={(e) => handleToggleAnnouncements(e.target.checked)}
    />
    <div>
      <label class="font-medium">Fetch KubeGraf announcements (no telemetry)</label>
      <p class="text-sm text-muted mt-1">
        Downloads a small announcements file. No identifiers or usage data are sent.
      </p>
    </div>
  </div>

  <Show when={announcementsStatus()?.opt_in}>
    <div class="mt-4">
      <button
        onClick={handleCheckNow}
        disabled={checking()}
        class="px-4 py-2 rounded text-sm font-medium transition-colors"
      >
        {checking() ? 'Checking...' : 'Check Now'}
      </button>

      <Show when={announcementsStatus()?.last_fetch_at}>
        <p class="text-sm text-muted mt-2">
          Last checked: {new Date(announcementsStatus()!.last_fetch_at!).toLocaleString()}
        </p>
      </Show>
    </div>
  </Show>
</section>
```

---

## Task 7: Create Policy Route

### File to Create
`ui/solid/src/routes/Policy.tsx`

### Implementation

```typescript
import { Component } from 'solid-js';

const Policy: Component = () => {
  return (
    <div class="container mx-auto px-6 py-8 max-w-4xl">
      <h1 class="text-3xl font-bold mb-6">Terms of Service & Privacy Policy</h1>

      <div class="prose prose-invert max-w-none">
        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">Terms of Service</h2>
          <p class="mb-4">
            Effective Date: January 3, 2026
          </p>
          <p class="mb-4">
            By using KubeGraf, you agree to these terms...
          </p>
          {/* Add full terms */}
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">Privacy Policy</h2>
          <p class="mb-4">
            KubeGraf is a local-first application. All data is stored locally by default.
          </p>
          <h3 class="text-xl font-semibold mb-2">Data Collection</h3>
          <ul class="list-disc list-inside mb-4">
            <li>Local-only by default</li>
            <li>No telemetry or analytics</li>
            <li>Optional announcements feature (opt-in, no identifiers sent)</li>
          </ul>
          {/* Add full privacy policy */}
        </section>
      </div>
    </div>
  );
};

export default Policy;
```

### Register Route
**File:** `ui/solid/src/App.tsx` or router configuration

```typescript
<Route path="/policy" component={Policy} />
```

---

## Testing Checklist

### Manual Testing

#### Bell Icon
- [ ] Bell appears in header top-right
- [ ] Bell does NOT appear in footer
- [ ] Badge shows correct unread count
- [ ] Click bell opens/closes panel
- [ ] Panel anchored correctly (desktop: under bell, mobile: right drawer)

#### Notifications
- [ ] Notifications load from backend
- [ ] "All" tab shows all notifications
- [ ] "Unread" tab shows only unread
- [ ] Click notification marks as read
- [ ] "Mark all read" works
- [ ] Delete notification works
- [ ] Severity icons display correctly
- [ ] Link URL opens in new tab
- [ ] Empty state displays correctly

#### Policy Gate
- [ ] On first run, policy modal appears
- [ ] Modal blocks interaction with app
- [ ] "Read Full Policy" link works
- [ ] "Accept & Continue" closes modal
- [ ] Cluster API calls work after accepting
- [ ] Refreshing page doesn't show modal again
- [ ] Clearing policy acceptance shows modal again

#### Announcements
- [ ] Toggle appears in Settings
- [ ] Toggle default is OFF
- [ ] Enabling toggle works
- [ ] "Check now" button appears when enabled
- [ ] "Check now" fetches announcements
- [ ] Last fetch time displays
- [ ] Announcements appear in notification center
- [ ] 24h rate limit works (button disabled or shows error)

---

## Acceptance Criteria

✅ All tasks completed
✅ Bell in header, not footer
✅ Backend API integration works
✅ Policy modal blocks cluster access
✅ Announcements opt-in functional
✅ Manual tests passing
✅ No console errors
✅ Responsive design works
✅ Accessibility requirements met

---

## Estimated Effort

- Task 1 (Move bell): 30 minutes
- Task 2 (Update NotificationCenter): 2 hours
- Task 3 (PolicyModal): 1 hour
- Task 4 (Policy gate integration): 30 minutes
- Task 5 (API interceptor): 30 minutes
- Task 6 (Settings): 1 hour
- Task 7 (Policy route): 30 minutes
- **Total: ~6 hours**

---

## Need Help?

Refer to:
- `NOTIFICATION_IMPLEMENTATION.md` - Full architecture docs
- Existing components in `ui/solid/src/components/` for patterns
- `ui/solid/src/services/api.ts` - API service reference
