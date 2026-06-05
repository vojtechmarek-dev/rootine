<script lang="ts">
    import Garden from './Garden.svelte';
    import type { GardenData } from '$lib/server/garden';
    import { Flame, Sprout, Maximize2 } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';

    // The dashboard streams this in, so accept the promise and resolve it here —
    // the garden never blocks the activity list.
    let { data }: { data: Promise<GardenData> } = $props();
</script>

<div class="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#2a2118] to-[#120c06] text-[#f3e9da]">
    {#await data}
        <div class="h-52 w-full animate-pulse bg-white/5"></div>
    {:then garden}
        <div class="flex items-center justify-between px-4 pt-4">
            <div class="flex items-center gap-2">
                <Sprout class="h-4 w-4 text-[#a9e08a]" />
                <span class="font-serif text-lg">Your garden</span>
            </div>
            <div class="flex items-center gap-1 text-sm text-orange-300" title="Current streak">
                <Flame class="h-4 w-4" />
                <span class="font-medium">{garden.currentStreak}</span>
            </div>
        </div>

        <button
            type="button"
            class="group relative block h-44 w-full"
            aria-label="Expand garden"
            onclick={() => goto(resolve('/garden'))}
        >
            <Garden seed={garden.seed} growth={garden.growth} interactive={false} />
            <span
                class="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs opacity-70 backdrop-blur transition group-hover:opacity-100"
            >
                <Maximize2 class="h-3 w-3" /> Expand
            </span>
        </button>
    {:catch}
        <div class="p-4 text-sm text-[#c9bba6]">Garden unavailable right now.</div>
    {/await}
</div>
