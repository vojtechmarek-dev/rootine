import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import { UpdateActivitySchema } from '$lib/types/schemas';
import { formatZodErrorTree } from '$lib/utils';
import { formDataToObj } from '$lib/utils/form';
import { eq, and } from 'drizzle-orm';

type SessionWithUser = { user: { id: string } };

export async function updateActivity(session: SessionWithUser, formData: FormData) {
    const raw = formDataToObj(formData);
    const result = UpdateActivitySchema.safeParse(raw);

    if (!result.success) {
        console.error('Activity Update Validation Failed', formatZodErrorTree(result.error));
        return fail(400, {
            message: 'Invalid activity data',
            errors: formatZodErrorTree(result.error),
            values: raw,
        });
    }

    const { data } = result;
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

    return { success: true };
}
