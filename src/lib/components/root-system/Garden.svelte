<script lang="ts">
    import RootSystem from './RootSystem.svelte';
    import { generateGarden, type Segment } from '$lib/roots';
    import { earnedAchievements } from '$lib/achievements';
    import { growthStage } from '$lib/growth';
    import type { GardenHabit } from '$lib/types/garden';

    interface Props {
        /** Stable per-user seed → fixed shared-tree shape. */
        seed: number;
        /** Habits mapped onto the taproot's offshoots. Order should be stable (createdAt). */
        habits: GardenHabit[];
        /** Total completions — drives reveal + root thickness. Defaults to the sum. */
        totalGrowth?: number;
        /** Current streak — for streak-based leaf achievements. */
        currentStreak?: number;
        /** Best streak ever — streak milestones use this so leaves persist. */
        longestStreak?: number;
        /** Focus & celebrate: frame + flash this activity's branch. */
        highlightActivityId?: string | null;
        /** Growth at which roots reach full thickness. */
        maxGrowth?: number;
        /** Pan / zoom enabled? Off for the dashboard preview. */
        interactive?: boolean;
        /** Screen px obscured at the bottom (fixed nav) — biases auto-fit upward. */
        bottomInset?: number;
        /** Draw the above-ground sprout at the origin. */
        sprout?: boolean;
        /** A root was clicked — bubble up the owning activity. */
        onselect?: (activityId: string, type: string) => void;
    }

    let {
        seed,
        habits,
        totalGrowth,
        currentStreak = 0,
        longestStreak = 0,
        highlightActivityId = null,
        maxGrowth = 60,
        interactive = true,
        sprout = true,
        bottomInset = 0,
        onselect,
    }: Props = $props();

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

    // Reveal roots by staggered STAGE (distinct days → segments), not raw days —
    // a root extends one segment per growth step, so it grows deliberately.
    const growthByActivity = $derived(Object.fromEntries(habits.map((h) => [h.id, growthStage(h.growth)])));

    const total = $derived(totalGrowth ?? habits.reduce((sum, h) => sum + h.growth, 0));

    // Earned milestones → leaves on the plant (hoverable, escalating rarity).
    const leaves = $derived(
        earnedAchievements({
            totalCompletions: total,
            currentStreak,
            longestStreak,
            habitCount: habits.length,
            maxHabitGrowth: habits.reduce((m, h) => Math.max(m, h.growth), 0),
        }).map((a) => ({ id: a.id, name: a.name, description: a.description }))
    );

    const describe = (seg: Segment) => {
        const h = seg.activityId ? byId.get(seg.activityId) : undefined;
        if (!h) return { name: 'Tap Root' };
        const days = `${h.growth} day${h.growth === 1 ? '' : 's'} of practice`;
        return { name: h.title, meta: h.streak > 0 ? `${days} · 🔥 ${h.streak}` : days };
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
    {leaves}
    {highlightActivityId}
    {maxGrowth}
    {interactive}
    {sprout}
    {bottomInset}
    {seed}
    {describe}
    onselect={handleSelect}
/>
