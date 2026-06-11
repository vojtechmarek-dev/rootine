import { describe, it, expect } from 'vitest';
import { growthProgress, growthStage, GROWTH_STEP } from './growth';

describe('growthProgress', () => {
    it('is empty before any practice (one day to first sprout)', () => {
        expect(growthProgress(0)).toEqual({ stage: 0, inStage: 0, stageCost: 1, progress: 0, toNext: 1 });
    });

    it('sprouts the first segment on day one', () => {
        const g = growthProgress(1);
        expect(g.stage).toBe(1);
        expect(g.inStage).toBe(0);
        expect(g.toNext).toBe(GROWTH_STEP);
        expect(g.progress).toBe(0);
    });

    it('fills toward the next segment over GROWTH_STEP days', () => {
        // STEP = 3: day 2 = 1/3, day 3 = 2/3, day 4 = next stage.
        expect(growthProgress(2)).toMatchObject({ stage: 1, inStage: 1, toNext: 2 });
        expect(growthProgress(3)).toMatchObject({ stage: 1, inStage: 2, toNext: 1 });
        expect(growthProgress(4)).toMatchObject({ stage: 2, inStage: 0, toNext: 3 });
    });

    it('grows one stage per GROWTH_STEP days thereafter', () => {
        expect(growthStage(1 + GROWTH_STEP)).toBe(2);
        expect(growthStage(1 + GROWTH_STEP * 9)).toBe(10);
    });

    it('floors fractional / clamps negative input', () => {
        expect(growthStage(2.9)).toBe(growthStage(2));
        expect(growthProgress(-5).stage).toBe(0);
    });
});
