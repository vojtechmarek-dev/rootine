/**
 * Optimistic per-habit growth deltas.
 *
 * The dashboard completes activities WITHOUT re-running its load (to avoid a
 * skeleton flash), so the server's garden counts stay stale until the next
 * navigation. ActivityCard bumps these deltas on complete/undo so the garden
 * widget grows a root instantly; GardenWidget clears them whenever fresh server
 * data arrives, so the optimistic value never double-counts.
 */
export const gardenProgress = $state<{ deltas: Record<string, number> }>({ deltas: {} });

export function bumpHabitGrowth(activityId: string, by: number): void {
    gardenProgress.deltas[activityId] = (gardenProgress.deltas[activityId] ?? 0) + by;
}

export function resetGardenProgress(): void {
    gardenProgress.deltas = {};
}
