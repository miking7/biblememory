# 078 — Backend Security Hardening

**Date:** 2026-08-01
**Scope:** `server/` only. No client behaviour change; sync protocol unchanged.

## Why

First dedicated security review of the PHP/SQLite backend. Audited every
endpoint across five dimensions (auth, authorization/multi-tenancy, injection,
configuration/exposure, resource abuse), with each finding adversarially
re-checked against the real code before being accepted.

**Clean on the big ones:** every SQL statement uses bound placeholders — no
injection anywhere. Passwords use `password_hash`/`password_verify`; tokens are
32 random bytes stored SHA-256-hashed. Tenant isolation held up: every `ops`
query scopes by `user_id`, and no IDOR was found.

What follows is what was actually wrong.

## Fixed

**`POST /api/migrate` was routed and unauthenticated.** The route table in
`public/index.php` exposed the CLI migration script over HTTP with no auth of
any kind. Anonymous callers could run the schema DDL and read back the total
user count; against an empty database it also minted `test@example.com` /
`password123` and printed a live bearer token in the response body. Verified
reachable by serving the real router and curling it with no headers.
*Fix:* route removed (nothing calls it — `npm run migrate` invokes the file
directly), plus a `PHP_SAPI !== 'cli'` guard in `migrate.php`, and the
known-credential test-user bootstrap deleted outright.

**`/api/parse-verse` was an unmetered spend channel on the operator's Anthropic
key.** Registration is open, so one throwaway account could bill unbounded
amounts: no input length cap (input tokens bill too) and `max_tokens: 10000`
per call. *Fix:* 20 KB input cap and per-account quotas (40/hour, 200/day)
enforced *before* the upstream call. Chosen over email verification, which
would need SMTP the project doesn't have — and which must never gate
`push`/`pull`, since `sync.ts` uses the registration token immediately.

**No rate limiting existed anywhere.** Unlimited login attempts, each costing
the server a full bcrypt verification. *Fix:* sliding-window counters in SQLite
(`rate_limits` table, `rate_limit_ok()` in `lib.php`) — login throttled per-IP
and per-account, registration per-IP. Keyed on `REMOTE_ADDR` only; `X-Forwarded-For`
is deliberately ignored because it is attacker-controlled without a known
trusted proxy. The per-account key matters: if a CDN is ever added, an IP-only
throttle would collapse every user into one bucket.

**Disabled accounts kept working.** `is_active` was checked at login only, so
tokens minted before deactivation stayed valid forever. *Fix:* `current_user_id()`
now joins `users` and requires `is_active = 1`. Tokens also expire after a year
of disuse (`last_used_at` refreshes each request, so normal offline-first use is
unaffected).

**Uncaught `TypeError` on hostile JSON.** Under `declare(strict_types=1)`,
`{"email":{...}}` or a numeric password hit `trim()`/`strlen()` and fataled —
a 500 that leaks paths when `display_errors` is on. *Fix:* `read_json_body()`
and `require_string()` in `lib.php` validate types up front; array-valued query
params rejected in `pull.php`/`collections.php`.

**Wildcard CORS.** `Access-Control-Allow-Origin: *` on token-authenticated
endpoints let any site drive register/login. *Fix:* `cors_headers()` echoes the
origin only when it is on `ALLOWED_ORIGINS`.

**Unbounded push batches.** No cap on op count or payload size. *Fix:* 1000 ops
per request and 64 KB per op. Both deliberately sized above real client
traffic — `sync.ts` pushes 500 at a time, and a pasted chapter is multi-KB. A
*cumulative* per-user storage quota was considered and rejected: the oplog is
never compacted, so a lifetime cap would eventually brick the heaviest
legitimate users, and a rejected batch stalls the client outbox permanently.

**Error-detail leak.** `parse-verse.php` returned raw exception text (including
upstream API messages) in an `errorDetails` field. *Fix:* logged server-side
only. No client code read it.

**Smaller items.** Email now normalised and matched case-insensitively (`Alice@`
and `alice@` were two accounts); passwords capped at bcrypt's real 72-byte limit
instead of being silently truncated; login runs a dummy bcrypt verify on unknown
addresses so response timing doesn't reveal account existence (the dummy must be
a *valid* hash — an invalid one returns ~130× faster and preserves the leak);
collection-ID regex uses the `D` modifier so `$` can't match before a trailing
newline; static-asset containment compares against `dist` **plus a separator**
(a bare prefix also accepts a sibling `dist-backup/`); `router.php` gained
realpath confinement it never had; `.env` parsing strips surrounding quotes.

**Push acking bug (correctness, found alongside).** Malformed ops were skipped
without being added to `acked_ids`. Since the client only clears an outbox entry
when its id comes back, such ops retried on every sync forever. They are now
acked — they can never become valid — while oversized payloads still return 413,
which is safe because a real client cannot produce one.

## Not done — needs a deliberate data migration

`ops.op_id` is `UNIQUE` **globally** rather than per-user. Combined with
`INSERT OR IGNORE`, a colliding id from another tenant is silently dropped *and*
acked, so the client discards it — confirmed by direct SQLite test. Not
practically exploitable (ids are v4 UUIDs, unguessable), but the constraint is
wrong and should be `UNIQUE(user_id, op_id)`. Changing it requires rebuilding
the table against production data, so it was left for an intentional migration
rather than folded into a security pass.

Also outstanding: no password-change or reset flow exists, so there is no way to
bulk-revoke a user's sessions.

## Traps found while hardening (why the code looks the way it does)

A max-effort review of the first cut of this work caught four ways the
hardening itself could break users. The current code reflects the corrections,
and each is easy to reintroduce:

- **A password length cap must never apply at LOGIN.** Accounts created before
  any cap existed can hold passwords longer than bcrypt's 72-byte window;
  `password_verify` truncates identically to `password_hash`, so they have
  always authenticated correctly. Rejecting them on length locks them out with
  no reset flow — and `sync.ts` calls `clearLocalData()` *before* the login
  request, so their local verses are gone too. The 72-byte cap therefore lives
  in `register.php` only, where it prevents silent truncation of a *new*
  password; `login.php` bounds the field at 4096 bytes purely to keep an
  oversized body away from bcrypt. Because the limit counts BYTES, only 19
  emoji or 40 accented characters reach 72.
- **A case-insensitive lookup needs a disambiguator.** Legacy rows were stored
  verbatim under a case-SENSITIVE UNIQUE constraint, so two accounts can differ
  only by case; a bare `fetch()` takes an arbitrary one and may check the
  password against the wrong account. `login.php` gathers all candidates and
  accepts the one whose hash actually verifies — the password is the only
  reliable discriminator. (Checked against live data: zero colliding groups.)
- **A per-op rejection must not abort the push batch.** Returning 413 from
  inside the loop rolls back every other op *and* acks none; because the client
  only clears an outbox entry when its id comes back, one bad op stalls that
  device's sync permanently. Oversized ops are skipped and reported in
  `rejected_ids` while the rest commits — and deliberately still not acked,
  since silently dropping a verse would lose user content. (Largest real op
  payload is ~2 KB against the 64 KB cap.)
- **A body-size cap must be checked before the body is read.** Measuring after
  `file_get_contents` allocates the whole payload first, so the cap bounds
  nothing. `read_json_body()` rejects on `CONTENT_LENGTH`, then reads at most
  one byte past the limit so an absent or lying header still cannot force an
  unbounded allocation.

## Deployment note

`public/.htaccess` is Apache-only and **inert** under the production nginx —
every protection it describes must be restated in the nginx config or it does
not exist. `nginx.conf.example` now documents this, adds CSP/HSTS, and calls out
nginx's `add_header` replace-not-merge rule: the `/assets/` block defines its
own header and therefore silently dropped all four security headers.

## Verification

`npm test` 122 green, `npm run build` green. Endpoints exercised live against an
isolated copy of the server (throwaway database — the real `server/api/*.sqlite`
files were never touched): migrate 404s over HTTP, throttles engage at the
configured thresholds, the parse-verse quota holds at 40/hour, a 500-op push
still succeeds while 1200 is rejected, disabled accounts are locked out, and
push/pull/cursor-pagination/logout all still behave correctly.
