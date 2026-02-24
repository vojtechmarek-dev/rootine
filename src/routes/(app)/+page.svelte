<script module lang="ts">
    // Prevent skeleton flash on client-side navigations.
    let hasHydrated = false;
</script>

<script lang="ts">
    import ActivityCard from '@/components/activity/ActivityCard.svelte';
    import type { PageData } from './$types';
    import { onMount } from 'svelte';

    let { data }: { data: PageData } = $props();

    const session = $derived(data.session);
    const activities = $derived(data.activities);

    let hydrated = $state(hasHydrated);

    onMount(() => {
        hydrated = true;
        hasHydrated = true;
    });
</script>

<div class="p-4">
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold">Dashboard</h1>
            {#if session?.user}
                <p class="text-sm text-muted-foreground">
                    Welcome back, {session.user.name || session.user.email}
                </p>
            {/if}
        </div>
    </div>

    {#if activities?.length === 0}
        <div class="rounded-lg border border-border bg-card p-6 dark:border-border dark:bg-card">
            <p class="text-muted-foreground">Your activities will appear here.</p>
        </div>
    {:else if !hydrated}
        <div class="space-y-4">
            <!-- Skeletons for loading state -->
            {#each Array.from({ length: 3 }) as _}
                <div class="animate-pulse rounded-lg border border-border bg-card p-4 dark:border-border dark:bg-card">
                    <div class="mb-3 h-4 w-1/2 rounded bg-muted"></div>
                    <div class="mb-4 h-3 w-2/3 rounded bg-muted"></div>
                    <div class="h-11 w-24 rounded bg-muted"></div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="space-y-4">
            {#each activities as activity}
                <ActivityCard {activity} />
            {/each}
        </div>
    {/if}
</div>
