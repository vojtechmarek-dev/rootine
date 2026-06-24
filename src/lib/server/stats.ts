import { db } from '$lib/server/db';
import { activities, logs, weekExceptions } from '$lib/server/db/schema';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { aggregateHabitStreaks, completedDayOrdinals, dayOrdinal } from '$lib/streak';
import { ActivitySchema, WeekExceptionSchema, type Activity, type WeekException } from '$lib/types/schemas';
import { activityTargetCount } from '$lib/utils';
import { isoWeekOf } from '$lib/workout-rotation';
import { growthProgress } from '$lib/growth';
import { ACHIEVEMENTS, earnedAchievements, type GardenStats } from '$lib/achievements';
import { buildHeatmap, doneCountByOrdinal, bestDay, consistency, HEATMAP_DAYS, CONSISTENCY_DAYS } from '$lib/stats';
import type { StatsData, HabitStat } from '$lib/types/stats';

/**
 * Insight rollup for the Stats page. Derived entirely from existing rows — same
 * query and "done day" definition as the garden (`$lib/server/garden`), so the
 * heatmap, streaks, and root growth never disagree. Nothing extra is persisted.
 */
export async function getStatsData(userId: string): Promise<StatsData> {
    // Full rows — we need each habit's schedule + start date for schedule-aware
    // streaks and consistency, not just display columns.
    const rows = await db.query.activities.findMany({
        where: and(eq(activities.userId, userId), eq(activities.archived, false)),
        orderBy: [asc(activities.createdAt)],
    });

    const acts: Activity[] = [];
    for (const row of rows) {
        const parsed = ActivitySchema.safeParse(row);
        if (parsed.success) acts.push(parsed.data);
    }

    // Current-week shifts so streak/consistency honour a mid-week skip+shift,
    // matching the dashboard. Only the current ISO week can hold an active shift.
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

    const datesByActivity = new Map<string, Date[]>();
    for (const row of completed) {
        const list = datesByActivity.get(row.activityId);
        if (list) list.push(row.date);
        else datesByActivity.set(row.activityId, [row.date]);
    }

    // A day counts as DONE only when the target was met (one definition behind
    // root growth, streaks, and the heatmap).
    const completedDaysByActivity = new Map<string, Set<number>>(
        acts.map((a) => [a.id, completedDayOrdinals(datesByActivity.get(a.id) ?? [], activityTargetCount(a))])
    );

    const now = new Date();
    const { byActivity, global } = aggregateHabitStreaks(acts, completedDaysByActivity, now, exceptions);

    const heatmap = buildHeatmap(doneCountByOrdinal(completedDaysByActivity), dayOrdinal(now), HEATMAP_DAYS);

    const habits: HabitStat[] = acts
        .map((a) => {
            const doneDays = completedDaysByActivity.get(a.id)?.size ?? 0;
            const streak = byActivity.get(a.id);
            return {
                id: a.id,
                title: a.title,
                type: a.type,
                color: a.color ?? 'zinc',
                doneDays,
                stage: growthProgress(doneDays).stage,
                currentStreak: streak?.current ?? 0,
                longestStreak: streak?.longest ?? 0,
            };
        })
        .sort((x, y) => y.doneDays - x.doneDays);

    const totalCompletions = habits.reduce((sum, h) => sum + h.doneDays, 0);
    const maxHabitGrowth = habits.reduce((max, h) => Math.max(max, h.doneDays), 0);

    const gardenStats: GardenStats = {
        totalCompletions,
        currentStreak: global.current,
        longestStreak: global.longest,
        habitCount: acts.length,
        maxHabitGrowth,
    };
    const earnedIds = new Set(earnedAchievements(gardenStats).map((a) => a.id));
    const achievements = ACHIEVEMENTS.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        earned: earnedIds.has(a.id),
    }));

    return {
        heatmap,
        currentStreak: global.current,
        longestStreak: global.longest,
        totalCompletions,
        activeHabits: acts.length,
        bestDay: bestDay(heatmap),
        consistency: consistency(acts, completedDaysByActivity, now, CONSISTENCY_DAYS, exceptions),
        consistencyDays: CONSISTENCY_DAYS,
        habits,
        achievements,
        earnedCount: earnedIds.size,
    };
}
