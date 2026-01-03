<script lang="ts">
    import * as Card from '$lib/components/ui/card';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const session = $derived(data.session);
    const activities = $derived(data.activities);
</script>

<div class="p-4">
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold">Dashboard</h1>
            {#if session?.user}
                <p class="text-sm text-muted-foreground">
                    Welcome back, {session.user.name || session.user.email}
                </p>
            {/if}
        </div>
    </div>

    {#if activities?.length === 0}
        <div class="rounded-lg border border-border bg-card p-6 dark:border-border dark:bg-card">
            <p class="text-muted-foreground">Your activities will appear here.</p>
        </div>
    {:else}
        <div class="space-y-4">
            {#each activities as activity}
                <Card.Root>
                    <Card.Header>
                        <Card.Title>{activity.title}</Card.Title>
                        <Card.Description>Type: {activity.type}</Card.Description>
                    </Card.Header>
                    <Card.Content>
                        <pre class="overflow-x-auto rounded-md bg-muted p-4 text-xs">
{JSON.stringify(activity, null, 2)}
                        </pre>
                    </Card.Content>
                </Card.Root>
            {/each}
        </div>
    {/if}
</div>
