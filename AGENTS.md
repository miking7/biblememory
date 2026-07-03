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
- **Navigation:** never bypass `useReview.navigate()`; it owns the
  isNavigating concurrency guard (previous-work/069).
- **Unicode:** apostrophe/quote handling in `utils/` is encoded
  corruption-proof (code points / escapes) — never replace those constructs
  with literal glyphs (previous-work/068).
- **Review scheduling:** `reviewCat: 'auto'` derives frequency from verse
  age; weekly/monthly due-ness is probability-gated per session
  (`Math.random`), so the daily queue is intentionally non-deterministic.
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
