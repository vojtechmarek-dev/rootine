<script lang="ts">
    import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
    import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
    import { Collapsible, type WithoutChild } from 'bits-ui';

    import { cn } from '$lib/utils';

    type Props = WithoutChild<Collapsible.RootProps> & {
        title?: string;
        triggerAriaLabel?: string;
        triggerClass?: string;
        contentClass?: string;
        hiddenUntilFound?: boolean;
    };

    let {
        open = $bindable(false),
        ref = $bindable(null),
        class: className,
        title,
        triggerAriaLabel,
        triggerClass,
        contentClass,
        hiddenUntilFound = false,
        children,
        ...restProps
    }: Props = $props();
</script>

<Collapsible.Root bind:open bind:ref class={cn('space-y-3', className)} {...restProps}>
    <div class="flex items-center gap-4">
        {#if title}
            <h4 class="text-sm font-medium text-foreground">{title}</h4>
        {/if}
        <Collapsible.Trigger
            aria-label={triggerAriaLabel ?? title ?? 'Toggle collapsible'}
            class={cn(
                'group inline-flex size-8 items-center justify-center rounded-md bg-background text-foreground shadow-sm transition hover:bg-muted ',
                triggerClass
            )}
        >
            {#if open}
                <ChevronUpIcon class="size-4" />
            {:else}
                <ChevronDownIcon class="size-4" />
            {/if}
        </Collapsible.Trigger>
    </div>

    <Collapsible.Content
        {hiddenUntilFound}
        class={cn('overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down', contentClass)}
    >
        {@render children?.()}
    </Collapsible.Content>
</Collapsible.Root>
