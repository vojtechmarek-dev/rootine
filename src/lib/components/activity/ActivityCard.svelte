<script lang="ts">
    import * as Card from '$lib/components/ui/card/index.js';
    import type { DashboardActivity } from '$lib/types/schemas';
    import { Button } from '$lib/components/ui/button';
    import { dev } from '$app/environment';
    import { onMount } from 'svelte';
    import Collapsible from '$lib/components/shared/Collapsible.svelte';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import {
        addAction,
        createPendingAction,
        getPendingCountForActivity,
        removeLastComplete,
    } from '$lib/sync/queue';

    const props = $props<{ activity: DashboardActivity }>();
    const activity = $derived(props.activity);

    let isSubmitting = $state(false);
    /** Optimistic log count for today (null = use server value). */
    let optimisticLogCount = $state<number | null>(null);
    /** Last inserted log ID from server, used for undo so we delete the right log. */
    let lastAddedLogId = $state<string | null>(null);

    const logCountToday = $derived(optimisticLogCount ?? activity.logCountToday);
    const isCompleted = $derived(logCountToday >= activity.targetCount);

    onMount(() => {
        const pendingCounts = getPendingCountForActivity(activity.id);
        const queuedDelta = pendingCounts.completes - pendingCounts.undos;
        const nextCount = Math.max(0, activity.logCountToday + queuedDelta);

        if (queuedDelta !== 0) {
            optimisticLogCount = nextCount;
        }
    });

    const queueAction = (action: 'complete' | 'undo', formData: FormData) => {
        if (action === 'undo') {
            const removed = removeLastComplete(activity.id);
            if (removed) {
                lastAddedLogId = null;
                return;
            }
        }

        const rawLogId = formData.get('logId');
        const logId = typeof rawLogId === 'string' && rawLogId.length > 0 ? rawLogId : undefined;

        addAction(
            createPendingAction({
                activityId: activity.id,
                action,
                date: new Date().toISOString(),
                logId,
            })
        );

        if (action === 'undo') {
            lastAddedLogId = null;
        }
    };

    const handleToggle: SubmitFunction = ({ formData, cancel }) => {
        const action = formData.get('action');
        const currentCount = optimisticLogCount ?? activity.logCountToday;

        isSubmitting = true;

        if (action === 'complete') {
            optimisticLogCount = currentCount + 1;
        } else if (action === 'undo') {
            optimisticLogCount = Math.max(0, currentCount - 1);
        }

        if (!navigator.onLine) {
            cancel();
            if (action === 'complete' || action === 'undo') {
                queueAction(action, formData);
            }
            isSubmitting = false;
            return;
        }

        return async ({ update, result }) => {
            isSubmitting = false;

            if (result.type === 'error') {
                if (action === 'complete' || action === 'undo') {
                    queueAction(action, formData);
                }
                return;
            }

            if (result.type === 'failure') {
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

            await update();
            optimisticLogCount = null;
        };
    };
</script>

<Card.Root class={isCompleted ? 'border-success/40 bg-success/5' : undefined}>
    <Card.Header>
        <Card.Title>{activity.title}</Card.Title>
        <Card.Description>{activity.description}</Card.Description>
        <Card.Action>
            <form method="POST" action="?/toggleActivity" use:enhance={handleToggle}>
                <input type="hidden" name="activityId" value={activity.id} />
                {#if isCompleted && lastAddedLogId}
                    <input type="hidden" name="logId" value={lastAddedLogId} />
                {/if}

                {#if isCompleted}
                    <Button type="submit" name="action" value="undo" variant="secondary" class="h-11" disabled={isSubmitting}>Undo</Button>
                {:else}
                    <Button type="submit" name="action" value="complete" variant="default" class="h-11" disabled={isSubmitting}>
                        {activity.targetCount > 1 ? `${logCountToday}/${activity.targetCount}` : 'Done'}
                    </Button>
                {/if}
            </form>
        </Card.Action>
    </Card.Header>
    <Card.Content>
        {#if dev}
            <Collapsible title="Raw Details" class="space-y-2">
                <pre class="overflow-x-auto rounded-md bg-muted p-4 text-xs">{JSON.stringify(activity, null, 2)}</pre>
            </Collapsible>
        {/if}
    </Card.Content>
</Card.Root>
