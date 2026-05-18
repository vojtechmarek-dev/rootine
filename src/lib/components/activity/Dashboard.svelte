<script lang="ts">
    import ActivityCard from '@/components/activity/ActivityCard.svelte';
    import ActivitySkeletons from '@/components/activity/ActivitySkeletons.svelte';
    import { onMount, untrack } from 'svelte';
    import type { DashboardActivity } from '$lib/types/schemas';
    import type { Session } from '@auth/sveltekit';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { format, addDays, subDays } from 'date-fns';
    import { Button } from '$lib/components/ui/button/index.js';
    import { ChevronLeft, ChevronRight } from '@lucide/svelte';
    import * as Select from '$lib/components/ui/select/index.js';
    import DatePicker from '$lib/components/shared/DatePicker.svelte';

    let {
        session,
        activities,
        loading = false,
    }: {
        session: Session | null;
        activities: DashboardActivity[];
        loading?: boolean;
    } = $props();

    const hasSessionUser = $derived(Boolean(session?.user));

    let hydrated = $state(false);

    const isActivityCompleted = (activity: DashboardActivity) => activity.logCountToday >= activity.targetCount;

    // Date state
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Default to today if no date in URL
    const currentDateStr = $derived(page.url.searchParams.get('date') || todayDateStr);
    const canToggleActivities = $derived(currentDateStr === todayDateStr);
    const isPastDate = $derived(currentDateStr < todayDateStr);

    let selectValue = $state('today');
    let customDate = $state<Date | undefined>(undefined);
    let expandedActivityId = $state<string | null>(null);

    // Sync selectValue and customDate based on URL
    $effect(() => {
        const dateStr = currentDateStr; // track URL changes

        untrack(() => {
            if (dateStr === todayDateStr) {
                if (selectValue !== 'custom') {
                    selectValue = 'today';
                }
                customDate = new Date();
            } else if (dateStr === tomorrowDateStr) {
                if (selectValue !== 'custom') {
                    selectValue = 'tomorrow';
                }
                customDate = addDays(new Date(), 1);
            } else {
                selectValue = 'custom';
                // Need to parse 'yyyy-MM-dd' correctly in local timezone
                const [year, month, day] = dateStr.split('-').map(Number);
                if (year && month && day) {
                    customDate = new Date(year, month - 1, day);
                }
            }
        });
    });

    // Handle Select changes
    $effect(() => {
        const value = selectValue; // track select value changes
        if (hydrated) {
            untrack(() => {
                let targetStr = currentDateStr;

                if (value === 'today') {
                    targetStr = todayDateStr;
                } else if (value === 'tomorrow') {
                    targetStr = tomorrowDateStr;
                }

                if (targetStr !== currentDateStr && value !== 'custom') {
                    // eslint-disable-next-line svelte/no-navigation-without-resolve
                    goto(`?date=${targetStr}`, { keepFocus: true });
                }
            });
        }
    });

    // Handle Custom Date Picker changes
    $effect(() => {
        const custom = customDate; // track customDate
        if (hydrated && selectValue === 'custom' && custom) {
            untrack(() => {
                const dateStr = format(custom, 'yyyy-MM-dd');
                if (dateStr !== currentDateStr) {
                    // eslint-disable-next-line svelte/no-navigation-without-resolve
                    goto(`?date=${dateStr}`, { keepFocus: true });
                }
            });
        }
    });

    const prevDay = () => {
        const [year, month, day] = currentDateStr.split('-').map(Number);
        if (year && month && day) {
            const date = new Date(year, month - 1, day);
            const prev = subDays(date, 1);
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            goto(`?date=${format(prev, 'yyyy-MM-dd')}`, { keepFocus: true });
        }
    };

    const nextDay = () => {
        const [year, month, day] = currentDateStr.split('-').map(Number);
        if (year && month && day) {
            const date = new Date(year, month - 1, day);
            const next = addDays(date, 1);
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            goto(`?date=${format(next, 'yyyy-MM-dd')}`, { keepFocus: true });
        }
    };

    onMount(() => {
        hydrated = true;
    });

    const toggleExpanded = (activityId: string) => {
        if (expandedActivityId === activityId) {
            expandedActivityId = null;
            return;
        }
        expandedActivityId = activityId;
    };
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

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div class="flex items-center gap-2">
                <Button variant="outline" size="icon" onclick={prevDay} class="h-10 w-10 shrink-0">
                    <ChevronLeft class="h-4 w-4" />
                    <span class="sr-only">Previous day</span>
                </Button>

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

                <Button variant="outline" size="icon" onclick={nextDay} class="h-10 w-10 shrink-0">
                    <ChevronRight class="h-4 w-4" />
                    <span class="sr-only">Next day</span>
                </Button>
            </div>

            {#if selectValue === 'custom'}
                <div class="animate-in zoom-in-95 fade-in w-full sm:w-auto">
                    <DatePicker bind:value={customDate} />
                </div>
            {/if}
        </div>
    </div>

    {#if loading}
        <ActivitySkeletons />
    {:else if activities.length === 0}
        <div class="rounded-2xl bg-surface-container-lowest p-6">
            <p class="text-muted-foreground">Your activities will appear here.</p>
        </div>
    {:else}
        <div class="space-y-8">
            <div class="space-y-4">
                {#each activities as activity (activity.id)}
                    <ActivityCard
                        {activity}
                        canToggle={canToggleActivities}
                        isPast={isPastDate}
                        isOpen={expandedActivityId === activity.id}
                        onToggle={() => {
                            toggleExpanded(activity.id);
                        }}
                    />
                {/each}
            </div>

            {#if activities.length > 0 && activities.every(isActivityCompleted)}
                <div class="rounded-2xl bg-success/10 p-6 text-center text-success">
                    <p class="font-medium">All done for this date! 🎉</p>
                </div>
            {/if}
        </div>
    {/if}
</div>
