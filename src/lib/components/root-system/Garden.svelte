<script lang="ts">
    import RootSystem from './RootSystem.svelte';
    import { generateRootSystem, type Segment } from '$lib/roots';

    interface Props {
        /** Stable per-user seed. The plant shape is fully determined by this. */
        seed: number;
        /** How much of the system to reveal (lifetime completions). */
        growth?: number;
        /** Growth at which roots reach full thickness. */
        maxGrowth?: number;
        /** Pan / zoom enabled? Off for the dashboard preview. */
        interactive?: boolean;
        /** Draw the above-ground sprout at the origin. */
        sprout?: boolean;
    }

    let { seed, growth = 0, maxGrowth = 60, interactive = true, sprout = true }: Props = $props();

    // Generation depends only on the seed, so this stays stable as growth rises.
    const segments = $derived<Segment[]>(generateRootSystem(seed));

    let root = $state<{ fitToView: () => void } | undefined>();
    /** Re-frame all visible roots. Forwarded from the inner RootSystem. */
    export function fitToView() {
        root?.fitToView();
    }
</script>

<RootSystem bind:this={root} {segments} {growth} {maxGrowth} {interactive} {sprout} />
