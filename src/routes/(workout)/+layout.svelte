<script lang="ts">
    import { Toaster } from '$lib/components/ui/sonner';
    let { children } = $props<{
        children: import('svelte').Snippet;
    }>();
</script>

<Toaster />
<div class="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
    <main class="flex-1">
        {@render children()}
    </main>
</div>
