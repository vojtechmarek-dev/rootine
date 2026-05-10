<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { X, Pause, Play } from '@lucide/svelte';

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
    <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground hover:bg-surface-variant hover:text-foreground"
        onclick={onExit}
    >
        <X class="h-6 w-6" />
    </Button>
    <div class="flex items-center gap-2">
        <button
            onclick={onTogglePause}
            class="group flex items-center gap-2 text-secondary transition-colors hover:text-secondary-foreground"
        >
            {#if isPaused}
                <Play class="h-4 w-4" />
            {:else}
                <Pause class="h-4 w-4" />
            {/if}
            <span class="font-serif text-2xl tracking-wider tabular-nums transition-opacity group-hover:opacity-80"
                >{formatTime(secondsElapsed)}</span
            >
        </button>
    </div>
    <div class="w-10"></div>
    <!-- Spacer for center alignment -->
</header>
