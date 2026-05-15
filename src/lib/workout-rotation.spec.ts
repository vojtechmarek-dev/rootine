import { describe, it, expect } from 'vitest';
import { isoWeekOf, shiftWeekdays, getRotationPosition } from './workout-rotation';

describe('isoWeekOf', () => {
    it('formats an ISO week string', () => {
        // 2025-01-15 is in ISO week 03 of 2025
        expect(isoWeekOf(new Date(2025, 0, 15))).toBe('2025-W03');
    });

    it('uses the ISO week-numbering year at year boundaries', () => {
        // 2024-12-30 (Mon) belongs to ISO week 01 of 2025
        expect(isoWeekOf(new Date(2024, 11, 30))).toBe('2025-W01');
    });
});

describe('shiftWeekdays', () => {
    it('returns a copy unchanged for a zero shift', () => {
        expect(shiftWeekdays(['mon', 'wed', 'fri'], 0)).toEqual(['mon', 'wed', 'fri']);
    });

    it('shifts every day forward by one', () => {
        expect(shiftWeekdays(['mon', 'wed', 'fri'], 1)).toEqual(['tue', 'thu', 'sat']);
    });

    it('shifts the late-week days without collapsing them', () => {
        // Sat +1 -> Sun (week end is Sunday in this app's WEEKDAYS)
        expect(shiftWeekdays(['sat'], 1)).toEqual(['sun']);
        // Fri & Sat stay distinct after the shift (no day lost)
        expect(shiftWeekdays(['fri', 'sat'], 1)).toEqual(['sat', 'sun']);
        // A 3-day schedule stays 3 days
        expect(shiftWeekdays(['wed', 'fri', 'sat'], 1)).toEqual(['thu', 'sat', 'sun']);
    });

    it('clamps a shift past the week end to Sunday', () => {
        // Sun +1 -> clamp to Sun (documented decision)
        expect(shiftWeekdays(['sun'], 1)).toEqual(['sun']);
        // Sat & Sun both land on Sun (genuine boundary collapse)
        expect(shiftWeekdays(['sat', 'sun'], 1)).toEqual(['sun']);
    });

    it('keeps canonical weekday order', () => {
        expect(shiftWeekdays(['fri', 'mon'], 1)).toEqual(['tue', 'sat']);
    });
});

describe('getRotationPosition', () => {
    const rotation = ['push', 'pull', 'legs'];

    it('returns null when rotation is empty', () => {
        expect(getRotationPosition([], 'push')).toBeNull();
    });

    it('starts at index 0 with no prior log', () => {
        expect(getRotationPosition(rotation, null)).toEqual({
            lastIndex: -1,
            currentIndex: 0,
            nextIndex: 1,
        });
    });

    it('recommends the set after the last completed one', () => {
        expect(getRotationPosition(rotation, 'push')).toEqual({
            lastIndex: 0,
            currentIndex: 1,
            nextIndex: 2,
        });
    });

    it('wraps around the cycle', () => {
        expect(getRotationPosition(rotation, 'legs')).toEqual({
            lastIndex: 2,
            currentIndex: 0,
            nextIndex: 1,
        });
    });

    it('treats an orphaned setId as no prior log (index 0)', () => {
        expect(getRotationPosition(rotation, 'deleted-set')).toEqual({
            lastIndex: -1,
            currentIndex: 0,
            nextIndex: 1,
        });
    });
});
