# UI Changes Guide - Where to See the New Features

## 🎯 What Changed and Where to See It

### 1. ✅ Prefetch on Sidebar Hover (ACTIVE NOW)

**What Changed:**
- Sidebar links now prefetch data when you hover over them
- Data is ready before you click, making navigation instant

**Where to See It:**
1. Open **DevTools** (F12) → **Network** tab
2. **Hover** over any sidebar link (e.g., "Pods", "Nodes", "Dashboard")
3. **Watch the Network tab** - you'll see API requests happening on hover
4. **Click the link** - it should load instantly (data already cached)

**Files Changed:**
- `src/components/Sidebar.tsx` - Added prefetch on `onMouseEnter`
- `src/utils/sidebarPrefetch.ts` - New utility file

---

### 2. ✅ AppShell Architecture (ACTIVE NOW)

**What Changed:**
- App now uses persistent shell layout
- Sidebar and Header stay fixed, only content area changes
- Smoother navigation transitions

**Where to See It:**
1. **Navigate between pages** (Dashboard → Pods → Nodes → Dashboard)
2. **Notice**: Sidebar and Header don't re-render or flicker
3. **Only the main content area** changes
4. **Feels more like a native app** - no full page reloads

**Visual Test:**
- Open DevTools → Elements tab
- Watch the DOM - sidebar and header elements stay stable
- Only the `<main>` content changes

**Files Changed:**
- `src/App.tsx` - Now uses `<AppShell>` wrapper
- `src/components/AppShell.tsx` - Persistent layout component
- `src/components/AppContent.tsx` - Separated route content

---

### 3. ✅ Skeleton Loading Components (READY TO USE)

**What Changed:**
- New skeleton loading components created
- Can be used in any component for better loading states

**Where to See It:**
Currently these are **created but not yet integrated** into existing routes. To see them:

**Option 1: View Example Component**
1. The `PodsTableWithQuery` component uses skeletons
2. You can temporarily add it to a route to see it

**Option 2: Check the Component**
- File: `src/components/SkeletonLoader.tsx`
- Contains: `SkeletonLoader`, `TableSkeleton`, `CardSkeleton`

**How It Will Look:**
- Instead of spinner, you'll see skeleton placeholders
- Gray animated boxes that match the content layout
- Better perceived performance

**Files Created:**
- `src/components/SkeletonLoader.tsx` - All skeleton variants

---

### 4. ✅ Loading Overlays (READY TO USE)

**What Changed:**
- New loading overlay component
- Shows subtle overlay when data is refreshing
- Can preserve last-known state

**Where to See It:**
Currently **created but not yet integrated**. To see it:

**Check the Component:**
- File: `src/components/LoadingOverlay.tsx`
- Will show subtle "Updating..." indicator when data refreshes

**How It Will Look:**
- Subtle overlay with "Updating..." text
- Last-known data visible in background (faded)
- No jarring loading spinners

**Files Created:**
- `src/components/LoadingOverlay.tsx` - Loading overlay component

---

### 5. ✅ Connection Overlay (ACTIVE NOW)

**What Changed:**
- Connection UI separated into its own component
- Cleaner code organization

**Where to See It:**
1. **Disconnect your cluster** (or if not connected)
2. **You'll see** the "No Cluster Connected" overlay
3. **Two options**: "Connect via kubeconfig" and "Create Local Cluster"
4. **Same UI as before**, but now in separate file

**Files Created:**
- `src/components/ConnectionOverlay.tsx` - Connection UI component

---

### 6. ✅ Example Query Component (DEMO)

**What Changed:**
- Created `PodsTableWithQuery` as example
- Shows how to use TanStack Query hooks
- Demonstrates VirtualizedTable and skeleton loading

**Where to See It:**
Currently **not visible** in UI (it's an example component). To see it:

**Option 1: Temporarily Add to Routes**
1. Open `src/components/AppContent.tsx`
2. Find the `views` object
3. Add: `podsquery: PodsTableWithQuery`
4. Navigate to that view

**Option 2: Check the File**
- File: `src/components/PodsTableWithQuery.tsx`
- Shows complete example of new patterns

**Files Created:**
- `src/components/PodsTableWithQuery.tsx` - Example component

---

## 🔍 How to Verify Changes Are Working

### Test 1: Prefetch on Hover
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. **Hover** over "Pods" in sidebar
4. **See**: API request to `/api/pods` happens
5. **Click** "Pods" - should load instantly (from cache)

### Test 2: AppShell Persistence
1. Navigate: Dashboard → Pods → Nodes → Dashboard
2. **Watch**: Sidebar and Header stay fixed
3. **Only content** changes
4. **Feels smoother** than before

### Test 3: Caching (Behind the Scenes)
1. Visit **Pods** page (first time - loads normally)
2. Visit **Nodes** page
3. Go back to **Pods** page
4. **Should load instantly** (from TanStack Query cache)

### Test 4: Check Network Tab
1. Open DevTools → Network tab
2. Navigate between pages
3. **Second visit** to same page shows "from memory cache" or no request
4. **Background refresh** happens silently

---

## 📊 What's Visible vs What's Infrastructure

### ✅ Visible Changes (You Can See)
1. **Prefetch on hover** - Network requests on hover
2. **Smoother navigation** - No flicker, persistent shell
3. **Faster repeat visits** - Instant loading from cache

### ⚙️ Infrastructure (Working Behind the Scenes)
1. **TanStack Query caching** - Automatic, invisible
2. **WebSocket connection** - Managed automatically
3. **Query hooks** - Available but not yet used in all routes
4. **Skeleton components** - Created but not integrated yet
5. **Loading overlays** - Created but not integrated yet

---

## 🎨 Visual Indicators

### What You'll Notice
- ✅ **Faster page loads** (especially repeat visits)
- ✅ **Smoother transitions** (no loading flicker)
- ✅ **Network activity on hover** (in DevTools)

### What You Won't See Yet
- ❌ Skeleton loading (not integrated into routes)
- ❌ Loading overlays (not integrated into routes)
- ❌ VirtualizedTable in Pods (not integrated yet)
- ❌ Optimistic updates (utilities ready but not used)

---

## 🚀 To See More Features

### See Skeleton Loading
The components are ready. To use them in a route:

```tsx
import { TableSkeleton } from '../components/SkeletonLoader';

<Show when={isLoading} fallback={<TableSkeleton rows={10} />}>
  {/* Your content */}
</Show>
```

### See Loading Overlay
```tsx
import { LoadingOverlay } from '../components/LoadingOverlay';

<LoadingOverlay isLoading={() => query.isFetching}>
  {/* Your content */}
</LoadingOverlay>
```

### See VirtualizedTable
The `PodsTableWithQuery` component shows how to use it. Check:
- File: `src/components/PodsTableWithQuery.tsx`
- Uses VirtualizedTable for lists with 50+ items

---

## 📝 Summary

### Active Now (Working)
1. ✅ **Prefetch on hover** - Sidebar links prefetch on hover
2. ✅ **AppShell** - Persistent layout, smoother navigation
3. ✅ **Caching** - Instant repeat visits (TanStack Query)
4. ✅ **Connection Overlay** - Separated into component

### Ready But Not Integrated
1. ⚠️ **Skeleton Loading** - Components created, not in routes yet
2. ⚠️ **Loading Overlays** - Component created, not in routes yet
3. ⚠️ **VirtualizedTable** - Component created, not in Pods yet
4. ⚠️ **Query Hooks** - Available, but routes still use old pattern

### Next Steps
To see full benefits, routes need to be migrated:
- Replace `createResource` with query hooks
- Add skeleton loading to loading states
- Add loading overlays to refresh states
- Use VirtualizedTable for large lists

---

## 🔧 Quick Test Commands

```bash
# Check if prefetch is working
# 1. Open DevTools Network tab
# 2. Hover over sidebar links
# 3. See API requests happen

# Check caching
# 1. Visit Pods page
# 2. Visit Nodes page  
# 3. Go back to Pods
# 4. Should be instant (from cache)
```

---

## 📍 File Locations

All new files are in:
- `src/components/` - UI components
- `src/hooks/queries/` - Query hooks
- `src/utils/` - Utilities

No duplication - everything properly segregated!

