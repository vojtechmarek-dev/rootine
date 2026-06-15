import { getLocalTimeZone } from '@internationalized/date';
import { CalendarDate, type DateValue } from '@internationalized/date';
import { isAfter, startOfDay } from 'date-fns';
import { isoWeekOf } from '$lib/workout-rotation';

/**
 * Converts a JS Date to a CalendarDate (YYYY-MM-DD)
 * using the LOCAL system time, not UTC.
 */
export function toDateValue(date: Date | undefined | null): DateValue | undefined {
    if (!date) return undefined;
    return new CalendarDate(
        date.getFullYear(),
        date.getMonth() + 1, // JS months are 0-indexed, CalendarDate is 1-indexed
        date.getDate()
    );
}

/**
 * Converts various types to a JS Date.
 * Returns an Invalid Date(NaN) if input is unknown / invalid.
 * Returns undefined if input is null / undefined.
 */
export function toDate(val: unknown): Date | undefined {
    if (val === null || val === undefined) {
        return undefined;
    }

    if (val instanceof Date) {
        return val;
    }

    if (typeof val === 'string') {
        // Warning: new Date("invalid-string") returns an Invalid Date (NaN)
        return new Date(val);
    }

    // Handle Internationalized DateValue
    if (typeof (val as DateValue).toDate === 'function') {
        return (val as DateValue).toDate(getLocalTimeZone());
    }

    // Fallback for completely unknown types
    return new Date(NaN);
}

/**
 * Wrapper for strict Date requirements.
 * Ensures the result is always a Date (throws if undefined/invalid).
 */
export function toDateRequired(val: unknown): Date {
    const d = toDate(val);
    if (!d || isNaN(d.getTime())) {
        return new Date(NaN); // Force return Invalid Date so Zod catches it
    }
    return d;
}

/**
 * The user's local calendar day ("yyyy-MM-dd") for `now`, in IANA `tz` (e.g.
 * "Europe/Prague"). Uses `Intl` so DST is handled automatically. Falls back to
 * UTC when `tz` is missing or invalid — so a server (UTC host) never reports its
 * own day as the user's when the timezone is unknown for one request.
 */
export function tzTodayString(tz: string | null | undefined, now: Date = new Date()): string {
    const fmt = (timeZone: string) =>
        new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    try {
        return fmt(tz || 'UTC');
    } catch {
        return fmt('UTC'); // invalid IANA name → UTC
    }
}

/**
 * The user's local "today" as a UTC-midnight Date — the same representation as
 * `new Date('yyyy-MM-dd')`, so it lines up with how dashboard dates are bucketed.
 */
export function tzTodayDate(tz: string | null | undefined, now: Date = new Date()): Date {
    return new Date(`${tzTodayString(tz, now)}T00:00:00Z`);
}

/**
 * Whether a completion may be logged for `date` ("make-up" / backfill window).
 *
 * A date is backfillable when it is **today**, or it is **in the past AND
 * within the current ISO week** (Mon–Sun containing today). Future days are
 * never backfillable. Comparison is day-granular and uses local fields via
 * `startOfDay`; ISO-week bucketing uses {@link isoWeekOf} (RRRR-WII), so the
 * same week number in a different year does not match.
 */
export function isBackfillableDate(date: Date, now: Date = new Date()): boolean {
    const day = startOfDay(date);
    const today = startOfDay(now);

    if (isAfter(day, today)) {
        return false; // future
    }
    if (day.getTime() === today.getTime()) {
        return true; // today
    }
    return isoWeekOf(day) === isoWeekOf(today); // past, same ISO week only
}
