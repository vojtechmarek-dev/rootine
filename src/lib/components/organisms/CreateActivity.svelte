<script lang="ts">
    import * as Drawer from '$lib/components/ui/drawer';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import { Plus, ChevronLeft } from '@lucide/svelte';
    import { cn } from '$lib/utils';
    import HabitForm, { meta as HabitMeta } from '$lib/components/organisms/forms/HabitForm.svelte';
    import PlantForm, { meta as PlantMeta } from '$lib/components/organisms/forms/PlantForm.svelte';
    import WorkoutForm, { meta as WorkoutMeta } from '$lib/components/organisms/forms/WorkoutForm.svelte';
    import type { Activity, HabitConfig, PlantConfig, WorkoutConfig, Schedule, BaseActivity } from '$lib/types/schemas';
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
        habit: {
            config: { targetValue: 1, unit: 'times' } as HabitConfig,
            schedule: { type: 'daily' } as Schedule,
        },
        plant: {
            config: { location: '', species: '' } as PlantConfig,
            schedule: { type: 'interval', value: 7, unit: 'days' } as Schedule,
        },
        workout: {
            config: { exercises: [] } as WorkoutConfig,
            schedule: { type: 'weekly', days: ['mon', 'wed', 'fri'] } as Schedule,
        },
    };

    let formShared = $state<BaseActivity>({
        title: '',
        description: undefined,
        color: 'zinc',
        icon: 'circle',
        startDate: new Date(),
        endDate: undefined,
        archived: false,
    });

    let formConfig = $state<any>(defaults.habit.config);
    let formSchedule = $state<Schedule>(defaults.habit.schedule);

    type ActivityType = Activity['type'];

    let view = $state<'menu' | ActivityType>('menu');

    let isOpen = $state(false);

    $effect(() => {
        if (!isOpen) {
            setTimeout(() => {
                view = 'menu';
            }, 300); // Reset after animation
        }
    });

    const resetView = () => {
        view = 'menu';
    };

    const switchView = (newType: ActivityType) => {
        formConfig = { ...defaults[newType].config };
        formSchedule = { ...defaults[newType].schedule };
        view = newType;
    };

    const FORM_ID = 'create-activity-form';
</script>

<Drawer.Root bind:open={isOpen}>
    <Drawer.Trigger
        class={cn(buttonVariants({ variant: 'default', size: 'icon' }), 'fixed right-4 bottom-24 z-50 h-14 w-14 rounded-full shadow-xl')}
    >
        <Plus class="h-6 w-6" />
        <span class="sr-only">Create new Rootine</span>
    </Drawer.Trigger>
    <Drawer.Content class="flex max-h-[80dvh] flex-col overflow-hidden">
        <div class="mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col">
            <div class="flex-1 overflow-y-auto p-4">
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
                    <div class="h-full w-full" transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}>
                        <div class="flex items-center justify-between pt-2 pb-4">
                            <Button variant="ghost" size="icon" class="-ml-2 h-9 w-9 rounded-full" onclick={resetView}>
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
                        <!-- We pass both config and schedule bindings -->
                        <FormDef.component id={FORM_ID} bind:shared={formShared} bind:config={formConfig} bind:schedule={formSchedule} />
                    </div>
                {/if}
            </div>
            <Drawer.Footer class="shrink-0 p-4 pt-0">
                <Drawer.Close class={buttonVariants({ variant: 'ghost' })} onclick={resetView}>Cancel</Drawer.Close>
            </Drawer.Footer>
        </div>
    </Drawer.Content>
</Drawer.Root>
