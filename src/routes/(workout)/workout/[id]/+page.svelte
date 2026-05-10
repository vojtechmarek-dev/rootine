<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { onMount } from 'svelte';
    import { cn } from '$lib/utils';
    import { page } from '$app/state';
    import { toast } from 'svelte-sonner';

    import WorkoutHeader from '$lib/components/activity/workout/WorkoutHeader.svelte';
    import ActiveExerciseCard from '$lib/components/activity/workout/ActiveExerciseCard.svelte';
    import QueueExerciseCard from '$lib/components/activity/workout/QueueExerciseCard.svelte';
    import WorkoutSummary from '$lib/components/activity/workout/WorkoutSummary.svelte';

    let { data } = $props();
    let activity = $derived(data.activity);
    let exercises = $derived(activity.config.exercises ?? []);

    type ExerciseStatus = 'pending' | 'completed' | 'skipped';

    let exerciseStates = $state(
        exercises.map((e) => ({
            id: e.id,
            status: 'pending' as ExerciseStatus,
            completedSets: [] as any[],
        }))
    );

    let currentIndex = $state(0);
    let isAllProcessed = $derived(exercises.length > 0 && exerciseStates.every((e) => e.status !== 'pending'));

    // Timer
    let secondsElapsed = $state(0);
    let timerInterval: ReturnType<typeof setInterval>;
    let isPaused = $state(false);

    let showSummary = $state(false);
    let isSubmitting = $state(false);

    onMount(() => {
        startTimer();
        return () => clearInterval(timerInterval);
    });

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isPaused) {
                secondsElapsed++;
            }
        }, 1000);
    }

    function togglePause() {
        isPaused = !isPaused;
    }

    function advanceToNextPending() {
        const nextIdx = exerciseStates.findIndex((e) => e.status === 'pending');
        currentIndex = nextIdx;
    }

    function handleComplete(index: number) {
        const exercise = exercises[index];
        exerciseStates[index].status = 'completed';
        exerciseStates[index].completedSets = Array.from({ length: exercise.sets }).map(() => ({
            weight: exercise.weight ?? 0,
            reps: exercise.reps ?? 0,
        }));
        advanceToNextPending();
    }

    function handleSkip(index: number) {
        exerciseStates[index].status = 'skipped';
        advanceToNextPending();
    }

    function handleQueueTap(index: number) {
        currentIndex = index;
    }

    function handleExit() {
        goto('/');
    }

    const logDataJSON = $derived.by(() => {
        const completed = exerciseStates
            .filter((e) => e.status === 'completed')
            .map((e) => {
                const ex = exercises.find((x) => x.id === e.id);
                return {
                    name: ex?.name ?? 'Unknown',
                    sets: e.completedSets,
                };
            });

        return JSON.stringify({
            durationMin: Math.round(secondsElapsed / 60),
            exercises: completed,
        });
    });
</script>

<!-- We explicitly enforce the dark theme for this immersive screen -->
<div class="dark relative flex h-[100dvh] flex-col bg-background text-foreground">
    <WorkoutHeader
        {isPaused}
        {secondsElapsed}
        onTogglePause={togglePause}
        onExit={handleExit}
    />

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto px-4 pt-8 pb-32">
        <div class="mx-auto max-w-md space-y-4">
            <div class="mb-8 px-2">
                <p class="mb-2 text-xs font-semibold tracking-widest text-clay uppercase">
                    Workout Progress &bull; {currentIndex === -1 ? exercises.length : currentIndex + 1} of {exercises.length}
                </p>
                <h1 class="font-serif text-5xl font-medium italic tracking-tight text-foreground">
                    {activity.title}
                </h1>
            </div>

            {#each exercises as exercise, i (exercise.id)}
                {#if i === currentIndex}
                    <ActiveExerciseCard
                        {exercise}
                        index={i}
                        totalExercises={exercises.length}
                        onSkip={() => handleSkip(i)}
                        onComplete={() => handleComplete(i)}
                    />
                {:else}
                    <QueueExerciseCard
                        {exercise}
                        status={exerciseStates[i].status}
                        onTap={() => handleQueueTap(i)}
                    />
                {/if}
            {/each}

            {#if exercises.length === 0}
                <div class="rounded-2xl bg-surface-container-low p-8 text-center text-muted-foreground">
                    No exercises configured for this workout.
                </div>
            {/if}
        </div>
    </main>

    <!-- Bottom Action Bar -->
    <div class="fixed right-0 bottom-0 left-0 flex justify-center bg-gradient-to-t from-background via-background/90 to-transparent p-6 pt-12 pb-8">
        <form
            class="w-full max-w-md"
            method="POST"
            action="?/complete"
            use:enhance={() => {
                isSubmitting = true;
                return async ({ update, result }) => {
                    isSubmitting = false;
                    if (result.type === 'success') {
                        showSummary = true;
                        setTimeout(() => {
                            goto('/');
                        }, 2000);
                    } else {
                        toast.error('Failed to finish workout');
                        console.error('Submission result:', result);
                        await update();
                    }
                };
            }}
        >
            <input type="hidden" name="logData" value={logDataJSON} />
            <input type="hidden" name="targetDate" value={page.url.searchParams.get('date') ?? ''} />
            <Button
                type="submit"
                variant={isAllProcessed ? 'clay' : 'outline'}
                class={cn(
                    'h-14 w-full rounded-2xl text-lg font-medium shadow-ambient transition-all',
                    !isAllProcessed && 'border-outline-variant/20 bg-surface-container-low text-muted-foreground opacity-60'
                )}
                disabled={!isAllProcessed || isSubmitting || exercises.length === 0}
            >
                {isSubmitting ? 'Finishing...' : 'Finish Workout'}
            </Button>
        </form>
    </div>

    <WorkoutSummary show={showSummary} />
</div>
