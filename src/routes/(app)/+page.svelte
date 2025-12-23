<script lang="ts">
    let { data } = $props<{
        data: { session: { user: { name?: string; email?: string; image?: string } } | null };
    }>();

    const session = $derived(data.session);
</script>

<div class="p-4">
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold">Dashboard</h1>
            {#if session?.user}
                <p class="text-sm text-muted-foreground">
                    Welcome back, {session.user.name || session.user.email}
                </p>
            {/if}
        </div>
    </div>

    <div class="rounded-lg border border-border bg-card p-6 dark:border-border dark:bg-card">
        <p class="text-muted-foreground">Your activities will appear here.</p>
    </div>
</div>
