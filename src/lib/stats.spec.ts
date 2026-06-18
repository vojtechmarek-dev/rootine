import { describe, it, expect } from 'vitest';
import { levelFor, buildHeatmap, bestDay, doneCountByOrdinal, consistency } from './stats';
import { dayOrdinal } from './streak';
import type { Activity } from '$lib/types/schemas';

// Minimal Activity factory — only the fields the scheduler reads matter.
function activity(overrides: Partial<Activity>): Activity {
    return {
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Test',
        archived: false,
        startDate: new Date(2025, 0, 1),
        type: 'habit',
        config: { targetValue: 1, unit: 'times' },
        schedule: { type: 'daily' },
        ...overrides,
    } as unknown as Activity;
}

describe('levelFor', () => {
    it('buckets counts 0..4+ into levels', () => {
        expect(levelFor(0)).toBe(0);
        expect(levelFor(1)).toBe(1);
        expect(levelFor(2)).toBe(2);
        expect(levelFor(3)).toBe(3);
        expect(levelFor(4)).toBe(4);
        expect(levelFor(9)).toBe(4);
    });
});

describe('buildHeatmap', () => {
    const today = dayOrdinal(new Date(2025, 5, 18)); // arbitrary day

    it('produces one cell per day, oldest → newest, ending today', () => {
        const cells = buildHeatmap(new Map(), today, 10);
        expect(cells).toHaveLength(10);
        expect(cells[0].ord).toBe(today - 9);
        expect(cells[9].ord).toBe(today);
        // monotonic ascending ordinals
        expect(cells.every((c, i) => i === 0 || c.ord === cells[i - 1].ord + 1)).toBe(true);
    });

    it('fills counts + levels from the map; empty days are level 0', () => {
        const counts = new Map<number, number>([
            [today, 4],
            [today - 1, 1],
        ]);
        const cells = buildHeatmap(counts, today, 3);
        expect(cells.at(-1)).toMatchObject({ ord: today, count: 4, level: 4 });
        expect(cells.at(-2)).toMatchObject({ ord: today - 1, count: 1, level: 1 });
        expect(cells.at(-3)).toMatchObject({ count: 0, level: 0 });
    });

    it('formats date as yyyy-MM-dd for the cell ordinal', () => {
        const ord = dayOrdinal(new Date(2025, 0, 15)); // 15 Jan 2025
        const cells = buildHeatmap(new Map(), ord, 1);
        expect(cells[0].date).toBe('2025-01-15');
    });
});

describe('bestDay', () => {
    it('returns the max count across cells', () => {
        const today = dayOrdinal(new Date(2025, 5, 18));
        const cells = buildHeatmap(
            new Map([
                [today, 3],
                [today - 2, 5],
            ]),
            today,
            5
        );
        expect(bestDay(cells)).toBe(5);
    });

    it('is 0 for an empty window', () => {
        const today = dayOrdinal(new Date(2025, 5, 18));
        expect(bestDay(buildHeatmap(new Map(), today, 5))).toBe(0);
    });
});

describe('doneCountByOrdinal', () => {
    it('counts how many habits were done on each day', () => {
        const a = new Set([1, 2, 3]);
        const b = new Set([2, 3]);
        const counts = doneCountByOrdinal(
            new Map([
                ['a', a],
                ['b', b],
            ])
        );
        expect(counts.get(1)).toBe(1);
        expect(counts.get(2)).toBe(2);
        expect(counts.get(3)).toBe(2);
    });
});

describe('consistency', () => {
    const now = new Date(2025, 0, 15); // Wed 15 Jan 2025

    it('is 100 when every scheduled day in the window was done', () => {
        const a = activity({ startDate: new Date(2025, 0, 1), schedule: { type: 'daily' } });
        // mark all 7 days in the window as done
        const done = new Set<number>();
        for (let i = 0; i < 7; i++) done.add(dayOrdinal(new Date(2025, 0, 15 - i)));
        const pct = consistency([a], new Map([[a.id, done]]), now, 7);
        expect(pct).toBe(100);
    });

    it('halves when half the scheduled days were done', () => {
        const a = activity({ startDate: new Date(2025, 0, 1), schedule: { type: 'daily' } });
        const done = new Set<number>();
        for (let i = 0; i < 7; i += 2) done.add(dayOrdinal(new Date(2025, 0, 15 - i))); // 4 of 7
        const pct = consistency([a], new Map([[a.id, done]]), now, 7);
        expect(pct).toBe(Math.round((4 / 7) * 100));
    });

    it('ignores rest days (weekly schedule only counts its due days)', () => {
        // Mon-only habit: across a 7-day window exactly one day is scheduled.
        const a = activity({ startDate: new Date(2025, 0, 1), schedule: { type: 'weekly', days: ['mon'] } });
        const monday = dayOrdinal(new Date(2025, 0, 13)); // Mon 13 Jan
        const pct = consistency([a], new Map([[a.id, new Set([monday])]]), now, 7);
        expect(pct).toBe(100); // the one scheduled day was done
    });

    it('is 0 when nothing is scheduled in the window', () => {
        // start date after the window → never scheduled
        const a = activity({ startDate: new Date(2025, 5, 1) });
        const pct = consistency([a], new Map(), now, 7);
        expect(pct).toBe(0);
    });
});
