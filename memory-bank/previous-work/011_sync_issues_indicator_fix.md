### Recent Bug Fix: Sync Issues Indicator Always Showing ✅

**Status:** Complete
**Completed:** December 25, 2024

#### Problem Identified
The "Sync issues - currently offline" popup was permanently displayed and blocking the login/signup buttons in the auth banner, even when users weren't logged in.

#### Root Cause
The `hasSyncIssuesWithAuth` was implemented as a function instead of a computed property in `app.ts`:
```typescript
// Bug: Function reference is always truthy
const hasSyncIssuesWithAuth = () => {
  return auth.isAuthenticated.value && sync.hasSyncIssues.value;
};
```

Since functions are always truthy in JavaScript, Vue's `v-show="hasSyncIssues"` directive treated it as always true, causing the indicator to display permanently regardless of authentication state or sync status.

#### Solution Implemented
Converted the function to a proper computed property:
```typescript
// Fixed: Computed property that reacts to state changes
const hasSyncIssuesWithAuth = computed(() => {
  return auth.isAuthenticated.value && sync.hasSyncIssues.value;
});
```

#### Results
- ✅ Indicator now hides when not logged in (no longer blocks login/signup buttons)
- ✅ Only shows when authenticated AND having sync issues
- ✅ Properly reacts to changes in authentication and sync status
- ✅ Sync issues indicator is irrelevant for unauthenticated users (local-only mode doesn't sync)

#### Files Modified
- `client/src/app.ts` - Added `computed` import, converted `hasSyncIssuesWithAuth` to computed property

#### Key Learning
Vue's `v-show` doesn't automatically call functions - it evaluates the expression's truthiness. Functions must be wrapped in `computed()` to create reactive properties that trigger UI updates when dependencies change.

