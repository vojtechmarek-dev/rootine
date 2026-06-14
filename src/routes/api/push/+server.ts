import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const SubscribeSchema = z.object({
    subscription: z.object({
        endpoint: z.url(),
        keys: z.object({
            p256dh: z.string().min(1),
            auth: z.string().min(1),
        }),
    }),
    timezone: z.string().min(1).default('UTC'),
});

const UnsubscribeSchema = z.object({
    endpoint: z.url(),
});

async function requireUserId(locals: App.Locals): Promise<string> {
    const session = await locals.auth();
    const userId = session?.user?.id;
    if (!userId) throw error(401, 'Unauthorized');
    return userId;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    const userId = await requireUserId(locals);

    const parsed = SubscribeSchema.safeParse(await request.json());
    if (!parsed.success) throw error(400, 'Invalid subscription payload');

    const { subscription, timezone } = parsed.data;

    // Upsert on endpoint: re-subscribing from the same browser refreshes
    // keys/timezone and re-assigns ownership to the current user.
    await db
        .insert(pushSubscriptions)
        .values({
            userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            timezone,
        })
        .onConflictDoUpdate({
            target: pushSubscriptions.endpoint,
            set: {
                userId,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                timezone,
            },
        });

    return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
    const userId = await requireUserId(locals);

    const parsed = UnsubscribeSchema.safeParse(await request.json());
    if (!parsed.success) throw error(400, 'Invalid payload');

    await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, parsed.data.endpoint)));

    return json({ success: true });
};
