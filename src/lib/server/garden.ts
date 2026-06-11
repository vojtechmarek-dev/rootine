import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { and, asc, eq, ne } from 'drizzle-orm';
import { computeStreak, distinctDayCount } from '$lib/streak';
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
 * in days. Root growth reflects consistency, not log volume.
 */
export async function getGardenData(userId: string): Promise<GardenData> {
    // Stable order so the garden layout doesn't reshuffle between loads.
    const acts = await db.query.activities.findMany({
        where: and(eq(activities.userId, userId), eq(activities.archived, false)),
        orderBy: [asc(activities.createdAt)],
        columns: { id: true, title: true, type: true, color: true },
    });

    const completed = await db
        .select({ activityId: logs.activityId, date: logs.date })
        .from(logs)
        .innerJoin(activities, eq(logs.activityId, activities.id))
        .where(and(eq(activities.userId, userId), ne(logs.status, 'skipped')));

    // Group completion dates per activity, then count distinct days.
    const datesByActivity = new Map<string, Date[]>();
    for (const row of completed) {
        const list = datesByActivity.get(row.activityId);
        if (list) list.push(row.date);
        else datesByActivity.set(row.activityId, [row.date]);
    }

    const habits: GardenHabit[] = acts.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        color: a.color ?? 'zinc',
        growth: distinctDayCount(datesByActivity.get(a.id) ?? []),
    }));

    // Total = sum of per-habit day-counts (each habit counts once per day).
    const totalCompletions = habits.reduce((sum, h) => sum + h.growth, 0);
    const { current, longest } = computeStreak(completed.map((r) => r.date));

    return {
        seed: seedFrom(userId),
        habits,
        totalCompletions,
        currentStreak: current,
        longestStreak: longest,
    };
}
