<script lang="ts">
    import Header from '@/components/layout/Header.svelte';
    import Navigation from '@/components/layout/Navigation.svelte';
    import CreateActivity from '@/components/activity/CreateActivity.svelte';
    import { Toaster } from '$lib/components/ui/sonner';
    import NavigationProgress from '@/components/shared/NavigationProgress.svelte';
    import { page } from '$app/state';
    import type { LayoutData } from './$types';

    let { children, data } = $props<{
        children: import('svelte').Snippet;
        data: LayoutData;
    }>();
</script>

<NavigationProgress />
<Toaster />
<div class="flex min-h-screen flex-col bg-background">
    <!--
      Vaul "scale background" affects the element with `data-vaul-drawer-wrapper`.
      We keep it scoped to the page content so fixed UI (bottom nav + "+" trigger)
      doesn't visibly scale/translate and snap back.
    -->
    <div class="flex min-h-screen flex-col bg-background" data-vaul-drawer-wrapper>
        <!-- Fixed Header Area -->
        <Header {data} />
        <!-- Main Content Area -->
        <main class="flex-1 pb-20">
            {@render children()}
        </main>
    </div>

    <!-- Fixed Bottom Navigation -->
    <!-- "+" create-habit FAB: dashboard only. Kept outside the vaul wrapper so it
         doesn't scale with the drawer (see note above). -->
    {#if page.url.pathname === '/'}
        <CreateActivity activityForm={data.activityForm} />
    {/if}
    <Navigation />
</div>
