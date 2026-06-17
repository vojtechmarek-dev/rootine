import webpush from 'web-push';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Payload shape consumed by the 'push' handler in src/service-worker.ts.
export type PushPayload = {
    title: string;
    body?: string;
    url?: string;
};

export type StoredSubscription = typeof pushSubscriptions.$inferSelect;

let vapidConfigured = false;

function ensureVapid() {
    if (vapidConfigured) return;
    if (!publicEnv.PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        throw new Error('VAPID keys are not configured (PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
    }
    webpush.setVapidDetails(env.VAPID_SUBJECT ?? 'mailto:admin@rootine.app', publicEnv.PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    vapidConfigured = true;
}

/**
 * Send a notification to one stored subscription. Subscriptions rejected by
 * the push service as gone (404/410) are deleted so we stop retrying them.
 * Returns true when delivered.
 */
export async function sendPush(subscription: StoredSubscription, payload: PushPayload): Promise<boolean> {
    ensureVapid();
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(payload)
        );
        return true;
    } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
        } else {
            console.error(`Push send failed (endpoint: ${subscription.endpoint.slice(0, 60)}…):`, err);
        }
        return false;
    }
}
