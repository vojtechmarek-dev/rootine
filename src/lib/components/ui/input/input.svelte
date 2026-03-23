<script lang="ts">
    import type { HTMLInputAttributes } from 'svelte/elements';
    import { cn } from '$lib/utils';

    export interface Props extends HTMLInputAttributes {}
    export type InputProps = Props;

    let { class: className = '', value = $bindable(), type = 'text', ...restProps }: Props = $props();
</script>

<input
    bind:value
    {type}
    class={cn(
        'flex h-12 w-full rounded-lg border-transparent bg-surface-container-lowest px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-tertiary-fixed focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
    )}
    {...restProps}
/>
