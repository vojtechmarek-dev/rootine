# ADR 001: Single Page Application (SPA) Mode for the PWA

## Status

Accepted. _Rationale corrected 2026-06-04 — the original framing credited `ssr = false`
with fixing the cold-start hang; the load-bearing fix was actually the `jwt` session
strategy. See the Decision note below._

## Context

Rootine is a Mobile-First PWA habit tracker. Because we use the free tier of Neon Serverless
Postgres, the database "scales to zero" (sleeps) after inactivity.

During early development, a cold start showed a blank, hanging browser tab for several seconds.
The cause was a **blocking database call inside the global `handle` hook** in
`src/hooks.server.ts`:

1. Auth.js was using the default **database** session strategy, so verifying the session via
   `DrizzleAdapter` required a query.
2. `handle` runs on **every** request that reaches the server — including the request for the
   HTML document itself — and it `await`ed that session check.

So the document response could not be sent until the cold Neon database woke up. The blank tab
was the document request hanging in `handle`.

## Decision

We made **two complementary changes**. They are easy to conflate; only the first one actually
removes the hang.

1. **Moved the blocking dependency out of `handle` — switched Auth.js to the `jwt` session
   strategy.** With `jwt`, `event.locals.auth()` verifies the session token locally (signed
   cookie + `AUTH_SECRET`) and does **not** query the database. The `DrizzleAdapter` is
   retained, but is only exercised during OAuth sign-in to link/persist users — not on every
   request. This is what removes the multi-second hang: the session check in `handle` no longer
   waits on Neon.

2. **Disabled SSR globally** (`export const ssr = false;` in `src/routes/+layout.ts`), making
   the app an SPA. This defers all `+page.server.ts` / `+layout.server.ts` data loading off the
   initial document response — those `load` functions run as client-initiated requests after
   the shell boots — so any remaining DB work (which *does* wake Neon) happens in the
   background with the splash already on screen.

> **Why SSR was not the root cause.** Turning off SSR alone would not have fixed the hang:
> `handle` runs on every request reaching the server regardless of the `ssr` flag, so the
> blocking session check would still have blocked the document response — you would just wait
> the same few seconds for an *empty* shell instead of a rendered page, which is arguably
> worse. The `jwt` switch is what decoupled the document response from Neon. Disabling SSR is
> what keeps data-loading off the critical path and gives us a cacheable client-rendered shell.

## Consequences

### Positive

- **Fast shell delivery (not literally 0ms).** The document request still invokes the Vercel
  function and runs `handle` (Auth.js + a local `jwt` verify), so the shell is not a static
  asset and not zero-latency. But because the check no longer touches Neon, the function
  returns the app shell in milliseconds instead of waiting seconds for the DB to wake. _For a
  truly static, function-free shell we would need to prerender the entry or move to
  `adapter-static` — we have not done this; see "If we ever want a function-free shell" below._
- **Graceful cold starts (the genuine win).** Heavy work — waking Neon via Drizzle inside
  server `load` functions and API routes — happens in the background after the shell paints,
  behind the splash screen, instead of a blank tab. This holds because the blocking call was
  decoupled (`jwt`) *and* loads are deferred (`ssr = false`), not because of the SSR flag by
  itself.
- **Cacheable, offline-first shell.** A client-rendered shell is straightforward to cache and
  boot offline, which maps neatly onto an offline-first PWA. _Note: PWA behaviour itself comes
  from the service worker + web manifest (see [ADR 002](../decisions/002-why-pwa.md) and
  [ADR 006](../decisions/006-service-worker-strategy.md)), **not** from `ssr = false`. SSR and
  PWAs are orthogonal — plenty of SSR apps are PWAs. Disabling SSR does not by itself make this
  a PWA._
- **Reduced render cost.** Vercel functions no longer render HTML for these routes; they return
  the shell and act as JSON APIs for `load`/endpoints. _Caveat: with no prerendering the
  function is still invoked per document request — we skip the render step, not the
  invocation._

### Negative

- **Loss of SEO.** The app is not properly indexed by search engines. _Mitigation: acceptable —
  Rootine is a private, authenticated personal productivity tool._
- **Requires JavaScript.** Users with JS disabled cannot use the app. _Mitigation: modern PWAs
  fundamentally require JavaScript; accepted baseline._

## Verifying this on a cold start

Open the Network tab and hard-load a protected route after the DB has slept. The **document**
response should arrive in milliseconds (handle + jwt verify); the subsequent `__data.json` /
`load` requests are the ones that may pause while Neon wakes, with the splash already painted.
If the *document* response itself hangs for seconds, a blocking call has crept back into
`handle` — fix that, don't reach for the SSR flag.

## If we ever want a function-free shell

Two ways to serve the HTML document as a static CDN asset (0ms, no function, no `handle`):

- **Prerender the shell, keep `adapter-vercel` (the viable option).** Prerendered routes are
  emitted as static files while `/api`, auth callbacks, and other endpoints stay as functions.
  Requires: (1) convert `(app)/+layout.server.ts` and `(workout)/+layout.server.ts` to client
  `+layout.ts` — a prerendered route cannot have any `*.server.ts` load; (2) move the auth
  redirect out of `handle` into a client-side guard; (3) `export const prerender = true`.
  Cost: the auth gate becomes client-side (brief shell paint before redirect), plus a medium
  refactor.
- **`adapter-static` with a `200.html` fallback (rejected for this app).** Emits **zero**
  functions, so `hooks.server.ts`, all server `load`s, `+server.ts` APIs, and the Auth.js
  OAuth callback disappear. Only viable if the backend is split out to a separate service.

**Decision: not worth it now.** The shell already returns in milliseconds (jwt verify, no
Neon), and the service worker precaches it. We'd trade a real safety property (server-side auth
redirect) and a refactor to save an occasional function cold start. Revisit only if measured
document TTFB on a cold region actually hurts first paint — and then use the prerender option,
never `adapter-static`.
