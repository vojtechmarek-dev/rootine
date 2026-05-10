<script lang="ts">
    import * as Card from '$lib/components/ui/card/index.js';
    import type { DashboardActivity } from '$lib/types/schemas';
    import { Button } from '$lib/components/ui/button';
    import { dev } from '$app/environment';
    import Collapsible from '$lib/components/shared/Collapsible.svelte';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { CalendarClock, CheckIcon, ChevronDown, Dumbbell, Pencil, Repeat, Sprout } from '@lucide/svelte';
    import { openActivityDrawer } from '$lib/state/activity-drawer.svelte';
    import type { ActivityFormData } from '$lib/types/schemas';
    import { cn, getActivityAccentClasses, getActivityTypeLabel } from '$lib/utils';

    const props = $props<{
        activity: DashboardActivity;
        canToggle?: boolean;
        isOpen?: boolean;
        onToggle?: () => void;
    }>();
    const activity = $derived(props.activity);
    const canToggle = $derived(props.canToggle ?? true);
    const isOpen = $derived(props.isOpen ?? false);
    const onToggle = $derived(props.onToggle);
    const accent = $derived(getActivityAccentClasses(activity.color));
    const typeLabel = $derived(getActivityTypeLabel(activity.type));

    let isSubmitting = $state(false);
    /** Optimistic log count for today (null = use server value). */
    let optimisticLogCount = $state<number | null>(null);
    /** Last inserted log ID from server, used for undo so we delete the right log. */
    let lastAddedLogId = $state<string | null>(null);

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

        isSubmitting = true;

        if (action === 'complete') {
            optimisticLogCount = currentCount + 1;
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
        'relative overflow-hidden border-l-4 border-l-transparent shadow-ambient dark:ring-1 dark:ring-outline-variant/15',
        isCompleted ? 'bg-success/10' : undefined
    )}
>
    <div class={cn('absolute inset-y-0 left-0 w-1', accent.bar)}></div>
    <Card.Header class="space-y-3">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-2">
                <div class="flex items-center gap-2">
                    <TypeIcon class="h-4 w-4 text-muted-foreground" />
                    <span class={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', accent.chip)}>
                        {typeLabel}
                    </span>
                </div>
                <Card.Title class="truncate">{activity.title}</Card.Title>
            </div>
        </div>
        <Card.Action>
            <form method="POST" action="?/toggleActivity" use:enhance={handleToggle} class="flex w-full items-center justify-between gap-2">
                <input type="hidden" name="activityId" value={activity.id} />
                {#if isCompleted && lastAddedLogId}
                    <input type="hidden" name="logId" value={lastAddedLogId} />
                {/if}

                <div class="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 shrink-0 text-muted-foreground"
                        onclick={() => {
                            if (onToggle) {
                                onToggle();
                            }
                        }}
                    >
                        <ChevronDown class={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : undefined)} />
                        <span class="sr-only">{isOpen ? 'Collapse details' : 'Expand details'}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        class="h-9 w-9 text-muted-foreground"
                        onclick={() => openActivityDrawer(activity as ActivityFormData)}
                    >
                        <Pencil class="h-4 w-4" />
                        <span class="sr-only">Edit Activity</span>
                    </Button>

                    {#if !canToggle}
                        <Button
                            type="button"
                            variant="outline"
                            class="h-10 gap-2"
                            disabled
                            title="Activity completion is available only for today"
                        >
                            <CalendarClock class="h-4 w-4" />
                        </Button>
                    {:else if isCompleted}
                        <div class="flex h-10 w-10 items-center justify-center rounded-md bg-success/20 text-success">
                            <CheckIcon class="h-5 w-5" />
                        </div>
                        <Button type="submit" name="action" value="undo" variant="secondary" class="h-10 px-4" disabled={isSubmitting}>
                            Undo
                        </Button>
                    {:else if activity.type === 'workout'}
                        <Button href="/workout/{activity.id}" variant="default" class="h-10 px-4">
                            Start Workout
                        </Button>
                    {:else}
                        <Button type="submit" name="action" value="complete" variant="default" class="h-10 px-4" disabled={isSubmitting}>
                            {activity.targetCount > 1 ? completionLabel : 'Done'}
                        </Button>
                    {/if}
                </div>
            </form>
        </Card.Action>
    </Card.Header>
    {#if isOpen}
        <Card.Content class="space-y-3 border-t pt-3">
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
