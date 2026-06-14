<script lang="ts">
    import { Bell, BellOff } from '@lucide/svelte';
    import { toast } from 'svelte-sonner';
    import { Button } from '$lib/components/ui/button';
    import { toastError } from '$lib/toast';
    import { getPushStatus, enablePush, disablePush, type PushStatus } from '$lib/push';

    let status = $state<PushStatus | 'loading'>('loading');
    let busy = $state(false);

    $effect(() => {
        getPushStatus().then((s) => (status = s));
    });

    async function toggle() {
        if (busy) return;
        busy = true;
        try {
            if (status === 'enabled') {
                status = await disablePush();
                toast.success('Reminders disabled on this device');
            } else {
                status = await enablePush();
                if (status === 'enabled') {
                    toast.success('Reminders enabled on this device');
                } else if (status === 'denied') {
                    toastError('Notifications are blocked', {
                        description: 'Allow notifications for this site in your browser settings.',
                    });
                }
            }
        } catch (err) {
            toastError('Could not update notifications', { detail: err });
        } finally {
            busy = false;
        }
    }
</script>

<div class="space-y-3">
    <h3 class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Notifications</h3>

    {#if status === 'unsupported'}
        <p class="text-sm text-muted-foreground">Push notifications aren't supported in this browser.</p>
    {:else}
        <Button
            variant={status === 'enabled' ? 'default' : 'outline'}
            class="w-full justify-start"
            disabled={busy || status === 'loading'}
            onclick={toggle}
        >
            {#if status === 'enabled'}
                <Bell class="mr-2 h-4 w-4" />
                Reminders on — tap to disable
            {:else}
                <BellOff class="mr-2 h-4 w-4" />
                Enable reminders on this device
            {/if}
        </Button>
        {#if status === 'denied'}
            <p class="text-sm text-muted-foreground">Notifications are blocked in your browser settings for this site.</p>
        {/if}
        <p class="text-xs text-muted-foreground">Habits with reminder times set will notify you on this device.</p>
    {/if}
</div>
