<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui';
    import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
    import { cn, type WithoutChild } from '$lib/utils.js';

    let {
        ref = $bindable(null),
        class: className,
        children,
        size = 'default',
        ...restProps
    }: WithoutChild<SelectPrimitive.TriggerProps> & {
        size?: 'sm' | 'default';
    } = $props();
</script>

<SelectPrimitive.Trigger
    bind:ref
    data-slot="select-trigger"
    data-size={size}
    class={cn(
        "flex w-fit items-center justify-between gap-2 rounded-lg bg-surface-container-lowest px-4 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none select-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-12 data-[size=sm]:h-10 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
    )}
    {...restProps}
>
    {@render children?.()}
    <ChevronDownIcon class="size-4 opacity-50" />
</SelectPrimitive.Trigger>
