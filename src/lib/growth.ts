/**
 * growth.ts — staggered root-growth math.
 *
 * A habit's root doesn't extend on every completion. Growth is measured in
 * DISTINCT DAYS of practice (see `distinctDayCount`), and a root gains one new
 * segment ("stage") only every `GROWTH_STEP` days — so roots grow deliberately
 * and a burst of activity in one day can't shoot a root across the garden.
 *
 * The very first day sprouts the first segment immediately (instant reward for
 * starting); every stage after that costs a full `GROWTH_STEP` days. The card's
 * progress meter reflects how far the user is toward the next segment.
 */

/** Distinct days of practice needed to grow each root segment after the first. */
export const GROWTH_STEP = 3;

export interface GrowthProgress {
    /** Revealed root segments so far (0 = nothing planted yet). */
    stage: number;
    /** Distinct days banked toward the NEXT segment. */
    inStage: number;
    /** Days the next segment costs in total. */
    stageCost: number;
    /** Fraction toward the next segment, 0..1. */
    progress: number;
    /** Distinct days still needed to trigger the next growth. */
    toNext: number;
}

/**
 * Map a habit's distinct-day count to its growth stage + progress to the next.
 * Stage 0→1 costs a single day (first sprout); every later stage costs GROWTH_STEP.
 */
export function growthProgress(points: number): GrowthProgress {
    const p = Math.max(0, Math.floor(points));
    if (p === 0) {
        return { stage: 0, inStage: 0, stageCost: 1, progress: 0, toNext: 1 };
    }
    const stage = 1 + Math.floor((p - 1) / GROWTH_STEP);
    const inStage = (p - 1) % GROWTH_STEP;
    return { stage, inStage, stageCost: GROWTH_STEP, progress: inStage / GROWTH_STEP, toNext: GROWTH_STEP - inStage };
}

/** Just the revealed-segment count for a habit's distinct-day total. */
export function growthStage(points: number): number {
    return growthProgress(points).stage;
}
