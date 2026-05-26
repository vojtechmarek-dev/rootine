import { describe, it, expect } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { toDate, toDateValue, toDateRequired } from './date';

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
