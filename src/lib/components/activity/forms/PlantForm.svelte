<script module>
    import { Flower2 } from '@lucide/svelte';
    export const meta = {
        label: 'Plant',
        icon: Flower2,
    };
</script>

<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import type { ActivityFormData, FormErrors } from '$lib/types/schemas';
    import CommonActivityFields from '$lib/components/activity/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/activity/ScheduleFields.svelte';

    let {
        data = $bindable(),
        errors,
    }: {
        data: Extract<ActivityFormData, { type: 'plant' }>;
        errors?: FormErrors;
    } = $props();
</script>

<div class="w-full max-w-md">
    <Field.Group>
        <Field.Set>
            <Field.Description>Track your plant care.</Field.Description>

            <!-- Shared Fields -->
            <CommonActivityFields
                bind:title={data.title}
                bind:description={data.description}
                bind:color={data.color}
                bind:icon={data.icon}
                bind:startDate={data.startDate}
                titlePlaceholder="e.g. Monstera"
                descriptionPlaceholder="e.g. Water weekly, bright indirect light"
                iconFallback="sprout"
                {errors}
            />

            <!-- Plant Specific Fields -->
            <Field.Group>
                <Field.Field>
                    <Field.Label>Species</Field.Label>
                    <Input type="text" placeholder="e.g. Monstera Deliciosa" bind:value={data.config.species} />
                    <Field.Error errors={errors?.config?.species} />
                </Field.Field>
                <Field.Field>
                    <Field.Label>Location</Field.Label>
                    <Input type="text" placeholder="e.g. Living Room" bind:value={data.config.location} />
                    <Field.Error errors={errors?.config?.location} />
                </Field.Field>

                <!-- Unified Schedule (Replaces waterIntervalDays) -->
                <ScheduleFields bind:schedule={data.schedule} errors={errors?.schedule} />
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
