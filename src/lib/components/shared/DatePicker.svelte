<script lang="ts">
    import type { DateValue } from '@internationalized/date';
    import { DateFormatter, getLocalTimeZone, today } from '@internationalized/date';
    import { cn } from '$lib/utils.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Popover from '$lib/components/ui/popover/index.js';
    import { Calendar } from '$lib/components/ui/calendar/index.js';
    import { toDateValue, toDate } from '$lib/utils/date.js';
    import { CalendarIcon } from '@lucide/svelte';

    const df = new DateFormatter('en-US', {
        dateStyle: 'long',
    });

    let { value = $bindable() }: { value: Date | undefined } = $props();

    // Separate the "View" (what month is visible) from the "Value" (what is selected).
    // We default the view to Today, but we don't default the selection.
    let placeholder = $state(today(getLocalTimeZone()));

    // Read-only derived: JS Date → DateValue for the Calendar UI.
    const calendarValue = $derived(value ? toDateValue(value) : undefined);

    // Write-only callback: DateValue → JS Date back to the parent.
    // Using onValueChange instead of bind:value avoids the infinite loop
    // that occurred when clearing the date (undefined ↔ undefined cycle).
    function handleValueChange(newVal: DateValue | undefined) {
        value = newVal ? toDate(newVal) : undefined;
    }
</script>

<Popover.Root>
    <Popover.Trigger>
        {#snippet child({ props })}
            <Button
                variant="outline"
                size="lg"
                class={cn('w-full justify-start text-start font-normal sm:w-[280px]', !value && 'text-muted-foreground')}
                {...props}
            >
                <CalendarIcon class="me-2 size-4" />
                {value ? df.format(value) : 'Select a date'}
            </Button>
        {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0">
        <Calendar
            value={calendarValue}
            onValueChange={handleValueChange}
            bind:placeholder
            type="single"
            initialFocus
            captionLayout="dropdown"
        />
    </Popover.Content>
</Popover.Root>
