<script lang="ts">
    import Garden from '$lib/components/root-system/Garden.svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Flame, Sprout, Trophy, Maximize } from '@lucide/svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    const g = $derived(data.gardenData);

    let garden = $state<{ fitToView: () => void } | undefined>();

    const stats = $derived([
        { label: 'Current streak', value: g.currentStreak, suffix: g.currentStreak === 1 ? 'day' : 'days', icon: Flame, tone: 'text-orange-400' },
        { label: 'Longest streak', value: g.longestStreak, suffix: g.longestStreak === 1 ? 'day' : 'days', icon: Trophy, tone: 'text-amber-400' },
        { label: 'Completions', value: g.totalCompletions, suffix: 'logged', icon: Sprout, tone: 'text-secondary' },
    ]);
</script>

<div class="flex flex-col gap-4 p-4">
    <div class="flex items-center justify-between">
        <h1 class="flex items-center gap-2 font-serif text-2xl">
            <Sprout class="h-6 w-6 text-secondary" /> Your garden
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

    <div class="relative h-[60vh] overflow-hidden rounded-2xl bg-gradient-to-b from-[#2a2118] to-[#120c06]">
        <Garden bind:this={garden} seed={g.seed} growth={g.growth} interactive={true} />
    </div>

    <p class="text-center text-xs text-muted-foreground">
        Every completed activity grows your roots. Keep your streak alive to grow faster — drag to pan, scroll to zoom.
    </p>
</div>
