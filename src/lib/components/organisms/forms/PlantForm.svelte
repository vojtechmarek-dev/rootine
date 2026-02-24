<script module>
    import { Flower2 } from '@lucide/svelte';
    export const meta = {
        label: 'Plant',
        icon: Flower2,
        color: 'text-green-500',
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
        data: Extract<ActivityFormData, { type: 'plant' }>;
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
                bind:endDate={data.endDate}
                bind:archived={data.archived}
            />

            <!-- Plant Specific Fields -->
            <Field.Group>
                <Field.Field>
                    <Field.Label>Species</Field.Label>
                    <Input type="text" name="species" placeholder="e.g. Monstera Deliciosa" bind:value={data.config.species} />
                </Field.Field>
                <Field.Field>
                    <Field.Label>Location</Field.Label>
                    <Input type="text" name="location" placeholder="e.g. Living Room" bind:value={data.config.location} />
                </Field.Field>

                <!-- Unified Schedule (Replaces waterIntervalDays) -->
                <ScheduleFields bind:schedule={data.schedule} />
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
