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
    import { Check, ChevronLeft, ChevronRight, Flame } from '@lucide/svelte';
    import * as Select from '$lib/components/ui/select/index.js';
    import DatePicker from '$lib/components/shared/DatePicker.svelte';
    import { isBackfillableDate } from '$lib/utils/date';
    import { cn } from '$lib/utils';
    import type { DashboardWeekDay } from '$lib/types/schemas';

    let {
        session,
        activities,
        week = [],
        streak = 0,
        loading = false,
    }: {
        session: Session | null;
        activities: DashboardActivity[];
        week?: DashboardWeekDay[];
        streak?: number;
        loading?: boolean;
    } = $props();

    const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const hasSessionUser = $derived(Boolean(session?.user));

    let hydrated = $state(false);

    // Cards toggle optimistically without invalidating the page, so the server
    // counts in `activities` go stale; cards report their live count up here.
    let optimisticCounts = $state<Record<string, number>>({});
    $effect(() => {
        // Fresh server data → optimistic overrides are obsolete.
        if (activities) {
            optimisticCounts = {};
        }
    });

    const logCountFor = (activity: DashboardActivity) => optimisticCounts[activity.id] ?? activity.logCountToday;
    const isActivityCompleted = (activity: DashboardActivity) => logCountFor(activity) >= activity.targetCount;

    // Date state
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Default to today if no date in URL
    const currentDateStr = $derived(page.url.searchParams.get('date') || todayDateStr);
    const isPastDate = $derived(currentDateStr < todayDateStr);

    // Parse the viewed date in LOCAL time (mirror the URL-sync effect below).
    const parsedCurrentDate = $derived.by(() => {
        const [year, month, day] = currentDateStr.split('-').map(Number);
        return year && month && day ? new Date(year, month - 1, day) : new Date();
    });

    // Completion is allowed for today or a missed day earlier this ISO week
    // (make-up / backfill). The server enforces the same window.
    const canCompleteActivities = $derived(isBackfillableDate(parsedCurrentDate));

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

    // Day summary for the tiles under the greeting.
    const doneCount = $derived(activities.filter(isActivityCompleted).length);
    const dayProgress = $derived(activities.length > 0 ? doneCount / activities.length : 0);

    // Optimistic streak: the server streak counts days with at least one
    // completion, and includes today only if a log existed at load time. Adjust
    // by today's live state so the tile moves with the first completion (and
    // drops back if everything is undone). Only today affects the anchored run.
    const viewingToday = $derived(currentDateStr === todayDateStr);
    const todayActiveAtLoad = $derived(viewingToday && activities.some((a) => a.logCountToday > 0));
    const todayActiveNow = $derived(viewingToday && activities.some((a) => logCountFor(a) > 0));
    const displayStreak = $derived(
        Math.max(0, streak + (todayActiveNow && !todayActiveAtLoad ? 1 : 0) - (!todayActiveNow && todayActiveAtLoad ? 1 : 0))
    );
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
                    <Select.Trigger size="sm" class="h-10 min-w-0 flex-1 justify-center rounded-full sm:w-[150px] sm:flex-none">
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
                <DatePicker bind:value={customDate} class="h-10 w-full justify-center sm:w-[240px] sm:justify-start" />
            {/if}
        </div>
    </div>

    {#if !loading && week.length > 0}
        <div class="mb-6 space-y-3">
            <!-- Week ribbon: checks on fully completed days, viewed day ringed. -->
            <div class="flex items-center justify-between rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-ambient sm:px-6">
                {#each week as day, i (day.date)}
                    {@const isViewed = day.date === currentDateStr}
                    {@const done = isViewed && activities.length > 0 ? doneCount === activities.length : day.completed}
                    {@const partial = !done && day.completedCount > 0}
                    <div class="flex flex-col items-center gap-1.5">
                        <span
                            class={cn(
                                'text-[10px] font-semibold tracking-wider',
                                isViewed ? 'font-bold text-clay' : 'text-muted-foreground/70'
                            )}
                        >
                            {WEEK_LETTERS[i]}
                        </span>
                        <div
                            class={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md transition-colors',
                                done
                                    ? 'bg-clay text-clay-foreground'
                                    : partial
                                      ? 'bg-clay/25'
                                      : day.scheduledCount === 0
                                        ? 'bg-surface-container-low/60'
                                        : 'bg-surface-container-high/70'
                            )}
                        >
                            {#if done}
                                <Check class="h-3 w-3" strokeWidth={2.5} />
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Streak + day summary tiles -->
            <div class="grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-surface-container-lowest px-5 py-4 shadow-ambient">
                    <div class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        <Flame class="h-3.5 w-3.5 text-clay" />
                        Streak
                    </div>
                    <div class="mt-1 flex items-baseline gap-1.5">
                        <span class="font-serif text-3xl font-semibold tracking-tight">{displayStreak}</span>
                        <span class="text-sm text-muted-foreground">{displayStreak === 1 ? 'day' : 'days'}</span>
                    </div>
                </div>
                <div class="rounded-2xl bg-surface-container-lowest px-5 py-4 shadow-ambient">
                    <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {currentDateStr === todayDateStr ? 'Today' : 'This day'}
                    </div>
                    <div class="mt-1 flex items-baseline gap-1.5">
                        <span class="font-serif text-3xl font-semibold tracking-tight">{doneCount}</span>
                        <span class="text-sm text-muted-foreground">/ {activities.length} done</span>
                    </div>
                    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                            class="h-full rounded-full bg-success transition-[width] duration-500 ease-out"
                            style="width: {Math.round(dayProgress * 100)}%"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    {#if loading}
        <ActivitySkeletons />
    {:else if activities.length === 0}
        <div class="rounded-2xl bg-surface-container-lowest p-6 shadow-ambient">
            <p class="text-muted-foreground">Your habits will appear here.</p>
        </div>
    {:else}
        <div class="space-y-8">
            <div class="space-y-4">
                {#each activities as activity (activity.id)}
                    <ActivityCard
                        {activity}
                        canToggle={canCompleteActivities}
                        isPast={isPastDate}
                        viewDate={currentDateStr}
                        isOpen={expandedActivityId === activity.id}
                        onToggle={() => {
                            toggleExpanded(activity.id);
                        }}
                        onLogCountChange={(count) => {
                            optimisticCounts[activity.id] = count;
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
