<script lang="ts">
    import * as Drawer from '$lib/components/ui/drawer';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import { Plus, ChevronLeft } from '@lucide/svelte';
    import { cn } from '$lib/utils';
    import HabitForm, { meta as HabitMeta } from '$lib/components/organisms/forms/HabitForm.svelte';
    import PlantForm, { meta as PlantMeta } from '$lib/components/organisms/forms/PlantForm.svelte';
    import WorkoutForm, {
        meta as WorkoutMeta,
    } from '$lib/components/organisms/forms/WorkoutForm.svelte';
    import type {
        Activity,
        HabitConfig,
        PlantConfig,
        WorkoutConfig,
        ActivityConfig,
    } from '@/types/schemas';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    // The Activity Forms Registry
    const ACTIVITY_FORMS = {
        habit: { component: HabitForm, ...HabitMeta },
        plant: { component: PlantForm, ...PlantMeta },
        workout: { component: WorkoutForm, ...WorkoutMeta },
    } as const;

    // defaults
    const defaults = {
        habit: { title: '', targetValue: 1, unit: 'times', period: 'daily' } as HabitConfig,
        plant: { title: '', waterIntervalDays: 7 } as PlantConfig,
        workout: { title: '', exercises: [] } as WorkoutConfig,
    };

    let formConfig = $state<any>(defaults.habit);

    type ActivityType = Activity['type'];

    let view = $state<'menu' | ActivityType>('menu');

    let isOpen = $state(false);

    $effect(() => {
        if (!isOpen) setTimeout(() => (view = 'menu'), 300); // Reset after animation
    });

    const resetView = () => {
        view = 'menu';
    };

    const switchView = (newType: ActivityType) => {
        formConfig = { ...defaults[newType] };
        view = newType;
    };

    const FORM_ID = 'create-activity-form';
</script>

<Drawer.Root bind:open={isOpen}>
    <Drawer.Trigger
        class={cn(
            buttonVariants({ variant: 'default', size: 'icon' }),
            'fixed right-4 bottom-24 z-50 h-14 w-14 rounded-full shadow-xl'
        )}
    >
        <Plus class="h-6 w-6" />
        <span class="sr-only">Create new Rootine</span>
    </Drawer.Trigger>
    <Drawer.Content>
        <div class="mx-auto w-full max-w-sm p-4">
            {#if view === 'menu'}
                <div transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}>
                    <Drawer.Header>
                        <Drawer.Title>Create Activity</Drawer.Title>
                        <Drawer.Description>What would you like to track?</Drawer.Description>
                    </Drawer.Header>
                    <div class="grid grid-cols-3 gap-4">
                        {#each Object.entries(ACTIVITY_FORMS) as [type, def]}
                            {@const Icon = def.icon}
                            <Button
                                variant="outline"
                                onclick={() => {
                                    switchView(type as ActivityType);
                                }}
                                class="flex h-24 flex-col"
                            >
                                <Icon class={def.color} />
                                <span>{def.label}</span>
                            </Button>
                        {/each}
                    </div>
                </div>
            {:else}
                {@const FormDef = ACTIVITY_FORMS[view]}
                {@const Icon = FormDef.icon}
                <div
                    class="h-full w-full"
                    transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}
                >
                    <div class="flex items-center justify-between pt-2 pb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="-ml-2 h-9 w-9 rounded-full"
                            onclick={resetView}
                        >
                            <ChevronLeft class="h-5 w-5" />
                            <span class="sr-only">Back</span>
                        </Button>
                        <div class="flex items-center gap-2">
                            <Icon class={cn('h-4 w-4', FormDef.color)} />
                            <Drawer.Title class="text-lg font-semibold">
                                {FormDef.label}
                            </Drawer.Title>
                        </div>

                        <Button type="submit" size="sm" form={FORM_ID}>Save</Button>
                    </div>

                    <!-- Render the component dynamically -->
                    <FormDef.component id={FORM_ID} bind:config={formConfig} />
                </div>
            {/if}
        </div>
        <Drawer.Footer>
            <Drawer.Close class={buttonVariants({ variant: 'ghost' })} onclick={resetView}>
                Cancel
            </Drawer.Close>
        </Drawer.Footer>
    </Drawer.Content>
</Drawer.Root>
