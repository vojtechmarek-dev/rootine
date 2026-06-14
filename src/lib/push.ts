// Client-side Web Push helpers. The service worker (src/service-worker.ts)
// handles delivery + click; this module owns permission, the PushManager
// subscription, and syncing it to the server (/api/push).

import { env } from '$env/dynamic/public';

export type PushStatus = 'unsupported' | 'denied' | 'enabled' | 'disabled';

export function isPushSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushStatus(): Promise<PushStatus> {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'enabled' : 'disabled';
}

/**
 * Request permission, subscribe via PushManager and persist the subscription
 * server-side. Returns the resulting status.
 */
export async function enablePush(): Promise<PushStatus> {
    if (!isPushSupported()) return 'unsupported';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.ready;
    const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(env.PUBLIC_VAPID_PUBLIC_KEY),
        }));

    const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            subscription: subscription.toJSON(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
    });

    if (!response.ok) {
        await subscription.unsubscribe();
        throw new Error('Failed to save push subscription');
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
