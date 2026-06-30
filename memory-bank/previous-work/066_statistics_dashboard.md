# 066 — Statistics / Progress Dashboard

## What & Why

The three header metrics (Total Verses, Reviewed Today, Day Streak) were static
numbers. This adds a tappable **Progress** dashboard: tapping any tile opens one
tabbed bottom-sheet modal deep-linked to that tile's tab — **Library**,
**Today**, **Consistency**. The "Reviewed Today" tile also became a live
progress bar toward the day's due target.

Goal: turn the data already sitting in the `reviews`/`verses` tables into
richer, motivating feedback without a backend change.

## Key Design Decisions (converged with user over two brainstorm rounds)

- **One tabbed modal, deep-linked** to the tapped tile — not four separate
  popups. More cohesive and discoverable; seeds the eventual full stats page.
- **Stayed at three tiles, no fourth.** The progress-bar tile absorbs the
  "due today" information, so a 4th "Due" metric was unnecessary.
- **Hand-rolled SVG/CSS charts, no charting library** — keeps the offline-first
  PWA bundle lean (no measurable bundle growth). Dynamic colors use inline
  styles to stay purge-safe under Tailwind.
- **Forgiving streak, tough-love otherwise.** A missed *today* doesn't break the
  streak until the day fully passes (anchors on today-or-yesterday). But **no
  grace/freeze day** — deliberately strict.
- **Bible coverage = verses per book** (not maturity) for v1.
- **Recall-confidence panel cut from v1** — the only available proxy
  (recall vs practice) punishes verses in active learning; revisit if real
  per-review difficulty is ever stored.
- **Live due target, NOT snapshotted.** The progress-bar denominator is the live
  `dueForReview.length` per the user's call ("don't freeze it"). See Deferred.
- **Per-section low-data guards** so day-1 looks intentional, not broken.
- **DST-safe local-day bucketing** via integer day ordinals (rounding absorbs
  the ≤1h DST shift).

## Architecture

- **`composables/useStats.ts`** — the engine. One lazy DB read (reviews +
  verses) on modal open → a per-local-day map → every derived panel: streaks
  (current/longest/top-5), active-day windows + per-day averages (denominator
  capped at days-since-first-review), heatmap cells, maturity funnel (via the
  shared `getEffectiveReviewCategory`), cumulative growth series, Bible book
  coverage.
- **`components/stats/StatsModal.vue`** — bottom-sheet shell: three themed tabs,
  tap + swipe nav (reuses `useSwipeDetection`), a11y (escape, focus trap +
  focus restore, scroll lock, ARIA), slide-up with reduced-motion guard.
- **Five chart components** (`components/stats/`): `HeatmapChart`,
  `MaturityBar`, `GrowthCurve`, `BibleGrid`, `MiniBars` — each renders its own
  empty/low-data state.
- **`utils/bibleBooks.ts`** — 66-book table + anchored `refSort` → book-number
  parser (skips non-canonical values).
- **`components/StatsBar.vue`** — tiles became `<button>`s emitting `open`;
  the middle tile gained a progress-bar fill.

### Single source of truth for streaks

The header tile and the modal must never disagree, so current-streak logic lives
once in `actions.ts` as `currentStreakFromReviews()`, consumed by both
`getCurrentStreak()` (header, via `useReview`) and `useStats` (modal). This also
replaced the old header implementation, which was capped at 365 days and used
DST-fragile fixed-millisecond arithmetic.

## Deferred / Follow-ups

- **Deterministic "due today" target.** `getVersesForReview()` gates
  weekly/monthly verses with `Math.random()`, so the progress-bar denominator
  can shift across reloads. Accepted for now; the deeper target rework will make
  it deterministic (and the tile should be revisited then). The bar is stable
  within a session.
- Optional polish: the tile shows `12/5` when reviews exceed the due target —
  consider collapsing to just the count once the target is met.
- Minor efficiency (fold the window-scan loops into one pass; cache `load()`
  across opens in a session) and a fuller `BaseModal` reuse — all low-value.

## Verification

- `tsc && vite build` clean.
- Streak/window/average algorithm validated with standalone Node checks
  (including the >365-day uncapped case and forgiving today-empty case).
- Visual look-and-feel approved by the user (tested via Herd).
- Reviewed at high effort (8-angle multi-agent pass); 6 confirmed findings
  fixed before commit.

## Key Files

- `client/src/composables/useStats.ts`
- `client/src/components/stats/{StatsModal,HeatmapChart,MaturityBar,GrowthCurve,BibleGrid,MiniBars}.vue`
- `client/src/utils/bibleBooks.ts`
- `client/src/components/StatsBar.vue`, `client/src/App.vue`
- `client/src/actions.ts` (`currentStreakFromReviews`)
