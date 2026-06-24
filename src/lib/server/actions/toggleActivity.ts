import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { eq, and, between, desc } from 'drizzle-orm';
import { startOfDay, endOfDay, isSameDay, isValid } from 'date-fns';
import { canFillDate } from '$lib/utils/date';

type SessionWithUser = { user: { id: string } };

/**
 * `now` is the user's local "today" (UTC-midnight Date, from the tz cookie) so the
 * fill window and logged timestamp track the day they're viewing — not the
 * server's UTC day. Defaults to the server clock when a caller omits it.
 */
export async function toggleActivity(session: SessionWithUser, formData: FormData, targetDate: Date, now: Date = new Date()) {
    if (!isValid(targetDate)) {
        return fail(400, { message: 'Invalid dashboard date' });
    }

    const activityId = formData.get('activityId') as string;
    const action = formData.get('action') as 'complete' | 'undo';

    if (action !== 'complete' && action !== 'undo') {
        return fail(400, { message: 'Invalid action' });
    }

    // Load the owned activity for its fill config (and to enforce ownership).
    const activity = await db.query.activities.findFirst({
        where: and(eq(activities.id, activityId), eq(activities.userId, session.user.id)),
        columns: { config: true },
    });
    if (!activity) {
        return fail(404, { message: 'Activity not found' });
    }

    // Today / make-up (back-fill) / future-fill, gated per-activity & to this ISO week.
    if (!canFillDate(targetDate, activity.config, now)) {
        return fail(403, { message: 'Completion is only available for today or an allowed day this week' });
    }

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    // Date the log so it always lands inside the viewed day's read window. For the
    // user's live today, use the real instant when it falls in the window (keeps
    // ordering), else clamp to the day's start — this covers the post-midnight
    // window where the server clock still trails the user's local day.
    const liveNow = new Date();
    const logDate = isSameDay(targetDate, now) ? (liveNow >= dayStart && liveNow <= dayEnd ? liveNow : dayStart) : startOfDay(targetDate);

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
                    where: and(eq(logs.activityId, activityId), between(logs.date, dayStart, dayEnd)),
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
