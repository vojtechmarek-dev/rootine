<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { X, Pause, Play } from '@lucide/svelte';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    let { isPaused, secondsElapsed, onTogglePause, onExit } = $props<{
        isPaused: boolean;
        secondsElapsed: number;
        onTogglePause: () => void;
        onExit: () => void;
    }>();

    const formatTime = $derived((totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60)
            .toString()
            .padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    });
</script>

<header class="z-10 flex items-center justify-between p-4">
    <AlertDialog.Root>
        <AlertDialog.Trigger>
            {#snippet child({ props })}
                <Button {...props} variant="ghost" size="icon-lg" class="text-foreground hover:bg-surface-variant">
                    <X class="size-7" strokeWidth={2.5} />
                </Button>
            {/snippet}
        </AlertDialog.Trigger>
        <AlertDialog.Content class="dark max-w-xs">
            <AlertDialog.Header>
                <AlertDialog.Title>End Workout?</AlertDialog.Title>
                <AlertDialog.Description>
                    Are you sure you want to exit? Your progress in this session will not be saved.
                </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer class="flex flex-col gap-2 sm:flex-col">
                <AlertDialog.Action onclick={onExit} variant="danger">Exit Workout</AlertDialog.Action>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog.Root>
    <div class="flex gap-2">
        <button onclick={onTogglePause} class="group flex items-center gap-3 text-secondary transition-colors hover:opacity-80">
            <span class="flex items-center">
                {#if isPaused}
                    <Play class="h-7 w-7" />
                {:else}
                    <Pause class="h-7 w-7" />
                {/if}
            </span>
            <span class="font-serif text-3xl leading-none tracking-wider tabular-nums transition-opacity group-hover:opacity-80">
                {formatTime(secondsElapsed)}
            </span>
        </button>
    </div>
    <div class="w-10"></div>
    <!-- Spacer for center alignment -->
</header>
