<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import * as Select from '$lib/components/ui/select/index.js';
    import { WEEKDAYS } from '$lib/constants';
    import type { Schedule } from '$lib/types/schemas';

    let { schedule = $bindable() }: { schedule: Schedule } = $props();

    // Helper to sync Select value with Schedule type
    let selectedType = $derived<Schedule['type']>(schedule.type);
    type WeeklySchedule = Extract<Schedule, { type: 'weekly' }>;

    const isWeeklySchedule = (value: Schedule): value is WeeklySchedule => {
        return value.type === 'weekly';
    };

    const onTypeChange = (newType: Schedule['type']) => {
        if (newType === schedule.type) {
            return;
        }

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
        <input type="hidden" name="schedule.type" value={schedule.type} />

        <Select.Root type="single" value={selectedType} onValueChange={(value) => onTypeChange(value as Schedule['type'])}>
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
                <Input type="number" name="schedule.value" min="1" bind:value={schedule.value} />
            </Field.Field>
            <Field.Field class="w-1/3">
                <Field.Label>Unit</Field.Label>
                <input type="hidden" name="schedule.unit" value={schedule.unit} />
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
            {#each schedule.days as day (day)}
                <input type="hidden" name="schedule.days" value={day} />
            {/each}

            <div class="flex flex-wrap gap-2">
                {#each WEEKDAYS as day (day)}
                    <button
                        type="button"
                        class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors
                        {schedule.days.includes(day)
                            ? 'bg-clay text-clay-foreground shadow-ambient'
                            : 'bg-surface-container-high text-muted-foreground hover:bg-surface-variant'}"
                        onclick={() => {
                            if (!isWeeklySchedule(schedule)) {
                                return;
                            }

                            const isSelected = schedule.days.includes(day);
                            const currentDays = schedule.days;
                            if (!isSelected) {
                                schedule.days = [...currentDays, day];
                            } else {
                                schedule.days = currentDays.filter((item) => item !== day);
                            }
                        }}
                    >
                        <span class="text-xs font-medium uppercase">{day.slice(0, 3)}</span>
                    </button>
                {/each}
            </div>
        </Field.Field>
    {/if}
</Field.Group>
