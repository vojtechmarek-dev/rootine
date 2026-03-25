<script lang="ts">
    import Dashboard from '@/components/activity/Dashboard.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const session = $derived(data.session);
    const activitiesPromise = $derived(data.streamed.activities);
</script>

<Dashboard {session} {activitiesPromise} />
