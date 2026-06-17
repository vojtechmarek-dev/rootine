<script lang="ts">
    import type { Component } from 'svelte';
    import type { Action } from 'svelte/action';
    import type { ActivityFormData, FormErrors } from '$lib/types/schemas';

    type Props = {
        data: ActivityFormData;
        errors?: FormErrors;
    };

    let {
        formData = $bindable(),
        errors,
        FormComponent,
        formId = 'activity-form',
        enhance,
    }: {
        formData: ActivityFormData;
        errors?: FormErrors;
        /** Rendered variant matches formData.type; each form exposes a narrower `data` subtype at runtime */
        FormComponent: Component<Props>;
        formId?: string;
        enhance: Action<HTMLFormElement, undefined>;
    } = $props();

    const isEditing = $derived(!!formData.id);
    const action = $derived(isEditing ? '?/updateActivity' : '?/createActivity');
</script>

<form id={formId} method="POST" {action} novalidate use:enhance>
    <FormComponent bind:data={formData} {errors} />
</form>
