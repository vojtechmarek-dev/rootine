<script lang="ts">
    import Header from '@/components/layout/Header.svelte';
    import Navigation from '@/components/layout/Navigation.svelte';
    import CreateActivity from '@/components/activity/CreateActivity.svelte';
    import type { LayoutData } from './$types';

    let { children, data } = $props<{
        children: import('svelte').Snippet;
        data: LayoutData;
    }>();
</script>

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
    <CreateActivity />
    <Navigation />
</div>
