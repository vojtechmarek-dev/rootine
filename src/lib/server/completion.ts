import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Log a "completed" entry for `activityId` at `now`, after verifying the activity
 * belongs to `userId`. Used by the notification "Done" action (and reusable by any
 * non-backfill completion path) so ownership + completion semantics live in one
 * place. The dashboard's own toggle keeps its backfill-window dating separately.
 *
 * Returns the new log id, or `null` when the activity isn't the user's — the
 * caller maps that to 403/404 and never writes a log for someone else's habit.
 */
export async function logCompletion(userId: string, activityId: string, now: Date = new Date()): Promise<string | null> {
    const owned = await db.query.activities.findFirst({
        where: and(eq(activities.id, activityId), eq(activities.userId, userId)),
        columns: { id: true },
    });
    if (!owned) return null;

    const [inserted] = await db.insert(logs).values({ activityId, date: now, status: 'completed', data: {} }).returning({ id: logs.id });
    return inserted?.id ?? null;
}
