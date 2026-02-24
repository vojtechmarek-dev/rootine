<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import * as Select from '$lib/components/ui/select/index.js';
    import { WEEKDAYS } from '$lib/constants';
    import type { Schedule } from '$lib/types/schemas';

    let { schedule = $bindable() }: { schedule: Schedule } = $props();

    // Helper to sync Select value with Schedule type
    let selectedType = $derived(schedule.type);

    const onTypeChange = (newType: string) => {
        if (newType === schedule.type) return;

        if (newType === 'daily') {
            schedule = { type: 'daily' };
        } else if (newType === 'weekly') {
            schedule = { type: 'weekly', days: ['mon', 'wed', 'fri'] };
        } else if (newType === 'interval') {
            schedule = { type: 'interval', value: 1, unit: 'days' };
        }
    };
</script>

<Field.Group>
    <Field.Field>
        <Field.Label>Frequency</Field.Label>
        <!-- Use hidden input for form submission if needed, but Shadcn Select usually needs manual handling or a hidden field -->
        <input type="hidden" name="schedule_type" value={schedule.type} />

        <Select.Root type="single" value={selectedType} onValueChange={onTypeChange}>
            <Select.Trigger class="w-full">
                {#if schedule.type === 'daily'}
                    Every Day
                {:else if schedule.type === 'weekly'}
                    Specific Days
                {:else if schedule.type === 'interval'}
                    Repeating Interval
                {/if}
            </Select.Trigger>
            <Select.Content>
                <Select.Item value="daily" label="Every Day" />
                <Select.Item value="weekly" label="Specific Days" />
                <Select.Item value="interval" label="Repeating Interval" />
            </Select.Content>
        </Select.Root>
    </Field.Field>

    {#if schedule.type === 'interval'}
        <div class="flex gap-2">
            <Field.Field class="flex-1">
                <Field.Label>Every</Field.Label>
                <Input type="number" name="schedule_value" min="1" bind:value={schedule.value} />
            </Field.Field>
            <Field.Field class="w-1/3">
                <Field.Label>Unit</Field.Label>
                <input type="hidden" name="schedule_unit" value={schedule.unit} />
                <Select.Root type="single" bind:value={schedule.unit}>
                    <Select.Trigger>
                        {schedule.unit === 'days' ? 'Days' : 'Hours'}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="days" label="Days" />
                        <Select.Item value="hours" label="Hours" />
                    </Select.Content>
                </Select.Root>
            </Field.Field>
        </div>
    {:else if schedule.type === 'weekly'}
        <Field.Field>
            <Field.Label>Days</Field.Label>
            <!-- Hidden inputs to submit array values for server handling -->
            {#each schedule.days as day}
                <input type="hidden" name="schedule_days" value={day} />
            {/each}

            <div class="flex flex-wrap gap-2">
                {#each WEEKDAYS as day}
                    <label
                        class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition-colors
                        {schedule.days.includes(day)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background hover:bg-muted'}"
                    >
                        <input
                            type="checkbox"
                            checked={schedule.days.includes(day)}
                            onchange={(e) => {
                                const checked = e.currentTarget.checked;
                                // We know schedule is weekly here due to if block
                                const currentDays = (schedule as any).days || [];
                                if (checked) {
                                    (schedule as any).days = [...currentDays, day];
                                } else {
                                    (schedule as any).days = currentDays.filter((d: any) => d !== day);
                                }
                            }}
                            class="sr-only"
                        />
                        <span class="text-xs font-medium uppercase">{day.slice(0, 3)}</span>
                    </label>
                {/each}
            </div>
        </Field.Field>
    {/if}
</Field.Group>
