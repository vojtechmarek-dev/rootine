/**
 * streak.ts — pure, testable streak math.
 *
 * A streak is SCHEDULE-AWARE and PER-HABIT: each habit's streak counts consecutive
 * *scheduled occurrences it completed* (its due days, per `isScheduledForDate`).
 * Days a habit isn't scheduled are skipped — they never break or extend it — so a
 * "Mon + Tue" habit isn't punished for resting Wed–Sun. The current streak gets a
 * one-day grace for *today* (a scheduled-but-unfinished today doesn't break it; a
 * missed past due day does).
 *
 * The global streak stays alive while at least one habit's streak is unbroken; its
 * value is the longest currently-alive habit streak (see `aggregateHabitStreaks`).
 * All math is day-granular over local calendar fields.
 */

import { addDays, startOfDay } from 'date-fns';
import { isScheduledForDate } from '$lib/scheduler';
import type { Activity, WeekException } from '$lib/types/schemas';

/** Local-calendar ordinal day number (days since 1970-01-01, local time). */
export function dayOrdinal(date: Date): number {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/**
 * Count DISTINCT local days represented by a list of dates. Multiple completions
 * on the same day count once. Invalid dates are ignored.
 */
export function distinctDayCount(dates: Date[]): number {
    const days = new Set<number>();
    for (const d of dates) {
        if (d instanceof Date && !Number.isNaN(d.getTime())) {
            days.add(dayOrdinal(d));
        }
    }
    return days.size;
}

/**
 * The set of local days an activity counts as DONE: days where its completion
 * count met the `target` (e.g. "drink water 3×" needs 3 logs that day). Multiple
 * logs on a day collapse to one done-day; a partial day (1 of 3) doesn't count.
 * This is the single definition behind root growth AND streaks. Invalid dates
 * are ignored.
 */
export function completedDayOrdinals(dates: Date[], target = 1): Set<number> {
    const counts = new Map<number, number>();
    for (const d of dates) {
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
        const o = dayOrdinal(d);
        counts.set(o, (counts.get(o) ?? 0) + 1);
    }
    const need = Math.max(1, target);
    const out = new Set<number>();
    for (const [o, c] of counts) {
        if (c >= need) out.add(o);
    }
    return out;
}

export interface StreakResult {
    /** Consecutive scheduled occurrences completed, ending today (grace) or earlier. */
    current: number;
    /** Best such run ever recorded for this habit. */
    longest: number;
}

/** Cap the history walk so an ancient habit can't blow up the loop (covers >3y / evergreen). */
const MAX_LOOKBACK_DAYS = 1100;

/**
 * Per-habit streak over the habit's OWN schedule. Walks real Date objects (local
 * tz) from the habit's start to today, asking `isScheduledForDate` which days are
 * due and `completedDays` (distinct dayOrdinals) which were done.
 */
export function computeHabitStreak(
    activity: Activity,
    completedDays: Set<number>,
    now: Date = new Date(),
    exceptions: WeekException[] = []
): StreakResult {
    const today = startOfDay(now);
    const todayOrd = dayOrdinal(today);

    // Walk window: from the habit's start (clamped to MAX_LOOKBACK) up to today.
    const startRaw = startOfDay(new Date(activity.startDate));
    const earliest = startOfDay(addDays(today, -MAX_LOOKBACK_DAYS));
    const cursor = startRaw < earliest ? earliest : startRaw;
    if (cursor > today) {
        return { current: 0, longest: 0 };
    }

    // Forward pass for `longest`; remember each due day's outcome for the back pass.
    const due: Array<{ ord: number; done: boolean }> = [];
    let longest = 0;
    let run = 0;
    for (let day = cursor; day <= today; day = startOfDay(addDays(day, 1))) {
        if (!isScheduledForDate(activity, day, exceptions)) {
            continue; // rest day — skip, neither breaks nor extends
        }
        const ord = dayOrdinal(day);
        const done = completedDays.has(ord);
        due.push({ ord, done });

        if (done) {
            run++;
            if (run > longest) longest = run;
        } else if (ord !== todayOrd) {
            run = 0; // missed a past due day
        }
        // else: today scheduled but not done yet → grace, leave `run` intact.
    }

    // Back pass for `current`: from the most recent due day, with today's grace.
    let current = 0;
    for (let i = due.length - 1; i >= 0; i--) {
        const d = due[i];
        if (d.ord === todayOrd && !d.done) {
            continue; // today not done yet — doesn't count, doesn't break
        }
        if (d.done) {
            current++;
        } else {
            break;
        }
    }

    return { current, longest };
}

/**
 * Roll per-habit streaks up to a global one. Takes each habit's pre-built set of
 * DONE day-ordinals (see `completedDayOrdinals`, target-aware). A habit is "alive"
 * when its current streak > 0; the global current is the longest currently-alive
 * habit streak, and the global longest is the best any habit has ever reached
 * (drives achievements).
 */
export function aggregateHabitStreaks(
    activities: Activity[],
    completedDaysByActivity: Map<string, Set<number>>,
    now: Date = new Date(),
    exceptions: WeekException[] = []
): { byActivity: Map<string, StreakResult>; global: StreakResult } {
    const byActivity = new Map<string, StreakResult>();
    let globalCurrent = 0;
    let globalLongest = 0;
    for (const activity of activities) {
        const result = computeHabitStreak(activity, completedDaysByActivity.get(activity.id) ?? new Set(), now, exceptions);
        byActivity.set(activity.id, result);
        if (result.current > globalCurrent) globalCurrent = result.current;
        if (result.longest > globalLongest) globalLongest = result.longest;
    }

    return { byActivity, global: { current: globalCurrent, longest: globalLongest } };
}
