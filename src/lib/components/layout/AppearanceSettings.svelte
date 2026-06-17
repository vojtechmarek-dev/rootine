<script lang="ts">
    import { Palette, Sun, Moon, Monitor } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button';
    import { ButtonGroup } from '$lib/components/ui/button-group';
    import { theme, setThemeMode, type ThemeMode } from '$lib/theme/theme.svelte';

    const modes: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
        { mode: 'light', label: 'Light', icon: Sun },
        { mode: 'dark', label: 'Dark', icon: Moon },
        { mode: 'system', label: 'System', icon: Monitor },
    ];
</script>

<section class="space-y-3 rounded-2xl bg-surface-container-low p-4">
    <div class="flex items-center gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-foreground">
            <Palette class="size-5" />
        </div>
        <div class="min-w-0">
            <h3 class="text-sm leading-none font-medium">Appearance</h3>
            <p class="mt-1 text-xs text-muted-foreground">Light, dark, or follow your system.</p>
        </div>
    </div>

    <ButtonGroup orientation="horizontal" class="flex w-full justify-center">
        {#each modes as { mode, label, icon: Icon } (mode)}
            <Button
                variant={theme.mode === mode ? 'default' : 'outline'}
                class="h-11 w-0 min-w-0 flex-1 shrink justify-center gap-2"
                aria-label="Theme mode: {label}"
                onclick={() => setThemeMode(mode)}
            >
                <Icon class="size-4" />
                <span class="text-xs font-medium">{label}</span>
            </Button>
        {/each}
    </ButtonGroup>
</section>
