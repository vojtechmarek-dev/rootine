<script lang="ts">
    import { fade, fly } from 'svelte/transition';
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
        /**
         * Focus & celebrate: when set, the camera frames just this activity's
         * branch (instead of the whole plant) and its tip flashes.
         */
        highlightActivityId?: string | null;
        /** Growth value at which roots reach full thickness. */
        maxGrowth?: number;
        /** Map a hovered segment to tooltip text. Default = generic depth labels. */
        describe?: (seg: Segment) => { name: string; meta?: string };
        /**
         * Scaffold for a future "open habit" interaction — currently nothing
         * passes a handler, so clicking a root is a no-op.
         */
        onselect?: (activityId: string | null, depth: number) => void;
        /** Draw the little above-ground sprout at the origin. */
        sprout?: boolean;
        /** Enable wheel-zoom / drag-pan / hover. Off for static previews. */
        interactive?: boolean;
        /** Stable seed for the decorative soil scatter (stones, specks, tufts). */
        seed?: number;
    }

    let {
        segments,
        growth = 4,
        growthByActivity,
        leaves = [],
        highlightActivityId = null,
        maxGrowth = 60,
        describe = (s) => ({ name: s.depth === 0 ? 'Your foundation' : 'Tap Root', meta: DEPTH_LABEL[s.depth] }),
        onselect,
        sprout = true,
        interactive = true,
        seed = 1,
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

    // ── only draw NEWLY-grown segments ───────────────────────────────────────────
    // The plant is a persistent organism — re-drawing it from scratch on every
    // visit reads as "temporary". We snapshot how much each root had grown last
    // visit (localStorage); only segments revealed SINCE then animate in. The very
    // first visit ever draws the whole plant (satisfying); after that it's stable.
    const SEEN_KEY = 'rootine.garden.seen.v1';
    type Seen = { a: Record<string, number>; t: number };
    function readSeen(): Seen | null {
        try {
            const raw = localStorage.getItem(SEEN_KEY);
            return raw ? (JSON.parse(raw) as Seen) : null;
        } catch {
            return null;
        }
    }
    // Captured ONCE at init (client-side; ssr=false) -> stays fixed for this view.
    const seenSnapshot = readSeen();

    function isNewlyGrown(seg: Segment): boolean {
        // legacy single-plant: no per-segment diff
        if (!growthByActivity) return false;

        // first ever visit → full draw
        if (!seenSnapshot) return true;

        // taproot: reveal only the tail grown since last visit
        if (seg.activityId == null) {
            return seg.born > (seenSnapshot.t ?? 0) && seg.born <= taprootReveal;
        }

        const prev = seenSnapshot.a?.[seg.activityId] ?? 0;
        const grown = growthByActivity[seg.activityId] ?? 0;

        // highlighted branch: reveal unseen growth; if all already seen, always
        // re-grow the outermost tip so the focus/celebrate animation still plays.
        if (highlightActivityId && seg.activityId === highlightActivityId) {
            if (grown > prev) return seg.born > prev && seg.born <= grown;
            return flashTip != null && seg.born === flashTip.born;
        }

        // other branches: reveal only segments grown since last visit
        return seg.born > prev && seg.born <= grown;
    }

    // Persist the current reveal so the NEXT visit only animates newer growth.
    $effect(() => {
        if (!growthByActivity) return;
        try {
            localStorage.setItem(SEEN_KEY, JSON.stringify({ a: { ...growthByActivity }, t: taprootReveal }));
        } catch {
            /* storage unavailable — fine, we just lose the diff */
        }
    });

    // Focus & celebrate: the outermost revealed tip of the highlighted activity.
    const flashTip = $derived.by(() => {
        if (!highlightActivityId) return null;
        let best: Segment | null = null;
        for (const s of visible) {
            if (s.activityId !== highlightActivityId) continue;
            if (!best || s.born > best.born) best = s;
        }
        return best;
    });

    // Sequence the celebrate: let the branch draw-grow first, THEN show the blink.
    // Roughly the longest segment draw (520ms + depth stagger). Without this the
    // ring would pulse over a still-growing root.
    const GROW_MS = 900;
    let flashOn = $state(false);
    $effect(() => {
        flashOn = false;
        if (!highlightActivityId || !flashTip) return;
        const t = setTimeout(() => (flashOn = true), GROW_MS);
        return () => clearTimeout(t);
    });

    // ── per-habit tinting ─────────────────────────────────────────────────────
    // The roots and tips keep the earthy brown palette (CSS) so the garden
    // always reads organic even with many habits — the activity colour only
    // tints the focus flash ring, where it's a brief accent on one branch.
    // Legacy colour tokens map to hex here; new activities already store hex.
    const HABIT_BASE: Record<string, string> = {
        emerald: '#5fae6e',
        blue: '#5b93d6',
        violet: '#9a7bd0',
        amber: '#d6a24e',
        rose: '#d678a0',
    };

    /** Resolve a segment's colour (token or hex) to a flash accent hex, or undefined for the default glow. */
    function accentHex(token: string | undefined): string | undefined {
        if (!token || token === 'zinc') return undefined;
        return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(token) ? token : HABIT_BASE[token];
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

    // ── scenery: soil dressing + sky band ────────────────────────────────────────
    // World-fixed decoration so it pans/zooms with the roots: a sky rect above the
    // surface, a soil rect below, seeded stones/specks in the dirt, a soft surface
    // line with sparse grass tufts. All static + pointer-events:none (no idle cost).
    function mulberry32(a: number) {
        return () => {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const scenery = $derived.by(() => {
        const rnd = mulberry32(Math.imul(seed, 2654435761) >>> 0 || 1);
        const stones = Array.from({ length: 26 }, () => ({
            x: -150 + rnd() * 300,
            y: 12 + rnd() * 250,
            rx: 1.2 + rnd() * 2.6,
            ry: 0.8 + rnd() * 1.5,
            rot: rnd() * 180,
            o: 0.06 + rnd() * 0.1,
        }));
        const specks = Array.from({ length: 64 }, () => ({
            x: -160 + rnd() * 320,
            y: 6 + rnd() * 270,
            r: 0.25 + rnd() * 0.55,
            o: 0.05 + rnd() * 0.09,
        }));
        // Grass tufts along the surface; keep clear of the stem at the origin.
        const tufts = Array.from({ length: 12 }, (_, i) => ({
            x: -88 + i * 16 + (rnd() * 8 - 4),
            h: 2.5 + rnd() * 2.5,
            lean: rnd() * 2 - 1,
        })).filter((t) => Math.abs(t.x) > 9);
        return { stones, specks, tufts };
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

    /**
     * Frame the viewport. With `focusActivityId`, frames just that activity's
     * branch (zoom & pan to the newly-grown root); otherwise frames the whole
     * plant + sprout.
     */
    function fit(animate: boolean, focusActivityId?: string | null) {
        if (!svgEl) return;
        const focusSegs = focusActivityId ? visible.filter((s) => s.activityId === focusActivityId) : [];
        const useFocus = focusSegs.length > 0;
        const src = useFocus ? focusSegs : visible;

        // Focus: tight box around the branch. Otherwise seed with the sprout.
        let minX = useFocus ? Infinity : -28;
        let minY = useFocus ? Infinity : Math.min(-46, plant.stemTop - 16);
        let maxX = useFocus ? -Infinity : 28;
        let maxY = useFocus ? -Infinity : 12;
        for (const s of src) {
            minX = Math.min(minX, s.x1, s.x2, s.cx);
            maxX = Math.max(maxX, s.x1, s.x2, s.cx);
            minY = Math.min(minY, s.y1, s.y2, s.cy);
            maxY = Math.max(maxY, s.y1, s.y2, s.cy);
        }
        if (!Number.isFinite(minX)) return; // nothing to frame

        const bw = maxX - minX,
            bh = maxY - minY;
        const pad = Math.max(bw, bh) * (useFocus ? 0.4 : 0.16) + (useFocus ? 12 : 18);
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

    // Auto-fit whenever the system grows or is regenerated — unless the user took
    // over. When a highlight is set, frame that branch (focus & celebrate).
    // Deps are tracked transitively: the `!svgEl` guard reads svgEl, and fit()
    // reads `visible` (← segments / growth / growthByActivity).
    let settled = false;
    $effect(() => {
        if (!svgEl) return;
        if (!userMoved) fit(settled, highlightActivityId); // snap on first layout, animate thereafter
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

        // Multi-pointer aware: 1 pointer = pan, 2 pointers = pinch-zoom + pan.
        // Plain Map — imperative event bookkeeping, not reactive state.
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const pointers = new Map<number, { x: number; y: number }>();
        let lastX = 0,
            lastY = 0;
        let pinchPrev: { dist: number; cx: number; cy: number } | null = null;

        const pinchState = () => {
            const [a, b] = [...pointers.values()];
            return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        };

        const onDown = (e: PointerEvent) => {
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            userMoved = true;
            el.setPointerCapture(e.pointerId);
            if (pointers.size === 1) {
                lastX = e.clientX;
                lastY = e.clientY;
            } else if (pointers.size === 2) {
                pinchPrev = pinchState();
            }
        };
        const onMove = (e: PointerEvent) => {
            if (!pointers.has(e.pointerId)) return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const r = el.getBoundingClientRect();

            if (pointers.size >= 2) {
                const ps = pinchState();
                if (pinchPrev && ps.dist > 0) {
                    // Zoom around the pinch midpoint (in world coords).
                    const mx = view.x + ((ps.cx - r.left) / r.width) * view.w;
                    const my = view.y + ((ps.cy - r.top) / r.height) * view.h;
                    const nw = Math.min(Math.max(view.w * (pinchPrev.dist / ps.dist), 40), 4000);
                    const ratio = nw / view.w;
                    view.x = mx - (mx - view.x) * ratio;
                    view.y = my - (my - view.y) * ratio;
                    view.w *= ratio;
                    view.h *= ratio;
                    // Pan by the midpoint's movement (two-finger drag).
                    view.x -= ((ps.cx - pinchPrev.cx) / r.width) * view.w;
                    view.y -= ((ps.cy - pinchPrev.cy) / r.height) * view.h;
                }
                pinchPrev = ps;
            } else if (pointers.size === 1) {
                view.x -= ((e.clientX - lastX) / r.width) * view.w;
                view.y -= ((e.clientY - lastY) / r.height) * view.h;
                lastX = e.clientX;
                lastY = e.clientY;
            }
        };
        const onUp = (e: PointerEvent) => {
            pointers.delete(e.pointerId);
            pinchPrev = null;
            // Drop to one finger → resume panning from it without a jump.
            if (pointers.size === 1) {
                const [p] = pointers.values();
                lastX = p.x;
                lastY = p.y;
            }
        };
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
                <stop offset="0%" style="stop-color: var(--tip-glow); stop-opacity: 0.55" />
                <stop offset="100%" style="stop-color: var(--tip-glow); stop-opacity: 0" />
            </radialGradient>
            <filter id="rs-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow
                    dx="0"
                    dy="1.1"
                    stdDeviation="0.9"
                    style="flood-color: var(--rs-shadow-color); flood-opacity: var(--rs-shadow-opacity)"
                />
            </filter>
            <radialGradient id="rs-leaf" cx="35%" cy="30%" r="80%">
                <stop offset="0%" style="stop-color: var(--rs-leaf-top)" />
                <stop offset="100%" style="stop-color: var(--rs-leaf-bottom)" />
            </radialGradient>
            <!-- World-fixed (userSpaceOnUse) so the horizon stays at y=0 while
                 panning/zooming. Pad spread clamps beyond the stop range. -->
            <linearGradient id="rs-sky" x1="0" y1="-420" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" style="stop-color: var(--rs-sky-top)" />
                <stop offset="100%" style="stop-color: var(--rs-sky-bottom)" />
            </linearGradient>
            <linearGradient id="rs-soil" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse">
                <stop offset="0%" style="stop-color: var(--rs-soil-top)" />
                <stop offset="100%" style="stop-color: var(--rs-soil-bottom)" />
            </linearGradient>
        </defs>

        <!-- Scenery: sky above the surface, soil with seeded stones + specks below,
             a soft surface line and sparse grass tufts at the horizon. -->
        <g class="scenery" aria-hidden="true">
            <rect x="-5000" y="-5000" width="10000" height="5000" fill="url(#rs-sky)" />
            <rect x="-5000" y="0" width="10000" height="5000" fill="url(#rs-soil)" />
            {#each scenery.specks as p, i (i)}
                <circle class="speck" cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(2)} style:opacity={p.o.toFixed(2)} />
            {/each}
            {#each scenery.stones as st, i (i)}
                <ellipse
                    class="stone"
                    cx={st.x.toFixed(1)}
                    cy={st.y.toFixed(1)}
                    rx={st.rx.toFixed(2)}
                    ry={st.ry.toFixed(2)}
                    transform="rotate({st.rot.toFixed(0)} {st.x.toFixed(1)} {st.y.toFixed(1)})"
                    style:opacity={st.o.toFixed(2)}
                />
            {/each}
            <path class="surface" d="M-340 0 Q -300 -1.3 -260 0 T -180 0 T -100 0 T -20 0 T 60 0 T 140 0 T 220 0 T 300 0 T 380 0" />
            {#each scenery.tufts as t, i (i)}
                <path
                    class="tuft"
                    d="M{t.x.toFixed(1)} 0 q {t.lean.toFixed(1)} {(-t.h).toFixed(1)} {(t.lean * 2).toFixed(1)} {(-t.h * 1.6).toFixed(1)}"
                />
            {/each}
        </g>

        {#if sprout}
            <!-- Above-ground plant: one leaf per earned milestone (hover to inspect). -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <g class="sprout" onmouseleave={() => (hoveredLeaf = null)}>
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

        <!-- `animate` newly-grown segments draw in via a CSS stroke-dashoffset
             sweep (pathLength=1 normalizes every segment). CSS animations run on
             element creation regardless of Svelte intro suppression, so this fires
             on initial mount, reveal, completion-growth and highlight alike. -->
        {#snippet rootPath(seg: Segment, animate: boolean)}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <path
                d={pathOf(seg)}
                pathLength="1"
                class="root depth-{seg.depth}"
                class:hl={hovered != null &&
                    (hovered.activityId != null ? seg.activityId === hovered.activityId : seg.rootId === hovered.rootId)}
                class:grow={animate}
                style:stroke-width="{(seg.baseWidth * maturity).toFixed(2)}px"
                style:animation-delay={animate ? `${(seg.depth * 0.08).toFixed(2)}s` : undefined}
                onmouseenter={() => (hovered = seg)}
                onclick={() => onselect?.(seg.activityId, seg.depth)}
            />
        {/snippet}

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <g class="roots" class:focusing={hovered} class:inert={!interactive} filter="url(#rs-shadow)" onmouseleave={() => (hovered = null)}>
            {#each visible as seg (seg.id)}
                {@render rootPath(seg, isNewlyGrown(seg))}
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

        <!-- Focus & celebrate: a finite ring flash at the highlighted branch's tip,
             shown only after the branch has finished growing (flashOn). -->
        {#if flashTip && flashOn}
            <g class="flash">
                <circle class="flash-ring" cx={flashTip.x2} cy={flashTip.y2} r="5" style:stroke={accentHex(flashTip.color)} />
            </g>
        {/if}
    </svg>

    {#if tip}
        <!-- Desktop: floats at the cursor. Touch (coarse pointer): CSS docks it as a
             bottom sheet (see @media below). The slide-up reads well in both. -->
        <div
            class="tooltip"
            style:left="{Math.min(mouse.x + 14, (wrapEl?.clientWidth ?? 9999) - 220)}px"
            style:top="{mouse.y + 14}px"
            transition:fly={{ y: 10, duration: 160, easing: cubicOut }}
        >
            <div class="t-name">{tip.name}</div>
            {#if tip.meta}<div class="t-meta">{tip.meta}</div>{/if}
        </div>
    {/if}
</div>

<style>
    /* The garden carries its own themed palette so it reads as a daylight garden
       in light mode and lamp-lit soil in dark mode. Light is the default; the
       .dark (or [data-mode='dark']) override below restores the original
       dark-soil look. Roots stay DARKER than the soil in light mode and lighter
       in dark mode, so they always have contrast against it. */
    .root-system {
        position: relative;
        width: 100%;
        height: 100%;

        /* sky band (above the surface) + soil (below). A clean warm white fading
           to the app's cream background at the horizon — bright, neutral, never
           cold against the tan soil. */
        --rs-sky-top: #fcfbf8;
        --rs-sky-bottom: #f4f1ea;
        --rs-soil-top: #e7dcc6;
        --rs-soil-bottom: #d2c3a6;

        /* roots, by depth (taproot strongest) — dark on the light soil */
        --root-0: #5f4327;
        --root-1: #6b4d2e;
        --root-2: #775836;
        --root-3: #846640;

        /* growing tips — a medium sage, between dark mode's bright tip and a deep
           green, so it reads as growth on the light soil without glaring */
        --tip: #7fa977;
        --tip-glow: #8cc78b;

        /* above-ground plant */
        --rs-stem: #6b4a2a;
        --rs-crown: #6b4a2a;
        --rs-leaf-top: #9fca77;
        --rs-leaf-bottom: #4f7d3a;
        --rs-leaf-stroke: #4f7d3a;

        /* soil dressing — dark enough to read as flecks/pebbles on the light soil
           (the per-element opacity from the generator is only 0.05–0.16). */
        --rs-speck: #6a5230;
        --rs-stone: #7c6541;
        --rs-surface: rgb(95 74 42 / 0.22);
        --rs-tuft: #5f8a48;

        /* root drop shadow — softer + warmer on light soil */
        --rs-shadow-color: #3a2a18;
        --rs-shadow-opacity: 0.18;

        /* hover tooltip */
        --rs-tooltip-bg: rgb(247 243 235 / 0.78);
        --rs-tooltip-border: rgb(19 36 27 / 0.12);
        --rs-tooltip-fg: #13241b;
        --rs-tooltip-meta: #5c6a5e;
    }

    /* Dark mode: the original lamp-lit soil palette (look unchanged). */
    :global(.dark) .root-system,
    :global([data-mode='dark']) .root-system {
        --rs-sky-top: #0f1a13;
        --rs-sky-bottom: #1c2b20;
        --rs-soil-top: #2a2118;
        --rs-soil-bottom: #120c06;

        --root-0: #d2a067;
        --root-1: #cd9a61;
        --root-2: #c69463;
        --root-3: #c1936a;

        --tip: #cfe7a0;
        --tip-glow: #a9e08a;

        --rs-stem: #8a6a3e;
        --rs-crown: #8a6a3e;
        --rs-leaf-top: #bfe39a;
        --rs-leaf-bottom: #6f9e54;
        --rs-leaf-stroke: #5f8a48;

        --rs-speck: #d2a067;
        --rs-stone: #c9b08e;
        --rs-surface: rgb(214 196 166 / 0.22);
        --rs-tuft: #5f8a48;

        --rs-shadow-color: #000000;
        --rs-shadow-opacity: 0.45;

        --rs-tooltip-bg: rgb(28 22 16 / 0.62);
        --rs-tooltip-border: rgb(243 233 218 / 0.14);
        --rs-tooltip-fg: #f3e9da;
        --rs-tooltip-meta: #c9bba6;
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

    .scenery {
        pointer-events: none;
    }
    .scenery .speck {
        fill: var(--rs-speck);
    }
    .scenery .stone {
        fill: var(--rs-stone);
    }
    .scenery .surface {
        fill: none;
        stroke: var(--rs-surface);
        stroke-width: 0.9;
        stroke-linecap: round;
    }
    .scenery .tuft {
        fill: none;
        stroke: var(--rs-tuft);
        stroke-width: 0.7;
        stroke-linecap: round;
        opacity: 0.55;
    }
    .stem {
        fill: none;
        stroke: var(--rs-stem);
        stroke-width: 3;
        stroke-linecap: round;
        transition: d 0.6s ease;
    }
    .crown {
        fill: var(--rs-crown);
    }
    .leaf {
        stroke: var(--rs-leaf-stroke);
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
        /* maturity thickening + hover fade animate smoothly */
        transition:
            stroke-width 0.8s ease,
            opacity 0.22s ease;
    }
    /* Newly-grown segments draw in via a normalized stroke-dashoffset sweep
       (path has pathLength=1). A CSS animation — not a Svelte intro — so it runs
       whenever the path element is created: initial mount, reveal, completion
       growth, or highlight. `both` holds it hidden through the stagger delay. */
    .root.grow {
        stroke-dasharray: 1;
        animation: rs-grow 0.55s ease-out both;
    }
    @keyframes rs-grow {
        from {
            stroke-dashoffset: 1;
        }
        to {
            stroke-dashoffset: 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .root.grow {
            animation-duration: 0.01s;
        }
    }
    /* Visual hierarchy on the dark soil: the taproot is strongest; finer roots
       fade softly into the background as depth increases. */
    .depth-0 {
        stroke: var(--root-0);
        opacity: 1;
    }
    .depth-1 {
        stroke: var(--root-1);
        opacity: 0.86;
    }
    .depth-2 {
        stroke: var(--root-2);
        opacity: 0.7;
    }
    .depth-3 {
        stroke: var(--root-3);
        opacity: 0.52;
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

    /* Focus & celebrate flash — FINITE (4 pulses then stops), so no idle CPU. */
    .flash {
        pointer-events: none;
    }
    .flash-ring {
        fill: none;
        stroke: var(--tip-glow);
        stroke-width: 1.5;
        transform-box: fill-box;
        transform-origin: center;
        animation: rs-flash 0.7s ease-out 4 forwards;
    }
    @keyframes rs-flash {
        0% {
            transform: scale(0.4);
            opacity: 0.95;
            stroke-width: 2.2;
        }
        100% {
            transform: scale(2.8);
            opacity: 0;
            stroke-width: 0.3;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .flash-ring {
            animation: none;
            opacity: 0;
        }
    }

    .tooltip {
        position: absolute;
        z-index: 5;
        pointer-events: none;
        max-width: 220px;
        padding: 9px 12px;
        border-radius: 12px;
        line-height: 1.35;
        background: var(--rs-tooltip-bg);
        border: 1px solid var(--rs-tooltip-border);
        backdrop-filter: blur(10px);
        color: var(--rs-tooltip-fg);
        font-size: 12.5px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .t-name {
        font-weight: 600;
    }
    .t-meta {
        color: var(--rs-tooltip-meta);
        font-size: 11.5px;
        margin-top: 2px;
    }

    /* Touch / coarse-pointer devices: a cursor-following tooltip is fiddly, so dock
       it as a full-width card at the bottom of the view (overrides the inline
       left/top via !important). Dismiss by tapping empty space. */
    @media (hover: none) and (pointer: coarse) {
        .tooltip {
            left: 0.75rem !important;
            right: 0.75rem;
            top: auto !important;
            /* Clear the fixed bottom nav (+ device safe-area) so the inspect card
               isn't hidden behind it on touch devices. */
            bottom: calc(env(safe-area-inset-bottom, 0px) + 4.5rem) !important;
            max-width: none;
            padding: 12px 16px;
            font-size: 14px;
            border-radius: 16px;
        }
        .t-name {
            font-size: 15px;
        }
        .t-meta {
            font-size: 12.5px;
        }
    }
</style>
