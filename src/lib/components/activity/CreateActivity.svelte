<script lang="ts">
    import * as Drawer from '$lib/components/ui/drawer';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import { Plus, ChevronLeft } from '@lucide/svelte';
    import { cn } from '$lib/utils';
    import HabitForm, { meta as HabitMeta } from '$lib/components/activity/forms/HabitForm.svelte';
    import PlantForm, { meta as PlantMeta } from '$lib/components/activity/forms/PlantForm.svelte';
    import WorkoutForm, { meta as WorkoutMeta } from '$lib/components/activity/forms/WorkoutForm.svelte';
    import type { Activity, HabitConfig, PlantConfig, WorkoutConfig, Schedule, ActivityFormData } from '$lib/types/schemas';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import ActivityEditor from '$lib/components/activity/ActivityEditor.svelte';

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

    const getInitialFormData = (): ActivityFormData => ({
        title: '',
        description: undefined,
        color: 'zinc',
        icon: 'circle',
        startDate: new Date(),
        endDate: undefined,
        archived: false,
        type: 'habit',
        config: defaults.habit.config,
        schedule: defaults.habit.schedule,
    });

    let formData = $state<ActivityFormData>(getInitialFormData());

    type ActivityType = Activity['type'];

    let view = $state<'menu' | ActivityType>('menu');

    let isOpen = $state(false);

    $effect(() => {
        if (!isOpen) {
            setTimeout(() => {
                resetForm();
            }, 300); // Reset after animation
        }
    });

    const resetForm = () => {
        view = 'menu';
        formData = getInitialFormData();
    };

    const switchView = (newType: ActivityType) => {
        formData.type = newType;
        formData.config = { ...defaults[newType].config };
        formData.schedule = { ...defaults[newType].schedule };
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
            <!-- Fixed header: controls stay outside scroll -->
            <div class="shrink-0 px-4 pt-2 pb-3">
                {#if view === 'menu'}
                    <Drawer.Header class="text-left px-0">
                        <Drawer.Title class="text-2xl font-semibold">Create Activity</Drawer.Title>
                        <Drawer.Description class="text-base text-foreground/70">What would you like to track?</Drawer.Description>
                    </Drawer.Header>
                {:else}
                    {@const FormDef = ACTIVITY_FORMS[view]}
                    {@const Icon = FormDef.icon}
                    <div class="flex items-center justify-between gap-2" transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}>
                        <Button variant="ghost" size="icon" class="-ml-2 h-9 w-9 shrink-0 rounded-full" onclick={resetForm}>
                            <ChevronLeft class="h-5 w-5" />
                            <span class="sr-only">Back</span>
                        </Button>
                        <div class="flex min-w-0 flex-1 items-center justify-center gap-2">
                            <Icon class={cn('h-4 w-4 shrink-0', FormDef.color)} />
                            <span class="truncate text-lg font-semibold">{FormDef.label}</span>
                        </div>
                        <Button type="submit" size="sm" form={FORM_ID} class="shrink-0">Save</Button>
                    </div>
                {/if}
            </div>

            <!-- Scrollable area: only form / menu content -->
            <div class="flex-1 overflow-y-auto p-4">
                {#if view === 'menu'}
                    <div class="grid grid-cols-3 gap-4" transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}>
                        {#each Object.entries(ACTIVITY_FORMS) as [type, def] (type)}
                            {@const Icon = def.icon}
                            <Button
                                variant="outline"
                                onclick={() => {
                                    switchView(type as ActivityType);
                                }}
                                class="flex h-24 flex-col gap-2"
                            >
                                <Icon class={cn('h-7 w-7 mb-1', def.color)} />
                                <span class="font-medium text-base">{def.label}</span>
                            </Button>
                        {/each}
                    </div>
                {:else}
                    {@const FormDef = ACTIVITY_FORMS[view]}
                    <div class="h-full w-full" transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}>
                        <ActivityEditor
                            bind:data={formData}
                            formId={FORM_ID}
                            FormComponent={FormDef.component}
                            onSuccess={() => {
                                isOpen = false;
                            }}
                        />
                    </div>
                {/if}
            </div>

            <Drawer.Footer class="shrink-0 p-4 pt-0">
                <Drawer.Close class={buttonVariants({ variant: 'ghost' })} onclick={() => (isOpen = false)}>Cancel</Drawer.Close>
            </Drawer.Footer>
        </div>
    </Drawer.Content>
</Drawer.Root>
