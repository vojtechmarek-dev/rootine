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
        errors,
    }: BaseActivity & { errors?: any } = $props();
</script>

<Field.Group>
    <Field.Field>
        <Field.Label>Title</Field.Label>
        <Input type="text" placeholder="e.g. Drink Water" bind:value={title} required />
        <Field.Error errors={errors?.title} />
    </Field.Field>

    <Field.Field>
        <Field.Label>Description</Field.Label>
        <Input type="text" placeholder="e.g. Drink water 3 times a day" bind:value={description} />
        <Field.Error errors={errors?.description} />
    </Field.Field>
    <Field.Field>
        <Field.Label>Start Date</Field.Label>
        <DatePicker bind:value={startDate} />
        <Field.Error errors={errors?.startDate} />
    </Field.Field>
</Field.Group>
