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
    import { Button } from '$lib/components/ui/button/index.js';
    import { Plus, Trash2 } from '@lucide/svelte';
    import type { ActivityFormData } from '$lib/types/schemas';
    import CommonActivityFields from '$lib/components/activity/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/activity/ScheduleFields.svelte';

    let {
        data = $bindable(),
    }: {
        data: Extract<ActivityFormData, { type: 'workout' }>;
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
            />

            <!-- Workout Specific Fields -->
            <Field.Group>
                <Field.Field>
                    <Field.Label>Estimated Duration (min)</Field.Label>
                    <Input
                        type="number"
                        name="config.estimatedDurationMin"
                        min="1"
                        placeholder="e.g. 45"
                        bind:value={data.config.estimatedDurationMin}
                    />
                </Field.Field>

                <!-- Unified Schedule -->
                <ScheduleFields bind:schedule={data.schedule} />

                <!-- Exercises -->
                <Field.Field>
                    <Field.Label>Exercises</Field.Label>
                    <div class="flex flex-col gap-4">
                        {#each data.config.exercises as exercise (exercise.id)}
                            <div
                                class="relative flex flex-col gap-3 rounded-lg bg-surface-container-low p-4 text-foreground shadow-ambient"
                            >
                                <div class="flex items-center gap-2">
                                    <div class="flex-1">
                                        <Input
                                            type="text"
                                            placeholder="Exercise name (e.g. Bench Press)"
                                            bind:value={exercise.name}
                                            class="bg-surface-container-high font-medium"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="shrink-0 text-danger hover:bg-danger/10 hover:text-danger"
                                        onclick={() => {
                                            data.config.exercises = data.config.exercises.filter((e) => e.id !== exercise.id);
                                        }}
                                    >
                                        <Trash2 class="h-4 w-4" />
                                        <span class="sr-only">Remove exercise</span>
                                    </Button>
                                </div>
                                <div class="grid grid-cols-3 gap-3">
                                    <div class="space-y-1">
                                        <label
                                            class="text-xs leading-none font-semibold tracking-wide text-secondary uppercase dark:text-muted-foreground"
                                            for="sets-{exercise.id}">Sets</label
                                        >
                                        <Input
                                            id="sets-{exercise.id}"
                                            type="number"
                                            min="1"
                                            bind:value={exercise.sets}
                                            class="bg-surface-container-high"
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label
                                            class="text-xs leading-none font-semibold tracking-wide text-secondary uppercase dark:text-muted-foreground"
                                            for="reps-{exercise.id}">Reps</label
                                        >
                                        <Input
                                            id="reps-{exercise.id}"
                                            type="number"
                                            min="1"
                                            bind:value={exercise.reps}
                                            class="bg-surface-container-high"
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label
                                            class="text-xs leading-none font-semibold tracking-wide text-secondary uppercase dark:text-muted-foreground"
                                            for="weight-{exercise.id}">Weight</label
                                        >
                                        <Input
                                            id="weight-{exercise.id}"
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder="lbs/kg"
                                            bind:value={exercise.weight}
                                            class="bg-surface-container-high"
                                        />
                                    </div>
                                </div>
                            </div>
                        {/each}

                        <Button
                            variant="outline"
                            class="w-full border-dashed"
                            onclick={() => {
                                data.config.exercises = [
                                    ...data.config.exercises,
                                    { id: crypto.randomUUID(), name: '', sets: 3, reps: 10 },
                                ];
                            }}
                        >
                            <Plus class="mr-2 h-4 w-4" />
                            Add Exercise
                        </Button>
                    </div>
                </Field.Field>
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
