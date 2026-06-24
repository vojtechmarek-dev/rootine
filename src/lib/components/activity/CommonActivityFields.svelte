<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import type { BaseActivity, FormErrors } from '$lib/types/schemas';
    import DatePicker from '$lib/components/shared/DatePicker.svelte';
    import ColorPicker from '$lib/components/shared/ColorPicker.svelte';
    import IconPicker from '$lib/components/shared/IconPicker.svelte';

    // Use a generic or partial type for the shared fields
    let {
        title = $bindable(),
        description = $bindable(),
        color = $bindable(),
        icon = $bindable(),
        startDate = $bindable(),
        titlePlaceholder = 'e.g. Drink Water',
        descriptionPlaceholder = 'e.g. Drink water 3 times a day',
        iconFallback = 'circle',
        errors,
    }: Omit<BaseActivity, 'endDate' | 'archived'> & {
        titlePlaceholder?: string;
        descriptionPlaceholder?: string;
        iconFallback?: string;
        errors?: FormErrors;
    } = $props();
</script>

<Field.Group>
    <Field.Field>
        <Field.Label>Title</Field.Label>
        <Input type="text" placeholder={titlePlaceholder} bind:value={title} required />
        <Field.Error errors={errors?.title} />
    </Field.Field>

    <Field.Field>
        <Field.Label>Description</Field.Label>
        <Input type="text" placeholder={descriptionPlaceholder} bind:value={description} />
        <Field.Error errors={errors?.description} />
    </Field.Field>
    <Field.Field>
        <Field.Label>Start Date</Field.Label>
        <DatePicker bind:value={startDate} />
        <Field.Error errors={errors?.startDate} />
    </Field.Field>

    <div class="flex items-start gap-3">
        <Field.Field class="flex-1">
            <Field.Label>Color</Field.Label>
            <ColorPicker bind:value={color} label="Pick a color" />
            <Field.Error errors={errors?.color} />
        </Field.Field>
        <!-- Plain column, not a Field: Field forces [&>*]:w-full which would
             stretch the square icon trigger to full width. -->
        <div class="flex shrink-0 flex-col gap-3">
            <Field.Label>Icon</Field.Label>
            <IconPicker bind:value={icon} fallback={iconFallback} />
            <Field.Error errors={errors?.icon} />
        </div>
    </div>
</Field.Group>
