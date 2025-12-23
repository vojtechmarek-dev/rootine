<script lang="ts">
    import { LogOut } from '@lucide/svelte';
    import { signOut } from '@auth/sveltekit/client';

    let { data } = $props<{
        data: { session: { user: { name?: string; email?: string; image?: string } } | null };
    }>();

    const session = $derived(data.session);

    async function handleSignOut() {
        await signOut({ callbackUrl: '/login' });
    }
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
        {#if session}
            <button
                type="button"
                class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Sign out"
                onclick={handleSignOut}
            >
                <LogOut class="h-5 w-5" />
            </button>
        {/if}
    </div>

    <div class="rounded-lg border border-border bg-card p-6 dark:border-border dark:bg-card">
        <p class="text-muted-foreground">Your activities will appear here.</p>
    </div>
</div>
