<script lang="ts">
    const { count = 3 } = $props<{ count?: number }>();
</script>

<div class="space-y-4">
    {#each Array.from({ length: count }) as _, i (i)}
        <div class="animate-pulse rounded-lg border border-border bg-card p-4 dark:border-border dark:bg-card">
            <div class="mb-3 h-4 w-1/2 rounded bg-muted"></div>
            <div class="mb-4 h-3 w-2/3 rounded bg-muted"></div>
            <div class="h-11 w-24 rounded bg-muted"></div>
        </div>
    {/each}
</div>