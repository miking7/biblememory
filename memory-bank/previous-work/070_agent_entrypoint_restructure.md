# 070 - Agent Entry-Point Restructure + Documentation Drift Purge

**Date:** July 3, 2026
**Status:** Complete ✅

## What Changed

### New canonical entry point: AGENTS.md (repo root)

One compact operational brief for ALL agentic tools (Claude Code, Cline,
Codex): project summary, commands, deploy/workflow rules, architecture map,
invariants & gotchas, memory-bank documentation map, and the documentation
maintenance rules (distilled from the old CLAUDE.md/.clinerules protocol).

- **CLAUDE.md** → now just `@AGENTS.md` (Claude Code import syntax) plus two
  lines of Claude-specific reading guidance.
- **.clinerules** → short pointer telling Cline to read AGENTS.md first.
- Codex reads AGENTS.md natively.

**Why:** The previous CLAUDE.md/.clinerules were two duplicated ~150-line
copies of the Cline memory-bank *protocol* containing zero project facts, and
mandated reading ALL memory-bank files (~3,500 lines) every task. Facts now
live once; reading is selective (start with activeContext.md, open others per
the map). The memory-bank/ structure itself is unchanged — it remains the
deep knowledge base.

### Protocol changes agents should know

- "Read ALL memory bank files every task" → **read selectively** via the
  documentation map in AGENTS.md (activeContext.md first, always).
- Core-file header comments now cite "AGENTS.md → Documentation maintenance"
  instead of .clinerules.
- New rule: reference symbols/functions in docs, **never line numbers**.
- New rule: exact dependency versions live only in `client/package.json`.

### Documentation drift purged (from the July 2026 audit)

- **productContext.md** — removed the Legacy App Integration section (legacy
  app was deleted in 043; replaced with a short Heritage note); review flow
  updated from "basic reveal" to the real five-mode experience; sync interval
  corrected 60s → 30s.
- **techContext.md** — stale exact versions replaced with major versions +
  package.json pointer; "Tailwind via Play CDN / 3.5MB / needs bundling"
  corrected (bundled + purged via @tailwindcss/postcss); dead package.json
  snapshot replaced with pointer; Vitest testing section added; `npm test`
  added to commands.
- **progress.md** — Legacy App Status corrected to "fully removed"; version
  now defers to package.json; "NOT Ready for Production" → In Production
  (bible-memory.app); stale "Resolved This Session" list removed; endpoint
  count 5 → 8; "Automated Tests: 0" → Vitest suites; Tailwind bundling
  checkbox marked done.
- **systemPatterns.md** — §7 now notes the real ReviewTab wiring (individual
  props per 064) vs the documented single-composable-prop target (planned
  cleanup); all five stale line-number references replaced with symbol
  references.

## Origin

Item 2 (merged with the doc-drift purge) of the architecture-review
remediation list — see previous-work/069 for item 1.
