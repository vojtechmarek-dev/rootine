<script lang="ts">
    import * as Card from '$lib/components/ui/card/index.js';
    import type { DashboardActivity } from '$lib/types/schemas';
    import { Button } from '$lib/components/ui/button';
    import { dev } from '$app/environment';
    import Collapsible from '$lib/components/shared/Collapsible.svelte';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { CalendarClock, CheckIcon, Pencil } from '@lucide/svelte';
    import { openActivityDrawer } from '$lib/state/activity-drawer.svelte';
    import type { ActivityFormData } from '$lib/types/schemas';

    const props = $props<{ activity: DashboardActivity; canToggle?: boolean }>();
    const activity = $derived(props.activity);
    const canToggle = $derived(props.canToggle ?? true);

    let isSubmitting = $state(false);
    /** Optimistic log count for today (null = use server value). */
    let optimisticLogCount = $state<number | null>(null);
    /** Last inserted log ID from server, used for undo so we delete the right log. */
    let lastAddedLogId = $state<string | null>(null);

    const logCountToday = $derived(optimisticLogCount ?? activity.logCountToday);
    const isCompleted = $derived(logCountToday >= activity.targetCount);

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

            await update();
            optimisticLogCount = null;
        };
    };
</script>

<Card.Root class={isCompleted ? 'bg-success/10' : undefined}>
    <Card.Header>
        <div class="flex items-start justify-between">
            <div>
                <Card.Title>{activity.title}</Card.Title>
                <Card.Description>{activity.description}</Card.Description>
            </div>
        </div>
        <Card.Action>
            <form method="POST" action="?/toggleActivity" use:enhance={handleToggle} class="flex items-center gap-2">
                <input type="hidden" name="activityId" value={activity.id} />
                <Button
                    variant="ghost"
                    size="icon"
                    class="-mt-1 -mr-1 h-8 w-8 text-muted-foreground"
                    onclick={() => openActivityDrawer(activity as ActivityFormData)}
                >
                    <Pencil class="h-4 w-4" />
                    <span class="sr-only">Edit Activity</span>
                </Button>
                {#if isCompleted && lastAddedLogId}
                    <input type="hidden" name="logId" value={lastAddedLogId} />
                {/if}

                {#if !canToggle}
                    <Button
                        type="button"
                        variant="outline"
                        class="h-11 gap-2"
                        disabled
                        title="Activity completion is available only for today"
                    >
                        <CalendarClock class="h-4 w-4" />
                    </Button>
                {:else if isCompleted}
                    <div class="flex h-11 w-11 items-center justify-center rounded-md">
                        <CheckIcon class="h-5 w-5" />
                    </div>
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
                <pre class="overflow-x-auto rounded-md p-4 text-xs">{JSON.stringify(activity, null, 2)}</pre>
            </Collapsible>
        {/if}
    </Card.Content>
</Card.Root>
