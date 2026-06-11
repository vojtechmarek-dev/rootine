import { describe, it, expect } from 'vitest';
import { computeStreak, distinctDayCount } from './streak';

/** Midday local time so ordinal bucketing is unambiguous. */
const d = (s: string) => new Date(`${s}T12:00:00`);

describe('distinctDayCount', () => {
    it('counts each day once regardless of completions per day', () => {
        // 3 completions on day 1, 1 on day 2 → 2 distinct days.
        const dates = [d('2026-06-01'), d('2026-06-01'), d('2026-06-01'), d('2026-06-02')];
        expect(distinctDayCount(dates)).toBe(2);
    });

    it('is 0 for no dates', () => {
        expect(distinctDayCount([])).toBe(0);
    });

    it('ignores invalid dates', () => {
        expect(distinctDayCount([new Date('nope'), d('2026-06-01')])).toBe(1);
    });
});

describe('computeStreak', () => {
    it('returns zeros for no completions', () => {
        expect(computeStreak([], d('2026-06-04'))).toEqual({ current: 0, longest: 0, lastActiveOrdinal: null });
    });

    it('counts consecutive days ending today', () => {
        const r = computeStreak([d('2026-06-02'), d('2026-06-03'), d('2026-06-04')], d('2026-06-04'));
        expect(r.current).toBe(3);
        expect(r.longest).toBe(3);
    });

    it('keeps current alive when only yesterday is done (grace day)', () => {
        const r = computeStreak([d('2026-06-02'), d('2026-06-03')], d('2026-06-04'));
        expect(r.current).toBe(2);
    });

    it('breaks current when both today and yesterday are missed', () => {
        const r = computeStreak([d('2026-06-01'), d('2026-06-02')], d('2026-06-04'));
        expect(r.current).toBe(0);
        expect(r.longest).toBe(2);
    });

    it('dedupes multiple completions on the same day', () => {
        const r = computeStreak([d('2026-06-04'), d('2026-06-04'), d('2026-06-03')], d('2026-06-04'));
        expect(r.current).toBe(2);
    });

    it('tracks the longest historical run independent of the current one', () => {
        const dates = [
            d('2026-05-01'),
            d('2026-05-02'),
            d('2026-05-03'),
            d('2026-05-04'), // run of 4
            d('2026-06-03'),
            d('2026-06-04'), // current run of 2
        ];
        const r = computeStreak(dates, d('2026-06-04'));
        expect(r.longest).toBe(4);
        expect(r.current).toBe(2);
    });

    it('ignores invalid dates', () => {
        const r = computeStreak([new Date('not-a-date'), d('2026-06-04')], d('2026-06-04'));
        expect(r.current).toBe(1);
        expect(r.longest).toBe(1);
    });
});
