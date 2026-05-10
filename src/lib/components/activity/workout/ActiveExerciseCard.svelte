<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Check, SkipForward, Dumbbell, BarChart2 } from '@lucide/svelte';
    import type { z } from 'zod';
    import type { WorkoutConfigSchema } from '$lib/types/schemas';

    type Exercise = z.infer<typeof WorkoutConfigSchema>['exercises'][number];

    let { exercise, index, totalExercises, onSkip, onComplete } = $props<{
        exercise: Exercise;
        index: number;
        totalExercises: number;
        onSkip: () => void;
        onComplete: () => void;
    }>();

    const isBodyweight = $derived(!exercise.weight);
</script>

<div class="relative my-4 overflow-hidden rounded-3xl bg-surface-container-high shadow-2xl ring-1 ring-outline-variant/10">
    <!-- Ambient glow blobs -->
    <div class="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-clay/15 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-primary-container/25 blur-3xl"></div>

    <!-- Top accent bar with progress dots -->
    <div class="relative z-10 flex items-center gap-2 px-6 pt-5 pb-2">
        {#each Array.from({ length: totalExercises }) as _, i}
            <div
                class={[
                    'h-1 rounded-full transition-all duration-300',
                    i < index
                        ? 'flex-none w-4 bg-success/60'
                        : i === index
                          ? 'flex-1 bg-clay'
                          : 'flex-none w-4 bg-outline-variant/30',
                ].join(' ')}
            ></div>
        {/each}
    </div>

    <div class="relative z-10 px-6 pb-6">
        <!-- Exercise name + index label -->
        <div class="mb-6 mt-3">
            <p class="mb-1 text-xs font-semibold tracking-widest text-clay/80 uppercase">
                Exercise {index + 1} of {totalExercises}
            </p>
            <h2 class="font-sans text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                {exercise.name}
            </h2>
        </div>

        <!-- Stats row -->
        <div class="mb-6 grid grid-cols-2 divide-x divide-outline-variant/10">
            <!-- Sets × Reps -->
            <div class="flex flex-col gap-1 pr-6">
                <span class="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    <BarChart2 class="h-3 w-3" /> Sets & Reps
                </span>
                <div class="flex items-baseline gap-1">
                    <span class="font-sans text-5xl font-bold tabular-nums text-foreground">{exercise.sets}</span>
                    <span class="pb-1 text-2xl font-light text-muted-foreground">×</span>
                    <span class="font-sans text-5xl font-bold tabular-nums text-foreground">{exercise.reps}</span>
                </div>
            </div>

            <!-- Weight -->
            <div class="flex flex-col gap-1 pl-6">
                <span class="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    <Dumbbell class="h-3 w-3" /> Weight
                </span>
                {#if isBodyweight}
                    <div class="flex items-baseline">
                        <span class="font-sans text-2xl font-semibold text-muted-foreground">Body&shy;weight</span>
                    </div>
                {:else}
                    <div class="flex items-baseline gap-1">
                        <span class="font-sans text-5xl font-bold tabular-nums text-foreground">{exercise.weight}</span>
                        <span class="pb-1 text-xl font-medium text-muted-foreground">kg</span>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-3">
            <Button
                variant="ghost"
                class="h-14 flex-none rounded-2xl border border-outline-variant/20 px-5 text-sm font-medium text-muted-foreground transition-all hover:border-outline-variant/40 hover:bg-surface-variant hover:text-foreground"
                onclick={onSkip}
            >
                <SkipForward class="mr-1.5 h-4 w-4" /> Skip
            </Button>
            <Button
                variant="clay"
                class="h-14 flex-1 rounded-2xl text-base font-semibold shadow-[0_0_30px_-10px_var(--clay)] transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_-5px_var(--clay)] active:scale-[0.98]"
                onclick={onComplete}
            >
                <Check class="mr-2 h-5 w-5" /> Complete
            </Button>
        </div>
    </div>
</div>
