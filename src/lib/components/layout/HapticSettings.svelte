<script lang="ts">
    import { Vibrate } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button';
    import { ButtonGroup } from '$lib/components/ui/button-group';
    import { settings, setHapticIntensity, type HapticPreference } from '$lib/settings.svelte';
    import { haptic } from '$lib/haptics';

    const options: { value: HapticPreference; label: string }[] = [
        { value: 'off', label: 'Off' },
        { value: 'light', label: 'Light' },
        { value: 'medium', label: 'Medium' },
        { value: 'strong', label: 'Strong' },
    ];

    const supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    function select(value: HapticPreference) {
        setHapticIntensity(value);
        haptic(); // preview the new setting on this device ('off' stays silent)
    }
</script>

<section class="space-y-3 rounded-2xl bg-surface-container-low p-4">
    <div class="flex items-center gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-foreground">
            <Vibrate class="size-5" />
        </div>
        <div class="min-w-0">
            <h3 class="text-sm leading-none font-medium">Haptics</h3>
            <p class="mt-1 text-xs text-muted-foreground">Vibration strength for taps and completions.</p>
        </div>
    </div>

    {#if !supported}
        <p class="text-sm text-muted-foreground">Vibration isn't supported on this device.</p>
    {:else}
        <ButtonGroup orientation="horizontal" class="flex w-full justify-center">
            {#each options as { value, label } (value)}
                <Button
                    variant={settings.hapticIntensity === value ? 'default' : 'outline'}
                    class="h-11 w-0 min-w-0 flex-1 shrink justify-center"
                    aria-label="Haptic intensity: {label}"
                    onclick={() => select(value)}
                >
                    <span class="text-xs font-medium">{label}</span>
                </Button>
            {/each}
        </ButtonGroup>
    {/if}
</section>
