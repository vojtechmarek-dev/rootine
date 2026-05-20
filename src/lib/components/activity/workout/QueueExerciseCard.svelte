<script lang="ts">
    import { Check, SkipForward } from '@lucide/svelte';
    import { cn } from '$lib/utils';
    import type { z } from 'zod';
    import type { WorkoutConfigSchema } from '$lib/types/schemas';

    type Exercise = z.infer<typeof WorkoutConfigSchema>['exercises'][number];
    type ExerciseStatus = 'pending' | 'completed' | 'skipped';

    let { exercise, status, onTap } = $props<{
        exercise: Exercise;
        status: ExerciseStatus;
        onTap: () => void;
    }>();
</script>

<button
    class={cn(
        'w-full rounded-2xl border border-transparent p-4 text-left transition-all',
        status === 'completed'
            ? 'bg-success/10 text-success opacity-60'
            : status === 'skipped'
              ? 'bg-surface-variant/50 text-muted-foreground opacity-50'
              : 'border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high'
    )}
    onclick={onTap}
>
    <div class="flex items-center justify-between">
        <div class="flex flex-col text-left">
            <span class="font-medium text-foreground">{exercise.name}</span>
            <span class="mt-0.5 text-xs text-muted-foreground">{exercise.sets} Sets &bull; {exercise.reps} Reps</span>
        </div>
        {#if status === 'completed'}
            <Check class="h-5 w-5" />
        {:else if status === 'skipped'}
            <SkipForward class="h-4 w-4" />
        {/if}
    </div>
</button>
