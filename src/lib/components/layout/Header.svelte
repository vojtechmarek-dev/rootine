<script lang="ts">
    import { LogOut, X, Settings } from '@lucide/svelte';
    import { signOut } from '@auth/sveltekit/client';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import * as Avatar from '$lib/components/ui/avatar';
    import * as Drawer from '$lib/components/ui/drawer';
    import type { Session } from '$lib/types/schemas';
    import AppearanceSettings from '$lib/components/layout/AppearanceSettings.svelte';
    import NotificationSettings from '$lib/components/layout/NotificationSettings.svelte';
    import HapticSettings from '$lib/components/layout/HapticSettings.svelte';

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

<div class="flex items-center justify-between px-4 py-2 pt-4">
    {#if session}
        <!-- Left Side: Avatar & Brand -->
        <div class="flex items-center justify-center gap-3">
            <Drawer.Root direction="left">
                <Drawer.Trigger class="flex items-center">
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
                                <Drawer.Description>Manage your session.</Drawer.Description>
                            </div>
                            <div class="flex flex-col items-end justify-center">
                                <Drawer.Close class={buttonVariants({ variant: 'ghost', size: 'icon' })}><X class="h-4 w-4" /></Drawer.Close
                                >
                            </div>
                        </Drawer.Header>
                        <div class="space-y-6 p-4 pb-8">
                            <div class="flex items-center gap-4 rounded-2xl bg-surface-container-low p-4">
                                <Avatar.Root class="h-12 w-12">
                                    <Avatar.Image src={user?.image} alt={user?.name} />
                                    <Avatar.Fallback>{getInitials(user?.name)}</Avatar.Fallback>
                                </Avatar.Root>
                                <div>
                                    <p class="font-medium">{user?.name ?? 'User'}</p>
                                    <p class="text-sm text-muted-foreground">{user?.email}</p>
                                </div>
                            </div>

                            <Button variant="danger" class="w-full" onclick={handleSignOut}>
                                <LogOut class="mr-2 h-4 w-4" />
                                Log out
                            </Button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Root>
            <span class="mt-0.5 font-serif text-2xl leading-none font-semibold tracking-tight text-foreground italic">Rootine</span>
        </div>

        <!-- Right Side: Settings -->
        <Drawer.Root direction="right">
            <Drawer.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon', class: 'h-11 w-11 rounded-full' })}>
                <Settings class="size-5 text-foreground" />
                <span class="sr-only">Settings</span>
            </Drawer.Trigger>
            <Drawer.Content>
                <div class="flex h-full w-full flex-col">
                    <Drawer.Header class="flex-row justify-between text-left">
                        <div class="flex flex-col">
                            <Drawer.Title>Settings</Drawer.Title>
                            <Drawer.Description>App preferences and appearance.</Drawer.Description>
                        </div>
                        <div class="flex flex-col items-end justify-center">
                            <Drawer.Close class={buttonVariants({ variant: 'ghost', size: 'icon' })}><X class="h-4 w-4" /></Drawer.Close>
                        </div>
                    </Drawer.Header>
                    <div class="space-y-4 p-4 pb-8">
                        <AppearanceSettings />
                        <NotificationSettings />
                        <HapticSettings />
                    </div>
                </div>
            </Drawer.Content>
        </Drawer.Root>
    {/if}
</div>
