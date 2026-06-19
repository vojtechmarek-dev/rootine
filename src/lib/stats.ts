/**
 * stats.ts — pure view-model helpers for the Stats page.
 *
 * Everything here takes plain data (ordinals, maps, activities) and returns
 * render-ready values, so it's unit-testable without a database. The server
 * rollup (`$lib/server/stats`) feeds these from the same log query the garden
 * uses. Day bucketing reuses `dayOrdinal` from `$lib/streak` so the heatmap,
 * streaks, and root growth all agree on what "a day" is.
 */

import { addDays, startOfDay } from 'date-fns';
import { dayOrdinal } from '$lib/streak';
import { isScheduledForDate } from '$lib/scheduler';
import type { Activity, WeekException } from '$lib/types/schemas';
import type { HeatmapCell } from '$lib/types/stats';

/** Default heatmap window (≈ one year). */
export const HEATMAP_DAYS = 364; // 52 whole weeks
/** Default trailing window for the consistency metric. */
export const CONSISTENCY_DAYS = 30;

/** `yyyy-MM-dd` for a local day ordinal. The ordinal encodes a calendar day via
 * `Date.UTC`, so reading the UTC fields of `ord * 1 day` yields that same day. */
function ordinalToISO(ord: number): string {
    return new Date(ord * 86_400_000).toISOString().slice(0, 10);
}

/** Map a completed-habit count to a 0–4 colour bucket (fixed thresholds: most
 * users track only a handful of habits, so relative quartiles would be noisy). */
export function levelFor(count: number): HeatmapCell['level'] {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
}

/**
 * Build the heatmap: one cell per day in `[todayOrd - days + 1, todayOrd]`,
 * oldest → newest. `doneCountByOrd` holds how many habits met target on each day.
 */
export function buildHeatmap(doneCountByOrd: Map<number, number>, todayOrd: number, days: number = HEATMAP_DAYS): HeatmapCell[] {
    const cells: HeatmapCell[] = [];
    const start = todayOrd - days + 1;
    for (let ord = start; ord <= todayOrd; ord++) {
        const count = doneCountByOrd.get(ord) ?? 0;
        cells.push({ date: ordinalToISO(ord), ord, count, level: levelFor(count) });
    }
    return cells;
}

/** Highest single-day completed-habit count across the cells. */
export function bestDay(cells: HeatmapCell[]): number {
    let best = 0;
    for (const c of cells) if (c.count > best) best = c.count;
    return best;
}

/**
 * Consistency over the trailing `days`: of all scheduled habit-occurrences in the
 * window, the share that were completed. Rest days (not scheduled) never count,
 * so a part-time habit isn't punished. Returns a 0–100 integer; 0 when nothing
 * was scheduled. Bounded to `days × habits` schedule checks.
 */
export function consistency(
    activities: Activity[],
    completedDaysByActivity: Map<string, Set<number>>,
    now: Date = new Date(),
    days: number = CONSISTENCY_DAYS,
    exceptions: WeekException[] = []
): number {
    const today = startOfDay(now);
    let scheduled = 0;
    let done = 0;
    for (let i = 0; i < days; i++) {
        const day = startOfDay(addDays(today, -i));
        const ord = dayOrdinal(day);
        for (const activity of activities) {
            if (!isScheduledForDate(activity, day, exceptions)) continue;
            scheduled++;
            if (completedDaysByActivity.get(activity.id)?.has(ord)) done++;
        }
    }
    return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
}

/**
 * Invert per-activity done-day sets into a single per-day count: how many habits
 * met target on each ordinal. Drives the heatmap intensity.
 */
export function doneCountByOrdinal(completedDaysByActivity: Map<string, Set<number>>): Map<number, number> {
    const counts = new Map<number, number>();
    for (const days of completedDaysByActivity.values()) {
        for (const ord of days) counts.set(ord, (counts.get(ord) ?? 0) + 1);
    }
    return counts;
}
