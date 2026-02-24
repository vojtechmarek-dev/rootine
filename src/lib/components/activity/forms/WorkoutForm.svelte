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
                        name="estimatedDurationMin"
                        min="1"
                        placeholder="e.g. 45"
                        bind:value={data.config.estimatedDurationMin}
                    />
                </Field.Field>

                <!-- Unified Schedule -->
                <ScheduleFields bind:schedule={data.schedule} />
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
