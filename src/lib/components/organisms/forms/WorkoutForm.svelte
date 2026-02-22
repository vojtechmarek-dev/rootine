<script module>
    import { Dumbbell } from '@lucide/svelte';
    export const meta = {
        label: 'Workout',
        icon: Dumbbell,
        color: 'text-blue-500',
    };
</script>

<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import type { WorkoutConfig, Schedule, BaseActivity } from '$lib/types/schemas';
    import CommonActivityFields from '$lib/components/molecules/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/molecules/ScheduleFields.svelte';

    let {
        id,
        config = $bindable(),
        schedule = $bindable(),
        shared = $bindable(),
    }: {
        id?: string;
        config: WorkoutConfig;
        schedule: Schedule;
        shared: BaseActivity;
    } = $props();
</script>

<div class="w-full max-w-md">
    <form {id} method="POST" action="?/createActivity">
        <input type="hidden" name="type" value="workout" />

        <Field.Group>
            <Field.Set>
                <Field.Description>Plan your workout routine.</Field.Description>

                <!-- Shared Fields -->
                <CommonActivityFields
                    bind:title={shared.title}
                    bind:description={shared.description}
                    bind:color={shared.color}
                    bind:icon={shared.icon}
                    bind:startDate={shared.startDate}
                    bind:endDate={shared.endDate}
                    bind:archived={shared.archived}
                />

                <!-- Workout Specific Fields -->
                <Field.Group>
                    <Field.Field>
                        <Field.Label>Estimated Duration (min)</Field.Label>
                        <Input
                            type="number"
                            name="estimatedDurationMin"
                            min="1"
                            placeholder="e.g. 45"
                            bind:value={config.estimatedDurationMin}
                        />
                    </Field.Field>

                    <!-- Unified Schedule -->
                    <ScheduleFields bind:schedule />
                </Field.Group>
            </Field.Set>
        </Field.Group>
    </form>
</div>
