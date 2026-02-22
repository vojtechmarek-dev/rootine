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
    import type { PlantConfig, Schedule, BaseActivity } from '$lib/types/schemas';
    import CommonActivityFields from '$lib/components/molecules/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/molecules/ScheduleFields.svelte';

    let {
        id,
        config = $bindable(),
        schedule = $bindable(),
        shared = $bindable(),
    }: {
        id?: string;
        config: PlantConfig;
        schedule: Schedule;
        shared: BaseActivity;
    } = $props();
</script>

<div class="w-full max-w-md">
    <form {id} method="POST" action="?/createActivity">
        <input type="hidden" name="type" value="plant" />

        <Field.Group>
            <Field.Set>
                <Field.Description>Track your plant care.</Field.Description>

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

                <!-- Plant Specific Fields -->
                <Field.Group>
                    <Field.Field>
                        <Field.Label>Species</Field.Label>
                        <Input type="text" name="species" placeholder="e.g. Monstera Deliciosa" bind:value={config.species} />
                    </Field.Field>
                    <Field.Field>
                        <Field.Label>Location</Field.Label>
                        <Input type="text" name="location" placeholder="e.g. Living Room" bind:value={config.location} />
                    </Field.Field>

                    <!-- Unified Schedule (Replaces waterIntervalDays) -->
                    <ScheduleFields bind:schedule />
                </Field.Group>
            </Field.Set>
        </Field.Group>
    </form>
</div>
