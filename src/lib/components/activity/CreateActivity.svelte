<script lang="ts">
    import { buttonVariants } from '$lib/components/ui/button';
    import { Plus } from '@lucide/svelte';
    import { cn } from '$lib/utils';
    import { openActivityDrawer } from '$lib/state/activity-drawer.svelte';
    import { onMount } from 'svelte';
    import type { SuperValidated } from 'sveltekit-superforms';
    import type { DrawerActivity } from '$lib/types/schemas';

    let { activityForm }: { activityForm: SuperValidated<DrawerActivity> } = $props();

    let DrawerComponent = $state<any>(null);

    onMount(() => {
        import('./CreateActivityDrawer.svelte').then((mod) => {
            DrawerComponent = mod.default;
        });
    });
</script>

<button
    onclick={() => openActivityDrawer()}
    class={cn(buttonVariants({ variant: 'default', size: 'icon' }), 'fixed right-4 bottom-24 z-50 h-14 w-14 rounded-full shadow-xl')}
>
    <Plus class="h-6 w-6" />
    <span class="sr-only">Create new Rootine</span>
</button>

{#if DrawerComponent}
    <DrawerComponent {activityForm} />
{/if}
