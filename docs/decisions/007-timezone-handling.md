# ADR 007: Resolving "today" in the user's timezone

## Context

Rootine is an SPA PWA (`ssr = false`, see [ADR 001](../adr/001-spa-mode-for-pwa.md)). Even with
SSR off, **server `load` functions and form `actions` still run on the server** — and our host
(Vercel) runs in **UTC**. The dashboard date and the completion backfill window were derived from
the server clock:

- `src/routes/(app)/+page.server.ts` — `const targetDate = urlDate ? new Date(urlDate) : new Date()`
- `isBackfillableDate(date, now = new Date())` in `src/lib/utils/date.ts`

For a user east of UTC (e.g. Europe/Prague, UTC+1/+2), between local **00:00 and ~02:00** the
server's UTC day is still _yesterday_. Two symptoms followed every night:

1. **Dashboard loaded yesterday.** With no `?date=`, the load defaulted to UTC `new Date()` = the
   user's previous local day, so `getDashboardActivities` returned yesterday's list while the
   client header (correctly, from local time) said "today".
2. **Completions were rejected.** A card posts `&date=<client-local-today>`; the action ran
   `isBackfillableDate(localToday, now = UTC-yesterday)`, judged the local day as _future_, and
   returned **403** "Completion is only available for today or a missed day."

The bad window equals the UTC offset, so it is **2 h in summer (DST), 1 h in winter** — which is
why it appeared to "fix itself in the morning" and felt tied to DST. It never reproduces in local
`npm run dev` (server clock == client clock), only in production on a UTC host.

## Options Considered

1. **`handleFetch` in `hooks.client.ts`.** Not viable: `handleFetch` is a **server** hook that only
   rewrites `fetch` calls made _inside_ a server `load`/`action`. There is no client `handleFetch`
   (Kit 2.61.1 client hooks: `handleError`, `init`, `reroute`, `transport`), and it does not touch
   the framework's client→server data request.
2. **Store each user's timezone in the DB / profile.** Heavier, and goes stale when the user
   travels unless we also re-detect and update it.
3. **Bucket all logs by the user's local day everywhere (reads + writes).** The fully "correct"
   model, but a large change touching every per-day query, growth, and streak; deferred.
4. **A timezone cookie, refreshed on navigation.** Cookies auto-attach to every request — both the
   data `load` and the action POST — with no per-request wiring, and refreshing on navigation keeps
   it current across travel.

## Decision

Adopt **option 4**. The browser tells the server its IANA timezone via a cookie; the server resolves
"today" in that zone.

- **Set the cookie before the first data request:** an inline script in `src/app.html` writes
  `tz=<Intl.DateTimeFormat().resolvedOptions().timeZone>` (e.g. `Europe/Prague`) synchronously in
  `<head>`, so the very first hydration data request already carries it.
- **Keep it fresh across travel:** `afterNavigate` in `src/routes/+layout.svelte` rewrites the cookie
  on every navigation. Worst case after a flight is **one** stale request, self-corrected on the next
  navigation.
- **Resolve the day server-side, DST-correct, zero deps:** `tzTodayString(tz, now)` /
  `tzTodayDate(tz, now)` in `src/lib/utils/date.ts` use
  `Intl.DateTimeFormat('en-CA', { timeZone })` to get `yyyy-MM-dd`, returned as a UTC-midnight `Date`
  matching how dashboard dates are bucketed. Missing/invalid tz falls back to UTC.
- **Use it in `+page.server.ts`:** the load default date and the toggle action both use
  `tzTodayDate(event.cookies.get('tz'))`. The action passes that local "today" into
  `toggleActivity(..., now)`, which threads it to `isBackfillableDate(targetDate, now)` and uses
  `isSameDay(targetDate, now)` (plus a clamp into the day's `[start, end]` window) to date the log —
  so a post-midnight completion lands in the day the user is actually viewing.

## Consequences

### Positive

- The dashboard shows the user's real local day at all hours, and completions near midnight succeed
  and persist in the correct day's bucket — across DST.
- No schema change, no extra round trip; cookies ride along with the requests Kit already makes.
- Robust against travel (refresh-on-navigation) with at most one self-correcting stale request.

### Negative / Gotchas

- A first-ever request with **no cookie yet and JS disabled** falls back to UTC. Acceptable: the SPA
  needs JS anyway, and the inline script runs before the first data fetch.
- This fixes the _viewed/default day_ and the _backfill window_. It does **not** re-bucket historical
  logs by local day — log read windows, growth (`distinctDayCount`/`completedDayOrdinals`), and
  streaks still bucket by UTC-midnight calendar dates. A completion logged at e.g. 00:30 local is
  clamped into the viewed local day, but the broader "all per-day math in local time" model is option
  3 above and remains future work.
- The cookie is trusted input; an invalid value is harmless (Intl throws → UTC fallback), and the
  date it influences is still constrained by the backfill window, so it cannot be used to log
  arbitrary future days.
