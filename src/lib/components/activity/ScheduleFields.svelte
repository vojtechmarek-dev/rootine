<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import * as Select from '$lib/components/ui/select/index.js';
    import { Button } from '$lib/components/ui/button';
    import { Plus, X } from '@lucide/svelte';
    import { WEEKDAYS } from '$lib/constants';
    import type { Schedule, FormErrors } from '$lib/types/schemas';

    let { schedule = $bindable(), errors }: { schedule: Schedule; errors?: FormErrors } = $props();

    // Helper to sync Select value with Schedule type
    let selectedType = $derived<Schedule['type']>(schedule.type);
    type WeeklySchedule = Extract<Schedule, { type: 'weekly' }>;

    const isWeeklySchedule = (value: Schedule): value is WeeklySchedule => {
        return value.type === 'weekly';
    };

    // Reminder times live on daily/weekly schedules only.
    type RemindableSchedule = Extract<Schedule, { times?: string[] }>;

    const isRemindable = (value: Schedule): value is RemindableSchedule => {
        return value.type === 'daily' || value.type === 'weekly';
    };

    const addTime = () => {
        if (!isRemindable(schedule)) return;
        schedule.times = [...(schedule.times ?? []), '09:00'];
    };

    const updateTime = (index: number, value: string) => {
        if (!isRemindable(schedule) || !schedule.times) return;
        schedule.times = schedule.times.map((t, i) => (i === index ? value : t));
    };

    const removeTime = (index: number) => {
        if (!isRemindable(schedule) || !schedule.times) return;
        const next = schedule.times.filter((_, i) => i !== index);
        schedule.times = next.length ? next : undefined;
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

    const INTERVAL_UNITS = [
        { value: 'days', one: 'day', many: 'days' },
        { value: 'weeks', one: 'week', many: 'weeks' },
        { value: 'months', one: 'month', many: 'months' },
        { value: 'years', one: 'year', many: 'years' },
    ] as const;

    const unitLabel = (unit: string, value: number) => {
        const def = INTERVAL_UNITS.find((u) => u.value === unit) ?? INTERVAL_UNITS[0];
        return value === 1 ? def.one : def.many;
    };
</script>

<Field.Group>
    <Field.Field>
        <Field.Label>Frequency</Field.Label>

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
        <Field.Error errors={errors?.type} />
    </Field.Field>

    {#if schedule.type === 'interval'}
        <Field.Field>
            <Field.Label>Repeat every</Field.Label>
            <div
                class="flex items-stretch overflow-hidden rounded-sm border border-border/60 bg-input focus-within:border-ring focus-within:ring-2 focus-within:ring-tertiary-fixed"
            >
                <Input
                    type="number"
                    min="1"
                    bind:value={schedule.value}
                    class="h-12 w-20 shrink-0 border-0 bg-transparent text-center focus:ring-0"
                    aria-label="Interval count"
                />
                <div class="my-2 w-px bg-border/60"></div>
                <Select.Root type="single" bind:value={schedule.unit}>
                    <Select.Trigger class="h-12 flex-1 border-0 bg-transparent capitalize focus:ring-0">
                        {unitLabel(schedule.unit, schedule.value)}
                    </Select.Trigger>
                    <Select.Content>
                        {#each INTERVAL_UNITS as u (u.value)}
                            <Select.Item value={u.value} label={u.many.charAt(0).toUpperCase() + u.many.slice(1)} />
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
            <Field.Error errors={errors?.value} />
            <Field.Error errors={errors?.unit} />
        </Field.Field>
    {:else if schedule.type === 'weekly'}
        <Field.Field>
            <Field.Label>Days</Field.Label>

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
            <Field.Error errors={errors?.days} />
        </Field.Field>
    {/if}

    {#if schedule.type === 'daily' || schedule.type === 'weekly'}
        <Field.Field>
            <Field.Label>Reminders</Field.Label>
            <Field.Description>Get a push notification at these times (enable notifications in Settings).</Field.Description>

            <div class="space-y-2">
                {#each schedule.times ?? [] as time, index (index)}
                    <div class="flex items-center gap-2">
                        <Input type="time" value={time} oninput={(e) => updateTime(index, e.currentTarget.value)} class="flex-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove reminder"
                            onclick={() => removeTime(index)}
                        >
                            <X class="h-4 w-4" />
                        </Button>
                    </div>
                {/each}
                <Button type="button" variant="outline" class="w-full" onclick={addTime}>
                    <Plus class="mr-2 h-4 w-4" />
                    Add reminder
                </Button>
            </div>
            <Field.Error errors={errors?.times} />
        </Field.Field>
    {/if}
</Field.Group>
