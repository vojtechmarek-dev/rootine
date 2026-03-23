import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { logs } from '$lib/server/db/schema';
import { eq, and, between, desc } from 'drizzle-orm';
import { startOfDay, endOfDay, isToday, isValid } from 'date-fns';

type SessionWithUser = { user: { id: string } };

export async function toggleActivity(
    _session: SessionWithUser,
    formData: FormData,
    targetDate: Date
) {
    if (!isValid(targetDate)) {
        return fail(400, { message: 'Invalid dashboard date' });
    }

    if (!isToday(targetDate)) {
        return fail(403, { message: 'Activity completion is only available for today' });
    }

    const activityId = formData.get('activityId') as string;
    const action = formData.get('action') as 'complete' | 'undo';

    if (action !== 'complete' && action !== 'undo') {
        return fail(400, { message: 'Invalid action' });
    }

    const logDate = new Date();

    try {
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
            return { success: true, logId: inserted?.id ?? null };
        }

        if (action === 'undo') {
            const logId = formData.get('logId') as string | null;

            if (logId) {
                await db.delete(logs).where(eq(logs.id, logId));
            } else {
                const mostRecent = await db.query.logs.findFirst({
                    where: and(
                        eq(logs.activityId, activityId),
                        between(logs.date, startOfDay(logDate), endOfDay(logDate))
                    ),
                    orderBy: [desc(logs.date)],
                });

                if (mostRecent) {
                    await db.delete(logs).where(eq(logs.id, mostRecent.id));
                }
            }
        }
    } catch (err) {
        console.error('Toggle error:', err);
        return fail(500, { message: 'Could not update status' });
    }

    return { success: true, logId: null };
}
