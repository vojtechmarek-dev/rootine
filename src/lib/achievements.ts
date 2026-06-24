/**
 * achievements.ts — the milestones that grow leaves on the garden plant.
 *
 * Each earned achievement = one leaf (rendered in this fixed order, so a leaf
 * always sits in the same spot). Ordered easy → rare: the first couple are
 * trivial ("complete your first activity"), later ones are hard (100-day streak).
 * Pure + deterministic so it's unit-testable and safe to evaluate on the client.
 */

/** Inputs every achievement is evaluated against. Derived from GardenData. */
export interface GardenStats {
    /** Lifetime completed (non-skipped) logs across all activities. */
    totalCompletions: number;
    /** Current consecutive-day streak. */
    currentStreak: number;
    /** Best streak ever (used for streak milestones — they stay earned). */
    longestStreak: number;
    /** Number of (non-archived) habits. */
    habitCount: number;
    /** Completions of the single most-completed habit. */
    maxHabitGrowth: number;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    /** Whether the stats satisfy this milestone. */
    earned: (s: GardenStats) => boolean;
}

/**
 * Ordered easiest → rarest. Add new milestones at the END so existing leaves keep
 * their positions. Streak milestones use `longestStreak` so a leaf, once grown,
 * never falls off if the current streak breaks.
 */
export const ACHIEVEMENTS: Achievement[] = [
    { id: 'first-step', name: 'First Step', description: 'Complete your very first activity.', earned: (s) => s.totalCompletions >= 1 },
    { id: 'taking-root', name: 'Taking Root', description: 'Complete 5 activities.', earned: (s) => s.totalCompletions >= 5 },
    { id: 'momentum', name: 'Momentum', description: 'Reach a 3-day streak.', earned: (s) => s.longestStreak >= 3 },
    { id: 'one-week', name: 'One Week Strong', description: 'Reach a 7-day streak.', earned: (s) => s.longestStreak >= 7 },
    { id: 'thirty-done', name: 'Thirty Done', description: 'Complete 30 activities.', earned: (s) => s.totalCompletions >= 30 },
    { id: 'habit-formed', name: 'Habit Formed', description: 'Reach a 30-day streak.', earned: (s) => s.longestStreak >= 30 },
    { id: 'deep-roots', name: 'Deep Roots', description: 'Complete one habit 100 times.', earned: (s) => s.maxHabitGrowth >= 100 },
    { id: 'centurion', name: 'Centurion', description: 'Complete 100 activities.', earned: (s) => s.totalCompletions >= 100 },
    { id: 'unstoppable', name: 'Unstoppable', description: 'Reach a 100-day streak.', earned: (s) => s.longestStreak >= 100 },
    { id: 'evergreen', name: 'Evergreen', description: 'Reach a 365-day streak.', earned: (s) => s.longestStreak >= 365 },
];

/** Earned achievements, in canonical (escalating) order. */
export function earnedAchievements(stats: GardenStats): Achievement[] {
    return ACHIEVEMENTS.filter((a) => a.earned(stats));
}
