<script lang="ts">
    import type { HTMLAttributes } from 'svelte/elements';
    import { cn, type WithElementRef } from '$lib/utils.js';

    let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
    bind:this={ref}
    data-slot="card"
    class={cn('flex flex-col gap-6 rounded-2xl bg-surface-container-lowest py-6 text-foreground', className)}
    {...restProps}
>
    {@render children?.()}
</div>
