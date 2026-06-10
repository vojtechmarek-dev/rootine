<script lang="ts">
    import * as Card from '$lib/components/ui/card/index.js';
    import type { DashboardActivity } from '$lib/types/schemas';
    import { Button } from '$lib/components/ui/button';
    import { dev } from '$app/environment';
    import Collapsible from '$lib/components/shared/Collapsible.svelte';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
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
    } from '@lucide/svelte';
    import { openActivityDrawer } from '$lib/state/activity-drawer.svelte';
    import type { ActivityFormData } from '$lib/types/schemas';
    import { cn, getActivityAccentClasses, getActivityTypeLabel } from '$lib/utils';
    import * as Popover from '$lib/components/ui/popover';
    import { buttonVariants } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import SkipDayModal from '$lib/components/activity/workout/SkipDayModal.svelte';

    const props = $props<{
        activity: DashboardActivity;
        canToggle?: boolean;
        isPast?: boolean;
        viewDate?: string;
        isOpen?: boolean;
        onToggle?: () => void;
    }>();
    const activity = $derived(props.activity);
    const canToggle = $derived(props.canToggle ?? true);
    const isPast = $derived(props.isPast ?? false);
    // The dashboard's currently-viewed date (yyyy-MM-dd). Threaded into the
    // toggle action and the workout link so a make-up logs against this day.
    const viewDate = $derived(props.viewDate ?? '');
    const dateQuery = $derived(viewDate ? `&date=${viewDate}` : '');
    const isOpen = $derived(props.isOpen ?? false);
    const onToggle = $derived(props.onToggle);
    const accent = $derived(getActivityAccentClasses(activity.color));
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
    function haptic() {
        try {
            navigator.vibrate?.(12);
        } catch {
            /* vibrate unsupported — ignore */
        }
    }

    const logCountToday = $derived(optimisticLogCount ?? activity.logCountToday);
    const isCompleted = $derived(logCountToday >= activity.targetCount);
    const completionLabel = $derived(`${logCountToday}/${activity.targetCount}`);

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
        // Root growth counts distinct days, so only the FIRST completion of the
        // day grows it — gate the "your root has grown" snackbar on that.
        const growsRoot = action === 'complete' && currentCount === 0;

        isSubmitting = true;

        if (action === 'complete') {
            optimisticLogCount = currentCount + 1;
            haptic();
            popReward();
        } else if (action === 'undo') {
            optimisticLogCount = Math.max(0, currentCount - 1);
        }

        return async ({ update, result }) => {
            isSubmitting = false;

            if (result.type === 'failure' || result.type === 'error') {
                optimisticLogCount = null;
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

            // First completion of the day → root grew. Offer a jump to it.
            if (growsRoot && result.type === 'success') {
                toast.success('Your root has grown! 🌱', {
                    action: {
                        label: 'View',
                        // eslint-disable-next-line svelte/no-navigation-without-resolve
                        onClick: () => goto(`/garden?highlight=${activity.id}`),
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
        isOpen ? 'bg-muted/30' : 'hover:bg-muted/10'
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
                            Edit Activity
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
                                    Archive Activity
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

                    <!-- Floating "+1" micro-reward, anchored above the action button. -->
                    {#if rewards.length}
                        <div class="pointer-events-none absolute right-2 bottom-full flex flex-col items-end">
                            {#each rewards as r (r.id)}
                                <span class="reward-float text-success">{r.label}</span>
                            {/each}
                        </div>
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
            <div class="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div><span class="font-medium text-foreground">Type:</span> {typeLabel}</div>
                <div><span class="font-medium text-foreground">Schedule:</span> {scheduleSummary}</div>
                <div><span class="font-medium text-foreground">Target:</span> {targetSummary}</div>
                <div><span class="font-medium text-foreground">Progress:</span> {completionLabel}</div>
            </div>

            {#if activity.description}
                <p class="text-sm text-muted-foreground">{activity.description}</p>
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
    /* Micro-reward: float up + fade. Colour comes from the `text-success` class. */
    .reward-float {
        font-weight: 700;
        font-size: 0.9rem;
        line-height: 1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
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
