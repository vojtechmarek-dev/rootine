// Custom service worker — VitePWA `injectManifest` strategy. See ADR 006.
//
// We author the worker here so app-specific logic (e.g. push notifications)
// lives in our own code, while workbox injects the precache manifest at build
// time via `self.__WB_MANIFEST`. SvelteKit compiles this file; VitePWA registers
// it (registerSW.js). SvelteKit's own auto-registration is disabled in
// svelte.config.js (kit.serviceWorker.register = false), so only one worker runs.

/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache all build assets (hashed by workbox); drop stale precaches on activate.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 'prompt' update flow: the page posts this when the user accepts the update
// (see detectServiceWorkerUpdate in src/routes/+layout.svelte).
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// --- Push notifications (scaffold) ---------------------------------------
// Client side still needs: request permission, subscribe via PushManager, and
// send the subscription to the server. This handles delivery + click.

self.addEventListener('push', (event) => {
    let payload: { title?: string; body?: string; url?: string };
    try {
        payload = event.data?.json() ?? {};
    } catch {
        payload = { body: event.data?.text() };
    }

    event.waitUntil(
        self.registration.showNotification(payload.title ?? 'Rootine', {
            body: payload.body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-64x64.png',
            data: payload.url ? { url: payload.url } : undefined,
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
    event.waitUntil(self.clients.openWindow(url));
});
