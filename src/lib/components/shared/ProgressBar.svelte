<script lang="ts">
    import { cn } from '$lib/utils';

    let {
        /** 0–100 for a determinate bar; null/undefined → indeterminate animation. */
        value = null,
        class: className,
    }: {
        value?: number | null;
        class?: string;
    } = $props();

    const clamped = $derived(value == null ? null : Math.min(100, Math.max(0, value)));
</script>

<div
    class={cn('relative h-1 w-full overflow-hidden rounded-full bg-muted', className)}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={clamped ?? undefined}
>
    {#if clamped == null}
        <div class="indeterminate absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary"></div>
    {:else}
        <div
            class="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300 ease-out"
            style="width: {clamped}%"
        ></div>
    {/if}
</div>

<style>
    @keyframes progress-indeterminate {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(350%);
        }
    }

    .indeterminate {
        animation: progress-indeterminate 1.1s ease-in-out infinite;
    }
</style>
