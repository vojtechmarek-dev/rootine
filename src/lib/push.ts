// Client-side Web Push helpers. The service worker (src/service-worker.ts)
// handles delivery + click; this module owns permission, the PushManager
// subscription, and syncing it to the server (/api/push).

import { env } from '$env/dynamic/public';

export type PushStatus = 'unsupported' | 'denied' | 'enabled' | 'disabled';

export function isPushSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * `navigator.serviceWorker.ready` never resolves until a worker controls the
 * scope — which can hang indefinitely if registration stalled or a stale worker
 * is in the way. Race it against a timeout so callers never block forever.
 */
function serviceWorkerReady(timeoutMs: number): Promise<ServiceWorkerRegistration | null> {
    return Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))]);
}

export async function getPushStatus(): Promise<PushStatus> {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';

    // Short wait: if the worker isn't active yet, report 'disabled' rather than
    // hanging — the user can still tap Enable, which waits longer.
    const registration = await serviceWorkerReady(3000);
    if (!registration) return 'disabled';
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'enabled' : 'disabled';
}

/**
 * Request permission, subscribe via PushManager and persist the subscription
 * server-side. Returns the resulting status.
 */
export async function enablePush(): Promise<PushStatus> {
    if (!isPushSupported()) return 'unsupported';
    if (!env.PUBLIC_VAPID_PUBLIC_KEY) {
        throw new Error('Missing PUBLIC_VAPID_PUBLIC_KEY — push is not configured.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await serviceWorkerReady(10000);
    if (!registration) {
        throw new Error('Service worker not ready — reload the page and try again.');
    }

    let subscription: PushSubscription;
    try {
        subscription =
            (await registration.pushManager.getSubscription()) ??
            (await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(env.PUBLIC_VAPID_PUBLIC_KEY),
            }));
    } catch (err) {
        // Chromium throws "Registration failed - push service not available" in
        // environments with no push backend (VS Code's built-in browser, some
        // embedded/Electron webviews). Surface an actionable hint.
        if (err instanceof Error && /push service/i.test(err.message)) {
            throw new Error(
                'No push service in this browser. Open the app in a standalone Chrome, Edge, or Firefox window — the in-editor browser cannot use Web Push.',
                { cause: err }
            );
        }
        throw err;
    }

    const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            subscription: subscription.toJSON(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        await subscription.unsubscribe();
        throw new Error(`Failed to save push subscription (HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''})`);
    }

    return 'enabled';
}

/** Unsubscribe locally and delete the subscription server-side. */
export async function disablePush(): Promise<PushStatus> {
    if (!isPushSupported()) return 'unsupported';

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        await fetch('/api/push', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
    }
    return 'disabled';
}

// Push API wants the VAPID public key as a Uint8Array, not base64url. Backed
// by an explicit ArrayBuffer so it satisfies the BufferSource parameter type.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(new ArrayBuffer(rawData.length));
    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }
    return output;
}
