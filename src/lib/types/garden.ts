/**
 * Shared garden view-model types — used by both the server rollup
 * (`$lib/server/garden`) and the client renderers. Kept out of the server
 * module so client components can import them without tripping SvelteKit's
 * server-only import guard.
 */

/** One habit mapped onto the shared tree — becomes one offshoot of the taproot. */
export interface GardenHabit {
    /** activity id. */
    id: string;
    /** Display name (root tooltip). */
    title: string;
    /** Activity type — drives click-through routing. */
    type: string;
    /** Accent colour token (e.g. "emerald"); "zinc" falls back to brown roots. */
    color: string;
    /** Completions for THIS habit — milestone blooms + tooltip count. */
    growth: number;
}

export interface GardenData {
    /** Stable per-user seed → fixed shared-tree shape. */
    seed: number;
    habits: GardenHabit[];
    /** Lifetime completed (non-skipped) logs across all activities. */
    totalCompletions: number;
    /** Consecutive-day streak, alive through a one-day grace window. */
    currentStreak: number;
    /** Best streak ever recorded. */
    longestStreak: number;
}
