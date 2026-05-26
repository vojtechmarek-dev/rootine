<script module>
    import { Check } from '@lucide/svelte';
    export const meta = {
        label: 'Habit',
        icon: Check,
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
        errors,
    }: {
        data: Extract<ActivityFormData, { type: 'habit' }>;
        errors?: any;
    } = $props();
</script>

<div class="w-full max-w-md">
    <Field.Group>
        <Field.Set>
            <Field.Description>What would you like to track?</Field.Description>

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

            <!-- Habit Specific Fields -->
            <Field.Group>
                <Field.Field>
                    <Field.Label>Target Value</Field.Label>
                    <Input type="number" min="1" bind:value={data.config.targetValue} />
                    <Field.Error errors={errors?.config?.targetValue} />
                </Field.Field>
                <Field.Field>
                    <Field.Label>Unit</Field.Label>
                    <Input type="text" placeholder="e.g. times" bind:value={data.config.unit} />
                    <Field.Error errors={errors?.config?.unit} />
                </Field.Field>

                <!-- Unified Schedule -->
                <ScheduleFields bind:schedule={data.schedule} errors={errors?.schedule} />
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
