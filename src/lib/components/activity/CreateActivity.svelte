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
    import { activityDrawerState, openActivityDrawer, closeActivityDrawer } from '$lib/state/activity-drawer.svelte';
    import { enhance } from '$app/forms';
    import { untrack } from 'svelte';

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

    // Sync formData with activityDrawerState
    $effect(() => {
        const drawerOpen = activityDrawerState.isOpen;
        const drawerData = activityDrawerState.data;

        untrack(() => {
            if (drawerOpen) {
                if (drawerData) {
                    // Edit Mode
                    formData = structuredClone($state.snapshot(drawerData));
                    view = formData.type;
                } else if (!formData.id && formData.title === '') {
                    // Ensure form is fresh for new creation if not already seeded
                    formData = getInitialFormData();
                    view = 'menu';
                }
            } else {
                // Wait for drawer animation before resetting
                setTimeout(() => {
                    resetForm();
                }, 300);
            }
        });
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

<Drawer.Root bind:open={activityDrawerState.isOpen} repositionInputs={false}>
    <Drawer.Trigger
        onclick={() => openActivityDrawer()}
        class={cn(buttonVariants({ variant: 'default', size: 'icon' }), 'fixed right-4 bottom-24 z-50 h-14 w-14 rounded-full shadow-xl')}
    >
        <Plus class="h-6 w-6" />
        <span class="sr-only">Create new Rootine</span>
    </Drawer.Trigger>
    <Drawer.Content class="flex max-h-[90dvh] flex-col overflow-hidden">
        <div class="mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col">
            <!-- Fixed header: controls stay outside scroll -->
            <div class="shrink-0 px-4 pt-2 pb-3">
                {#if view === 'menu'}
                    <Drawer.Header class="px-0 text-left">
                        <Drawer.Title class="text-2xl font-semibold">Create Activity</Drawer.Title>
                        <Drawer.Description class="text-base text-foreground/70">What would you like to track?</Drawer.Description>
                    </Drawer.Header>
                {:else}
                    {@const FormDef = ACTIVITY_FORMS[view]}
                    {@const Icon = FormDef.icon}
                    <div class="flex items-center justify-between gap-2" transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}>
                        {#if activityDrawerState.data}
                            <div class="w-9 shrink-0"></div>
                            <!-- Placeholder to balance layout -->
                        {:else}
                            <Button variant="ghost" size="icon" class="-ml-2 h-9 w-9 shrink-0 rounded-full" onclick={resetForm}>
                                <ChevronLeft class="h-5 w-5" />
                                <span class="sr-only">Back</span>
                            </Button>
                        {/if}
                        <div class="flex min-w-0 flex-1 items-center justify-center gap-2">
                            <Icon class="h-4 w-4 shrink-0" />
                            <span class="truncate text-lg font-semibold">
                                {activityDrawerState.data ? 'Edit' : 'New'}
                                {FormDef.label}
                            </span>
                        </div>
                        <div class="w-9 shrink-0"></div>
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
                                variant="default"
                                onclick={() => {
                                    switchView(type as ActivityType);
                                }}
                                class="flex h-24 flex-col gap-2"
                            >
                                <Icon class="mb-1 h-7 w-7" />
                                <span class="text-base font-medium">{def.label}</span>
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
                            onSuccess={() => closeActivityDrawer()}
                        />

                        {#if activityDrawerState.data && activityDrawerState.data.id}
                            <form
                                method="POST"
                                action="?/archiveActivity"
                                class="mt-8"
                                use:enhance={() => {
                                    return async ({ result, update }) => {
                                        await update();
                                        if (result.type === 'success') {
                                            closeActivityDrawer();
                                        }
                                    };
                                }}
                            >
                                <input type="hidden" name="id" value={activityDrawerState.data.id} />
                                <Button type="submit" variant="danger" class="w-full">
                                    Archive {FormDef.label}
                                </Button>
                                <p class="mt-2 text-center text-sm text-muted-foreground">
                                    Archived activities won't appear on your dashboard.
                                </p>
                            </form>
                        {/if}
                    </div>
                {/if}
            </div>

            <Drawer.Footer class="shrink-0 border-t border-border/50 p-4 ">
                {#if view === 'menu'}
                    <Drawer.Close class={buttonVariants({ variant: 'link' })}>Cancel</Drawer.Close>
                {:else}
                    <div class="flex gap-3">
                        <Drawer.Close class={cn(buttonVariants({ variant: 'link' }), 'flex-1')}>Cancel</Drawer.Close>
                        <Button type="submit" variant="default" form={FORM_ID} class="flex-2">
                            {activityDrawerState.data ? 'Save Changes' : 'Create'}
                        </Button>
                    </div>
                {/if}
            </Drawer.Footer>
        </div>
    </Drawer.Content>
</Drawer.Root>
