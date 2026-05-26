import { describe, it, expect } from 'vitest';
import { isScheduledForDate } from './scheduler';
import type { Activity, WeekException } from '$lib/types/schemas';

// Minimal Activity factory. Only the fields scheduler reads matter, so we cast.
function activity(overrides: Partial<Activity>): Activity {
    return {
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Test',
        archived: false,
        startDate: new Date(2025, 0, 1), // Wed 1 Jan 2025
        type: 'habit',
        config: { targetValue: 1, unit: 'times' },
        schedule: { type: 'daily' },
        ...overrides,
    } as unknown as Activity;
}

describe('isScheduledForDate — guards', () => {
    it('is false before the start date', () => {
        const a = activity({ startDate: new Date(2025, 0, 10) });
        expect(isScheduledForDate(a, new Date(2025, 0, 9))).toBe(false);
    });

    it('is true on the start date for a daily schedule', () => {
        const a = activity({ startDate: new Date(2025, 0, 10) });
        expect(isScheduledForDate(a, new Date(2025, 0, 10))).toBe(true);
    });

    it('is false when archived', () => {
        const a = activity({ archived: true });
        expect(isScheduledForDate(a, new Date(2025, 0, 5))).toBe(false);
    });

    it('is false after the end date', () => {
        const a = activity({ endDate: new Date(2025, 0, 5) });
        expect(isScheduledForDate(a, new Date(2025, 0, 6))).toBe(false);
    });

    it('is true on the end date', () => {
        const a = activity({ endDate: new Date(2025, 0, 5) });
        expect(isScheduledForDate(a, new Date(2025, 0, 5))).toBe(true);
    });
});

describe('isScheduledForDate — weekly', () => {
    // 2025-01-06 is a Monday.
    const a = activity({
        type: 'workout',
        schedule: { type: 'weekly', days: ['mon', 'wed', 'fri'] },
    });

    it('is true on a scheduled weekday', () => {
        expect(isScheduledForDate(a, new Date(2025, 0, 6))).toBe(true); // Mon
        expect(isScheduledForDate(a, new Date(2025, 0, 8))).toBe(true); // Wed
    });

    it('is false on an unscheduled weekday', () => {
        expect(isScheduledForDate(a, new Date(2025, 0, 7))).toBe(false); // Tue
        expect(isScheduledForDate(a, new Date(2025, 0, 5))).toBe(false); // Sun
    });
});

describe('isScheduledForDate — interval (days)', () => {
    const a = activity({
        startDate: new Date(2025, 0, 1),
        schedule: { type: 'interval', value: 3, unit: 'days' },
    });

    it('is true on multiples of the interval from the anchor', () => {
        expect(isScheduledForDate(a, new Date(2025, 0, 1))).toBe(true); // diff 0
        expect(isScheduledForDate(a, new Date(2025, 0, 4))).toBe(true); // diff 3
    });

    it('is false off the interval', () => {
        expect(isScheduledForDate(a, new Date(2025, 0, 2))).toBe(false); // diff 1
    });
});

describe('isScheduledForDate — plant anchors on lastWatered', () => {
    it('uses lastWatered as the interval anchor when present', () => {
        const a = activity({
            type: 'plant',
            startDate: new Date(2025, 0, 1),
            config: { lastWatered: new Date(2025, 0, 10).toISOString() },
            schedule: { type: 'interval', value: 7, unit: 'days' },
        });
        expect(isScheduledForDate(a, new Date(2025, 0, 17))).toBe(true); // 7 days after lastWatered
        expect(isScheduledForDate(a, new Date(2025, 0, 16))).toBe(false);
    });
});

describe('isScheduledForDate — week exceptions', () => {
    // 2025-01-06 (Mon) .. 2025-01-12 (Sun) is ISO week 2025-W02.
    const base = activity({
        type: 'workout',
        schedule: { type: 'weekly', days: ['mon', 'wed'] },
    });

    const exception: WeekException = {
        id: '00000000-0000-0000-0000-0000000000aa',
        habitId: base.id,
        weekOf: '2025-W02',
        shiftDays: 1,
    };

    it('shifts the scheduled days for the matching week', () => {
        // mon+1 -> tue, wed+1 -> thu
        expect(isScheduledForDate(base, new Date(2025, 0, 7), [exception])).toBe(true); // Tue
        expect(isScheduledForDate(base, new Date(2025, 0, 6), [exception])).toBe(false); // Mon no longer scheduled
    });

    it('ignores exceptions for a different week', () => {
        const other = { ...exception, weekOf: '2025-W05' };
        expect(isScheduledForDate(base, new Date(2025, 0, 6), [other])).toBe(true); // Mon still scheduled
    });

    it('ignores exceptions for a different habit', () => {
        const other = { ...exception, habitId: '00000000-0000-0000-0000-0000000000bb' };
        expect(isScheduledForDate(base, new Date(2025, 0, 6), [other])).toBe(true);
    });
});
