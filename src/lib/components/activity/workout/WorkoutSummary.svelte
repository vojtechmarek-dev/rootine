<script lang="ts">
    import { Check } from '@lucide/svelte';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    let { show } = $props<{ show: boolean }>();
</script>

<AlertDialog.Root open={show}>
    <AlertDialog.Content class="dark max-w-xs text-center">
        <AlertDialog.Header class="items-center">
            <div
                class="mb-4 flex h-20 w-20 animate-in zoom-in items-center justify-center rounded-full bg-clay/20 text-clay"
            >
                <Check class="h-10 w-10" />
            </div>
            <AlertDialog.Title class="font-serif text-3xl font-medium italic tracking-tight">
                Workout Complete
            </AlertDialog.Title>
            <AlertDialog.Description class="text-base">
                Great job! Redirecting...
            </AlertDialog.Description>
        </AlertDialog.Header>
    </AlertDialog.Content>
</AlertDialog.Root>

