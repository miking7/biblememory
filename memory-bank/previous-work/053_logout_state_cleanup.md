# 053 - Logout State Cleanup

## Summary
Implemented proper cleanup of all local data on logout, with pre-cleanup before login/signup for a clean slate.

## Problem
The original logout only cleared the `auth` table in IndexedDB, leaving behind:
- User data (verses, reviews, settings)
- Sync infrastructure (outbox, appliedOps, sync cursor)
- localStorage preferences (verseViewMode, verseSortPreference)
- sessionStorage
- Service worker caches

Additionally, there was no warning when users had unsynced changes in the outbox.

## Solution

### New Functions in `db.ts`

**`clearLocalData()`** - Clears all user data:
- Deletes entire IndexedDB database (`db.delete()`)
- Clears all localStorage
- Clears all sessionStorage

**`clearServiceWorkerCaches()`** - Clears static asset caches:
- Deletes all service worker caches (fonts, icons, app shell)
- These contain static assets, not user data

### Updated Auth Flows in `sync.ts`

**Login/Register:**
```typescript
await clearLocalData();  // Clean slate before auth
await db.open();         // Reinitialize database
// ... authenticate and sync
```

**Logout:**
```typescript
await notifyServerLogout();      // Best-effort server notification
await clearLocalData();          // Clear user data
await clearServiceWorkerCaches(); // Clear static asset caches
```

### Enhanced Logout UX in `useAuth.ts`

**Outbox Warning:**
```typescript
const outboxCount = await getOutboxCount();
if (outboxCount > 0) {
  message = `WARNING: You have ${outboxCount} unsynced changes that will be PERMANENTLY LOST...`;
} else {
  message = 'Are you sure you want to logout?\n\nAll local data will be cleared.';
}
```

**Page Redirect:**
After logout, redirects to `/` which:
- Shows landing page (user not authenticated)
- Page refresh resets all in-memory state (composables)
- Kills sync interval timer

## Design Decisions

### Why separate functions?
- **Explicit over implicit**: Call sites show exactly what's being cleared
- **No hidden behavior**: `logout()` explicitly calls both functions
- **Reusable**: `clearLocalData()` used alone for pre-login cleanup

### Why page refresh for in-memory state?
- Simpler than manually resetting each composable
- Guaranteed clean slate (no missed state)
- User goes to landing page anyway after logout
- Kills sync interval timer automatically

### Why skip SW caches on login/signup?
- SW caches contain static assets (JS, CSS, fonts) - identical for all users
- No security/privacy benefit to clearing them
- Avoids unnecessary re-downloading of assets
- Only `clearLocalData()` needed for pre-auth cleanup

### Why warn about outbox items?
- Prevents accidental data loss
- Gives user agency (wait for sync or proceed anyway)
- Simple `confirm()` dialog (no over-engineering)

## Files Changed

| File | Changes |
|------|---------|
| `client/src/db.ts` | Added `clearLocalData()`, `clearServiceWorkerCaches()` |
| `client/src/sync.ts` | Added `getOutboxCount()`, updated `login()`, `register()`, `logout()` |
| `client/src/composables/useAuth.ts` | Enhanced `handleLogout()` with outbox warning and redirect |

## Data Architecture Reference

### Persistent Storage (IndexedDB)
- `verses` - User's verse library
- `reviews` - Review history
- `settings` - User preferences
- `auth` - Authentication token
- `outbox` - Pending sync operations
- `appliedOps` - Deduplication tracking
- `sync` - Cursor state

### localStorage
- `verseViewMode` - 'full' or 'compact'
- `verseSortPreference` - sort preference

### Service Worker Caches
- `google-fonts-cache` - Google Fonts CSS
- `gstatic-fonts-cache` - Google Font files
- `mdi-icons-cache` - Material Design Icons
- Workbox precache - App shell (JS, CSS, HTML)

## Testing Considerations
- Test logout with items in outbox (warning should appear)
- Test logout with empty outbox (simple confirmation)
- Test login after logout (should have clean IndexedDB)
- Test service worker caches cleared only on logout
- Test page refresh resets all in-memory state
