<script lang="ts">
    import { navigating } from '$app/state';
    import ProgressBar from './ProgressBar.svelte';

    // SvelteKit sets navigating.to for the duration of a client-side navigation
    // (link clicks, goto, form redirects). Show a thin top bar while it's active.
    const active = $derived(navigating.to != null);
</script>

{#if active}
    <div class="fixed inset-x-0 top-0 z-[100]">
        <ProgressBar class="h-1 rounded-none bg-transparent" />
    </div>
{/if}
