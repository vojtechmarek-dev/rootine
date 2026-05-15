import { format } from 'date-fns';
import { WEEKDAYS, type Weekday } from '$lib/constants';

/**
 * ISO week string for a date, e.g. "2025-W03".
 * Uses the ISO-week-numbering year (RRRR) so the last days of December that
 * belong to week 1 of the next year are bucketed correctly.
 */
export function isoWeekOf(date: Date): string {
    // RRRR = ISO week-numbering year, II = ISO week of year (zero-padded).
    return format(date, "RRRR-'W'II");
}

/**
 * Clamp behaviour for shifts that push a day past the end of the week.
 *
 * DECISION (spec §6): a shift that would land past the last day of the week is
 * **clamped to the week's end** rather than wrapping into the following Monday.
 * This keeps the shift inside the ISO week the WeekException applies to and
 * avoids a day silently leaking into a week with no exception record.
 *
 * The week end is the LAST entry of WEEKDAYS — Sunday here (mon=0 .. sun=6).
 * Clamping at Saturday instead would push both Fri and Sat onto Saturday and,
 * after de-duplication, silently drop a scheduled day.
 */
const WEEK_END_INDEX = WEEKDAYS.length - 1; // 6 = Sunday

/**
 * Apply a day offset to a set of weekly preferred days.
 * Negative shifts clamp at Monday, positive shifts clamp at the week end.
 * Result is de-duplicated and returned in canonical weekday order.
 */
export function shiftWeekdays(days: readonly Weekday[], shiftDays: number): Weekday[] {
    if (shiftDays === 0) {
        return [...days];
    }

    const shifted = new Set<Weekday>();
    for (const day of days) {
        const idx = WEEKDAYS.indexOf(day);
        if (idx === -1) {
            continue;
        }
        const clamped = Math.min(Math.max(idx + shiftDays, 0), WEEK_END_INDEX);
        shifted.add(WEEKDAYS[clamped]);
    }

    return WEEKDAYS.filter((d) => shifted.has(d));
}

/**
 * Derive the rotation position from the last completed set.
 *
 * Sequence position is never stored — it is computed from `lastSetId` (the
 * `setId` of the most recent WorkoutLog where it is non-null). The recommended
 * set is the one *after* that in `rotation`, wrapping around. If there is no
 * prior log, or the stored id is an orphan (set was deleted), fall back to
 * index 0.
 */
export function getRotationPosition(
    rotation: readonly string[],
    lastSetId: string | null
): { lastIndex: number; currentIndex: number; nextIndex: number } | null {
    if (rotation.length === 0) {
        return null;
    }

    const lastIndex = lastSetId ? rotation.indexOf(lastSetId) : -1;

    // No prior log, or orphaned setId → start the cycle at index 0.
    const currentIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % rotation.length;
    const nextIndex = (currentIndex + 1) % rotation.length;

    return { lastIndex, currentIndex, nextIndex };
}
