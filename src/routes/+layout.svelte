<script lang="ts">
    import './layout.css';
    import '../app.scss';
    import favicon from '$lib/assets/favicon.svg';
    import { initializeTheme } from '$lib/theme/theme.svelte';

    let { children } = $props();

    initializeTheme();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
