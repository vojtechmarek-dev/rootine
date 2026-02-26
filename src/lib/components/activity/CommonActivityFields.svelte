<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import type { BaseActivity } from '$lib/types/schemas';
    import DatePicker from '$lib/components/shared/DatePicker.svelte';

    // Use a generic or partial type for the shared fields
    let {
        title = $bindable(),
        description = $bindable(),
        color = $bindable(),
        icon = $bindable(),
        startDate = $bindable(),
        endDate = $bindable(),
        archived = $bindable(),
    }: BaseActivity = $props();
</script>

<Field.Group>
    <Field.Field>
        <Field.Label>Title</Field.Label>
        <Input type="text" name="title" placeholder="e.g. Drink Water" bind:value={title} required />
    </Field.Field>

    <Field.Field>
        <Field.Label>Description</Field.Label>
        <Input type="text" name="description" placeholder="e.g. Drink water 3 times a day" bind:value={description} />
    </Field.Field>
    <Field.Field>
        <Field.Label>Start Date</Field.Label>
        <DatePicker bind:value={startDate} />
        <input type="hidden" name="startDate" value={startDate?.toISOString?.() ?? ''} />
    </Field.Field>
    <input type="hidden" name="endDate" value={endDate?.toISOString?.() ?? ''} />
    <input type="hidden" name="color" value={color ?? ''} />
    <input type="hidden" name="icon" value={icon ?? ''} />
    <input type="hidden" name="archived" value={archived ? 'true' : 'false'} />
</Field.Group>
