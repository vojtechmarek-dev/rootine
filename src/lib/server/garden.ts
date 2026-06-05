import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { computeStreak } from '$lib/streak';

export interface GardenData {
    /** Stable per-user seed so the plant's shape never changes between reloads. */
    seed: number;
    /** How much of the root system to reveal (= lifetime completions). */
    growth: number;
    /** Lifetime completed (non-skipped) logs across all activities. */
    totalCompletions: number;
    /** Consecutive-day streak, alive through a one-day grace window. */
    currentStreak: number;
    /** Best streak ever recorded. */
    longestStreak: number;
}

/** Deterministic 32-bit seed from the user id (FNV-1a). Same user → same plant. */
function seedFromUserId(userId: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < userId.length; i++) {
        h ^= userId.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0 || 1;
}

/**
 * Gamification rollup: one shared plant fed by every completion the user logs.
 * Growth and streak are derived from the logs — nothing extra is persisted.
 * Skipped logs record intent, not work, so they're excluded (mirrors the
 * dashboard's completion counting).
 */
export async function getGardenData(userId: string): Promise<GardenData> {
    const rows = await db
        .select({ date: logs.date })
        .from(logs)
        .innerJoin(activities, eq(logs.activityId, activities.id))
        .where(and(eq(activities.userId, userId), ne(logs.status, 'skipped')));

    const dates = rows.map((r) => r.date);
    const { current, longest } = computeStreak(dates);

    return {
        seed: seedFromUserId(userId),
        growth: dates.length,
        totalCompletions: dates.length,
        currentStreak: current,
        longestStreak: longest,
    };
}
