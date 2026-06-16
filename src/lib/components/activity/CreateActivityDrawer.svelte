<script module>
    import { zod4Client } from 'sveltekit-superforms/adapters';
    import { DrawerActivitySchema } from '$lib/types/schemas';

    const drawerActivityValidator = zod4Client(DrawerActivitySchema);
</script>

<script lang="ts">
    import type { Component } from 'svelte';
    import * as Drawer from '$lib/components/ui/drawer';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import { ChevronLeft } from '@lucide/svelte';
    import { cn } from '$lib/utils';
    import { toastError } from '$lib/toast';
    import HabitForm, { meta as HabitMeta } from '$lib/components/activity/forms/HabitForm.svelte';
    import PlantForm, { meta as PlantMeta } from '$lib/components/activity/forms/PlantForm.svelte';
    import WorkoutForm, { meta as WorkoutMeta } from '$lib/components/activity/forms/WorkoutForm.svelte';
    import type { Activity, HabitConfig, PlantConfig, WorkoutConfig, Schedule, ActivityFormData, DrawerActivity } from '$lib/types/schemas';
    import { getEmptyDrawerActivity } from '$lib/types/schemas';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import ActivityEditor from '$lib/components/activity/ActivityEditor.svelte';
    import { activityDrawerState, closeActivityDrawer } from '$lib/state/activity-drawer.svelte';
    import { enhance } from '$app/forms';
    import { untrack } from 'svelte';
    import type { SuperValidated } from 'sveltekit-superforms';
    import { superForm } from 'sveltekit-superforms/client';

    let { activityForm }: { activityForm: SuperValidated<DrawerActivity> } = $props();

    const ACTIVITY_FORMS = {
        habit: { component: HabitForm, ...HabitMeta },
        plant: { component: PlantForm, ...PlantMeta },
        workout: { component: WorkoutForm, ...WorkoutMeta },
    } as const;

    const defaults = {
        habit: {
            config: { targetValue: 1, unit: 'times' } as HabitConfig,
            schedule: { type: 'daily' } as Schedule,
            icon: 'check',
        },
        plant: {
            config: { location: '', species: '' } as PlantConfig,
            schedule: { type: 'interval', value: 7, unit: 'days' } as Schedule,
            icon: 'sprout',
        },
        workout: {
            config: { exercises: [], workoutSets: [], rotation: [], useRotation: true } as WorkoutConfig,
            schedule: { type: 'weekly', days: ['mon', 'wed', 'fri'] } as Schedule,
            icon: 'dumbbell',
        },
    };

    type ActivityType = Activity['type'];

    let view = $state<'menu' | ActivityType>('menu');

    // svelte-ignore state_referenced_locally
    const {
        form,
        errors,
        enhance: superEnhance,
        reset,
        submitting,
    } = superForm(activityForm, {
        id: 'activity-drawer-form',
        dataType: 'json',
        resetForm: false,
        validators: drawerActivityValidator,
        onUpdated({ form: f }) {
            if (!f.posted) {
                return;
            }
            if (!f.valid) {
                toastError('Could not save habit', {
                    description: 'Please check the highlighted fields and try again.',
                    detail: f.errors,
                });
                return;
            }
            closeActivityDrawer();
        },
    });

    const resetEmpty = () => {
        view = 'menu';
        reset({ data: getEmptyDrawerActivity() });
    };

    const switchView = (newType: ActivityType) => {
        $form.type = newType;
        $form.config = { ...defaults[newType].config };
        $form.schedule = { ...defaults[newType].schedule };
        $form.icon = defaults[newType].icon;
        view = newType;
    };

    const FORM_ID = 'create-activity-form';

    $effect(() => {
        const drawerOpen = activityDrawerState.isOpen;
        const drawerData = activityDrawerState.data;

        if (drawerOpen) {
            untrack(() => {
                if (drawerData) {
                    reset({ data: structuredClone($state.snapshot(drawerData)) });
                    view = drawerData.type;
                } else if (!$form.id && $form.title === '') {
                    reset({ data: getEmptyDrawerActivity() });
                    view = 'menu';
                }
            });

            /**
             * Vaul binding can flicker open false briefly while opening/closing.
             * Without clearing this timeout when we become open again, resetEmpty runs
             * after an edit-open and resets the drawer to the "create menu" screen.
             */
            return;
        }

        const resetHandle = setTimeout(() => {
            resetEmpty();
        }, 300);

        return () => {
            clearTimeout(resetHandle);
        };
    });
</script>

<Drawer.Root bind:open={activityDrawerState.isOpen} repositionInputs={false}>
    <Drawer.Content class="flex max-h-[90dvh] flex-col overflow-hidden">
        <div class="mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col">
            <div class="shrink-0 px-4 pt-2 pb-3">
                {#if view === 'menu'}
                    <Drawer.Header class="px-0 text-left">
                        <Drawer.Title class="font-serif text-2xl font-semibold">Grow a new habit</Drawer.Title>
                        <Drawer.Description class="text-base text-foreground/70">What would you like to track?</Drawer.Description>
                    </Drawer.Header>
                {:else}
                    {@const FormDef = ACTIVITY_FORMS[view]}
                    {@const Icon = FormDef.icon}
                    <div class="flex items-center justify-between gap-2" transition:slide={{ axis: 'y', duration: 300, easing: quintOut }}>
                        {#if activityDrawerState.data}
                            <div class="w-9 shrink-0"></div>
                        {:else}
                            <Button variant="ghost" size="icon" class="-ml-2 h-9 w-9 shrink-0 rounded-full" onclick={resetEmpty}>
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
                                class="flex h-24 flex-col gap-2 rounded-2xl"
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
                            bind:formData={$form}
                            errors={$errors}
                            formId={FORM_ID}
                            FormComponent={FormDef.component as Component<{ data: ActivityFormData; errors?: any }>}
                            enhance={superEnhance}
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
                                    Archived habits won't appear on your dashboard.
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
                        <Button type="submit" variant="default" form={FORM_ID} class="flex-2" loading={$submitting}>
                            {#if $submitting}
                                {activityDrawerState.data ? 'Saving…' : 'Creating…'}
                            {:else}
                                {activityDrawerState.data ? 'Save Changes' : 'Create'}
                            {/if}
                        </Button>
                    </div>
                {/if}
            </Drawer.Footer>
        </div>
    </Drawer.Content>
</Drawer.Root>
