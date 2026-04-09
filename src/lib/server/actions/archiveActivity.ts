import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { formDataToObj } from '$lib/utils/form';

type SessionWithUser = { user: { id: string } };

const ArchiveActivitySchema = z.object({
    id: z.string().uuid('Invalid activity ID'),
});

export async function archiveActivity(session: SessionWithUser, formData: FormData) {
    const raw = formDataToObj(formData);
    const result = ArchiveActivitySchema.safeParse(raw);

    if (!result.success) {
        return fail(400, {
            message: 'Invalid activity data',
        });
    }

    const { id } = result.data;

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

    return { success: true };
}
