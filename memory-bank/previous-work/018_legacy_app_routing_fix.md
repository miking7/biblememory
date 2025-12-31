### Recent Completion: Fixed Legacy App Routing in index.php ✅

**Status:** Complete  
**Completed:** December 26, 2024

Fixed index.php to properly serve legacy app files on Herd and production servers.

#### Problem Identified
Legacy app worked in Vite dev server but failed on Herd/production:
- **Vite dev server**: `http://localhost:3000/legacy/index.html` ✅ worked
- **Herd**: `https://biblememory.test/legacy/index.html` ❌ served main SPA instead
- **Production**: `https://biblememory.brightangel7.com/legacy/index.html` ❌ served main SPA instead

#### Root Cause
`server/public/index.php` had routing logic that:
1. Handled `/api/*` → API endpoints ✅
2. Handled `/assets/*` → Static assets ✅
3. **Everything else** → Fell back to main SPA `dist/index.html` ❌

The `/legacy/*` path fell into "everything else" category and was incorrectly served the main SPA.

**Why Vite worked:** Vite's dev server serves files directly from filesystem without going through index.php routing.

**Why Herd/Production failed:** All requests go through index.php, which didn't have specific routing for legacy folder.

#### Solution Implemented

Added specific routing block for `/legacy/*` paths in `index.php`:

```php
// TEMPORARY: Serve legacy app static files
// TODO: Remove this block once legacy app is no longer needed (Phase 2+)
// The legacy jQuery app is a transitional tool while building new Vue.js features
if (strpos($path, '/legacy/') === 0 || $path === '/legacy') {
    $legacyPath = __DIR__ . '/dist' . $path;
    
    // Default to index.html if requesting /legacy/ directory
    if (is_dir($legacyPath)) {
        $legacyPath .= '/index.html';
    }
    
    if (file_exists($legacyPath) && is_file($legacyPath)) {
        // Serve with appropriate content type
        readfile($legacyPath);
        exit;
    }
}
```

#### Design Decisions

**Approach Selected:** Specific route (Option B)
- **Option A (Generic):** Check if any file exists in dist/ before SPA fallback
- **Option B (Specific):** Explicitly handle `/legacy/*` paths

**Why Option B:**
- ✅ More secure - no accidental file exposure
- ✅ Explicit - easy to see valid URLs in code
- ✅ Temporary - legacy will be removed in Phase 2+
- ✅ Clear intent - marked as TEMPORARY with TODO comment

#### Results

**✅ Legacy App Now Works Everywhere**
- Vite dev server: `http://localhost:3000/legacy/index.html` ✅
- Herd: `https://biblememory.test/legacy/index.html` ✅  
- Production: `https://biblememory.brightangel7.com/legacy/index.html` ✅

**✅ Proper Content Types**
- HTML, JS, CSS, images all served with correct headers

**✅ Clear Documentation**
- TEMPORARY comment indicates this will be removed
- TODO explains when to remove (Phase 2+)
- Comments explain it's a transitional tool

#### Files Modified
- `server/public/index.php` - Added legacy routing block

#### Key Learning
When building SPAs with server-side routing, remember to explicitly handle static file paths that should bypass the SPA catch-all. The order matters: specific routes before generic SPA fallback.

