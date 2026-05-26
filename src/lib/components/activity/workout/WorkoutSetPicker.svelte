<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { cn } from '$lib/utils';
    import { Check, Dumbbell } from '@lucide/svelte';
    import type { WorkoutSet } from '$lib/types/schemas';

    let {
        title,
        sets,
        recommendedSetId,
        lastSet,
        selectedSetId = $bindable(),
        onConfirm,
        onExit,
    }: {
        title: string;
        sets: WorkoutSet[];
        recommendedSetId: string | null;
        lastSet: { name: string | null; daysSinceLast: number | null } | null;
        selectedSetId: string | null;
        onConfirm: () => void;
        onExit: () => void;
    } = $props();

    const selectedName = $derived(sets.find((s) => s.id === selectedSetId)?.name?.trim() || 'workout');

    const lastLine = $derived.by(() => {
        if (!lastSet?.name) {
            return null;
        }
        const d = lastSet.daysSinceLast;
        const ago = d == null ? '' : d === 0 ? ' · today' : d === 1 ? ' · yesterday' : ` · ${d} days ago`;
        return `Last workout: ${lastSet.name}${ago}`;
    });
</script>

<div class="relative flex h-dvh flex-col bg-background text-foreground">
    <main class="flex-1 overflow-y-auto px-4 pt-12 pb-32">
        <div class="mx-auto max-w-md space-y-6">
            <div class="px-2">
                <p class="mb-2 text-xs font-semibold tracking-widest text-clay uppercase">{title}</p>
                <h1 class="font-serif text-4xl font-medium tracking-tight text-foreground italic">Ready to start?</h1>
                {#if lastLine}
                    <p class="mt-3 text-sm text-muted-foreground">{lastLine}</p>
                {/if}
            </div>

            <div class="space-y-3">
                {#each sets as set (set.id)}
                    {@const isRecommended = set.id === recommendedSetId}
                    {@const isSelected = set.id === selectedSetId}
                    <button
                        type="button"
                        class={cn(
                            'flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-ambient transition-all active:scale-[0.99]',
                            isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-outline-variant/25 bg-surface-container-low hover:bg-muted/20'
                        )}
                        onclick={() => (selectedSetId = set.id)}
                    >
                        <div
                            class={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-surface-container-high text-muted-foreground'
                            )}
                        >
                            {#if isSelected}
                                <Check class="h-5 w-5" />
                            {:else}
                                <Dumbbell class="h-5 w-5" />
                            {/if}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="truncate font-medium text-foreground">{set.name?.trim() || 'Unnamed set'}</span>
                                {#if isRecommended}
                                    <span class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Recommended</span>
                                {/if}
                            </div>
                            <span class="text-xs text-muted-foreground">
                                {set.exercises.length}
                                {set.exercises.length === 1 ? 'exercise' : 'exercises'}
                            </span>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    </main>

    <div
        class="fixed right-0 bottom-0 left-0 flex flex-col items-center gap-2 bg-linear-to-t from-background via-background/90 to-transparent p-6 pt-12 pb-8"
    >
        <Button
            type="button"
            variant="clay"
            class="h-14 w-full max-w-md rounded-2xl text-lg font-medium shadow-ambient"
            disabled={!selectedSetId}
            onclick={onConfirm}
        >
            Start {selectedName}
        </Button>
        <Button type="button" variant="ghost" class="text-muted-foreground" onclick={onExit}>Cancel</Button>
    </div>
</div>
