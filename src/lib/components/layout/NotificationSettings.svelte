<script lang="ts">
    import { Bell, BellOff, BellRing } from '@lucide/svelte';
    import { toast } from 'svelte-sonner';
    import { Button } from '$lib/components/ui/button';
    import { toastError } from '$lib/toast';
    import { getPushStatus, isPushSupported, enablePush, disablePush, type PushStatus } from '$lib/push';

    let status = $state<PushStatus | 'loading'>('loading');
    let busy = $state(false);

    $effect(() => {
        // Decide support synchronously so the button is usable immediately;
        // refine to the real subscription state in the background. A failed or
        // slow readiness check can never strand the button on 'loading'.
        if (!isPushSupported()) {
            status = 'unsupported';
            return;
        }
        if (Notification.permission === 'denied') {
            status = 'denied';
            return;
        }
        status = 'disabled';
        getPushStatus()
            .then((s) => (status = s))
            .catch((err) => console.error('Push status check failed:', err));
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
            const message = err instanceof Error ? err.message : String(err);
            console.error('[push] enable/disable failed:', err);
            toastError('Could not update notifications', { description: message, detail: err });
        } finally {
            busy = false;
        }
    }
</script>

<section class="space-y-3 rounded-2xl bg-surface-container-low p-4">
    <div class="flex items-center gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-foreground">
            {#if status === 'enabled'}
                <BellRing class="size-5" />
            {:else}
                <Bell class="size-5" />
            {/if}
        </div>
        <div class="min-w-0">
            <h3 class="text-sm leading-none font-medium">Notifications</h3>
            <p class="mt-1 text-xs text-muted-foreground">Reminders for habits with times set, on this device.</p>
        </div>
    </div>

    {#if status === 'unsupported'}
        <p class="text-sm text-muted-foreground">Push notifications aren't supported in this browser.</p>
    {:else}
        <Button
            variant={status === 'enabled' ? 'default' : 'outline'}
            class="w-full justify-center"
            disabled={busy || status === 'loading'}
            onclick={toggle}
        >
            {#if status === 'enabled'}
                <BellRing class="mr-2 h-4 w-4" />
                Reminders on — tap to disable
            {:else}
                <BellOff class="mr-2 h-4 w-4" />
                Enable reminders
            {/if}
        </Button>
        {#if status === 'denied'}
            <p class="text-sm text-muted-foreground">Notifications are blocked in your browser settings for this site.</p>
        {/if}
    {/if}
</section>
