<script module>
    import { Check } from '@lucide/svelte';
    export const meta = {
        label: 'Habit',
        icon: Check,
        color: 'text-primary',
    };
</script>

<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import type { ActivityFormData } from '$lib/types/schemas';
    import CommonActivityFields from '$lib/components/molecules/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/molecules/ScheduleFields.svelte';

    let {
        data = $bindable(),
    }: {
        data: Extract<ActivityFormData, { type: 'habit' }>;
    } = $props();

    // Determine if we are editing or creating based on presence of data.id
    const isEditing = $derived(!!data.id);
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
            />

            <!-- Habit Specific Fields -->
            <Field.Group>
                <Field.Field>
                    <Field.Label>Target Value</Field.Label>
                    <Input type="number" name="targetValue" min="1" bind:value={data.config.targetValue} />
                </Field.Field>
                <Field.Field>
                    <Field.Label>Unit</Field.Label>
                    <Input type="text" name="unit" placeholder="e.g. times" bind:value={data.config.unit} />
                </Field.Field>

                <!-- Unified Schedule -->
                <ScheduleFields bind:schedule={data.schedule} />
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
