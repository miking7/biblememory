# Testing & Quality Assurance

<!-- 
MAINTENANCE PRINCIPLES (from .clinerules):
- Document current testing approach - NOT extensive future test plans
- Keep only what's relevant NOW
- Brief mention of future testing strategy
- NO detailed test checklists (those change constantly and clutter context)
- Focus on testing philosophy and approach, not exhaustive scenarios
- This file should help understand how we test, not list every test case
-->

## Current Testing Approach

**Phase 1:** Manual testing only

We're using manual testing with an ad-hoc approach for Phase 1 to reach MVP faster. Testing is performed by:
- Using the app during development to verify features work
- Testing on multiple browsers (Chrome, Firefox, Safari)
- Testing on multiple devices (desktop, mobile)
- Fixing bugs as they're discovered during use

**Why manual testing now:**
- Faster to MVP (no time spent setting up test infrastructure)
- Good enough for Phase 1 (single user, close to the code)
- Automated tests will come in Phase 2 when app is more stable

**Testing coverage:**
- Basic CRUD operations tested during development
- Review system tested with real usage
- Sync tested across devices
- Import/export tested with real data
- Authentication flows tested after UI implementation

## Known Issues

**Current known issues tracked in:** activeContext.md and GitHub Issues (when created)

**Recent fixes:**
- Safari offline detection issues (replaced `navigator.onLine` with sync status tracking)
- Sync issues indicator always showing (fixed computed property)
- Multiple root DOM nodes warning (wrapped in single root div)
- v-show memory usage with large lists (switched to v-if)

## Future Testing Strategy (Phase 2+)

When the app is feature-complete and stable, we'll add automated testing:
- Unit tests (Vitest) for business logic and composables
- Integration tests for component interactions
- E2E tests (Playwright) for critical user journeys
- CI/CD pipeline with automated test runs


## Production Readiness Checklist

Before deploying to production, verify:
- [ ] All core features work (CRUD, Review, Sync)
- [ ] Authentication flows tested thoroughly
- [ ] Multi-device sync verified
- [ ] Import/export tested with real data
- [ ] Mobile experience tested on real devices
- [ ] No console errors in any browser
- [ ] Performance acceptable with large datasets (500+ verses)
- [ ] Security review complete (auth, tokens, SQL injection, XSS)
- [ ] Backup and restore procedures tested
- [ ] HTTPS configured and enforced
- [ ] Error monitoring configured (when added)

**Current status:** Not production ready (see activeContext.md for current phase)
