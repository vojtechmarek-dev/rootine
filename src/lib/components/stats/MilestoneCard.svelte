<script lang="ts">
    import { Lock } from '@lucide/svelte';

    let {
        name,
        description,
        emoji,
        earned,
    }: {
        name: string;
        description: string;
        emoji: string;
        earned: boolean;
    } = $props();

    let sheening = $state(false);

    function triggerSheen() {
        if (!earned) return;
        sheening = false;
        requestAnimationFrame(() => (sheening = true)); // restart the sweep
    }

    function onEnter(e: PointerEvent) {
        if (e.pointerType === 'mouse') triggerSheen(); // desktop hover
    }

    function onDown(e: PointerEvent) {
        if (e.pointerType !== 'mouse') triggerSheen(); // touch tap
    }
</script>

<!-- Pointer handlers are purely decorative (the sheen sweep); the card exposes no
     activation behaviour and its text is in the DOM for assistive tech. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="relative overflow-hidden rounded-xl p-3 {earned
        ? 'bg-clay text-clay-foreground shadow-ambient'
        : 'bg-surface-container-high text-muted-foreground'}"
    title={description}
    onpointerenter={onEnter}
    onpointerdown={onDown}
>
    {#if earned && sheening}
        <div class="sheen" onanimationend={() => (sheening = false)}></div>
    {/if}
    <div class="flex items-start gap-2.5">
        <span class="text-2xl leading-none {earned ? '' : 'opacity-40 grayscale'}" aria-hidden="true">{emoji}</span>
        <div class="min-w-0">
            <p class="flex items-center gap-1 text-sm font-semibold">
                {name}
                {#if !earned}<Lock class="size-3 opacity-60" />{/if}
            </p>
            <p class="mt-0.5 text-xs {earned ? 'opacity-90' : 'opacity-70'}">{description}</p>
        </div>
    </div>
</div>

<style>
    /* Diagonal gloss that sweeps across an earned card on hover / tap. */
    .sheen {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.38) 50%, transparent 65%);
        transform: translateX(-120%);
        animation: sheen-sweep 0.7s ease-out;
    }
    @keyframes sheen-sweep {
        to {
            transform: translateX(120%);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .sheen {
            display: none;
        }
    }
</style>
