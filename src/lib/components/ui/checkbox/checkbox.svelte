<script lang="ts">
    import { Checkbox as CheckboxPrimitive } from 'bits-ui';
    import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
    import CheckIcon from '@lucide/svelte/icons/check';
    import MinusIcon from '@lucide/svelte/icons/minus';

    let {
        ref = $bindable(null),
        checked = $bindable(false),
        indeterminate = $bindable(false),
        class: className,
        ...restProps
    }: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
    bind:ref
    data-slot="checkbox"
    class={cn(
        // Elevated, legible control (distinct from adjacent muted surfaces)
        'peer relative flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-outline-variant/55 bg-surface-container-lowest shadow-xs transition-[color,box-shadow,background-color,border-color] outline-none',
        'dark:border-outline-variant/35 dark:bg-card dark:shadow-none',
        'hover:border-secondary/45 hover:shadow-sm dark:hover:border-secondary/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/55',
        'group-has-disabled/field:opacity-50 disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25 dark:aria-invalid:border-destructive/60',
        'data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-checked:shadow-sm dark:data-checked:bg-primary dark:data-checked:text-primary-foreground',
        'aria-invalid:data-checked:border-primary',
        'after:absolute after:-inset-x-3 after:-inset-y-2',
        className
    )}
    bind:checked
    bind:indeterminate
    {...restProps}
>
    {#snippet children({ checked, indeterminate })}
        <div
            data-slot="checkbox-indicator"
            class="grid place-content-center text-current transition-none [&>svg]:size-4 [&>svg]:stroke-[2.5]"
        >
            {#if checked}
                <CheckIcon />
            {:else if indeterminate}
                <MinusIcon />
            {/if}
        </div>
    {/snippet}
</CheckboxPrimitive.Root>
