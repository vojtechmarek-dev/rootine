# ADR 006: Service Worker Strategy (injectManifest, single owner)

## Context

Rootine is an SPA PWA (`ssr = false`, see [ADR 001](../adr/001-spa-mode-for-pwa.md)). It needs a
service worker for offline precaching and, going forward, for push notifications.

We found two latent misconfigurations:

1. **Two service workers.** A hand-rolled `src/service-worker.ts` (auto-registered by
   SvelteKit) coexisted with `@vite-pwa/sveltekit`, which generates and registers its own
   `sw.js`. Both fought for the same scope. On deploy/update the workers churned and could
   serve a stale/missing route chunk. When SvelteKit's client router fails to import a route
   chunk it falls back to a **full-page reload** — which re-serves `app.html` and re-shows the
   cold-start splash. This is why the splash flashed when navigating to the (newly added)
   workout route even though the app was already loaded.

2. **Two web manifests.** A static `static/manifest.webmanifest` (rich: icons, screenshots)
   collided with the manifest VitePWA generates from `vite.config.ts`. The generated one won
   and silently dropped the icons/screenshots, breaking install metadata.

## Options Considered

1. **generateSW (workbox writes the worker).** Simplest, zero SW code. But you cannot
   hand-author event handlers, so **push notifications are not possible** without escaping to
   `importScripts`. Custom SW logic is on our roadmap, so this is a dead end.
2. **Keep the hand-rolled worker + SvelteKit auto-registration.** This is the broken state
   above: no precache manifest, network-first caching that serves stale data, and it conflicts
   with VitePWA. Rejected.
3. **injectManifest (we author the worker, workbox injects the precache list).** One worker,
   our code, plus a proper precache manifest. VitePWA owns the single registration.

## Decision

Use **`strategies: 'injectManifest'`** with `@vite-pwa/sveltekit` as the single owner:

- `src/service-worker.ts` is authored by us (`precacheAndRoute(self.__WB_MANIFEST)` + custom
  handlers: `message`/SKIP_WAITING, `push`, `notificationclick`).
- SvelteKit still **builds** the file but **does not register** it
  (`kit.serviceWorker.register = false` in `svelte.config.js`); VitePWA registers it via the
  generated `registerSW.js`. Exactly one worker runs.
- `registerType: 'prompt'` — no silent auto-reload. The app drives the update UX
  (`detectServiceWorkerUpdate` in `src/routes/+layout.svelte` posts `SKIP_WAITING`).
- The web manifest lives **only** in `vite.config.ts` (icons + screenshots inlined);
  `static/manifest.webmanifest` was deleted. Single source of truth.
- `devOptions.enabled = false` — the worker does **not** run in `vite dev`. We originally
  enabled it (to test SW features without build/preview), but with `registerType: 'prompt'`
  every code change produced a new *waiting* SW while the old one kept serving a stale app;
  newly-added routes then hard-reloaded to the cold-start splash until a manual refresh.
  Test SW features via `npm run preview` instead. The production SW + prompt UX are unchanged.

## Consequences

### Positive

- **One service worker, one manifest** — no scope fights, no stale-chunk hard reloads, so the
  cold-start splash stays cold-start only (no flash on in-app navigation).
- **Push notifications are now possible** — handlers live in our `src/service-worker.ts`.
- **Proper precache** of all client chunks via workbox replaces the old network-first worker
  (which risked serving stale API data).
- **No stale-SW friction in dev** — the worker is off under `vite dev`, so new routes/chunks
  load immediately; SW behaviour is verified via `npm run preview`.

### Negative / Gotchas

- `src/service-worker.ts` is compiled in a webworker context (no DOM). Keep imports
  worker-safe; it depends on `workbox-precaching` (pinned to the workbox version VitePWA uses).
- Renaming/removing the file requires reverting `kit.serviceWorker.register` and the VitePWA
  `strategies`/`filename` options together, or the build step that injects `self.__WB_MANIFEST`
  will fail.
- Existing clients still running the old `sw.js`/`service-worker.js` will pick up the new
  worker on their next visit (the old script 404s on update check and is unregistered).
  Transient; negligible for a single-user app.
- Push still needs the **client-side** subscription flow (permission prompt + `PushManager`
  subscribe + send subscription to the server) and a server push sender — not yet implemented.
