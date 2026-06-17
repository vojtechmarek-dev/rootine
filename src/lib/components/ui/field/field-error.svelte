<script lang="ts">
    import { cn, type WithElementRef } from '$lib/utils.js';
    import type { HTMLAttributes } from 'svelte/elements';
    import type { Snippet } from 'svelte';
    import type { FieldErrorList, FormErrors } from '$lib/types/schemas';

    let {
        ref = $bindable(null),
        class: className,
        errors: errorsProp,
        children,
        ...restProps
    }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
        children?: Snippet;
        // Callers index into a FormErrors tree, so a leaf access is typed as the
        // branch-or-leaf union; only the leaf array is renderable here.
        errors?: FormErrors | FieldErrorList;
    } = $props();

    const errors = $derived(Array.isArray(errorsProp) ? errorsProp : undefined);

    const hasContent = $derived.by(() => {
        // has slotted error
        if (children) return true;

        // no errors
        if (!errors) return false;

        // has an error but no message
        if (errors.length === 1) {
            const err = errors[0];
            if (typeof err !== 'string' && !err?.message) {
                return false;
            }
        }

        return true;
    });

    const isMultipleErrors = $derived(errors && errors.length > 1);
    const singleErrorMessage = $derived.by(() => {
        if (errors && errors.length === 1) {
            const err = errors[0];
            return typeof err === 'string' ? err : err?.message;
        }
        return null;
    });
</script>

{#if hasContent}
    <div bind:this={ref} role="alert" data-slot="field-error" class={cn('text-sm font-normal text-destructive', className)} {...restProps}>
        {#if children}
            {@render children()}
        {:else if singleErrorMessage}
            {singleErrorMessage}
        {:else if isMultipleErrors}
            <ul class="ms-4 flex list-disc flex-col gap-1">
                {#each errors ?? [] as error, index (index)}
                    {#if typeof error === 'string'}
                        <li>{error}</li>
                    {:else if error?.message}
                        <li>{error.message}</li>
                    {/if}
                {/each}
            </ul>
        {/if}
    </div>
{/if}
