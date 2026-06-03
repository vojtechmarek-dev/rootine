<script lang="ts">
    import Dashboard from '@/components/activity/Dashboard.svelte';
    import { toastError } from '$lib/toast';
    import type { PageData } from './$types';
    import { SvelteSet } from 'svelte/reactivity';

    let { data }: { data: PageData } = $props();

    const session = $derived(data.session);
    const dashboardPayload = $derived(
        data.dashboardPayload.then((payload) => {
            notifyDataErrors(payload.errors);
            return payload;
        })
    );
    const shownErrorSignatures = new SvelteSet<string>();

    const notifyDataErrors = (errors: Array<{ id: string; type: string; message: string }>) => {
        const signature = JSON.stringify(errors);
        if (errors.length === 0 || shownErrorSignatures.has(signature)) {
            return;
        }

        shownErrorSignatures.add(signature);

        for (const err of errors) {
            toastError(`Failed to load ${err.type} activity`, {
                description: 'Some saved data could not be read. Other activities are unaffected.',
                detail: `Activity ID: ${err.id}. ${err.message}`,
                duration: 5000,
            });
        }
    };
</script>

{#await dashboardPayload}
    <Dashboard {session} activities={[]} loading={true} />
{:then dashboardPayload}
    {@const activities = dashboardPayload.activities}
    <Dashboard {session} {activities} />
{:catch err}
    <div class="p-4">
        <div class="rounded-2xl bg-destructive/10 p-6 text-destructive">
            <p class="font-medium">Could not load activities right now.</p>
            <p class="mt-1 text-sm text-muted-foreground">{err instanceof Error ? err.message : 'Unknown error.'}</p>
        </div>
    </div>
{/await}
