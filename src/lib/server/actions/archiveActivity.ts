import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

type SessionWithUser = { user: { id: string } };

export async function archiveActivity(session: SessionWithUser, id: string) {
    try {
        await db
            .update(activities)
            .set({
                archived: true,
                updatedAt: new Date(),
            })
            .where(and(eq(activities.id, id), eq(activities.userId, session.user.id)));
    } catch (err) {
        console.error('Archive Activity Error:', err);
        return fail(500, { message: 'Failed to archive activity' });
    }

    return { success: true as const };
}
