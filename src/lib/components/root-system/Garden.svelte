<script lang="ts">
    import RootSystem from './RootSystem.svelte';
    import { generateGarden, type Segment } from '$lib/roots';
    import type { GardenHabit } from '$lib/types/garden';

    interface Props {
        /** Stable per-user seed → fixed shared-tree shape. */
        seed: number;
        /** Habits mapped onto the taproot's offshoots. Order should be stable (createdAt). */
        habits: GardenHabit[];
        /** Total completions — drives reveal + root thickness. Defaults to the sum. */
        totalGrowth?: number;
        /** Growth at which roots reach full thickness. */
        maxGrowth?: number;
        /** Pan / zoom enabled? Off for the dashboard preview. */
        interactive?: boolean;
        /** Draw the above-ground sprout at the origin. */
        sprout?: boolean;
        /** A root was clicked — bubble up the owning activity. */
        onselect?: (activityId: string, type: string) => void;
    }

    let { seed, habits, totalGrowth, maxGrowth = 60, interactive = true, sprout = true, onselect }: Props = $props();

    const byId = $derived(new Map(habits.map((h) => [h.id, h])));

    // One offshoot per taproot node, top-down: active habits cascade at
    // increasing depths (alternating L/R) for an organic spread, with no gaps.
    const PER_NODE = 1;

    // Generate the taproot (absolute) + every habit's offshoot (relative to the
    // origin). Stable per seed + habit set.
    const raw = $derived<Segment[]>(
        generateGarden(
            habits.map((h) => ({ id: h.id, color: h.color })),
            { seed }
        )
    );

    // Place ONLY the active habits onto taproot nodes, packed from the top with no
    // gaps — so the first visible offshoot always sits near the surface and idle
    // habits leave no bare taproot. Active offshoots are mirrored L/R and translated
    // onto their node; `attachBorn` tells RootSystem how deep to reveal the taproot.
    const segments = $derived.by<Segment[]>(() => {
        const taproot = raw.filter((s) => s.activityId === null);
        const nodePos: Record<number, { x: number; y: number }> = {};
        for (const s of taproot) nodePos[s.born] = { x: s.x2, y: s.y2 };
        const K = taproot.length;

        const offshootsById: Record<string, Segment[]> = {};
        for (const s of raw) if (s.activityId) (offshootsById[s.activityId] ??= []).push(s);

        const placed: Segment[] = [...taproot];
        let ai = 0;
        for (const h of habits) {
            if (h.growth <= 0) continue; // idle habits occupy no node
            const node = Math.min(K, 1 + Math.floor(ai / PER_NODE));
            const side = ai % 2 === 0 ? 1 : -1;
            const p = nodePos[node];
            ai++;
            for (const s of offshootsById[h.id] ?? []) {
                placed.push({
                    ...s,
                    attachBorn: node,
                    x1: p.x + side * s.x1,
                    y1: p.y + s.y1,
                    cx: p.x + side * s.cx,
                    cy: p.y + s.cy,
                    x2: p.x + side * s.x2,
                    y2: p.y + s.y2,
                });
            }
        }
        return placed;
    });

    const growthByActivity = $derived(Object.fromEntries(habits.map((h) => [h.id, h.growth])));

    const total = $derived(totalGrowth ?? habits.reduce((sum, h) => sum + h.growth, 0));

    const describe = (seg: Segment) => {
        const h = seg.activityId ? byId.get(seg.activityId) : undefined;
        if (!h) return { name: 'Root' };
        return { name: h.title, meta: `${h.growth} completed` };
    };

    const handleSelect = (activityId: string | null) => {
        if (!activityId) return;
        const h = byId.get(activityId);
        onselect?.(activityId, h?.type ?? 'habit');
    };

    let root = $state<{ fitToView: () => void } | undefined>();
    /** Re-frame all visible roots. Forwarded from the inner RootSystem. */
    export function fitToView() {
        root?.fitToView();
    }
</script>

<RootSystem
    bind:this={root}
    {segments}
    {growthByActivity}
    growth={total}
    {maxGrowth}
    {interactive}
    {sprout}
    {describe}
    onselect={handleSelect}
/>
