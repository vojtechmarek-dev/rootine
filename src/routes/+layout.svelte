<script lang="ts">
    import './layout.css';
    import '../app.scss';
    import favicon from '$lib/assets/favicon.svg';
    import { initializeTheme } from '$lib/theme/theme.svelte';
    import { onMount } from 'svelte';
    import { page } from '$app/state';

    let { children } = $props();

    // In Svelte 5, calling this sync function with $effect 
    // at the root of a component sets up the reactivity automatically.
    initializeTheme();

    // Hide splash screen after app is hydrated and ready
    onMount(() => {
        const splash = document.getElementById('app-splash');
        if (!splash) return;

        const hide = () => {
            if (splash.dataset.hidden === 'true') return;
            splash.dataset.hidden = 'true';
            setTimeout(() => splash.remove(), 220);
        };

        // If we are waiting for streamed activities (Neon cold start), wait before hiding
        if (page.data?.streamed?.activities instanceof Promise) {
            page.data.streamed.activities.finally(hide).catch(hide);
        } else {
            hide();
        }
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
