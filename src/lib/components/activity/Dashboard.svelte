<script lang="ts">
    import ActivityCard from '@/components/activity/ActivityCard.svelte';
    import ActivitySkeletons from '@/components/activity/ActivitySkeletons.svelte';
    import { onMount } from 'svelte';
    import type { DashboardActivity } from '$lib/types/schemas';
    import type { Session } from '@auth/sveltekit';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { format, addDays } from 'date-fns';
    import * as Select from '$lib/components/ui/select/index.js';
    import DatePicker from '$lib/components/shared/DatePicker.svelte';

    let {
        session,
        activitiesPromise,
    }: {
        session: Session | null;
        activitiesPromise: Promise<DashboardActivity[]>;
    } = $props();

    const hasSessionUser = $derived(Boolean(session?.user));

    let hydrated = $state(false);

    const isActivityCompleted = (activity: DashboardActivity) => activity.logCountToday >= activity.targetCount;

    // Date state
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Default to today if no date in URL
    const currentDateStr = $derived(page.url.searchParams.get('date') || todayDateStr);

    let selectValue = $state('today');
    let customDate = $state<Date | undefined>(undefined);

    // Sync selectValue and customDate based on URL
    $effect(() => {
        if (currentDateStr === todayDateStr) {
            selectValue = 'today';
            customDate = new Date();
        } else if (currentDateStr === tomorrowDateStr) {
            selectValue = 'tomorrow';
            customDate = addDays(new Date(), 1);
        } else {
            selectValue = 'custom';
            // Need to parse 'yyyy-MM-dd' correctly in local timezone
            const [year, month, day] = currentDateStr.split('-').map(Number);
            if (year && month && day) {
                customDate = new Date(year, month - 1, day);
            }
        }
    });

    // Handle Select changes
    $effect(() => {
        if (hydrated) {
            let targetStr = currentDateStr;

            if (selectValue === 'today') {
                targetStr = todayDateStr;
            } else if (selectValue === 'tomorrow') {
                targetStr = tomorrowDateStr;
            }
            // If custom is selected via dropdown, we don't navigate immediately
            // We wait for the DatePicker to trigger a change

            if (targetStr !== currentDateStr && selectValue !== 'custom') {
                // eslint-disable-next-line svelte/no-navigation-without-resolve
                goto(`?date=${targetStr}`, { keepFocus: true });
            }
        }
    });

    // Handle Custom Date Picker changes
    $effect(() => {
        if (hydrated && selectValue === 'custom' && customDate) {
            const dateStr = format(customDate, 'yyyy-MM-dd');
            if (dateStr !== currentDateStr) {
                // eslint-disable-next-line svelte/no-navigation-without-resolve
                goto(`?date=${dateStr}`, { keepFocus: true });
            }
        }
    });

    // Allow DatePicker to change selectValue to custom if used directly
    const onDatePicked = (v: Date | undefined) => {
        if (!v) return;
        customDate = v;
        const vStr = format(v, 'yyyy-MM-dd');
        if (vStr === todayDateStr) selectValue = 'today';
        else if (vStr === tomorrowDateStr) selectValue = 'tomorrow';
        else selectValue = 'custom';
    };

    $effect(() => {
        if (customDate) {
            onDatePicked(customDate);
        }
    });

    onMount(() => {
        hydrated = true;
    });
</script>

<div class="p-4">
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="mb-4">
            {#if hasSessionUser}
                <div class="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                    <p class="font-serif text-2xl text-foreground sm:text-3xl">Welcome back,</p>
                    <p class="font-serif text-3xl font-semibold text-secondary italic sm:text-4xl">
                        {session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0]}
                    </p>
                </div>
            {/if}
        </div>

        <div class="flex items-center gap-2">
            <Select.Root type="single" bind:value={selectValue}>
                <Select.Trigger class="w-[140px]">
                    {#if selectValue === 'today'}
                        Today
                    {:else if selectValue === 'tomorrow'}
                        Tomorrow
                    {:else}
                        Custom Date
                    {/if}
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="today">Today</Select.Item>
                    <Select.Item value="tomorrow">Tomorrow</Select.Item>
                    <Select.Item value="custom">Pick a date...</Select.Item>
                </Select.Content>
            </Select.Root>

            {#if selectValue === 'custom'}
                <div class="animate-in zoom-in-95 fade-in">
                    <DatePicker bind:value={customDate} />
                </div>
            {/if}
        </div>
    </div>

    {#await activitiesPromise}
        <ActivitySkeletons count={3} />
    {:then activities}
        {@const pendingActivities = activities.filter((a) => !isActivityCompleted(a))}
        {@const completedActivities = activities.filter((a) => isActivityCompleted(a))}

        {#if activities.length === 0}
            <div class="rounded-2xl bg-surface-container-lowest p-6">
                <p class="text-muted-foreground">Your activities will appear here.</p>
            </div>
        {:else}
            <div class="space-y-8">
                {#if pendingActivities.length > 0}
                    <div>
                        <div class="space-y-4">
                            {#each pendingActivities as activity (activity.id)}
                                <ActivityCard {activity} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if completedActivities.length > 0}
                    <div>
                        <h2 class="mb-4 text-lg font-semibold text-muted-foreground">Completed</h2>
                        <div class="space-y-4">
                            {#each completedActivities as activity (activity.id)}
                                <ActivityCard {activity} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if pendingActivities.length === 0 && completedActivities.length > 0}
                    <div class="rounded-2xl bg-success/10 p-6 text-center text-success">
                        <p class="font-medium">All done for this date! 🎉</p>
                    </div>
                {/if}
            </div>
        {/if}
    {/await}
</div>
