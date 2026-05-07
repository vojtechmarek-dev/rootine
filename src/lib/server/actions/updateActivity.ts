import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import type { UpdateActivity } from '$lib/types/schemas';
import { eq, and } from 'drizzle-orm';

type SessionWithUser = { user: { id: string } };

export async function updateActivity(session: SessionWithUser, data: UpdateActivity) {
    const { id, ...updateData } = data;

    try {
        await db
            .update(activities)
            .set({
                ...updateData,
                updatedAt: new Date(),
            })
            .where(and(eq(activities.id, id), eq(activities.userId, session.user.id)));
    } catch (err) {
        console.error('Update Activity Error:', err);
        return fail(500, { message: 'Failed to update activity' });
    }

    return { success: true as const };
}
