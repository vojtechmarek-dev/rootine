<script lang="ts">
    import { Input } from '$lib/components/ui/input';
    import { buttonVariants } from '$lib/components/ui/button';
    import * as Popover from '$lib/components/ui/popover';
    import { iconMap, iconNames, getIconComponent } from '$lib/utils/icons';
    import { cn } from '$lib/utils';

    let {
        value = $bindable(),
        fallback = 'circle',
    }: {
        value: string | null | undefined;
        /** Icon shown (and selectable as "default") when nothing is chosen yet. */
        fallback?: string;
    } = $props();

    let searchQuery = $state('');
    let open = $state(false);

    const filtered = $derived(
        searchQuery.trim() ? iconNames.filter((name) => name.includes(searchQuery.trim().toLowerCase())) : iconNames
    );

    const Current = $derived(getIconComponent(value || fallback));

    function select(name: string) {
        value = name;
        open = false;
        searchQuery = '';
    }
</script>

<Popover.Root bind:open>
    <Popover.Trigger
        class={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-12 w-12 rounded-sm border-border/60')}
        aria-label="Pick an icon"
    >
        <Current class="h-5 w-5" />
    </Popover.Trigger>
    <Popover.Content class="z-[200] w-72 p-3" align="start">
        <div class="space-y-3">
            <Input bind:value={searchQuery} placeholder="Search icons…" class="h-9" />
            <div class="grid max-h-56 grid-cols-7 gap-1 overflow-x-hidden overflow-y-auto">
                {#each filtered as name (name)}
                    {@const Icon = iconMap[name]}
                    <button
                        type="button"
                        onclick={() => select(name)}
                        title={name}
                        class={cn(
                            'flex aspect-square w-full items-center justify-center rounded-sm text-foreground/80 transition-colors hover:bg-surface-container-high',
                            value === name && 'bg-clay/15 text-clay ring-1 ring-clay ring-inset'
                        )}
                    >
                        <Icon class="h-4 w-4" />
                    </button>
                {/each}
            </div>
            {#if filtered.length === 0}
                <p class="py-2 text-center text-sm text-muted-foreground">No icons found</p>
            {/if}
        </div>
    </Popover.Content>
</Popover.Root>
