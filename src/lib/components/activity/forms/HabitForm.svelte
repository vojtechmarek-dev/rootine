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
                iconFallback="check"
                {errors}
            />

            <!-- Habit Specific Fields -->
            <Field.Group>
                <Field.Field>
                    <Field.Label>Daily goal</Field.Label>
                    <div
                        class="flex items-stretch overflow-hidden rounded-sm border border-border/60 bg-input focus-within:border-ring focus-within:ring-2 focus-within:ring-tertiary-fixed"
                    >
                        <Input
                            type="number"
                            min="1"
                            bind:value={data.config.targetValue}
                            class="h-12 w-20 shrink-0 border-0 bg-transparent text-center focus:ring-0"
                            aria-label="Target value"
                        />
                        <div class="my-2 w-px bg-border/60"></div>
                        <Input
                            type="text"
                            placeholder="times"
                            bind:value={data.config.unit}
                            class="h-12 flex-1 border-0 bg-transparent focus:ring-0"
                            aria-label="Unit"
                        />
                    </div>
                    <Field.Description>How much counts as done — e.g. "3 glasses" or "1 time".</Field.Description>
                    <Field.Error errors={errors?.config?.targetValue} />
                    <Field.Error errors={errors?.config?.unit} />
                </Field.Field>

                <!-- Unified Schedule -->
                <ScheduleFields bind:schedule={data.schedule} errors={errors?.schedule} />
            </Field.Group>
        </Field.Set>
    </Field.Group>
</div>
