<script lang="ts">
    import * as Card from '$lib/components/ui/card/index.js';
    import type { DashboardActivity } from '$lib/types/schemas';
    import { Button } from '$lib/components/ui/button';
    import { dev } from '$app/environment';
    import Collapsible from '$lib/components/shared/Collapsible.svelte';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';

    const props = $props<{ activity: DashboardActivity }>();
    const activity = $derived(props.activity);

    let isSubmitting = $state(false);
    let optimisticCompleted = $state<boolean | null>(null);

    const isCompleted = $derived(optimisticCompleted ?? activity.isCompleted);

    const handleToggle: SubmitFunction = ({ formData }) => {
        const action = formData.get('action');

        isSubmitting = true;

        if (action === 'complete') {
            optimisticCompleted = true;
        } else if (action === 'undo') {
            optimisticCompleted = false;
        }

        return async ({ update, result }) => {
            isSubmitting = false;

            if (result.type === 'failure' || result.type === 'error') {
                optimisticCompleted = null;
                await update();
                return;
            }

            await update();
            optimisticCompleted = null;
        };
    };
</script>

<Card.Root class={isCompleted ? 'border-emerald-500/40 bg-emerald-500/5' : undefined}>
    <Card.Header>
        <Card.Title>{activity.title}</Card.Title>
        <Card.Description>{activity.description}</Card.Description>
        <Card.Action>
            <form method="POST" action="?/toggleActivity" use:enhance={handleToggle}>
                <input type="hidden" name="activityId" value={activity.id} />

                {#if isCompleted}
                    <Button type="submit" name="action" value="undo" variant="secondary" class="h-11" disabled={isSubmitting}>Undo</Button>
                {:else}
                    <Button type="submit" name="action" value="complete" variant="default" class="h-11" disabled={isSubmitting}>
                        Done
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
