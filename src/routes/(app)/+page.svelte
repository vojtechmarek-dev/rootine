<script lang="ts">
    import Dashboard from '@/components/activity/Dashboard.svelte';
    import type { PageData } from './$types';
    import { toast } from 'svelte-sonner';
    import { onMount } from 'svelte';

    let { data }: { data: PageData } = $props();

    const session = $derived(data.session);
    const activities = $derived(data.activities);

    onMount(() => {
        if (data.errors && data.errors.length > 0) {
            for (const err of data.errors) {
                toast.error(`Failed to load ${err.type} activity`, {
                    description: `Activity ID: ${err.id}. Invalid data.`,
                    duration: 5000,
                });
            }
        }
    });
</script>

<Dashboard {session} {activities} />
