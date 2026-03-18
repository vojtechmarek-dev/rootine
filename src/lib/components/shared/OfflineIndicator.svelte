<script lang="ts">
    import { getNetworkStatus } from '$lib/sync/network.svelte';
    import { getSyncEngine } from '$lib/sync/engine.svelte';

    const network = getNetworkStatus();
    const syncEngine = getSyncEngine();
</script>

{#if !network.isOnline}
    <div class="border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning-foreground">
        <div class="mx-auto flex w-full max-w-screen-sm items-center justify-between gap-2">
            <p class="font-medium">You're offline</p>
            <p class="text-xs text-muted-foreground">
                {#if syncEngine.pendingCount > 0}
                    {syncEngine.pendingCount} pending {syncEngine.pendingCount === 1 ? 'action' : 'actions'}
                {:else}
                    Changes will sync automatically
                {/if}
            </p>
        </div>
    </div>
{/if}
