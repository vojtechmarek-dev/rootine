import { db } from '$lib/server/db';
import { activities, logs, weekExceptions } from '$lib/server/db/schema';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { aggregateHabitStreaks, completedDayOrdinals } from '$lib/streak';
import { ActivitySchema, WeekExceptionSchema, type Activity, type WeekException } from '$lib/types/schemas';
import { activityTargetCount } from '$lib/utils';
import { isoWeekOf } from '$lib/workout-rotation';
import type { GardenData, GardenHabit } from '$lib/types/garden';

export type { GardenData, GardenHabit } from '$lib/types/garden';

/** Deterministic 32-bit seed from any id string (FNV-1a). Same id → same shape. */
function seedFrom(id: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0 || 1;
}

/**
 * Gamification rollup: one root per habit, fed by that habit's completions, all
 * sharing one above-ground plant. Growth and streak are derived from the logs —
 * nothing extra is persisted. Skipped logs record intent, not work, so they're
 * excluded (mirrors the dashboard's completion counting).
 *
 * A habit's growth counts DISTINCT DAYS it was done — multiple completions on the
 * same day (e.g. drink water 3×) count once, so frequent habits don't fill a root
 * in days. Streaks are schedule-aware (see `aggregateHabitStreaks`): rest days
 * don't break them, and the global streak is the longest currently-alive habit's.
 */
export async function getGardenData(userId: string): Promise<GardenData> {
    // Full rows (stable order) — we need each habit's schedule + start date to
    // compute its schedule-aware streak, not just the display columns.
    const rows = await db.query.activities.findMany({
        where: and(eq(activities.userId, userId), eq(activities.archived, false)),
        orderBy: [asc(activities.createdAt)],
    });

    const acts: Activity[] = [];
    for (const row of rows) {
        const parsed = ActivitySchema.safeParse(row);
        if (parsed.success) acts.push(parsed.data);
    }

    // Current-week shifts so the streak honors a mid-week skip+shift, matching the
    // dashboard. Only the current ISO week can hold an active shift.
    const currentWeek = isoWeekOf(new Date());
    const activityIds = acts.map((a) => a.id);
    const exceptions: WeekException[] = [];
    if (activityIds.length) {
        const rawExceptions = await db.query.weekExceptions.findMany({
            where: and(inArray(weekExceptions.habitId, activityIds), eq(weekExceptions.weekOf, currentWeek)),
        });
        for (const row of rawExceptions) {
            const parsed = WeekExceptionSchema.safeParse(row);
            if (parsed.success) exceptions.push(parsed.data);
        }
    }

    const completed = await db
        .select({ activityId: logs.activityId, date: logs.date })
        .from(logs)
        .innerJoin(activities, eq(logs.activityId, activities.id))
        .where(and(eq(activities.userId, userId), ne(logs.status, 'skipped')));

    // Group completion dates per activity.
    const datesByActivity = new Map<string, Date[]>();
    for (const row of completed) {
        const list = datesByActivity.get(row.activityId);
        if (list) list.push(row.date);
        else datesByActivity.set(row.activityId, [row.date]);
    }

    // A day counts as DONE only when the target was met (matches the dashboard) —
    // one definition driving both root growth and the streak.
    const completedDaysByActivity = new Map<string, Set<number>>(
        acts.map((a) => [a.id, completedDayOrdinals(datesByActivity.get(a.id) ?? [], activityTargetCount(a))])
    );

    const { byActivity, global } = aggregateHabitStreaks(acts, completedDaysByActivity, new Date(), exceptions);

    const habits: GardenHabit[] = acts.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        color: a.color ?? 'zinc',
        growth: completedDaysByActivity.get(a.id)?.size ?? 0,
        streak: byActivity.get(a.id)?.current ?? 0,
    }));

    // Total = sum of per-habit day-counts (each habit counts once per day).
    const totalCompletions = habits.reduce((sum, h) => sum + h.growth, 0);

    return {
        seed: seedFrom(userId),
        habits,
        totalCompletions,
        currentStreak: global.current,
        longestStreak: global.longest,
    };
}
