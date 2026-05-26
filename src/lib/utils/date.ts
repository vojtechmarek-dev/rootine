import { getLocalTimeZone } from '@internationalized/date';
import { CalendarDate, type DateValue } from '@internationalized/date';

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
