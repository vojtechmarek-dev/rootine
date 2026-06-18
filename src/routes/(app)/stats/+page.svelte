<script lang="ts">
    import { Flame, Award, Sprout, Target, ChartColumn } from '@lucide/svelte';
    import StatCard from '$lib/components/stats/StatCard.svelte';
    import StatsHeatmap from '$lib/components/stats/StatsHeatmap.svelte';
    import MilestoneCard from '$lib/components/stats/MilestoneCard.svelte';
    import ProgressBar from '$lib/components/shared/ProgressBar.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // A glyph per milestone (keyed by achievement id from $lib/achievements).
    const MILESTONE_EMOJI: Record<string, string> = {
        'first-step': '🌱',
        'taking-root': '🌿',
        momentum: '⚡',
        'one-week': '🔥',
        'thirty-done': '📅',
        'habit-formed': '🪴',
        'deep-roots': '🌳',
        centurion: '💯',
        unstoppable: '🚀',
        evergreen: '🌲',
    };
</script>

<div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-4 pb-24">
    <header>
        <h1 class="font-serif text-3xl leading-none font-semibold tracking-tight text-foreground italic">Insights</h1>
        <p class="mt-1 text-sm text-muted-foreground">How your routine is taking root.</p>
    </header>

    {#await data.stats}
        <!-- Skeleton -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {#each [0, 1, 2, 3] as i (i)}
                <div class="h-[88px] animate-pulse rounded-2xl bg-surface-container-low"></div>
            {/each}
        </div>
        <div class="h-40 animate-pulse rounded-2xl bg-surface-container-low"></div>
    {:then stats}
        {#if stats.totalCompletions === 0}
            <!-- Empty state -->
            <div class="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-low p-10 text-center">
                <Sprout class="size-8 text-muted-foreground" />
                <p class="font-medium text-foreground">No data yet</p>
                <p class="max-w-xs text-sm text-muted-foreground">
                    Complete a habit and your streaks, heatmap, and milestones will start growing here.
                </p>
            </div>
        {:else}
            {@const maxDone = Math.max(1, ...stats.habits.map((h) => h.doneDays))}

            <!-- Headline stats -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                    label="Current streak"
                    value={stats.currentStreak}
                    sub={stats.currentStreak === 1 ? 'day' : 'days'}
                    icon={Flame}
                />
                <StatCard
                    label="Longest streak"
                    value={stats.longestStreak}
                    sub={stats.longestStreak === 1 ? 'day' : 'days'}
                    icon={Award}
                />
                <StatCard label="Completions" value={stats.totalCompletions} sub="all time" icon={Sprout} />
                <StatCard label="Consistency" value={`${stats.consistency}%`} sub="last {stats.consistencyDays} days" icon={Target} />
            </div>

            <!-- Heatmap -->
            <section class="space-y-3 rounded-2xl bg-surface-container-low p-4">
                <div class="flex items-center justify-between">
                    <h2 class="flex items-center gap-2 text-sm font-medium text-foreground">
                        <ChartColumn class="size-4 text-muted-foreground" /> Activity
                    </h2>
                    {#if stats.bestDay > 0}
                        <span class="text-xs text-muted-foreground">best day: {stats.bestDay}</span>
                    {/if}
                </div>
                <StatsHeatmap cells={stats.heatmap} />
            </section>

            <!-- Per-habit breakdown -->
            {#if stats.habits.length > 0}
                <section class="space-y-3 rounded-2xl bg-surface-container-low p-4">
                    <div>
                        <h2 class="text-sm font-medium text-foreground">By habit</h2>
                        <p class="text-xs text-muted-foreground">Days completed all-time, with current streak.</p>
                    </div>
                    <ul class="space-y-3">
                        {#each stats.habits as habit (habit.id)}
                            <li class="space-y-1.5">
                                <div class="flex items-baseline justify-between gap-3">
                                    <span class="truncate text-sm font-medium text-foreground">{habit.title}</span>
                                    <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                        {#if habit.currentStreak > 0}
                                            <span class="inline-flex items-center gap-0.5" title="Current streak">
                                                <Flame class="size-3 text-clay" />{habit.currentStreak}
                                            </span>
                                            <span aria-hidden="true">·</span>
                                        {/if}
                                        <span title="Distinct days you completed this habit">
                                            {habit.doneDays}
                                            {habit.doneDays === 1 ? 'day' : 'days'}
                                        </span>
                                    </span>
                                </div>
                                <ProgressBar value={(habit.doneDays / maxDone) * 100} />
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}

            <!-- Achievements -->
            <section class="space-y-3 rounded-2xl bg-surface-container-low p-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-medium text-foreground">Milestones</h2>
                    <span class="text-xs text-muted-foreground">{stats.earnedCount} / {stats.achievements.length}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {#each stats.achievements as a (a.id)}
                        <MilestoneCard name={a.name} description={a.description} emoji={MILESTONE_EMOJI[a.id] ?? '🌱'} earned={a.earned} />
                    {/each}
                </div>
            </section>
        {/if}
    {:catch err}
        <div class="rounded-2xl bg-destructive/10 p-6 text-destructive">
            <p class="font-medium">Could not load your stats right now.</p>
            <p class="mt-1 text-sm text-muted-foreground">{err instanceof Error ? err.message : 'Unknown error.'}</p>
        </div>
    {/await}
</div>
