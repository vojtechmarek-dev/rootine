import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, earnedAchievements, type GardenStats } from './achievements';

const stats = (over: Partial<GardenStats> = {}): GardenStats => ({
    totalCompletions: 0,
    currentStreak: 0,
    longestStreak: 0,
    habitCount: 0,
    maxHabitGrowth: 0,
    ...over,
});

describe('earnedAchievements', () => {
    it('grows nothing with zero activity', () => {
        expect(earnedAchievements(stats())).toEqual([]);
    });

    it('earns the first leaf on the very first completion', () => {
        const earned = earnedAchievements(stats({ totalCompletions: 1 }));
        expect(earned.map((a) => a.id)).toEqual(['first-step']);
    });

    it('first two are easy (5 completions earns two leaves)', () => {
        const earned = earnedAchievements(stats({ totalCompletions: 5 }));
        expect(earned.map((a) => a.id)).toEqual(['first-step', 'taking-root']);
    });

    it('streak milestones use longestStreak (survive a broken current streak)', () => {
        const earned = earnedAchievements(stats({ totalCompletions: 1, currentStreak: 0, longestStreak: 7 }));
        expect(earned.map((a) => a.id)).toContain('one-week');
        expect(earned.map((a) => a.id)).toContain('momentum');
    });

    it('per-habit milestone keys off the most-completed habit', () => {
        expect(earnedAchievements(stats({ maxHabitGrowth: 100 })).map((a) => a.id)).toContain('deep-roots');
        expect(earnedAchievements(stats({ maxHabitGrowth: 99 })).map((a) => a.id)).not.toContain('deep-roots');
    });

    it('returns achievements in canonical (escalating) order', () => {
        const earned = earnedAchievements(stats({ totalCompletions: 1000, longestStreak: 1000, maxHabitGrowth: 1000 }));
        expect(earned).toEqual(ACHIEVEMENTS); // all earned, original order preserved
    });

    it('rarer milestones need much more (100 completions ≠ 365-day streak)', () => {
        const ids = earnedAchievements(stats({ totalCompletions: 100, longestStreak: 0 })).map((a) => a.id);
        expect(ids).toContain('centurion');
        expect(ids).not.toContain('evergreen');
        expect(ids).not.toContain('unstoppable');
    });
});
