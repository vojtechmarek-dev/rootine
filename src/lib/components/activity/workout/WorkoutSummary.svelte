<script lang="ts">
    import { Check } from '@lucide/svelte';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    let { show } = $props<{ show: boolean }>();
</script>

<AlertDialog.Root open={show}>
    <AlertDialog.Content size="sm" class="max-w-xs text-center">
        <AlertDialog.Header class="place-items-center items-center text-center">
            <div class="mb-4 flex h-20 w-20 animate-in items-center justify-center rounded-full bg-clay/20 text-clay zoom-in">
                <Check class="h-10 w-10" />
            </div>
            <AlertDialog.Title class="font-serif text-3xl font-medium tracking-tight italic">Workout Complete</AlertDialog.Title>
            <AlertDialog.Description class="text-base">Great job! Redirecting...</AlertDialog.Description>
        </AlertDialog.Header>
    </AlertDialog.Content>
</AlertDialog.Root>
