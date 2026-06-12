<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { onDestroy, onMount } from 'svelte';
    import { cn } from '$lib/utils';
    import { page } from '$app/state';
    import { toastError } from '$lib/toast';
    import { toast } from 'svelte-sonner';

    import WorkoutHeader from '$lib/components/activity/workout/WorkoutHeader.svelte';
    import ActiveExerciseCard from '$lib/components/activity/workout/ActiveExerciseCard.svelte';
    import QueueExerciseCard from '$lib/components/activity/workout/QueueExerciseCard.svelte';
    import WorkoutSummary from '$lib/components/activity/workout/WorkoutSummary.svelte';
    import WorkoutSetPicker from '$lib/components/activity/workout/WorkoutSetPicker.svelte';
    import ProgressBar from '$lib/components/shared/ProgressBar.svelte';
    import TimerWorker from '$lib/workers/timerWorker.ts?worker';

    let { data } = $props();
    let activity = $derived(data.activity);
    const sets = $derived(data.sets ?? []);
    let showSummary = $state(false);
    let isSubmitting = $state(false);

    // Whether the set picker step is shown before focus mode (spec §5):
    // skip it when there are no sets, or rotation is off and only one set.
    const needPicker = $derived(sets.length > 0 && !(data.useRotation === false && sets.length <= 1));

    let selectedSetId = $state<string | null>(null);
    let phase = $state<'pick' | 'focus'>('focus');

    // Initialise selection/phase from server-derived rotation each load.
    $effect.pre(() => {
        if (sets.length === 0) {
            selectedSetId = null;
            phase = 'focus';
        } else if (needPicker) {
            selectedSetId = data.recommendedSetId ?? (sets.length === 1 ? sets[0].id : null);
            phase = 'pick';
        } else {
            // Single set, rotation off → auto-select, straight to focus.
            selectedSetId = sets[0].id;
            phase = 'focus';
        }
    });

    // Exercises driving focus mode: the chosen set's list, or the legacy
    // top-level list for habits with no sets.
    let exercises = $derived(
        sets.length > 0 ? (sets.find((s) => s.id === selectedSetId)?.exercises ?? []) : (activity.config.exercises ?? [])
    );

    type ExerciseStatus = 'pending' | 'completed' | 'skipped';

    /** Per-set log row; matches workout log JSON and `handleComplete` payload. */
    type CompletedSet = { weight: number; reps: number };

    type ExerciseStateRow = {
        id: string;
        status: ExerciseStatus;
        completedSets: CompletedSet[];
    };

    let exerciseStates = $state<ExerciseStateRow[]>([]);
    let currentIndex = $state(0);

    $effect.pre(() => {
        const list = exercises;
        exerciseStates = list.map((e) => ({
            id: e.id,
            status: 'pending' as ExerciseStatus,
            completedSets: [] as CompletedSet[],
        }));
        currentIndex = 0;
    });
    let isAllProcessed = $derived(
        exercises.length > 0 && exerciseStates.length === exercises.length && exerciseStates.every((e) => e.status !== 'pending')
    );

    // Timer
    let worker: Worker | null = null;
    let isPaused = $state(false);
    let secondsElapsed = $state(0);
    // The clock runs only between "entered focus mode" and "workout finished".
    let timerRunning = $state(false);

    onMount(() => {
        worker = new TimerWorker();
        worker.onmessage = (event) => {
            secondsElapsed = event.data;
        };
        // Skip the picker step → start counting immediately. Otherwise wait until
        // the user confirms a set (see onConfirm) so the clock doesn't run while
        // they're still choosing.
        if (phase === 'focus') {
            startTimer();
        }
    });

    onDestroy(() => {
        worker?.terminate();
    });

    function startTimer() {
        if (timerRunning || !worker) {
            return;
        }
        timerRunning = true;
        worker.postMessage('start');
    }

    function stopTimer() {
        if (!timerRunning) {
            return;
        }
        timerRunning = false;
        isPaused = false;
        worker?.postMessage('stop');
    }

    function togglePause() {
        if (!timerRunning) {
            return;
        }
        isPaused = !isPaused;
        worker?.postMessage('pause');
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
        // eslint-disable-next-line svelte/no-navigation-without-resolve
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
            durationSec: secondsElapsed,
            exercises: completed,
            setId: selectedSetId,
        });
    });
</script>

{#if phase === 'pick'}
    <WorkoutSetPicker
        title={activity.title}
        {sets}
        recommendedSetId={data.recommendedSetId ?? null}
        lastSet={data.lastSet ?? null}
        bind:selectedSetId
        onConfirm={() => {
            phase = 'focus';
            startTimer();
        }}
        onExit={handleExit}
    />
{:else}
    <div class="relative flex h-dvh flex-col bg-background text-foreground">
        <WorkoutHeader {isPaused} {secondsElapsed} onTogglePause={togglePause} onExit={handleExit} />

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto px-4 pt-8 pb-32">
            <div class="mx-auto max-w-md space-y-4">
                <div class="mb-8 px-2">
                    <p class="mb-2 text-xs font-semibold tracking-widest text-clay uppercase">
                        Workout Progress &bull; {currentIndex === -1 ? exercises.length : currentIndex + 1} of {exercises.length}
                    </p>
                    <h1 class="font-serif text-5xl font-medium tracking-tight text-foreground italic">
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
                        <QueueExerciseCard {exercise} status={exerciseStates[i].status} onTap={() => handleQueueTap(i)} />
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
        <div
            class="fixed right-0 bottom-0 left-0 z-20 flex justify-center border-t border-border/50 bg-background px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]"
        >
            <form
                class="w-full max-w-md"
                method="POST"
                action="?/complete"
                use:enhance={() => {
                    isSubmitting = true;
                    // Freeze the clock the moment they finish — the elapsed time is
                    // already serialised into logData above, so the API call no
                    // longer ticks the visible timer up.
                    stopTimer();
                    return async ({ update, result }) => {
                        isSubmitting = false;
                        if (result.type === 'success') {
                            showSummary = true;
                            // The dashboard's grow toast comes from its optimistic
                            // toggle path, which this flow bypasses — the action
                            // reports the stage crossing instead.
                            const grew = (result.data as { grew?: boolean } | undefined)?.grew === true;
                            setTimeout(async () => {
                                // eslint-disable-next-line svelte/no-navigation-without-resolve
                                await goto('/');
                                if (grew) {
                                    toast.success('Your root has grown! 🌱', {
                                        action: {
                                            label: 'View',
                                            // eslint-disable-next-line svelte/no-navigation-without-resolve
                                            onClick: () => goto(`/roots?highlight=${activity.id}`),
                                        },
                                    });
                                }
                            }, 2000);
                        } else {
                            console.error('Submission result:', result);
                            toastError('Failed to finish workout', {
                                description: 'Your session was not saved. Please try again.',
                                detail: result,
                            });
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
                    {isSubmitting ? 'Finishing…' : 'Finish Workout'}
                </Button>
                {#if isSubmitting}
                    <ProgressBar class="mt-3" />
                {/if}
            </form>
        </div>

        <WorkoutSummary show={showSummary} />
    </div>
{/if}
