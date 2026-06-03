<script lang="ts">
    import { Toaster } from '$lib/components/ui/sonner';
    import NavigationProgress from '$lib/components/shared/NavigationProgress.svelte';
    let { children } = $props<{
        children: import('svelte').Snippet;
    }>();
</script>

<NavigationProgress />
<Toaster />
<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
    <main class="flex-1">
        {@render children()}
    </main>
</div>
