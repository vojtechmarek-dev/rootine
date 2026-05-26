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
    import type { ActivityFormData } from '$lib/types/schemas';
    import CommonActivityFields from '$lib/components/activity/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/activity/ScheduleFields.svelte';
    import ExerciseListEditor from '$lib/components/activity/workout/ExerciseListEditor.svelte';
    import WorkoutSetsEditor from '$lib/components/activity/workout/WorkoutSetsEditor.svelte';

    let {
        data = $bindable(),
        errors,
    }: {
        data: Extract<ActivityFormData, { type: 'workout' }>;
        errors?: any;
    } = $props();
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
                bind:endDate={data.endDate}
                bind:archived={data.archived}
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

                <!-- Default exercises (used when no sets are defined) -->
                <Field.Field>
                    <Field.Label>Exercises</Field.Label>
                    <Field.Description
                        >Used when this habit has no sets. With sets defined, each set has its own exercises.</Field.Description
                    >
                    <ExerciseListEditor bind:exercises={data.config.exercises} errors={errors?.config?.exercises} />
                </Field.Field>

                <!-- Workout sets + rotation -->
                <WorkoutSetsEditor
                    bind:workoutSets={data.config.workoutSets}
                    bind:rotation={data.config.rotation}
                    bind:useRotation={data.config.useRotation}
                    errors={errors?.config?.workoutSets}
                />
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
