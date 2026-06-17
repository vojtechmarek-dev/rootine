<script module>
    import { Dumbbell } from '@lucide/svelte';
    export const meta = {
        label: 'Workout',
        icon: Dumbbell,
    };
</script>

<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import type { ActivityFormData, FormErrors } from '$lib/types/schemas';
    import { cn } from '$lib/utils';
    import CommonActivityFields from '$lib/components/activity/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/activity/ScheduleFields.svelte';
    import ExerciseListEditor from '$lib/components/activity/workout/ExerciseListEditor.svelte';
    import WorkoutSetsEditor from '$lib/components/activity/workout/WorkoutSetsEditor.svelte';

    let {
        data = $bindable(),
        errors,
    }: {
        data: Extract<ActivityFormData, { type: 'workout' }>;
        errors?: FormErrors;
    } = $props();

    // One editor at a time: a flat exercise list ("single") or named sets the
    // workout cycles through ("sets"). Runtime precedence is "sets win when
    // present", so switching keeps the data consistent instead of showing both.
    let mode = $state<'single' | 'sets'>((data.config.workoutSets?.length ?? 0) > 0 ? 'sets' : 'single');

    function setMode(next: 'single' | 'sets') {
        if (next === mode) {
            return;
        }
        if (next === 'sets') {
            // Carry the flat list over as the first set so nothing is lost.
            if ((data.config.workoutSets?.length ?? 0) === 0 && (data.config.exercises?.length ?? 0) > 0) {
                data.config = {
                    ...data.config,
                    workoutSets: [{ id: crypto.randomUUID(), name: 'Day 1', exercises: data.config.exercises }],
                    exercises: [],
                };
            }
        } else {
            // Flatten back: keep the first set's exercises, drop the rest.
            if ((data.config.exercises?.length ?? 0) === 0 && (data.config.workoutSets?.length ?? 0) > 0) {
                data.config = { ...data.config, exercises: data.config.workoutSets[0].exercises };
            }
            data.config = { ...data.config, workoutSets: [], rotation: [], useRotation: true };
        }
        mode = next;
    }

    const modeOptions = [
        { value: 'single', label: 'Single routine' },
        { value: 'sets', label: 'Rotating sets' },
    ] as const;
</script>

<div class="w-full max-w-md">
    <Field.Group>
        <Field.Set>
            <Field.Description>Plan your workout routine.</Field.Description>

            <!-- Shared Fields -->
            <CommonActivityFields
                bind:title={data.title}
                bind:description={data.description}
                bind:color={data.color}
                bind:icon={data.icon}
                bind:startDate={data.startDate}
                titlePlaceholder="e.g. Push Pull Legs"
                descriptionPlaceholder="e.g. Strength program, 3 times a week"
                iconFallback="dumbbell"
                {errors}
            />

            <!-- Workout Specific Fields -->
            <Field.Group>
                <Field.Field>
                    <Field.Label>Estimated Duration (min)</Field.Label>
                    <Input type="number" min="1" placeholder="e.g. 45" bind:value={data.config.estimatedDurationMin} />
                    <Field.Error errors={errors?.config?.estimatedDurationMin} />
                </Field.Field>

                <!-- Unified Schedule -->
                <ScheduleFields bind:schedule={data.schedule} errors={errors?.schedule} />

                <!-- Structure: flat exercise list vs rotating sets -->
                <Field.Field>
                    <Field.Label>Structure</Field.Label>
                    <div class="flex rounded-full bg-surface-container-low p-1">
                        {#each modeOptions as option (option.value)}
                            <button
                                type="button"
                                class={cn(
                                    'flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                                    mode === option.value
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                aria-pressed={mode === option.value}
                                onclick={() => setMode(option.value)}
                            >
                                {option.label}
                            </button>
                        {/each}
                    </div>
                    <Field.Description>
                        {mode === 'single'
                            ? 'The same exercises every session.'
                            : 'Named sets you cycle through (e.g. Push Day, Pull Day).'}
                    </Field.Description>
                </Field.Field>

                {#if mode === 'single'}
                    <Field.Field>
                        <Field.Label>Exercises</Field.Label>
                        <ExerciseListEditor bind:exercises={data.config.exercises} errors={errors?.config?.exercises} />
                    </Field.Field>
                {:else}
                    <WorkoutSetsEditor
                        bind:workoutSets={data.config.workoutSets}
                        bind:rotation={data.config.rotation}
                        bind:useRotation={data.config.useRotation}
                        errors={errors?.config?.workoutSets}
                    />
                {/if}
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
