<script lang="ts">
    import type { Component } from 'svelte';

    let {
        label,
        value,
        sub,
        icon: Icon,
    }: {
        label: string;
        value: string | number;
        sub?: string;
        icon?: Component;
    } = $props();
</script>

<div class="rounded-2xl bg-surface-container-low p-4">
    <div class="flex items-center gap-1.5 text-muted-foreground">
        {#if Icon}
            <Icon class="size-3.5" />
        {/if}
        <p class="text-xs font-medium">{label}</p>
    </div>
    <p class="mt-1 text-2xl leading-tight font-semibold tabular-nums text-foreground">{value}</p>
    {#if sub}
        <p class="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    {/if}
</div>
