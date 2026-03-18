import { json, type RequestHandler } from '@sveltejs/kit';
import { and, between, desc, eq } from 'drizzle-orm';
import { endOfDay, startOfDay } from 'date-fns';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';

const SyncActionSchema = z.object({
    activityId: z.uuid(),
    action: z.enum(['complete', 'undo']),
    logId: z.uuid().optional(),
    date: z.iso.datetime(),
});

export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ message: 'Unauthorized' }, { status: 401 });
    }

    let payload: unknown;
    try {
        payload = await event.request.json();
    } catch {
        return json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = SyncActionSchema.safeParse(payload);
    if (!parsed.success) {
        return json({ message: 'Invalid sync payload' }, { status: 400 });
    }

    const { activityId, action, logId, date } = parsed.data;
    const logDate = new Date(date);

    try {
        const activity = await db.query.activities.findFirst({
            where: and(eq(activities.id, activityId), eq(activities.userId, session.user.id)),
            columns: { id: true },
        });

        if (!activity) {
            return json({ message: 'Activity not found' }, { status: 404 });
        }

        if (action === 'complete') {
            const [inserted] = await db
                .insert(logs)
                .values({
                    activityId,
                    date: logDate,
                    status: 'completed',
                    data: {},
                })
                .returning({ id: logs.id });

            return json({ success: true, logId: inserted?.id ?? null });
        }

        if (logId) {
            await db
                .delete(logs)
                .where(and(eq(logs.id, logId), eq(logs.activityId, activityId)));
            return json({ success: true, logId: null });
        }

        const mostRecent = await db.query.logs.findFirst({
            where: and(
                eq(logs.activityId, activityId),
                between(logs.date, startOfDay(logDate), endOfDay(logDate))
            ),
            orderBy: [desc(logs.date)],
        });

        if (mostRecent) {
            await db
                .delete(logs)
                .where(and(eq(logs.id, mostRecent.id), eq(logs.activityId, activityId)));
        }

        return json({ success: true, logId: null });
    } catch (error) {
        console.error('Sync endpoint error:', error);
        return json({ message: 'Could not process sync action' }, { status: 500 });
    }
};
