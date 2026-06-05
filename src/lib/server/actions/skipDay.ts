import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities, logs, weekExceptions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { isoWeekOf } from '$lib/workout-rotation';

type SessionWithUser = { user: { id: string } };

/**
 * Handle the dashboard "Skip day" action for a workout habit.
 *
 *  - mode "skip":  log today as skipped (no setId). Rotation is unaffected —
 *                  skips are invisible to sequence logic.
 *  - mode "shift": create a +1 WeekException for the current ISO week. The
 *                  scheduler offsets the remaining preferred days this week.
 */
export async function skipDay(session: SessionWithUser, formData: FormData) {
    const activityId = formData.get('activityId') as string | null;
    const mode = formData.get('mode') as string | null;

    if (!activityId || (mode !== 'skip' && mode !== 'shift')) {
        return fail(400, { message: 'Invalid skip request' });
    }

    // Ownership + type check.
    const activity = await db.query.activities.findFirst({
        where: and(eq(activities.id, activityId), eq(activities.userId, session.user.id)),
    });
    if (!activity) {
        return fail(404, { message: 'Activity not found' });
    }
    if (activity.type !== 'workout') {
        return fail(400, { message: 'Only workout habits can be skipped' });
    }

    if (mode === 'skip') {
        try {
            await db.insert(logs).values({
                activityId,
                date: new Date(),
                status: 'skipped',
                data: { setId: null },
            });
        } catch (err) {
            console.error('Skip workout error:', err);
            return fail(500, { message: 'Could not skip the workout' });
        }
        return { success: true as const, mode: 'skip' as const };
    }

    // mode === 'shift'
    const weekOf = isoWeekOf(new Date());

    // Edge case: at most one shift per habit per week. Bail early if one
    // already exists; the DB unique constraint is the hard backstop.
    const existing = await db.query.weekExceptions.findFirst({
        where: and(eq(weekExceptions.habitId, activityId), eq(weekExceptions.weekOf, weekOf)),
    });
    if (existing) {
        return fail(409, { message: 'This week is already shifted.' });
    }

    try {
        await db.insert(weekExceptions).values({
            habitId: activityId,
            weekOf,
            shiftDays: 1,
        });
    } catch (err) {
        console.error('Shift week error:', err);
        return fail(409, { message: 'This week is already shifted.' });
    }

    return { success: true as const, mode: 'shift' as const };
}
