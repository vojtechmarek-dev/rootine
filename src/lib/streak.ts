/**
 * streak.ts — pure, testable streak math over completion dates.
 *
 * A "streak" counts consecutive local calendar days on which the user completed
 * at least one activity. The current streak stays alive while *today or
 * yesterday* has a completion, so it doesn't collapse to 0 before a full day is
 * actually missed (standard habit-tracker grace window). All math is
 * day-granular and uses local calendar fields.
 */

/** Local-calendar ordinal day number (days since 1970-01-01, local time). */
function dayOrdinal(date: Date): number {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export interface StreakResult {
    /** Consecutive days ending today (or yesterday, if today isn't done yet). */
    current: number;
    /** Best run ever recorded. */
    longest: number;
    /** Ordinal of the most recent active day, or null if there are none. */
    lastActiveOrdinal: number | null;
}

/**
 * Compute current + longest streak from a flat list of completion dates.
 * Dates may repeat (multiple completions per day) and arrive in any order;
 * invalid dates are ignored.
 */
export function computeStreak(completionDates: Date[], now: Date = new Date()): StreakResult {
    const days = new Set<number>();
    for (const d of completionDates) {
        if (d instanceof Date && !Number.isNaN(d.getTime())) {
            days.add(dayOrdinal(d));
        }
    }

    if (days.size === 0) {
        return { current: 0, longest: 0, lastActiveOrdinal: null };
    }

    const sorted = [...days].sort((a, b) => a - b);
    const lastActiveOrdinal = sorted[sorted.length - 1];

    // Longest run anywhere in history.
    let longest = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
        run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
        if (run > longest) longest = run;
    }

    // Current run, anchored at today (or yesterday as the grace day).
    const today = dayOrdinal(now);
    let cursor: number | null = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;

    let current = 0;
    while (cursor !== null && days.has(cursor)) {
        current++;
        cursor--;
    }

    return { current, longest, lastActiveOrdinal };
}
