<script lang="ts">
    import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
    import { Button } from '$lib/components/ui/button';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { CalendarOff, CalendarClock, LoaderCircle } from '@lucide/svelte';
    import type { DashboardActivity } from '$lib/types/schemas';
    import { shiftWeekdays } from '$lib/workout-rotation';

    let {
        open = $bindable(false),
        activity,
    }: {
        open: boolean;
        activity: DashboardActivity;
    } = $props();

    type Mode = 'skip' | 'shift';
    let mode = $state<Mode>('skip');
    let isSubmitting = $state(false);

    // Reset selection each time the modal opens.
    $effect(() => {
        if (open) {
            mode = 'skip';
        }
    });

    const originalDays = $derived(activity.schedule.type === 'weekly' ? activity.schedule.days : []);

    /** Pair original day -> shifted day, in canonical order, for the preview. */
    const dayPairs = $derived(
        originalDays.map((d, i) => ({
            from: d.slice(0, 3).toUpperCase(),
            to: (shiftWeekdays([d], 1)[0] ?? d).slice(0, 3).toUpperCase(),
            key: `${d}-${i}`,
        }))
    );
</script>

<AlertDialog.Root bind:open>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Skip {activity.title}?</AlertDialog.Title>
            <AlertDialog.Description>Choose what to do with today's workout.</AlertDialog.Description>
        </AlertDialog.Header>

        <form
            method="POST"
            action="?/skipDay"
            use:enhance={() => {
                isSubmitting = true;
                return async ({ result, update }) => {
                    isSubmitting = false;
                    if (result.type === 'success') {
                        toast.success(mode === 'shift' ? 'This week shifted by 1 day.' : 'Workout skipped for today.');
                        open = false;
                        await update();
                    } else if (result.type === 'failure') {
                        toast.error((result.data?.message as string) ?? 'Could not skip the workout.');
                        await update({ reset: false });
                    } else {
                        toast.error('Could not skip the workout.');
                    }
                };
            }}
        >
            <input type="hidden" name="activityId" value={activity.id} />
            <input type="hidden" name="mode" value={mode} />

            <div class="flex flex-col gap-2 py-2">
                <button
                    type="button"
                    class="flex items-start gap-3 rounded-xl border p-3 text-left transition-colors {mode === 'skip'
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/30 hover:bg-muted/40'}"
                    onclick={() => (mode = 'skip')}
                >
                    <CalendarOff class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <span>
                        <span class="block text-sm font-medium text-foreground">Skip this workout</span>
                        <span class="block text-xs text-muted-foreground">Mark today as skipped. No schedule change.</span>
                    </span>
                </button>

                <button
                    type="button"
                    class="flex items-start gap-3 rounded-xl border p-3 text-left transition-colors {mode === 'shift'
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/30 hover:bg-muted/40'}"
                    onclick={() => (mode = 'shift')}
                >
                    <CalendarClock class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <span class="min-w-0">
                        <span class="block text-sm font-medium text-foreground">Shift this week +1 day</span>
                        <span class="block text-xs text-muted-foreground">Push remaining days this week back by one.</span>

                        {#if mode === 'shift'}
                            {#if dayPairs.length > 0}
                                <span class="mt-2 flex flex-wrap gap-1.5">
                                    {#each dayPairs as pair (pair.key)}
                                        <span class="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-1 text-xs">
                                            <span class="text-muted-foreground line-through">{pair.from}</span>
                                            <span aria-hidden="true">→</span>
                                            <span class="font-semibold text-foreground">{pair.to}</span>
                                        </span>
                                    {/each}
                                </span>
                            {:else}
                                <span class="mt-2 block text-xs text-muted-foreground">This habit has no weekly days to shift.</span>
                            {/if}
                        {/if}
                    </span>
                </button>
            </div>

            <AlertDialog.Footer>
                <Button type="button" variant="ghost" onclick={() => (open = false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="default" disabled={isSubmitting}>
                    {#if isSubmitting}
                        <LoaderCircle class="size-4 animate-spin" />
                        Working…
                    {:else}
                        Confirm
                    {/if}
                </Button>
            </AlertDialog.Footer>
        </form>
    </AlertDialog.Content>
</AlertDialog.Root>
