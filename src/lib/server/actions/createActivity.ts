import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import type { CreateActivity } from '$lib/types/schemas';

type SessionWithUser = { user: { id: string } };

export async function createActivity(session: SessionWithUser, data: CreateActivity) {
    try {
        await db.insert(activities).values({
            userId: session.user.id,
            ...data,
        });
    } catch (err) {
        console.error('Create Activity Error:', err);
        return fail(500, { message: 'Failed to create activity' });
    }

    return { success: true as const };
}
