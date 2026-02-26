<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActivityFormData } from '$lib/types/schemas';

    let {
        data = $bindable(),
        FormComponent,
        formId = 'activity-form',
        onSuccess,
    }: {
        data: ActivityFormData;
        FormComponent: any; // Dynamic component - TypeScript will infer at usage
        formId?: string;
        onSuccess?: () => void;
    } = $props();

    // Derived state
    const isEditing = $derived(!!data.id);

    // Determine the server action based on existence of ID
    const action = $derived(isEditing ? '?/updateActivity' : '?/createActivity');
</script>

<form
    id={formId}
    method="POST"
    {action}
    use:enhance={() => {
        return async ({ result, update }) => {
            await update();
            if (result.type === 'success') {
                onSuccess?.();
            }
        };
    }}
>
    <!-- Metadata hidden fields -->
    <input type="hidden" name="type" value={data.type} />
    {#if data.id}
        <input type="hidden" name="id" value={data.id} />
    {/if}

    <!--
		DYNAMIC DELEGATION
		Components are dynamic by default in runes mode
	-->
    <FormComponent bind:data />
</form>
