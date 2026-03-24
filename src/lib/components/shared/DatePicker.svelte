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

    // 1. Separate the "View" (what month is visible) from the "Value" (what is selected)
    // We default the view to Today, but we don't default the selection.
    let placeholder = $state(today(getLocalTimeZone()));

    const dateProxy = {
        // Return undefined if no value, so the UI can show "Select a date"
        get value(): DateValue | undefined {
            return value ? toDateValue(value) : undefined;
        },
        // Handle the update
        set value(newVal: DateValue | undefined) {
            value = newVal ? toDate(newVal) : undefined;
        },
    };
</script>

<Popover.Root>
    <Popover.Trigger>
        {#snippet child({ props })}
            <Button
                variant="outline"
                size="lg"
                class={cn(
                    'w-[280px] justify-start text-start font-normal',
                    !value && 'text-muted-foreground' // Check the real prop, or proxy.value
                )}
                {...props}
            >
                <CalendarIcon class="me-2 size-4" />
                <!-- Now this check works correctly -->
                {value ? df.format(value) : 'Select a date'}
            </Button>
        {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0">
        <Calendar bind:value={dateProxy.value} bind:placeholder type="single" initialFocus captionLayout="dropdown" />
    </Popover.Content>
</Popover.Root>
