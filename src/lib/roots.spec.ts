import { describe, it, expect } from 'vitest';
import { generateGarden, generateRootSystem, milestoneTier } from './roots';

describe('milestoneTier', () => {
    it('counts passed thresholds (7/30/100/365)', () => {
        expect(milestoneTier(0)).toBe(0);
        expect(milestoneTier(6)).toBe(0);
        expect(milestoneTier(7)).toBe(1);
        expect(milestoneTier(29)).toBe(1);
        expect(milestoneTier(30)).toBe(2);
        expect(milestoneTier(100)).toBe(3);
        expect(milestoneTier(365)).toBe(4);
        expect(milestoneTier(99999)).toBe(4);
    });
});

describe('generateGarden', () => {
    const habits = [
        { id: 'a', color: 'emerald' },
        { id: 'b', color: 'blue' },
    ];
    const opts = { seed: 42 };

    it('has a shared taproot (activityId null, depth 0) plus habit offshoots', () => {
        const segs = generateGarden(habits, opts);
        const taproot = segs.filter((s) => s.activityId === null);
        expect(taproot.length).toBeGreaterThan(0);
        expect(taproot.every((s) => s.depth === 0)).toBe(true);
        // Each habit owns at least one offshoot, all at depth >= 1.
        for (const id of ['a', 'b']) {
            const owned = segs.filter((s) => s.activityId === id);
            expect(owned.length).toBeGreaterThan(0);
            expect(owned.every((s) => s.depth >= 1)).toBe(true);
        }
    });

    it('tints a habit offshoot with its colour; taproot is uncoloured', () => {
        const segs = generateGarden(habits, opts);
        expect(segs.filter((s) => s.activityId === 'a').every((s) => s.color === 'emerald')).toBe(true);
        expect(segs.filter((s) => s.activityId === null).every((s) => s.color === undefined)).toBe(true);
    });

    it('is deterministic for the same input', () => {
        expect(generateGarden(habits, opts)).toEqual(generateGarden(habits, opts));
    });

    it('uses LOCAL born starting at 1 for the taproot and each offshoot', () => {
        const segs = generateGarden(habits, opts);
        for (const id of [null, 'a', 'b']) {
            const born = segs.filter((s) => s.activityId === id).map((s) => s.born);
            expect(Math.min(...born)).toBe(1); // each owner counts from 1 independently
        }
    });

    it('makes offshoot length track its habit growth (more completions → longer)', () => {
        // Reveal sim: count how many of habit "a"'s segments show at growth 3 vs 9.
        const segs = generateGarden(habits, opts).filter((s) => s.activityId === 'a');
        const shownAt = (g: number) => segs.filter((s) => s.born <= g).length;
        expect(shownAt(9)).toBeGreaterThan(shownAt(3));
        expect(shownAt(0)).toBe(0); // a neglected habit shows nothing
    });

    it('uses unique segment ids', () => {
        const segs = generateGarden(habits, opts);
        expect(new Set(segs.map((s) => s.id)).size).toBe(segs.length);
    });

    it('generates offshoots relative to the origin (placement happens later)', () => {
        const segs = generateGarden(habits, opts);
        // Raw offshoots carry no attachBorn — Garden assigns it when placing.
        expect(segs.filter((s) => s.activityId != null).every((s) => s.attachBorn === undefined)).toBe(true);
        // Each offshoot's first (depth-1, born-1) segment starts at the origin.
        for (const id of ['a', 'b']) {
            const first = segs.find((s) => s.activityId === id && s.born === 1);
            expect(first?.depth).toBe(1);
            expect(first?.x1).toBe(0);
            expect(first?.y1).toBe(0);
        }
    });

    it('starts the taproot at the origin (absolute coords)', () => {
        const segs = generateGarden(habits, opts);
        const tap0 = segs.find((s) => s.activityId === null && s.born === 1);
        expect(tap0?.x1).toBe(0);
        expect(tap0?.y1).toBe(0);
    });
});

describe('generateRootSystem (legacy)', () => {
    it('tags segments with a null activityId', () => {
        const segs = generateRootSystem(7);
        expect(segs.length).toBeGreaterThan(0);
        expect(segs.every((s) => s.activityId === null)).toBe(true);
    });
});
