<script lang="ts">
    import Header from '@/components/organisms/Header.svelte';
    import Navigation from '@/components/organisms/Navigation.svelte';
    import CreateActivity from '@/components/organisms/CreateActivity.svelte';
    import type { LayoutData } from './$types';

    let { children, data } = $props<{
        children: import('svelte').Snippet;
        data: LayoutData;
    }>();

    const session = $derived(data.session);
</script>

<div class="flex min-h-screen flex-col bg-background" data-vaul-drawer-wrapper>
    <!-- Fixed Header Area -->
    <Header {data} />
    <!-- Main Content Area -->
    <main class="flex-1 pb-20">
        {@render children()}
    </main>

    <!-- Fixed Bottom Navigation -->
    <CreateActivity />
    <Navigation />
</div>
