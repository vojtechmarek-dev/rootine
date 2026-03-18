<script lang="ts">
    import { Skeleton } from '$lib/components/ui/skeleton';

    const { count = 3 } = $props<{ count?: number }>();
</script>

<div class="space-y-4">
    {#each Array.from({ length: count }, (_, i) => i) as i (i)}
        <div class="rounded-lg border border-border bg-card p-4 dark:border-border dark:bg-card">
            <div class="mb-3 flex items-center justify-between gap-3">
                <Skeleton class="h-4 w-1/2" />
                <Skeleton class="h-6 w-6 rounded-full" />
            </div>
            <div class="mb-4 space-y-2">
                <Skeleton class="h-3 w-2/3" />
                <Skeleton class="h-3 w-1/3" />
            </div>
            <Skeleton class="h-11 w-24" />
        </div>
    {/each}
</div>