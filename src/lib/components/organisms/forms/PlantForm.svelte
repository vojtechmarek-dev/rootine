<script module>
    import { Flower2 } from '@lucide/svelte';
    export const meta = {
        label: 'Plant',
        icon: Flower2,
        color: 'text-green-500',
    };
</script>

<script lang="ts">
    let { id }: { id?: string } = $props();
</script>

<div>
    <form {id}>
        <h1>Plant Form</h1>
    </form>
</div>
