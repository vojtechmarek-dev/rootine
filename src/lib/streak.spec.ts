import { describe, it, expect } from 'vitest';
import { aggregateHabitStreaks, completedDayOrdinals, computeHabitStreak, dayOrdinal, distinctDayCount } from './streak';
import type { Activity } from '$lib/types/schemas';

/** Midday local time so ordinal bucketing is unambiguous. */
const d = (s: string) => new Date(`${s}T12:00:00`);
/** Set of day-ordinals from yyyy-MM-dd strings — what the habit completed. */
const doneOn = (...days: string[]) => new Set(days.map((s) => dayOrdinal(d(s))));

// June 2026: the 1st is a Monday → Mondays 1,8,15,22,29 · Tuesdays 2,9,16,23,30.
// "now" anchor for most tests is Thu 2026-06-11 (a rest day for a Mon/Tue habit).
const NOW = d('2026-06-11');

function habit(partial: Partial<Activity> & { schedule: Activity['schedule']; startDate: Date }, id = 'h1'): Activity {
    return { id, type: 'habit', config: {}, archived: false, ...partial } as unknown as Activity;
}
const daily = (start: string, id = 'h1') => habit({ schedule: { type: 'daily' }, startDate: d(start) }, id);
const weekly = (start: string, days: string[], id = 'h1') =>
    habit({ schedule: { type: 'weekly', days } as Activity['schedule'], startDate: d(start) }, id);

describe('distinctDayCount', () => {
    it('counts each day once regardless of completions per day', () => {
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

describe('completedDayOrdinals', () => {
    it('counts a day only when the completion count meets the target', () => {
        // 3 completions on day 1, 1 on day 2.
        const dates = [d('2026-06-01'), d('2026-06-01'), d('2026-06-01'), d('2026-06-02')];
        expect(completedDayOrdinals(dates, 3)).toEqual(new Set([dayOrdinal(d('2026-06-01'))]));
        expect(completedDayOrdinals(dates, 1).size).toBe(2);
    });

    it('ignores invalid dates and floors target at 1', () => {
        expect(completedDayOrdinals([new Date('nope'), d('2026-06-01')], 0).size).toBe(1);
    });
});

describe('computeHabitStreak — daily', () => {
    it('counts consecutive days ending today', () => {
        const done = doneOn('2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11');
        const r = computeHabitStreak(daily('2026-06-06'), done, NOW);
        expect(r).toEqual({ current: 6, longest: 6 });
    });

    it('keeps current alive when today is not done yet (grace)', () => {
        // Done through yesterday; today (Jun 11) scheduled but not done → grace.
        const done = doneOn('2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10');
        const r = computeHabitStreak(daily('2026-06-06'), done, NOW);
        expect(r).toEqual({ current: 5, longest: 5 });
    });

    it('breaks when a past day was missed', () => {
        // Missed Jun 9; today not done. Most recent done run is Jun 10 only.
        const done = doneOn('2026-06-06', '2026-06-07', '2026-06-08', '2026-06-10');
        const r = computeHabitStreak(daily('2026-06-06'), done, NOW);
        expect(r.current).toBe(1); // walk back: Jun11 grace, Jun10 done, Jun9 missed → stop
        expect(r.longest).toBe(3); // Jun 6,7,8
    });
});

describe('computeHabitStreak — weekly Mon/Tue (rest days never break it)', () => {
    it('survives Wed–Sun and counts only scheduled occurrences', () => {
        const done = doneOn('2026-06-01', '2026-06-02', '2026-06-08', '2026-06-09'); // two Mon+Tue
        const r = computeHabitStreak(weekly('2026-06-01', ['mon', 'tue']), done, NOW);
        expect(r).toEqual({ current: 4, longest: 4 });
    });

    it('breaks on a missed scheduled day, not on rest days', () => {
        // Missed Tue Jun 9 (a past due day); Mon Jun 8 done.
        const done = doneOn('2026-06-01', '2026-06-02', '2026-06-08');
        const r = computeHabitStreak(weekly('2026-06-01', ['mon', 'tue']), done, NOW);
        expect(r.current).toBe(0); // last due day (Jun 9) missed → dead
        expect(r.longest).toBe(3); // Jun 1,2,8
    });

    it('grants grace when today itself is the scheduled day', () => {
        // now = Tue Jun 9; Mon Jun 8 done, today not done yet.
        const done = doneOn('2026-06-08');
        const r = computeHabitStreak(weekly('2026-06-01', ['mon', 'tue']), done, d('2026-06-09'));
        expect(r.current).toBe(1); // Mon counts, Tue (today) graced
    });
});

describe('aggregateHabitStreaks', () => {
    it('global stays alive while one habit is alive; value = longest alive', () => {
        const a = daily('2026-06-06', 'A'); // alive, current 6
        const b = weekly('2026-06-01', ['mon', 'tue'], 'B'); // dead (missed Jun 9), longest 3
        const completed = new Map<string, Set<number>>([
            ['A', doneOn('2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11')],
            ['B', doneOn('2026-06-01', '2026-06-02', '2026-06-08')],
        ]);
        const { byActivity, global } = aggregateHabitStreaks([a, b], completed, NOW);
        expect(byActivity.get('A')).toEqual({ current: 6, longest: 6 });
        expect(byActivity.get('B')).toEqual({ current: 0, longest: 3 });
        expect(global).toEqual({ current: 6, longest: 6 });
    });

    it('is zero when there are no activities', () => {
        expect(aggregateHabitStreaks([], new Map(), NOW).global).toEqual({ current: 0, longest: 0 });
    });
});
