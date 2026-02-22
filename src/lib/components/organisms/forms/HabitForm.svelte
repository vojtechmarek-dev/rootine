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
    import type { HabitConfig, Schedule, BaseActivity } from '$lib/types/schemas';
    import CommonActivityFields from '$lib/components/molecules/CommonActivityFields.svelte';
    import ScheduleFields from '$lib/components/molecules/ScheduleFields.svelte';

    let {
        id,
        shared = $bindable(),
        config = $bindable(),
        schedule = $bindable(),
    }: {
        id?: string;
        shared: BaseActivity;
        config: HabitConfig;
        schedule: Schedule;
    } = $props();
</script>

<div class="w-full max-w-md">
    <!-- 
      1. id={id} allows the parent button to trigger this form 
      2. name attributes allow standard FormData submission
      3. bind:value allows parent to access state directly
    -->
    <form {id} method="POST" action="?/createActivity">
        <input type="hidden" name="type" value="habit" />

        <Field.Group>
            <Field.Set>
                <Field.Description>What would you like to track?</Field.Description>

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

                <!-- Habit Specific Fields -->
                <Field.Group>
                    <Field.Field>
                        <Field.Label>Target Value</Field.Label>
                        <Input type="number" name="targetValue" min="1" bind:value={config.targetValue} />
                    </Field.Field>
                    <Field.Field>
                        <Field.Label>Unit</Field.Label>
                        <Input type="text" name="unit" placeholder="e.g. times" bind:value={config.unit} />
                    </Field.Field>

                    <!-- Unified Schedule -->
                    <ScheduleFields bind:schedule />
                </Field.Group>
            </Field.Set>
        </Field.Group>
    </form>
</div>
