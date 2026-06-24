/**
 * Shared Stats view-model types — used by the server rollup (`$lib/server/stats`)
 * and the client components. Kept out of the server module so client code can
 * import them without tripping SvelteKit's server-only import guard (mirrors
 * `$lib/types/garden`).
 */

/** One day in the completion heatmap. */
export interface HeatmapCell {
    /** Local wall-clock day, `yyyy-MM-dd`. */
    date: string;
    /** Local day ordinal (days since epoch) — see `dayOrdinal` in `$lib/streak`. */
    ord: number;
    /** Habits that met their target that day. */
    count: number;
    /** 0–4 colour-intensity bucket. */
    level: 0 | 1 | 2 | 3 | 4;
}

/** Per-habit breakdown row. */
export interface HabitStat {
    id: string;
    title: string;
    type: string;
    /** Accent colour token. */
    color: string;
    /** Distinct days the habit met target (drives growth). */
    doneDays: number;
    /** Revealed growth stage (see `growthProgress` in `$lib/growth`). */
    stage: number;
    currentStreak: number;
    longestStreak: number;
}

/** A milestone with its earned state for the achievements strip. */
export interface AchievementStat {
    id: string;
    name: string;
    description: string;
    earned: boolean;
}

export interface StatsData {
    /** One cell per day over the window, oldest → newest. */
    heatmap: HeatmapCell[];
    /** Global streaks (longest currently-alive habit / best ever). */
    currentStreak: number;
    longestStreak: number;
    /** Lifetime done-days summed across habits. */
    totalCompletions: number;
    /** Non-archived habit count. */
    activeHabits: number;
    /** Most habits completed on a single day in the window. */
    bestDay: number;
    /** % of scheduled occurrences completed over the trailing window. */
    consistency: number;
    /** Window length (days) the consistency % was computed over. */
    consistencyDays: number;
    /** Per-habit breakdown, most-practised first. */
    habits: HabitStat[];
    /** Milestones (earned + locked) in canonical order. */
    achievements: AchievementStat[];
    /** Count of earned achievements (of `achievements.length`). */
    earnedCount: number;
}
