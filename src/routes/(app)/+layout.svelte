<script lang="ts">
    import Header from '@/components/layout/Header.svelte';
    import Navigation from '@/components/layout/Navigation.svelte';
    import CreateActivity from '@/components/activity/CreateActivity.svelte';
    import OfflineIndicator from '$lib/components/shared/OfflineIndicator.svelte';
    import { initNetworkStatus } from '$lib/sync/network.svelte';
    import { initSyncEngine } from '$lib/sync/engine.svelte';
    import { hideSplash } from '$lib/splash';
    import type { LayoutData } from './$types';
    import { onMount } from 'svelte';

    let { children, data } = $props<{
        children: import('svelte').Snippet;
        data: LayoutData;
    }>();

    onMount(() => {
        hideSplash();

        const cleanupNetwork = initNetworkStatus();
        const cleanupSync = initSyncEngine();

        return () => {
            cleanupSync();
            cleanupNetwork();
        };
    });
</script>

<div class="flex min-h-screen flex-col bg-background" data-vaul-drawer-wrapper>
    <Header session={data.session} />
    <OfflineIndicator />
    <main class="flex-1 pb-20">
        {@render children()}
    </main>

    <CreateActivity />
    <Navigation />
</div>
