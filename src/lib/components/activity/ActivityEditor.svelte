<script lang="ts">
    import type { Component } from 'svelte';
    import type { Action } from 'svelte/action';
    import type { ActivityFormData } from '$lib/types/schemas';

    type Props = {
        data: ActivityFormData;
    };

    let {
        formData = $bindable(),
        FormComponent,
        formId = 'activity-form',
        enhance,
    }: {
        formData: ActivityFormData;
        /** Rendered variant matches formData.type; each form exposes a narrower `data` subtype at runtime */
        FormComponent: Component<Props>;
        formId?: string;
        enhance: Action<HTMLFormElement, undefined>;
    } = $props();

    const isEditing = $derived(!!formData.id);
    const action = $derived(isEditing ? '?/updateActivity' : '?/createActivity');
</script>

<form id={formId} method="POST" {action} use:enhance>
    <FormComponent bind:data={formData} />
</form>
