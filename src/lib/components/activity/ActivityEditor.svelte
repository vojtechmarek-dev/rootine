<script lang="ts">
    import { enhance } from '$app/forms';
    import { toToastDescription } from '$lib/utils';
    import { toast } from 'svelte-sonner';
    import type { Component } from 'svelte';
    import type { ActivityFormData } from '$lib/types/schemas';

    let {
        data = $bindable(),
        FormComponent,
        formId = 'activity-form',
        onSuccess,
    }: {
        data: ActivityFormData;
        FormComponent: Component<{ data: unknown }>;
        formId?: string;
        onSuccess?: () => void;
    } = $props();

    // Derived state
    const isEditing = $derived(!!data.id);

    // Determine the server action based on existence of ID
    const action = $derived(isEditing ? '?/updateActivity' : '?/createActivity');

    function getFailureToastData(data: unknown): { title: string; description?: string } {
        const fallbackTitle = 'Could not save activity';
        if (!data || typeof data !== 'object') {
            return { title: fallbackTitle };
        }

        const failureData = data as { message?: unknown; errors?: unknown };
        const title = typeof failureData.message === 'string' && failureData.message.trim()
            ? failureData.message.trim()
            : fallbackTitle;
        const description = toToastDescription(failureData.errors);

        return { title, description };
    }
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
            if (result.type === 'failure') {
                const { title, description } = getFailureToastData(result.data);
                toast.error(title, { description });
            }
            if (result.type === 'error') {
                toast.error('Unexpected error', {
                    description: 'Something went wrong while submitting the form.',
                });
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
