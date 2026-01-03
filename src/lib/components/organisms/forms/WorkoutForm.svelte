<script module>
    import { Dumbbell } from '@lucide/svelte';
    export const meta = {
        label: 'Workout',
        icon: Dumbbell,
        color: 'text-blue-500',
    };
</script>

<script lang="ts">
    let { id }: { id?: string } = $props();
</script>

<div>
    <form {id}>
        <h1>Workout Form</h1>
    </form>
</div>
