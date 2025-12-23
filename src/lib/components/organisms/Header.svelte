<script lang="ts">
    import { LogOut, X } from '@lucide/svelte';
    import { signOut } from '@auth/sveltekit/client';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import * as Avatar from '$lib/components/ui/avatar';
    import * as Drawer from '$lib/components/ui/drawer';
    import type { Session } from '$lib/types/schemas';

    let { data } = $props<{
        data: { session: Session | null };
    }>();

    const session = $derived(data.session);
    const user = $derived(session?.user);

    async function handleSignOut() {
        await signOut({ callbackUrl: '/login' });
    }

    function getInitials(name?: string | null) {
        return name ? name.slice(0, 2).toUpperCase() : 'U';
    }
</script>

<div class="flex items-center justify-end px-4 py-2 pt-4">
    {#if session}
        <Drawer.Root direction="right">
            <Drawer.Trigger>
                <Avatar.Root class="cursor-pointer transition-opacity hover:opacity-80">
                    <Avatar.Image src={user?.image} alt={user?.name} />
                    <Avatar.Fallback>{getInitials(user?.name)}</Avatar.Fallback>
                </Avatar.Root>
            </Drawer.Trigger>
            <Drawer.Content>
                <div class="flex h-full w-full flex-col">
                    <Drawer.Header class="flex-row justify-between text-left">
                        <div class="flex flex-col">
                            <Drawer.Title>Account</Drawer.Title>
                            <Drawer.Description>Manage your account settings.</Drawer.Description>
                        </div>
                        <div class="flex flex-col items-end justify-center">
                            <Drawer.Close
                                class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                                ><X class="h-4 w-4" /></Drawer.Close
                            >
                        </div>
                    </Drawer.Header>
                    <div class="p-4 pb-8">
                        <div class="mb-6 flex items-center gap-4 rounded-lg border p-4">
                            <Avatar.Root class="h-12 w-12">
                                <Avatar.Image src={user?.image} alt={user?.name} />
                                <Avatar.Fallback>{getInitials(user?.name)}</Avatar.Fallback>
                            </Avatar.Root>
                            <div>
                                <p class="font-medium">{user?.name ?? 'User'}</p>
                                <p class="text-sm text-muted-foreground">{user?.email}</p>
                            </div>
                        </div>

                        <Button variant="destructive" class="w-full" onclick={handleSignOut}>
                            <LogOut class="mr-2 h-4 w-4" />
                            Log out
                        </Button>
                    </div>
                </div>
            </Drawer.Content>
        </Drawer.Root>
    {/if}
</div>
