<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import type { SharedActivityProps } from '@/types/schemas';

    // Use a generic or partial type for the shared fields
    let {
        title = $bindable(),
        description = $bindable(),
        color = $bindable(),
        icon = $bindable(),
        startDate = $bindable(),
        endDate = $bindable(),
    }: SharedActivityProps = $props();
</script>

<Field.Group>
    <Field.Field>
        <Field.Label>Title</Field.Label>
        <Input
            type="text"
            name="title"
            placeholder="e.g. Drink Water"
            bind:value={title}
            required
        />
    </Field.Field>

    <Field.Field>
        <Field.Label>Description</Field.Label>
        <Input
            type="text"
            name="description"
            placeholder="e.g. Drink water 3 times a day"
            bind:value={description}
        />
    </Field.Field>
    <Field.Field>
        <Field.Label>Start Date</Field.Label>
        <Input type="date" name="startDate" bind:value={startDate} />
    </Field.Field>
    <Field.Field>
        <!-- Future: ColorPicker and IconPicker components would go here -->
        <!-- For now, keeping hidden or simple inputs as per your current setup -->
    </Field.Field>
</Field.Group>
