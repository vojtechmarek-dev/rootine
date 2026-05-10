<script lang="ts">
    import { Check } from '@lucide/svelte';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    let { show } = $props<{ show: boolean }>();
</script>

<AlertDialog.Root open={show}>
    <AlertDialog.Content class="dark max-w-xs text-center">
        <AlertDialog.Header class="items-center">
            <div
                class="mb-4 flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-clay/20 text-clay shadow-[0_0_40px_-10px_var(--clay)]"
            >
                <Check class="h-10 w-10" />
            </div>
            <AlertDialog.Title class="font-serif text-3xl font-medium tracking-tight italic">Workout Complete</AlertDialog.Title>
            <AlertDialog.Description class="text-base">Great job! Redirecting...</AlertDialog.Description>
        </AlertDialog.Header>
    </AlertDialog.Content>
</AlertDialog.Root>
