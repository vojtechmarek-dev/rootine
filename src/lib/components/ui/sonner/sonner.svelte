<script lang="ts">
    import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
    import { theme } from '$lib/theme/theme.svelte';
    import Loader2Icon from '@lucide/svelte/icons/loader-2';
    import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
    import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
    import InfoIcon from '@lucide/svelte/icons/info';
    import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

    // Bottom-centered, lifted above the fixed bottom nav (~64px + breathing room).
    // svelte-sonner uses `mobileOffset` (not `offset`) on small viewports.
    // Only lift the bottom — a uniform offset also pads left/right, squishing the
    // toast into two rows on narrow phones. Keep side margins small for max width.
    let {
        richColors = true,
        closeButton = true,
        position = 'bottom-center',
        offset = 84,
        mobileOffset = { bottom: 84, left: 16, right: 16, top: 16 },
        ...restProps
    }: SonnerProps = $props();
</script>

<Sonner
    theme={theme.resolvedMode}
    class="toaster group"
    {richColors}
    {closeButton}
    {position}
    {offset}
    {mobileOffset}
    style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
    toastOptions={{ classes: { description: 'whitespace-pre-wrap break-words text-xs opacity-90' } }}
    {...restProps}
>
    {#snippet loadingIcon()}
        <Loader2Icon class="size-4 animate-spin" />
    {/snippet}
    {#snippet successIcon()}
        <CircleCheckIcon class="size-4" />
    {/snippet}
    {#snippet errorIcon()}
        <OctagonXIcon class="size-4" />
    {/snippet}
    {#snippet infoIcon()}
        <InfoIcon class="size-4" />
    {/snippet}
    {#snippet warningIcon()}
        <TriangleAlertIcon class="size-4" />
    {/snippet}
</Sonner>
