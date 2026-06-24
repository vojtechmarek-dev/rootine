<script lang="ts">
    import { Check } from '@lucide/svelte';
    import { cn } from '$lib/utils';
    import { WEEK_LETTERS } from '$lib/constants';
    import type { DashboardActivity, DashboardWeekDay } from '$lib/types/schemas';
    import { goto } from '$app/navigation';
    import { format } from 'date-fns';

    let {
        week,
        currentDateStr,
        todayDateStr,
        activities,
        doneCount,
    }: {
        week: DashboardWeekDay[];
        currentDateStr: string;
        todayDateStr: string;
        activities: DashboardActivity[];
        doneCount: number;
    } = $props();
</script>

<div class="flex items-center justify-between rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-ambient sm:px-6">
    {#each week as day, i (day.date)}
        {@const isViewed = day.date === currentDateStr}
        {@const done = isViewed && activities.length > 0 ? doneCount === activities.length : day.completed}
        {@const partial = !done && (isViewed && activities.length > 0 ? doneCount > 0 : day.completedCount > 0)}
        {@const isToday = day.date === todayDateStr}
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
        <button
            type="button"
            class={cn('flex flex-col items-center gap-1.5 cursor-pointer', isToday ? 'border-1 border-clay/25 rounded-md p-1' : '')}
            onclick={() => goto(`?date=${format(day.date, 'yyyy-MM-dd')}`, { keepFocus: true })}
        >
            <span class={cn('text-[10px] font-semibold tracking-wider', isViewed ? 'font-bold text-clay' : 'text-muted-foreground/70')}>
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
        </button>
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
    {/each}
</div>
