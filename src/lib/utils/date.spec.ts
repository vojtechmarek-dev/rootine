import { describe, it, expect } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { toDate, toDateValue, toDateRequired, isBackfillableDate, tzTodayString, tzTodayDate } from './date';

describe('toDateValue', () => {
    it('returns undefined for null/undefined', () => {
        expect(toDateValue(null)).toBeUndefined();
        expect(toDateValue(undefined)).toBeUndefined();
    });

    it('converts a JS Date to a CalendarDate using local fields', () => {
        const cd = toDateValue(new Date(2025, 0, 15)); // 15 Jan 2025 local
        expect(cd).toEqual(new CalendarDate(2025, 1, 15));
    });
});

describe('toDate', () => {
    it('returns undefined for null/undefined', () => {
        expect(toDate(null)).toBeUndefined();
        expect(toDate(undefined)).toBeUndefined();
    });

    it('passes through a Date instance unchanged', () => {
        const d = new Date(2025, 5, 1);
        expect(toDate(d)).toBe(d);
    });

    it('parses an ISO date string', () => {
        expect(toDate('2025-01-15T00:00:00.000Z')).toEqual(new Date('2025-01-15T00:00:00.000Z'));
    });

    it('returns an Invalid Date for an unparseable string', () => {
        const d = toDate('not-a-date') as Date;
        expect(Number.isNaN(d.getTime())).toBe(true);
    });

    it('converts a DateValue via its toDate method', () => {
        const result = toDate(new CalendarDate(2025, 1, 15)) as Date;
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(15);
    });

    it('returns an Invalid Date for unknown types', () => {
        const d = toDate(42) as Date;
        expect(Number.isNaN(d.getTime())).toBe(true);
    });
});

describe('toDateRequired', () => {
    it('returns the Date for a valid input', () => {
        const d = new Date(2025, 0, 1);
        expect(toDateRequired(d)).toBe(d);
    });

    it('returns an Invalid Date for null', () => {
        expect(Number.isNaN(toDateRequired(null).getTime())).toBe(true);
    });

    it('returns an Invalid Date for an unparseable string', () => {
        expect(Number.isNaN(toDateRequired('nope').getTime())).toBe(true);
    });
});

describe('isBackfillableDate', () => {
    // Wed 27 May 2026. ISO week = Mon 25 May .. Sun 31 May.
    const now = new Date(2026, 4, 27, 12, 0, 0);

    it('allows today', () => {
        expect(isBackfillableDate(new Date(2026, 4, 27), now)).toBe(true);
    });

    it('allows today regardless of time of day', () => {
        expect(isBackfillableDate(new Date(2026, 4, 27, 23, 30), now)).toBe(true);
    });

    it('allows a past day in the current ISO week', () => {
        expect(isBackfillableDate(new Date(2026, 4, 26), now)).toBe(true); // Tue
    });

    it('allows Monday (start) of the current ISO week', () => {
        expect(isBackfillableDate(new Date(2026, 4, 25), now)).toBe(true);
    });

    it('rejects Sunday of the previous ISO week', () => {
        expect(isBackfillableDate(new Date(2026, 4, 24), now)).toBe(false);
    });

    it('rejects a far past date', () => {
        expect(isBackfillableDate(new Date(2026, 3, 1), now)).toBe(false); // 1 Apr
    });

    it('rejects tomorrow', () => {
        expect(isBackfillableDate(new Date(2026, 4, 28), now)).toBe(false);
    });

    it('rejects future days even within the same ISO week', () => {
        expect(isBackfillableDate(new Date(2026, 4, 31), now)).toBe(false); // Sun, same week
    });
});

describe('tzTodayString / tzTodayDate', () => {
    // 22:30 UTC — already "tomorrow" east of UTC, still "today" to the west.
    const lateUtc = new Date('2026-06-16T22:30:00Z');

    it('reports the local day east of UTC (Prague, +2 in summer)', () => {
        expect(tzTodayString('Europe/Prague', lateUtc)).toBe('2026-06-17');
    });

    it('reports the local day west of UTC (New York, -4 in summer)', () => {
        expect(tzTodayString('America/New_York', lateUtc)).toBe('2026-06-16');
    });

    it('handles DST: Prague is +1 in winter', () => {
        expect(tzTodayString('Europe/Prague', new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
    });

    it('falls back to UTC for a missing or invalid timezone', () => {
        expect(tzTodayString(undefined, lateUtc)).toBe('2026-06-16');
        expect(tzTodayString('Not/AZone', lateUtc)).toBe('2026-06-16');
    });

    it('tzTodayDate is the local day at UTC midnight', () => {
        expect(tzTodayDate('Europe/Prague', lateUtc).toISOString()).toBe('2026-06-17T00:00:00.000Z');
    });
});
