# Authentication Implementation Plan

## Decision: Optional Authentication with Smart Prompts

**Date:** January 6, 2025  
**Status:** Planning Phase  
**Approach:** Offline-first with optional sync

## Philosophy

The app will be **fully functional without authentication**, embracing true offline-first principles. Authentication becomes an optional feature that enables multi-device sync and cloud backup, rather than a requirement to use the app.

## User Experience Flow

### Anonymous User Journey
1. User opens app → immediately sees verse management interface
2. Can add, edit, delete, review verses without any account
3. Sees persistent but dismissible banner: "Sign up to sync across devices"
4. Gets strategic prompts at key moments (after 3 verses, after first review)
5. Can export verses manually for backup
6. All data stored locally in IndexedDB

### Authenticated User Journey
1. User clicks "Sign Up" or "Login" from banner/menu
2. Modal appears with login/register form
3. After successful auth, all existing local verses automatically sync to server
4. Banner changes to show sync status and user email
5. Automatic sync every 60 seconds + on reconnect
6. Can logout (keeps local data, stops syncing)

## Implementation Components

### 1. Authentication State Management

**Add to app.ts:**
```typescript
// Authentication state
isAuthenticated: false,
userEmail: '',
showAuthModal: false,
authMode: 'login', // 'login' or 'register'
showAuthBanner: true,
lastAuthPrompt: 0,

// Auth form
authForm: {
  email: '',
  password: '',
  error: ''
}
```

### 2. Persistent Auth Banner

**Location:** Top of page, below header  
**Appearance:** Glass-morphism card, blue gradient accent  
**States:**
- **Not Authenticated:** "⚠️ Local-only mode. Sign up to sync across devices. [Sign Up] [Login] [Dismiss]"
- **Authenticated:** "✓ Synced as user@example.com • Last sync: 2 min ago [Logout]"

**Behavior:**
- Dismissible but reappears after 24 hours or 5 new verses
- Shows sync status when authenticated
- Animates in/out smoothly

### 3. Authentication Modal

**Design:** Glass-morphism modal matching existing edit modal style  
**Features:**
- Toggle between Login and Register modes
- Email and password fields
- Error message display
- Loading state during auth
- "Cancel" button to dismiss

**Validation:**
- Email format validation
- Password minimum 8 characters
- Clear error messages from server

### 4. Strategic Prompts

**Trigger Points:**
```typescript
// After 3rd verse added
if (!isAuthenticated && verses.length === 3) {
  showAuthPrompt("Great start! Sign up to backup your progress?");
}

// After first review session
if (!isAuthenticated && reviewedToday === 1) {
  showAuthPrompt("Nice work! Want to sync across devices?");
}

// Before export (if >10 verses)
if (!isAuthenticated && verses.length > 10) {
  showAuthPrompt("You have many verses! Sign up for automatic backup?");
}
```

**Prompt Design:**
- Non-blocking toast notification
- Appears bottom-right
- Auto-dismisses after 10 seconds
- "Sign Up" and "Dismiss" buttons

### 5. Data Migration on Signup

**Process:**
1. User signs up with existing local verses
2. After successful authentication, check for local verses
3. If local verses exist, automatically push them to server
4. Show migration progress: "Syncing your 15 verses..."
5. Complete with success message: "All verses synced!"

**Code Flow:**
```typescript
async function migrateLocalData() {
  const localVerses = await db.verses.toArray();
  if (localVerses.length > 0) {
    // Create operations for all local verses
    for (const verse of localVerses) {
      await db.outbox.add({
        op_id: generateUUID(),
        ts_client: Date.now(),
        entity: 'verse',
        action: 'add',
        data: verse
      });
    }
    // Push to server
    await pushOps();
  }
}
```

### 6. Account Menu

**Location:** Top-right of header  
**States:**
- **Not Authenticated:** "Sign Up" button (gradient style)
- **Authenticated:** User email with dropdown menu
  - "Sync Now"
  - "Sync Status"
  - "Logout"

### 7. Sync Status Indicator

**Location:** In stats bar or near account menu  
**Display:**
- "Local Only" badge (gray) when not authenticated
- "Synced 2 min ago" badge (green) when authenticated
- "Syncing..." badge (blue) during sync
- "Sync Failed" badge (red) if error

### 8. Modified Sync Behavior

**Changes to sync.ts:**
```typescript
// Only attempt sync if authenticated
export async function syncNow(): Promise<void> {
  if (!await isAuthenticated()) {
    console.log("Not authenticated, skipping sync");
    return;
  }
  
  try {
    await pushOps();
    await pullOps();
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
  }
}
```

**Changes to app.ts:**
```typescript
// Only schedule sync if authenticated
function scheduleSync() {
  if (!this.isAuthenticated) {
    return; // Don't schedule sync for anonymous users
  }
  
  // ... existing sync scheduling code
}
```

## UI Components to Build

### 1. Auth Banner Component
- Persistent banner at top
- Two states: anonymous and authenticated
- Dismissible with localStorage tracking
- Smooth animations

### 2. Auth Modal Component
- Login form (email, password)
- Register form (email, password, confirm password)
- Toggle between modes
- Error display
- Loading states
- Success feedback

### 3. Auth Prompt Toast
- Bottom-right notification
- Auto-dismiss after 10 seconds
- Action buttons
- Smooth slide-in animation

### 4. Account Menu Dropdown
- User email display
- Sync status
- Logout button
- Dropdown animation

### 5. Sync Status Badge
- Color-coded status
- Last sync time
- Click to sync now
- Tooltip with details

## Technical Implementation Details

### State Management
```typescript
// Add to Alpine.js app
authState: {
  isAuthenticated: false,
  userEmail: '',
  lastSyncAt: null,
  syncStatus: 'idle', // 'idle' | 'syncing' | 'success' | 'error'
  pendingOps: 0
}
```

### Local Storage Keys
```typescript
'auth_banner_dismissed_at': timestamp
'auth_prompt_count': number
'last_auth_prompt_at': timestamp
```

### Error Handling
- Network errors: Show "Offline" status, queue operations
- Auth errors: Clear error messages in modal
- Sync errors: Show in sync status badge
- Migration errors: Retry with exponential backoff

### Security Considerations
- Passwords never stored locally (only token)
- Token stored in IndexedDB (more secure than localStorage)
- HTTPS required in production
- Token expiration handling (re-login prompt)

## Testing Checklist

### Anonymous User Flow
- [ ] Can use app without authentication
- [ ] All CRUD operations work offline
- [ ] Banner shows "Local-only mode"
- [ ] Can dismiss banner
- [ ] Banner reappears after conditions met
- [ ] Strategic prompts appear at right times
- [ ] Export works for backup

### Authentication Flow
- [ ] Can open auth modal from banner
- [ ] Can toggle between login/register
- [ ] Email validation works
- [ ] Password validation works
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Register with new email succeeds
- [ ] Register with existing email shows error
- [ ] Modal closes after success

### Data Migration
- [ ] Local verses sync after signup
- [ ] Migration progress shown
- [ ] All verses appear after migration
- [ ] No duplicate verses created
- [ ] Reviews also migrated

### Authenticated User Flow
- [ ] Banner shows user email and sync status
- [ ] Automatic sync works every 60 seconds
- [ ] Manual "Sync Now" works
- [ ] Sync status updates correctly
- [ ] Can logout successfully
- [ ] Local data preserved after logout
- [ ] Can login again with same account

### Multi-Device Sync
- [ ] Verses added on Device A appear on Device B
- [ ] Edits on Device A sync to Device B
- [ ] Deletes on Device A sync to Device B
- [ ] Reviews sync between devices
- [ ] Conflicts resolved correctly (LWW)

### Edge Cases
- [ ] Network goes offline during sync
- [ ] Token expires (re-login prompt)
- [ ] Server returns error
- [ ] Large number of local verses (100+)
- [ ] Rapid successive operations
- [ ] Browser data cleared (local data lost warning)

## Implementation Order

### Phase 1: Core Auth Infrastructure (Day 1)
1. Add authentication state to app.ts
2. Add auth modal HTML to index.html
3. Wire up login/register functions from sync.ts
4. Add logout functionality
5. Test basic auth flow

### Phase 2: UI Components (Day 2)
1. Build auth banner (both states)
2. Build auth modal with forms
3. Add account menu to header
4. Add sync status indicator
5. Style all components with glass-morphism

### Phase 3: Smart Prompts (Day 3)
1. Implement strategic prompt logic
2. Build toast notification component
3. Add localStorage tracking for prompts
4. Test prompt triggers

### Phase 4: Data Migration (Day 4)
1. Implement migration function
2. Add migration progress UI
3. Test with various data sizes
4. Handle edge cases

### Phase 5: Polish & Testing (Day 5)
1. Add animations and transitions
2. Improve error messages
3. Add loading states
4. Comprehensive testing
5. Update documentation

## Success Metrics

### User Experience
- Users can start using app in < 5 seconds (no signup friction)
- 70%+ of users with 5+ verses sign up for sync
- < 1% of users report data loss
- Sync success rate > 99%

### Technical
- Auth modal loads in < 200ms
- Login/register completes in < 1 second
- Data migration completes in < 5 seconds for 100 verses
- No memory leaks from auth state management

## Future Enhancements (Phase 2+)

1. **Social Login** - Google, Apple, Facebook OAuth
2. **Password Reset** - Email-based password recovery
3. **Email Verification** - Verify email addresses
4. **Account Settings** - Change email, password
5. **Data Export on Logout** - Automatic export before logout
6. **Sync Conflict UI** - Show conflicts and let user choose
7. **Offline Queue Viewer** - See pending operations
8. **Sync History** - View sync log and history

## Notes

- This approach prioritizes user experience and offline-first philosophy
- Authentication is a feature, not a requirement
- Data safety is ensured through strategic prompts and easy migration
- The implementation is progressive - can be done in phases
- Backend is already complete - only frontend changes needed
