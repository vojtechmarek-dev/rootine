<script lang="ts">
    import { LogOut } from '@lucide/svelte';
    import { signOut } from '@auth/sveltekit/client';
    import { Button } from '$lib/components/ui/button';
    let { data } = $props<{
        data: { session: { user: { name?: string; email?: string; image?: string } } | null };
    }>();

    const session = $derived(data.session);

    async function handleSignOut() {
        await signOut({ callbackUrl: '/login' });
    }
</script>

<div class="flex items-center justify-end px-4 py-2 pt-4">
    {#if session}
        <Button variant="ghost" size="icon" onclick={handleSignOut}>
            <LogOut class="h-5 w-5" />
        </Button>
    {/if}
</div>
