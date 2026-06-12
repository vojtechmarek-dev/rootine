<script lang="ts">
    import Garden from '$lib/components/root-system/Garden.svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { page } from '$app/state';
    import { dev } from '$app/environment';
    import { Flame, Sprout, Trophy, Maximize } from '@lucide/svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    const g = $derived(data.gardenData);

    // Focus & celebrate: /roots?highlight=<activityId> frames + flashes that branch.
    const highlightActivityId = $derived(page.url.searchParams.get('highlight'));

    let garden = $state<{ fitToView: () => void } | undefined>();

    // ── dev-only overrides (showcasing / debugging) ──────────────────────────
    let revealAll = $state(false);
    let useGrowthOverride = $state(false);
    let growthPerHabit = $state(8);
    let curOverride = $state<number | null>(null);
    let longOverride = $state<number | null>(null);
    let totalOverride = $state<number | null>(null);

    // Effective habits fed to the visualization (dev overrides applied).
    const effHabits = $derived(
        dev && revealAll
            ? g.habits.map((h) => ({ ...h, growth: 200 }))
            : dev && useGrowthOverride
              ? g.habits.map((h) => ({ ...h, growth: growthPerHabit }))
              : g.habits
    );
    const effTotal = $derived(effHabits.reduce((sum, h) => sum + h.growth, 0));

    const statCur = $derived(curOverride ?? g.currentStreak);
    const statLong = $derived(longOverride ?? g.longestStreak);
    const statTotal = $derived(totalOverride ?? g.totalCompletions);

    const stats = $derived([
        { label: 'Current streak', value: statCur, icon: Flame, tone: 'text-orange-400' },
        { label: 'Longest streak', value: statLong, icon: Trophy, tone: 'text-amber-400' },
        { label: 'Completions', value: statTotal, icon: Sprout, tone: 'text-secondary' },
    ]);

</script>

<div class="flex flex-col gap-4 p-4">
    <div class="flex items-center justify-between">
        <h1 class="flex items-center gap-2 font-serif text-2xl">
            <Sprout class="h-6 w-6 text-secondary" /> Your roots
        </h1>
        <Button variant="outline" size="sm" onclick={() => garden?.fitToView()}>
            <Maximize class="mr-1 h-4 w-4" /> Fit
        </Button>
    </div>

    <div class="grid grid-cols-3 gap-3">
        {#each stats as stat (stat.label)}
            {@const Icon = stat.icon}
            <div class="rounded-2xl bg-surface-container-lowest p-3 text-center sm:p-4">
                <Icon class="mx-auto mb-1 h-5 w-5 {stat.tone}" />
                <div class="text-2xl font-semibold">{stat.value}</div>
                <div class="text-xs text-muted-foreground">{stat.label}</div>
            </div>
        {/each}
    </div>

    {#if dev}
        <!-- Dev-only debug panel: stripped from production builds. -->
        <fieldset
            class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-sm"
        >
            <legend class="px-1 text-xs font-semibold tracking-wide text-amber-500/80 uppercase">Dev · debug</legend>

            <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={revealAll} />
                Reveal whole system
            </label>

            <label class="flex items-center gap-2 {revealAll ? 'opacity-40' : ''}">
                <input type="checkbox" bind:checked={useGrowthOverride} disabled={revealAll} />
                Growth / habit
                <input type="range" min="0" max="40" bind:value={growthPerHabit} disabled={revealAll || !useGrowthOverride} />
                <span class="w-6 tabular-nums">{growthPerHabit}</span>
            </label>

            <label class="flex items-center gap-1">
                <Flame class="h-3.5 w-3.5 text-orange-400" />
                <input
                    type="number"
                    class="w-16 rounded border border-outline-variant/30 bg-transparent px-1 py-0.5"
                    placeholder={String(g.currentStreak)}
                    bind:value={curOverride}
                />
            </label>
            <label class="flex items-center gap-1">
                <Trophy class="h-3.5 w-3.5 text-amber-400" />
                <input
                    type="number"
                    class="w-16 rounded border border-outline-variant/30 bg-transparent px-1 py-0.5"
                    placeholder={String(g.longestStreak)}
                    bind:value={longOverride}
                />
            </label>
            <label class="flex items-center gap-1">
                <Sprout class="h-3.5 w-3.5 text-secondary" />
                <input
                    type="number"
                    class="w-16 rounded border border-outline-variant/30 bg-transparent px-1 py-0.5"
                    placeholder={String(g.totalCompletions)}
                    bind:value={totalOverride}
                />
            </label>

            <Button
                variant="ghost"
                size="sm"
                onclick={() => {
                    revealAll = false;
                    useGrowthOverride = false;
                    curOverride = longOverride = totalOverride = null;
                }}
            >
                Reset
            </Button>
        </fieldset>
    {/if}

    {#if g.habits.length === 0}
        <div class="rounded-2xl bg-surface-container-lowest p-6 text-center text-muted-foreground">
            Create a habit and start completing it — your roots grow from here.
        </div>
    {:else}
        <div class="relative h-[60vh] overflow-hidden rounded-2xl bg-gradient-to-b from-[#2a2118] to-[#120c06]">
            <Garden
                bind:this={garden}
                seed={g.seed}
                habits={effHabits}
                totalGrowth={effTotal}
                currentStreak={statCur}
                longestStreak={statLong}
                {highlightActivityId}
                interactive={true}
            />
        </div>
        <p class="text-center text-xs text-muted-foreground">
            Each root is one habit; it grows as you complete it. Drag to pan, scroll to zoom.
        </p>
    {/if}
</div>
