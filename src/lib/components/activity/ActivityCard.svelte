<script lang="ts">
    import * as Card from '$lib/components/ui/card/index.js';
    import type { DashboardActivity } from '$lib/types/schemas';
    import { Button } from '$lib/components/ui/button';
    import { dev } from '$app/environment';
    import Collapsible from '$lib/components/shared/Collapsible.svelte';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { growthProgress, growthStage } from '$lib/growth';
    import { haptic } from '$lib/haptics';
    import type { SubmitFunction } from '@sveltejs/kit';
    import {
        CalendarClock,
        CalendarOff,
        CheckIcon,
        ChevronDown,
        Dumbbell,
        Pencil,
        Repeat,
        Sprout,
        MoreHorizontal,
        Archive,
        Target,
        Flame,
    } from '@lucide/svelte';
    import { openActivityDrawer } from '$lib/state/activity-drawer.svelte';
    import type { ActivityFormData } from '$lib/types/schemas';
    import { cn, getActivityAccentClasses, getActivityTypeLabel } from '$lib/utils';
    import * as Popover from '$lib/components/ui/popover';
    import { buttonVariants } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import SkipDayModal from '$lib/components/activity/workout/SkipDayModal.svelte';

    interface Props {
        activity: DashboardActivity;
        canToggle?: boolean;
        isPast?: boolean;
        /**
         * The dashboard's currently-viewed date (yyyy-MM-dd). Threaded into the
         * toggle action and the workout link so a make-up logs against this day.
         */
        viewDate?: string;
        isOpen?: boolean;
        onToggle?: () => void;
        /** Optimistic log-count changes, so the dashboard summary updates live. */
        onLogCountChange?: (count: number) => void;
    }
    let { activity, canToggle = true, isPast = false, viewDate = '', isOpen = false, onToggle, onLogCountChange }: Props = $props();

    const dateQuery = $derived(viewDate ? `&date=${viewDate}` : '');
    const accent = $derived(getActivityAccentClasses(activity.color, activity.type));
    const typeLabel = $derived(getActivityTypeLabel(activity.type));

    let isSubmitting = $state(false);
    let skipModalOpen = $state(false);
    // Controlled so menu actions can dismiss it. On mobile the popover otherwise
    // stays mounted and overlays the edit drawer it just opened.
    let menuOpen = $state(false);

    // Sequence preview: shown only when rotation is enabled and sets exist.
    const rotationView = $derived(activity.workoutRotation ?? null);
    const showSequence = $derived(
        activity.type === 'workout' &&
            rotationView != null &&
            (activity.config?.useRotation ?? true) !== false &&
            (activity.config?.workoutSets?.length ?? 0) > 0 &&
            rotationView.currentSetId != null
    );

    function onSkipClick() {
        if (activity.weekShifted) {
            toast('This week is already shifted.');
            return;
        }
        skipModalOpen = true;
    }

    /** Optimistic log count for today (null = use server value). */
    let optimisticLogCount = $state<number | null>(null);
    /** Last inserted log ID from server, used for undo so we delete the right log. */
    let lastAddedLogId = $state<string | null>(null);

    // Micro-reward: a little "+1" floats up from the button on completion, paired
    // with a light haptic tap — immediate in-flow feedback (no separate widget).
    let rewardSeq = 0;
    let rewards = $state<{ id: number; label: string }[]>([]);
    function popReward(label = '+1') {
        const id = ++rewardSeq;
        rewards = [...rewards, { id, label }];
        setTimeout(() => (rewards = rewards.filter((r) => r.id !== id)), 850);
    }

    const logCountToday = $derived(optimisticLogCount ?? activity.logCountToday);
    const isCompleted = $derived(logCountToday >= activity.targetCount);
    const completionLabel = $derived(`${logCountToday}/${activity.targetCount}`);

    // Root-growth meter. `growthPoints` counts days the habit was COMPLETED (target
    // met), so today only counts once `logCountToday` reaches the target. Add/subtract
    // today's optimistic completed-state around that baseline to keep the meter live.
    const baseTodayCounted = $derived(activity.logCountToday >= activity.targetCount);
    const todayCounted = $derived(isCompleted);
    const displayPoints = $derived(Math.max(0, (activity.growthPoints ?? 0) + (todayCounted ? 1 : 0) - (baseTodayCounted ? 1 : 0)));
    const growth = $derived(growthProgress(displayPoints));

    // Per-habit streak (schedule-aware, from the server). The card only renders for
    // activities scheduled today, so completing today extends it — mirror the growth
    // meter's optimistic baseline so the flame moves with the first completion.
    const displayStreak = $derived(Math.max(0, activity.streak + (todayCounted ? 1 : 0) - (baseTodayCounted ? 1 : 0)));

    // Root tendril meter: an organic curve standing in for a flat progress bar.
    // The filled portion is revealed via pathLength/dashoffset; the tip dot (and
    // the "+1" reward float) track the end of the filled portion.
    const TENDRIL_PATH = 'M2 9 C 18 4, 34 12, 52 8 S 86 4, 110 8';
    const growthPct = $derived(Math.round(growth.progress * 100));
    let tendrilEl = $state<SVGPathElement | null>(null);
    let tendrilTip = $state({ x: 2, y: 9 });
    $effect(() => {
        const el = tendrilEl;
        const pct = growthPct;
        if (!el) {
            return;
        }
        const point = el.getPointAtLength((pct / 100) * el.getTotalLength());
        tendrilTip = { x: point.x, y: point.y };
    });

    const TypeIcon = $derived.by(() => {
        if (activity.type === 'plant') {
            return Sprout;
        }
        if (activity.type === 'workout') {
            return Dumbbell;
        }
        return Repeat;
    });

    const scheduleSummary = $derived.by(() => {
        if (activity.schedule.type === 'daily') {
            return 'Daily';
        }
        if (activity.schedule.type === 'weekly') {
            const days = activity.schedule.days.map((day: string) => day.slice(0, 3).toUpperCase()).join(', ');
            return `Weekly: ${days}`;
        }
        return `Every ${activity.schedule.value} ${activity.schedule.unit}`;
    });

    const targetSummary = $derived.by(() => {
        if (activity.type === 'habit') {
            const unit = activity.config.unit ?? 'times';
            return `${activity.config.targetValue} ${unit}`;
        }
        if (activity.type === 'plant') {
            return activity.config.species ?? 'Care task';
        }
        const exerciseCount = activity.config.exercises?.length ?? 0;
        if (exerciseCount > 0) {
            return `${exerciseCount} exercises`;
        }
        return 'Workout session';
    });

    const handleToggle: SubmitFunction = ({ formData }) => {
        const action = formData.get('action');
        const currentCount = optimisticLogCount ?? activity.logCountToday;
        // Celebrate only when this completion FINISHES the day's target — so a habit
        // like "drink water 3×" pops once (on the 3rd), not on every sip.
        const completesDay = action === 'complete' && currentCount < activity.targetCount && currentCount + 1 >= activity.targetCount;
        // The root grows the first day the habit is completed; show the "your root
        // has grown" snackbar only when finishing today crosses a growth stage.
        const pointsWithoutToday = Math.max(0, (activity.growthPoints ?? 0) - (baseTodayCounted ? 1 : 0));
        const grewStage = completesDay && growthStage(pointsWithoutToday + 1) > growthStage(pointsWithoutToday);

        isSubmitting = true;

        if (action === 'complete') {
            optimisticLogCount = currentCount + 1;
            if (completesDay) {
                haptic('light');
                popReward();
            }
        } else if (action === 'undo') {
            optimisticLogCount = Math.max(0, currentCount - 1);
        }
        if (optimisticLogCount != null) {
            onLogCountChange?.(optimisticLogCount);
        }

        return async ({ update, result }) => {
            isSubmitting = false;

            if (result.type === 'failure' || result.type === 'error') {
                optimisticLogCount = null;
                onLogCountChange?.(activity.logCountToday);
                await update();
                return;
            }

            if (result.type === 'success' && result.data) {
                const data = result.data as { logId?: string | null };
                if (formData.get('action') === 'complete' && data.logId) {
                    lastAddedLogId = data.logId;
                } else if (formData.get('action') === 'undo') {
                    lastAddedLogId = null;
                }
            }

            // Completion crossed a growth stage → a root segment grew. Offer a jump.
            if (grewStage && result.type === 'success') {
                toast.success('Your root has grown! 🌱', {
                    action: {
                        label: 'View',
                        // eslint-disable-next-line svelte/no-navigation-without-resolve
                        onClick: () => goto(`/roots?highlight=${activity.id}`),
                    },
                });
            }

            // Don't invalidate the page — the dashboardPayload promise would be
            // re-created, causing the skeleton to flash for a moment even though
            // the optimistic UI already shows the correct log count.
            // Also: do NOT reset optimisticLogCount here. Since the page data is
            // not refreshed, activity.logCountToday is still the old value;
            // nulling optimisticLogCount would silently revert the UI.
            // It stays set until the next navigation triggers a fresh load.
            await update({ invalidateAll: false });
        };
    };
</script>

<Card.Root
    class={cn(
        'relative cursor-pointer overflow-hidden border-l-4 border-l-transparent shadow-ambient transition-all duration-200 active:scale-[0.99] dark:ring-1 dark:ring-outline-variant/15',
        isCompleted ? 'bg-success/10' : undefined,
        // Open: elevate + ring instead of a bg tint — a tinted card blends into
        // the warm page background in light mode.
        isOpen ? 'shadow-lg ring-1 ring-clay/40 dark:ring-clay/40' : 'hover:shadow-lg'
    )}
    onclick={() => {
        if (onToggle) onToggle();
    }}
>
    <div class={cn('absolute inset-y-0 left-0 w-1', accent.bar)}></div>
    <Card.Header class="space-y-3">
        <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
                <TypeIcon class="h-4 w-4 text-muted-foreground" />
                <span class={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', accent.chip)}>
                    {typeLabel}
                </span>
                {#if displayStreak > 0}
                    <span
                        class="inline-flex items-center gap-1 rounded-full bg-clay/15 px-2 py-0.5 text-xs font-medium text-clay"
                        title="{displayStreak}-day streak on this habit"
                    >
                        <Flame class="h-3 w-3" />
                        {displayStreak}
                    </span>
                {/if}
                {#if isCompleted}
                    <span class="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                        <CheckIcon class="h-3 w-3" />
                        Completed
                    </span>
                {:else if activity.isSkippedToday}
                    <span
                        class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                        <CalendarOff class="h-3 w-3" />
                        Skipped
                    </span>
                {:else if isPast && !isCompleted}
                    <span
                        class="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive/70"
                    >
                        Missed
                    </span>
                {/if}
            </div>
            <Card.Title class="truncate">{activity.title}</Card.Title>

            <!-- Root-growth tendril: how close the next root segment is. The "+1"
                 reward floats from the tendril's tip so completion and growth read
                 as one moment. -->
            <div
                class="flex items-center gap-2 pt-0.5"
                title="Root growth — {growth.inStage}/{growth.stageCost} days toward the next segment"
            >
                <Sprout class="h-3.5 w-3.5 shrink-0 text-success/80" />
                <div class="relative h-4 w-28">
                    <svg viewBox="0 0 112 16" class="h-full w-full overflow-visible" aria-hidden="true">
                        <path d={TENDRIL_PATH} pathLength="100" class="tendril-track" />
                        <path
                            bind:this={tendrilEl}
                            d={TENDRIL_PATH}
                            pathLength="100"
                            class="tendril-fill"
                            style="stroke-dashoffset: {100 - growthPct}"
                        />
                        <circle cx={tendrilTip.x} cy={tendrilTip.y} r="2.6" class="tendril-tip" />
                    </svg>
                    {#if rewards.length}
                        <div class="pointer-events-none absolute bottom-full -translate-x-1/2" style="left: {(tendrilTip.x / 112) * 100}%">
                            {#each rewards as r (r.id)}
                                <span class="reward-float">{r.label}</span>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>

            {#if showSequence && rotationView}
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                    {#if rotationView.lastSetName}
                        <span class="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground line-through">
                            {rotationView.lastSetName}
                        </span>
                        <span class="text-xs text-muted-foreground" aria-hidden="true">→</span>
                    {/if}
                    <span class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        {rotationView.currentSetName}
                    </span>
                    {#if rotationView.nextSetName}
                        <span class="text-xs text-muted-foreground" aria-hidden="true">→</span>
                        <span class="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                            {rotationView.nextSetName}
                        </span>
                    {/if}
                </div>
            {/if}
        </div>
        <Card.Action class="flex flex-col items-end justify-between self-stretch">
            <Popover.Root bind:open={menuOpen}>
                <Popover.Trigger
                    class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), '-mt-2 -mr-2 h-9 w-9 text-muted-foreground')}
                    onclick={(e) => e.stopPropagation()}
                >
                    <MoreHorizontal class="h-5 w-5" />
                    <span class="sr-only">Actions</span>
                </Popover.Trigger>
                <Popover.Content class="w-44 p-1" align="end">
                    <div class="flex flex-col gap-1">
                        <Button
                            variant="ghost"
                            class="h-auto justify-start gap-3 px-3 py-2 text-sm font-normal"
                            onclick={(e) => {
                                e.stopPropagation();
                                menuOpen = false;
                                openActivityDrawer(activity as ActivityFormData);
                            }}
                        >
                            <Pencil class="h-4 w-4" />
                            Edit {typeLabel}
                        </Button>
                        <Button
                            variant="ghost"
                            class="h-auto justify-start gap-3 px-3 py-2 text-sm font-normal"
                            onclick={(e) => {
                                e.stopPropagation();
                                menuOpen = false;
                                if (onToggle) onToggle();
                            }}
                        >
                            <ChevronDown class={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : undefined)} />
                            {isOpen ? 'Collapse' : 'Expand'} Details
                        </Button>
                        <div class="my-1 border-t"></div>
                        <div
                            class="contents"
                            onclick={(e) => e.stopPropagation()}
                            onkeydown={(e) => {
                                if (e.key !== 'Enter' && e.key !== ' ') {
                                    return;
                                }
                                e.stopPropagation();
                            }}
                            role="presentation"
                        >
                            <form method="POST" action="?/archiveActivity" use:enhance>
                                <input type="hidden" name="id" value={activity.id} />
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    class="h-auto w-full justify-start gap-3 px-3 py-2 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Archive class="h-4 w-4" />
                                    Archive {typeLabel}
                                </Button>
                            </form>
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Root>

            <div
                class="contents"
                onclick={(e) => e.stopPropagation()}
                onkeydown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') {
                        return;
                    }
                    e.stopPropagation();
                }}
                role="presentation"
            >
                <form
                    method="POST"
                    action="?/toggleActivity{dateQuery}"
                    use:enhance={handleToggle}
                    class="relative mt-2 flex items-center justify-end"
                >
                    <input type="hidden" name="activityId" value={activity.id} />
                    {#if isCompleted && lastAddedLogId}
                        <input type="hidden" name="logId" value={lastAddedLogId} />
                    {/if}

                    {#if !canToggle}
                        <Button
                            type="button"
                            variant="outline"
                            class="h-10 gap-2"
                            disabled
                            title="You can only complete today or a missed day earlier this week"
                        >
                            <CalendarClock class="h-4 w-4" />
                        </Button>
                    {:else if isCompleted}
                        <Button type="submit" name="action" value="undo" variant="secondary" class="h-10 px-4" disabled={isSubmitting}>
                            Undo
                        </Button>
                    {:else if activity.type === 'workout'}
                        <div class="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                            {#if !isPast}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    class="h-10 gap-1.5 px-3 text-muted-foreground"
                                    disabled={activity.isSkippedToday}
                                    onclick={onSkipClick}
                                >
                                    <CalendarOff class="h-4 w-4" />
                                    Skip day
                                </Button>
                            {/if}
                            <Button href="/workout/{activity.id}?date={viewDate}" variant="default" class="h-10 px-4">
                                {isPast ? 'Make up' : 'Start Workout'}
                            </Button>
                        </div>
                    {:else}
                        <Button type="submit" name="action" value="complete" variant="default" class="h-10 px-4" disabled={isSubmitting}>
                            {activity.targetCount > 1 ? completionLabel : 'Done'}
                        </Button>
                    {/if}
                </form>
            </div>
        </Card.Action>
    </Card.Header>
    {#if isOpen}
        <Card.Content class="space-y-3 border-t pt-3" onclick={(e) => e.stopPropagation()}>
            <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span class="inline-flex items-center gap-1.5">
                    <CalendarClock class="h-4 w-4 shrink-0 text-clay/80" />
                    {scheduleSummary}
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <Target class="h-4 w-4 shrink-0 text-clay/80" />
                    {targetSummary}
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <CheckIcon class="h-4 w-4 shrink-0 {isCompleted ? 'text-success' : 'text-muted-foreground/60'}" />
                    {completionLabel} today
                </span>
            </div>

            <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sprout class="h-4 w-4 shrink-0 text-success/80" />
                <span>
                    {displayPoints}
                    {displayPoints === 1 ? 'day' : 'days'} grown ·
                    {growth.stage > 0 ? `next root segment in ${growth.toNext}d` : `sprouts in ${growth.toNext}d`}
                </span>
            </div>

            {#if activity.description}
                <p class="font-serif text-sm text-muted-foreground italic">{activity.description}</p>
            {/if}

            {#if dev}
                <Collapsible title="Raw Details" class="space-y-2">
                    <pre class="overflow-x-auto rounded-md p-4 text-xs">{JSON.stringify(activity, null, 2)}</pre>
                </Collapsible>
            {/if}
        </Card.Content>
    {/if}
</Card.Root>

{#if activity.type === 'workout'}
    <SkipDayModal bind:open={skipModalOpen} {activity} />
{/if}

<style>
    .tendril-track {
        fill: none;
        stroke: var(--surface-container-high);
        stroke-width: 2;
        stroke-linecap: round;
    }
    .tendril-fill {
        fill: none;
        stroke: var(--clay);
        stroke-width: 2.25;
        stroke-linecap: round;
        stroke-dasharray: 100;
        transition: stroke-dashoffset 0.7s cubic-bezier(0.22, 0.61, 0.2, 1);
    }
    .tendril-tip {
        fill: var(--clay);
        /* cx/cy are CSS properties per SVG2 — the tip glides with the fill. */
        transition:
            cx 0.7s cubic-bezier(0.22, 0.61, 0.2, 1),
            cy 0.7s cubic-bezier(0.22, 0.61, 0.2, 1);
    }

    /* Micro-reward: a solid clay pill (floats over card text, so it needs a bg). */
    .reward-float {
        display: inline-block;
        font-weight: 700;
        font-size: 0.75rem;
        line-height: 1;
        padding: 3px 8px;
        border-radius: 999px;
        background: var(--clay);
        color: var(--clay-foreground);
        box-shadow: 0 2px 6px rgb(0 0 0 / 0.2);
        animation: reward-float 0.85s cubic-bezier(0.22, 0.61, 0.2, 1) forwards;
    }
    @keyframes reward-float {
        0% {
            transform: translateY(6px) scale(0.9);
            opacity: 0;
        }
        25% {
            opacity: 1;
        }
        100% {
            transform: translateY(-26px) scale(1.05);
            opacity: 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .reward-float {
            animation-duration: 0.4s;
            transform: none;
        }
    }
</style>
