<script lang="ts">
    import { draw, fade } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    import { type Segment, pathOf } from '$lib/roots';

    const DEPTH_LABEL = ['Taproot', 'Main root', 'Offshoot', 'Fine root'];

    /** An earned milestone, rendered as a hoverable leaf on the plant. */
    interface LeafBadge {
        id: string;
        name: string;
        description: string;
    }

    interface Props {
        /** All segments from generateRootSystem() / generateGarden(). */
        segments: Segment[];
        /** Global growth (total completions) — drives reveal + root thickness. */
        growth?: number;
        /**
         * Per-habit completion counts. Does NOT gate reveal (the tree is one
         * shared organism); used for the above-ground plant level + tooltip counts.
         */
        growthByActivity?: Record<string, number>;
        /** Earned milestones → one hoverable leaf each, in escalating order. */
        leaves?: LeafBadge[];
        /** Growth value at which roots reach full thickness. */
        maxGrowth?: number;
        /** Map a hovered segment to tooltip text. Default = generic depth labels. */
        describe?: (seg: Segment) => { name: string; meta?: string };
        /** Fired when a root is clicked — e.g. open that habit. */
        onselect?: (activityId: string | null, depth: number) => void;
        /** Draw the little above-ground sprout at the origin. */
        sprout?: boolean;
        /** Enable wheel-zoom / drag-pan / hover. Off for static previews. */
        interactive?: boolean;
    }

    let {
        segments,
        growth = 4,
        growthByActivity,
        leaves = [],
        maxGrowth = 60,
        describe = (s) => ({ name: s.depth === 0 ? 'Your foundation' : 'Root', meta: DEPTH_LABEL[s.depth] }),
        onselect,
        sprout = true,
        interactive = true,
    }: Props = $props();

    // ── derived view of the system ──────────────────────────────────────────────
    // Each habit OFFSHOOT reveals by its own completion count (local born), so a
    // neglected habit is a short stub and an active one is long + complex. The
    // shared TAPROOT reveals only deep enough to host the offshoots that have
    // grown (the deepest active attachment), plus a short tail. Without a
    // per-habit map (legacy single plant) everything falls back to global growth.

    // How deep the taproot must be revealed: the deepest attachment node of any
    // habit that has started growing. A small base keeps a seedling stub visible.
    const taprootReveal = $derived.by(() => {
        if (!growthByActivity) return growth;
        let depth = 2;
        for (const s of segments) {
            if (s.activityId != null && s.attachBorn != null && (growthByActivity[s.activityId] ?? 0) > 0) {
                if (s.attachBorn + 2 > depth) depth = s.attachBorn + 2;
            }
        }
        return depth;
    });

    function isVisible(s: Segment): boolean {
        if (!growthByActivity) return s.born <= growth;
        if (s.activityId == null) return s.born <= taprootReveal; // taproot
        return s.born <= (growthByActivity[s.activityId] ?? 0); // offshoot by its habit
    }

    const visible = $derived(segments.filter(isVisible));

    // Roots thicken as the overall practice strengthens.
    const maturity = $derived(1 + (Math.min(growth, maxGrowth) / maxGrowth) * 0.5);

    // Glowing dots on roots that still have hidden segments (i.e. are still growing).
    // Plain objects (not Map/Set) so this stays a pure, non-reactive computation.
    const tips = $derived.by(() => {
        const last: Record<string, Segment> = {};
        const growing: Record<string, true> = {};
        for (const s of segments) {
            if (isVisible(s)) last[s.rootId] = s;
            else growing[s.rootId] = true;
        }
        const out: Segment[] = [];
        for (const id in last) if (growing[id]) out.push(last[id]);
        return out.slice(0, 28);
    });

    // ── per-habit tinting ─────────────────────────────────────────────────────
    // Earthy accents per activity colour token. "zinc"/unset falls back to the
    // default brown depth palette (CSS) so a mixed garden still reads organic.
    const HABIT_BASE: Record<string, string> = {
        emerald: '#5fae6e',
        blue: '#5b93d6',
        violet: '#9a7bd0',
        amber: '#d6a24e',
        rose: '#d678a0',
    };

    function mixHex(a: string, b: string, t: number): string {
        const pa = parseInt(a.slice(1), 16);
        const pb = parseInt(b.slice(1), 16);
        const ar = (pa >> 16) & 255,
            ag = (pa >> 8) & 255,
            ab = pa & 255;
        const br = (pb >> 16) & 255,
            bg = (pb >> 8) & 255,
            bb = pb & 255;
        const r = Math.round(ar + (br - ar) * t);
        const g = Math.round(ag + (bg - ag) * t);
        const bl = Math.round(ab + (bb - ab) * t);
        return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
    }

    /** Stroke for a segment — accent shaded toward parchment with depth, or undefined to use CSS browns. */
    function strokeFor(seg: Segment): string | undefined {
        const token = seg.color;
        if (!token || token === 'zinc') return undefined;
        const base = HABIT_BASE[token];
        if (!base) return undefined;
        return mixHex(base, '#e7d8bb', seg.depth * 0.16);
    }

    // ── above-ground plant: one leaf per earned milestone (achievement) ──────────
    // Leaves are NOT continuous progress — each is an earned achievement, growing
    // rarer as you climb the stem. Each leaf is hoverable for its description.
    // A unit leaf pointing up-and-right from its base at (0,0); placed via transform.
    const LEAF_PATH = 'M0 0 C 4 -7 14 -9 21 -3 C 14 1 5 3 0 0 Z';

    const plant = $derived.by(() => {
        const n = leaves.length;
        // Stem grows with the number of milestones earned (room for the leaves).
        const stemTop = -(36 + Math.min(n, 12) * 6);
        const crownY = stemTop + 4;

        const placed = leaves.map((badge, k) => {
            const frac = n > 1 ? k / (n - 1) : 0.5; // 0 at base → 1 at the crown
            const y = -14 + (crownY - -14) * frac;
            const side: 1 | -1 = k % 2 === 0 ? 1 : -1;
            const scale = 0.95 - 0.3 * frac; // larger low, smaller toward the tip
            return { badge, y, side, scale, rot: -22 - frac * 12 };
        });

        return { stemTop, crownY, leaves: placed };
    });

    // ── hover / inspect ─────────────────────────────────────────────────────────
    let hovered = $state<Segment | null>(null);
    let hoveredLeaf = $state<LeafBadge | null>(null);
    let mouse = $state({ x: 0, y: 0 });
    // A hovered leaf takes priority over a hovered root for the tooltip.
    const tip = $derived(hoveredLeaf ? { name: hoveredLeaf.name, meta: hoveredLeaf.description } : hovered ? describe(hovered) : null);

    function trackMouse(e: MouseEvent) {
        if (!wrapEl) return;
        const r = wrapEl.getBoundingClientRect();
        mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    // ── pan / zoom / auto-fit viewBox ─────────────────────────────────────────────
    let svgEl = $state<SVGSVGElement>();
    let wrapEl = $state<HTMLDivElement>();
    let view = $state({ x: -160, y: -90, w: 320, h: 300 });
    const viewBox = $derived(`${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`);
    let userMoved = $state(false); // once the user pans/zooms, stop auto-fitting

    let vbRaf = 0;
    function tweenView(target: typeof view, duration = 650) {
        cancelAnimationFrame(vbRaf);
        const s = { ...view };
        const t0 = performance.now();
        const ease = (k: number) => 1 - Math.pow(1 - k, 3);
        const step = (now: number) => {
            const k = Math.min(1, (now - t0) / duration);
            const e = ease(k);
            view.x = s.x + (target.x - s.x) * e;
            view.y = s.y + (target.y - s.y) * e;
            view.w = s.w + (target.w - s.w) * e;
            view.h = s.h + (target.h - s.h) * e;
            if (k < 1) vbRaf = requestAnimationFrame(step);
        };
        vbRaf = requestAnimationFrame(step);
    }

    /** Frame all currently-visible roots (plus the sprout) into the viewport. */
    function fit(animate: boolean) {
        if (!svgEl) return;
        let minX = -28,
            minY = Math.min(-46, plant.stemTop - 16), // include the (possibly tall) plant
            maxX = 28,
            maxY = 12; // seed the box with the sprout
        for (const s of visible) {
            minX = Math.min(minX, s.x1, s.x2, s.cx);
            maxX = Math.max(maxX, s.x1, s.x2, s.cx);
            minY = Math.min(minY, s.y1, s.y2, s.cy);
            maxY = Math.max(maxY, s.y1, s.y2, s.cy);
        }
        const bw = maxX - minX,
            bh = maxY - minY;
        const pad = Math.max(bw, bh) * 0.16 + 18;
        const cx = (minX + maxX) / 2,
            cy = (minY + maxY) / 2;
        const r = svgEl.getBoundingClientRect();
        const aspect = r.width / Math.max(1, r.height);
        let w = bw + pad * 2,
            h = bh + pad * 2;
        if (w / h > aspect) h = w / aspect;
        else w = h * aspect;
        const target = { x: cx - w / 2, y: cy - h / 2, w, h };
        if (animate) tweenView(target);
        else view = target;
    }

    // Auto-fit whenever the system grows or is regenerated — unless the user took over.
    // Deps are tracked transitively: the `!svgEl` guard reads svgEl, and fit()
    // reads `visible` (← segments / growth / growthByActivity), so this re-runs as
    // the system grows, including optimistic per-habit bumps.
    let settled = false;
    $effect(() => {
        if (!svgEl) return;
        if (!userMoved) fit(settled); // snap on first layout, animate thereafter
        settled = true;
    });

    // Wheel-zoom, drag-pan, and refit-on-resize. Attached imperatively so the wheel
    // listener can be non-passive (needed to preventDefault the page scroll).
    $effect(() => {
        const el = svgEl;
        if (!el || !interactive) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            userMoved = true;
            const r = el.getBoundingClientRect();
            const mx = view.x + ((e.clientX - r.left) / r.width) * view.w;
            const my = view.y + ((e.clientY - r.top) / r.height) * view.h;
            const f = e.deltaY > 0 ? 1.12 : 0.89;
            const ratio = Math.min(Math.max(view.w * f, 40), 4000) / view.w;
            view.x = mx - (mx - view.x) * ratio;
            view.y = my - (my - view.y) * ratio;
            view.w *= ratio;
            view.h *= ratio;
        };

        let dragging = false,
            lx = 0,
            ly = 0;
        const onDown = (e: PointerEvent) => {
            dragging = true;
            userMoved = true;
            lx = e.clientX;
            ly = e.clientY;
            el.setPointerCapture(e.pointerId);
        };
        const onMove = (e: PointerEvent) => {
            if (!dragging) return;
            const r = el.getBoundingClientRect();
            view.x -= ((e.clientX - lx) / r.width) * view.w;
            view.y -= ((e.clientY - ly) / r.height) * view.h;
            lx = e.clientX;
            ly = e.clientY;
        };
        const onUp = () => (dragging = false);
        const onResize = () => {
            if (!userMoved) fit(false);
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
        window.addEventListener('resize', onResize);
        return () => {
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointercancel', onUp);
            window.removeEventListener('resize', onResize);
        };
    });

    /** Re-center on all roots. Call from a "Fit" button via bind:this. */
    export function fitToView() {
        userMoved = false;
        fit(true);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="root-system" bind:this={wrapEl} onmousemove={trackMouse}>
    <svg bind:this={svgEl} {viewBox} class:static-view={!interactive} preserveAspectRatio="xMidYMid meet">
        <defs>
            <!-- Cheap soft glow for root tips (a radial gradient, NOT an animated
                 SVG blur filter — the latter re-rasters every frame and pegs CPU). -->
            <radialGradient id="rs-tipglow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#a9e08a" stop-opacity="0.55" />
                <stop offset="100%" stop-color="#a9e08a" stop-opacity="0" />
            </radialGradient>
            <filter id="rs-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="1.1" stdDeviation="0.9" flood-color="#000" flood-opacity="0.45" />
            </filter>
            <radialGradient id="rs-leaf" cx="35%" cy="30%" r="80%">
                <stop offset="0%" stop-color="#bfe39a" />
                <stop offset="100%" stop-color="#6f9e54" />
            </radialGradient>
        </defs>

        {#if sprout}
            <!-- Above-ground plant: one leaf per earned milestone (hover to inspect). -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <g class="sprout" onmouseleave={() => (hoveredLeaf = null)}>
                <line class="ground" x1="-70" y1="0" x2="70" y2="0" />
                <path class="stem" d="M0 0 Q -2 {(plant.stemTop * 0.5).toFixed(1)} 0 {plant.stemTop.toFixed(1)}" />
                {#each plant.leaves as lf (lf.badge.id)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <path
                        class="leaf"
                        class:hl={hoveredLeaf?.id === lf.badge.id}
                        d={LEAF_PATH}
                        fill="url(#rs-leaf)"
                        transform="translate(0 {lf.y.toFixed(1)}) scale({(lf.side * lf.scale).toFixed(2)} {lf.scale.toFixed(
                            2
                        )}) rotate({lf.rot.toFixed(0)})"
                        onmouseenter={() => (hoveredLeaf = lf.badge)}
                        transition:fade={{ duration: 400 }}
                    />
                {/each}
                <circle class="crown" cx="0" cy="0" r="3.4" />
            </g>
        {/if}

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <g class="roots" class:focusing={hovered} class:inert={!interactive} filter="url(#rs-shadow)" onmouseleave={() => (hovered = null)}>
            {#each visible as seg (seg.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <path
                    d={pathOf(seg)}
                    class="root depth-{seg.depth}"
                    class:hl={hovered?.rootId === seg.rootId}
                    style:stroke={strokeFor(seg)}
                    style:stroke-width="{(seg.baseWidth * maturity).toFixed(2)}px"
                    onmouseenter={() => (hovered = seg)}
                    onclick={() => onselect?.(seg.activityId, seg.depth)}
                    transition:draw={{ duration: 520, delay: seg.depth * 80, easing: cubicOut }}
                />
            {/each}
        </g>

        <g class="tips">
            {#each tips as t (t.rootId)}
                <g class="tip">
                    <circle class="halo" cx={t.x2} cy={t.y2} r={(4.6 - t.depth * 0.6).toFixed(2)} fill="url(#rs-tipglow)" />
                    <circle class="core" cx={t.x2} cy={t.y2} r={(1.5 - t.depth * 0.25).toFixed(2)} />
                </g>
            {/each}
        </g>
    </svg>

    {#if tip}
        <div class="tooltip" style:left="{Math.min(mouse.x + 14, (wrapEl?.clientWidth ?? 9999) - 220)}px" style:top="{mouse.y + 14}px">
            <div class="t-name">{tip.name}</div>
            {#if tip.meta}<div class="t-meta">{tip.meta}</div>{/if}
        </div>
    {/if}
</div>

<style>
    /* Designed for a dark "soil" background — the parent supplies that.
	   Retheme by overriding these custom properties from the parent. */
    .root-system {
        position: relative;
        width: 100%;
        height: 100%;
        --root-0: #d2a067;
        --root-1: #cd9a61;
        --root-2: #c69463;
        --root-3: #c1936a;
        --tip: #cfe7a0;
        --tip-glow: #a9e08a;
    }

    svg {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
        cursor: grab;
    }
    svg:active {
        cursor: grabbing;
    }
    /* Static preview (dashboard widget): no grab cursor, no root hit-testing —
	   clicks fall through to the parent (e.g. an "expand" link). */
    svg.static-view {
        cursor: pointer;
    }
    .roots.inert .root {
        pointer-events: none;
        cursor: inherit;
    }

    .ground {
        stroke: rgba(243, 233, 218, 0.16);
        stroke-width: 0.8;
        stroke-dasharray: 2 4;
    }
    .stem {
        fill: none;
        stroke: #8a6a3e;
        stroke-width: 3;
        stroke-linecap: round;
        transition: d 0.6s ease;
    }
    .crown {
        fill: #8a6a3e;
    }
    .leaf {
        stroke: #5f8a48;
        stroke-width: 0.4;
        cursor: pointer;
        transition: filter 0.18s ease;
    }
    .leaf.hl {
        filter: brightness(1.18) saturate(1.12) drop-shadow(0 0 2px rgba(169, 224, 138, 0.7));
    }

    .root {
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        pointer-events: stroke;
        cursor: pointer;
        /* maturity thickening + hover fade animate smoothly */
        transition:
            stroke-width 0.8s ease,
            opacity 0.22s ease;
    }
    .depth-0 {
        stroke: var(--root-0);
    }
    .depth-1 {
        stroke: var(--root-1);
    }
    .depth-2 {
        stroke: var(--root-2);
    }
    .depth-3 {
        stroke: var(--root-3);
    }

    /* hovering a root dims the rest and highlights its siblings */
    .roots.focusing .root {
        opacity: 0.28;
    }
    .roots.focusing .root.hl {
        opacity: 1;
        filter: brightness(1.28) saturate(1.1);
    }

    .tip {
        pointer-events: none;
    }
    .tip .core {
        fill: var(--tip);
    }
    /* Static soft glow from the radial-gradient fill. Deliberately NOT animated:
       a continuous pulse re-rasters the SVG every frame (idle CPU). */
    .tip .halo {
        opacity: 0.8;
    }

    .tooltip {
        position: absolute;
        z-index: 5;
        pointer-events: none;
        max-width: 220px;
        padding: 9px 12px;
        border-radius: 12px;
        line-height: 1.35;
        background: rgba(28, 22, 16, 0.62);
        border: 1px solid rgba(243, 233, 218, 0.14);
        backdrop-filter: blur(10px);
        color: #f3e9da;
        font-size: 12.5px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .t-name {
        font-weight: 600;
    }
    .t-meta {
        color: #c9bba6;
        font-size: 11.5px;
        margin-top: 2px;
    }
</style>
