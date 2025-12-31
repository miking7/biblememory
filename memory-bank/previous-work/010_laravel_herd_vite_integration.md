### Recent Resolution: Laravel Herd + Vite Dev Server Integration ✅

**Status:** Complete
**Completed:** December 25, 2024

#### Problem Diagnosed
When using Laravel Herd to serve `server/public` at `https://biblememory.test`, the Vite dev server wasn't working as expected:
- Vue DevTools showed production mode instead of development mode
- HMR (Hot Module Replacement) not functioning
- Confusion between development and production environments

#### Root Cause
Laravel Herd and Vite dev server were running as completely separate systems with no integration:
- **Laravel Herd** served built assets from `server/public/dist/index.html` at `https://biblememory.test`
- **Vite dev server** ran at `localhost:3000` but wasn't being accessed
- Visiting `https://biblememory.test` showed the **production build**, not the dev server
- No connection between the two systems

#### Solution Implemented
**Option 1: Direct Vite Dev Server Access**
- Updated `vite.config.ts` to proxy API calls to Laravel Herd
- Changed proxy target from `http://localhost:8000` to `https://biblememory.test`
- Added `secure: false` to accept Herd's self-signed SSL certificate

**Development Workflow:**
- Run `npm run dev` to start Vite at `http://localhost:3000`
- Access app at `http://localhost:3000` (not `https://biblememory.test`)
- API calls automatically proxy to `https://biblememory.test/api/*`
- Vue DevTools now correctly shows development mode ✅
- Full HMR support ✅

**Production Testing:**
- Run `npm run build` to generate assets
- Visit `https://biblememory.test` to test production build
- Serves built assets from `server/public/dist/`

#### Files Modified
- `client/vite.config.ts` - Updated proxy target and added SSL configuration
- `memory-bank/techContext.md` - Added Laravel Herd workflow documentation

#### Key Learnings
1. **Separate URLs for dev/prod** - Development uses `localhost:3000`, production testing uses Herd's domain
2. **Laravel Herd integration** - Herd serves static files, doesn't automatically integrate with Vite
3. **Proxy configuration** - Vite can proxy API calls to any backend URL, including HTTPS with self-signed certs

