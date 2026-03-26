import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import { CreateActivitySchema } from '$lib/types/schemas';
import { formatZodErrorTree } from '$lib/utils';
import { formDataToObj } from '$lib/utils/form';

type SessionWithUser = { user: { id: string } };

export async function createActivity(session: SessionWithUser, formData: FormData) {
    const raw = formDataToObj(formData);
    const result = CreateActivitySchema.safeParse(raw);

    if (!result.success) {
        console.error('Activity Validation Failed', formatZodErrorTree(result.error));
        return fail(400, {
            message: 'Invalid activity data',
            errors: formatZodErrorTree(result.error),
            values: raw,
        });
    }

    const { data } = result;

    try {
        await db.insert(activities).values({
            userId: session.user.id,
            ...data,
        });
    } catch (err) {
        console.error('Create Activity Error:', err);
        return fail(500, { message: 'Failed to create activity' });
    }

    return { success: true };
}
