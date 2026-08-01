# Bible Memory — Agent Guide

Canonical entry point for AI coding agents. Claude Code loads it via CLAUDE.md
(import), Cline via .clinerules (pointer), Codex reads it natively. Facts live
here once; deep documentation lives in `memory-bank/` (map below).

## What this is

Offline-first Bible memorization PWA — digital flashcards with spaced
repetition (daily → weekly → monthly intervals). Live at
https://bible-memory.app.

- **Client:** Vue 3 (Composition API) + TypeScript + Tailwind CSS v4 (bundled
  via PostCSS) + Dexie/IndexedDB + Vite + vite-plugin-pwa. No Pinia, no
  router — deliberate (see systemPatterns §7).
- **Server:** PHP 8 + SQLite (WAL), OpLog sync with cursor pagination and
  last-write-wins conflict resolution.
- Exact dependency versions: `client/package.json` is the source of truth —
  do not restate versions in docs.

## Commands (from repo root)

```bash
npm run dev        # Vite dev server :3000 (API proxied)
npm run build      # tsc typecheck + vite build → server/public/dist/ (gitignored)
npm test           # Vitest unit tests (client/src/**/*.test.ts, node env)
npm run migrate    # create/update SQLite schema
npm run db:reset   # drop + recreate database
npm run db:open    # sqlite3 CLI
```

Local production testing: Laravel Herd serves `server/public` at
https://biblememory.test (build first so `dist/` is fresh).

## Deploy & workflow

- **Pushing to GitHub `master` publishes production.** Never push without the
  owner's explicit go-ahead; he tests on Herd first. Local commits are fine
  when asked.
- Conventional commits: `fix(review): ...`, `feat: ...`, `docs(memory-bank): ...`
- Verification loop for client changes: `npm test` + `npm run build` (the
  build runs the TypeScript check).
- Memory-bank updates ship in the same commit as the code they document.

## Architecture map

```
client/src/
  App.vue            shell component
  app.ts             composable orchestration — the ONLY caller of the
                     composables below (they are singletons by convention)
  composables/
    useReview.ts     review state machine; navigate() is the single entry
                     point for ALL navigation, guarded by isNavigating
    useSwipeDetection.ts   touch gestures (reused by StatsModal)
    useVerses.ts / useAuth.ts / useSync.ts / useStats.ts / useAddVerseWizard.ts
  actions.ts         CRUD + oplog ops + review-status cache
  db.ts              Dexie schema (verses, reviews, settings, auth, outbox,
                     appliedOps, sync)
  sync.ts            push/pull + auth API calls
  components/        tabs/, modals/, stats/ — props down, events up;
                     review components receive the whole review composable
                     as ONE prop and call its actions directly
server/
  public/index.php   router — 8 API endpoints (register, login, logout,
                     push, pull, migrate, parse-verse, collections)
  api/*.php, schema.sql
```

Data flow: mutation → IndexedDB + outbox (one transaction) → push →
server `ops` table (monotonic seq) → other devices cursor-pull → LWW merge.

## Invariants & gotchas

- **Card animations:** owned by Vue `<Transition>` in ReviewTab — keyed by
  verse id, transition name chosen from `useReview.navDirection`. Never
  reintroduce manual visibility/offset state for the card; the old
  hand-rolled engine caused invisible-card bugs (previous-work/067, 071).
- **Navigation:** never bypass `useReview.navigate()` for card navigation;
  the interstitial actions `keepReviewing()`/`startNewDay()`/
  `finishSkippedCards()` are its only sanctioned siblings and share the
  same isNavigating guard (previous-work/069, 075).
- **Unicode:** apostrophe/quote handling in `utils/` is encoded
  corruption-proof (code points / escapes) — never replace those constructs
  with literal glyphs (previous-work/068).
- **Sync health:** `useSync.syncHealth` may flip to `'synced'` only after a
  sync actually completes — never on `navigator.onLine` / the `online` event
  alone (those are hints; only offline signals are authoritative). Flipping
  healthy on connectivity detection caused the stale reconnect toast
  (previous-work/074).
- **Review scheduling:** deterministic and date-seeded. The algorithm
  lives in `utils/reviewScheduling.ts` (pure, unit-tested) and is
  documented in systemPatterns §Spaced Repetition Algorithm — that's the
  source of truth for the mechanism (deck-first ordering, `dailyTarget`,
  `handSize`); don't restate it here. Invariants: per-category quotas shape
  the DECK (which verses are dealt first) and set `dailyTarget` (their sum),
  but they do NOT split the progress readout — progress is one grand total
  (`reviewed` = distinct eligible verses reviewed vs. `dailyTarget`),
  measured regardless of category mix (accepted trade-off: reaching the
  total with a skewed mix reads as done — only reachable by skipping the
  dealt order). `dailyTarget` is fixed once the verse set and date are known;
  it never drifts with over-review, so there is no freeze logic and
  `reviewed` simply climbs past it on bonus reviews. Quotas shape queue
  order without ever excluding a verse; the queue is never persisted (rebuilt
  on every Review-tab entry from synced state); reviews must never record
  into a session whose `queueDate` is stale (new-day interstitial); never
  reintroduce `Math.random` into scheduling.
- **Review-status highlight:** the "reviewed today" card tint reads an
  in-memory `Map` (`recentReviewsCache` in actions.ts) via
  `getCachedReviewStatus`. Two rules keep it correct: (1) every mutation bumps
  the `reviewCacheVersion` ref that `getCachedReviewStatus` reads, so consumers
  actually repaint — a plain Map is not a reactive source, so never read it
  without touching that version; (2) the cache is day-scoped, so the midnight
  watchers must rebuild it app-wide (`refreshReviewCacheForToday`, via
  `useReview.handleDayRollover`), not merely raise the Review-tab new-day flag
  — otherwise the tint lingers on yesterday until reload (previous-work/077).
- **Server security** (previous-work/078 is the reference): `migrate.php` is
  CLI-only — never re-add it to the `$apiRoutes` table in `public/index.php`.
  Every endpoint that touches user data calls `current_user_id()`, which is
  also where `is_active` and token expiry are enforced — checking `is_active`
  at login alone left disabled accounts working. JSON bodies go through
  `read_json_body()`/`require_string()` in `lib.php`: under
  `declare(strict_types=1)` a raw `trim()` on an attacker-supplied array is a
  fatal 500. CORS is an allowlist (`ALLOWED_ORIGINS`), never `*`. `/api/parse-verse`
  spends the operator's Anthropic credits, so it must keep its input cap and
  per-account quota, checked BEFORE the upstream call. Push limits are
  per-request by design — a cumulative storage quota would brick long-lived
  users, because the oplog is never compacted and a rejected batch stalls the
  client outbox permanently. Any new push cap must stay above the client's
  500-op batch (`sync.ts`).
- **`.htaccess` is Apache-only and inert in production** (nginx). Anything it
  protects must be restated in the nginx config — see `server/nginx.conf.example`,
  which also documents nginx's `add_header` replace-not-merge trap.
- Logout wipes ALL local data (by design, with outbox warning).

## Documentation map (memory-bank/)

Read selectively — do NOT read everything for every task. Start with
`activeContext.md` (current work + complete archive index), then open only
what the task needs:

| File | Answers |
|---|---|
| activeContext.md | What is being worked on right now? |
| projectbrief.md | What are we building and why? (scope) |
| productContext.md | How should the product behave? (UX flows) |
| systemPatterns.md | How is it architected and why? (the deep reference) |
| techContext.md | Stack detail, dev setup, configuration |
| progress.md | What's done, what's left? (feature status) |
| testing.md / dataSpecifications.md / phase2-architecture.md | Specialized |
| previous-work/NNN_*.md | Archived work — open only when directly relevant |

## Documentation maintenance

- After significant changes: update `activeContext.md`; archive completed
  work to `previous-work/NNN_name.md` (sequential, 001-999) and add an index
  line in activeContext.
- On an explicit **"update memory bank"** request: review every core file.
- Principles: no code duplication in docs (reference files/symbols instead);
  document decisions and *why*, not implementation detail; one source of
  truth per fact; keep activeContext under ~200 lines.
- Reference symbols/functions, **never line numbers** — they rot.
- Historical statements live in previous-work/ and are expected to be dated;
  everything else must describe current reality.
