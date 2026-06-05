<script lang="ts">
	import { draw } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { type Segment, pathOf } from '$lib/roots';

	const DEPTH_LABEL = ['Taproot', 'Main root', 'Offshoot', 'Fine root'];

	interface Props {
		/** All segments from generateRootSystem(). */
		segments: Segment[];
		/** Current growth level. Drive this from habit data (e.g. total completions). */
		growth?: number;
		/** Growth value at which roots reach full thickness. */
		maxGrowth?: number;
		/** Map a hovered segment to tooltip text. Default = generic depth labels. */
		describe?: (seg: Segment) => { name: string; meta?: string };
		/** Fired when a root is clicked — e.g. open that habit. */
		onselect?: (rootId: string, depth: number) => void;
		/** Draw the little above-ground sprout at the origin. */
		sprout?: boolean;
		/** Enable wheel-zoom / drag-pan / hover. Off for static previews. */
		interactive?: boolean;
	}

	let {
		segments,
		growth = 4,
		maxGrowth = 60,
		describe = (s) => ({ name: s.depth === 0 ? 'Your foundation' : 'Root', meta: DEPTH_LABEL[s.depth] }),
		onselect,
		sprout = true,
		interactive = true
	}: Props = $props();

	// ── derived view of the system ──────────────────────────────────────────────
	// Reveal everything born up to the current growth. Because generation is
	// deterministic, raising growth only *adds* paths — Svelte then plays the
	// draw-in transition on each new one. (Svelte skips intros for the initial
	// set, so the starting roots appear instantly; every growth step after draws in.)
	const visible = $derived(segments.filter((s) => s.born <= growth));

	// Roots thicken as habits strengthen.
	const maturity = $derived(1 + (Math.min(growth, maxGrowth) / maxGrowth) * 0.5);

	// Glowing dots on roots that still have hidden segments (i.e. are still growing).
	const tips = $derived.by(() => {
		const last = new Map<string, Segment>();
		const growing = new Set<string>();
		for (const s of segments) {
			if (s.born <= growth) last.set(s.rootId, s);
			else growing.add(s.rootId);
		}
		const out: Segment[] = [];
		for (const [id, s] of last) if (growing.has(id)) out.push(s);
		return out.slice(0, 28);
	});

	// ── hover / inspect ─────────────────────────────────────────────────────────
	let hovered = $state<Segment | null>(null);
	let mouse = $state({ x: 0, y: 0 });
	const tip = $derived(hovered ? describe(hovered) : null);

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
		let minX = -22, minY = -46, maxX = 22, maxY = 12; // seed the box with the sprout
		for (const s of visible) {
			minX = Math.min(minX, s.x1, s.x2, s.cx);
			maxX = Math.max(maxX, s.x1, s.x2, s.cx);
			minY = Math.min(minY, s.y1, s.y2, s.cy);
			maxY = Math.max(maxY, s.y1, s.y2, s.cy);
		}
		const bw = maxX - minX, bh = maxY - minY;
		const pad = Math.max(bw, bh) * 0.16 + 18;
		const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
		const r = svgEl.getBoundingClientRect();
		const aspect = r.width / Math.max(1, r.height);
		let w = bw + pad * 2, h = bh + pad * 2;
		if (w / h > aspect) h = w / aspect;
		else w = h * aspect;
		const target = { x: cx - w / 2, y: cy - h / 2, w, h };
		if (animate) tweenView(target);
		else view = target;
	}

	// Auto-fit whenever the system grows or is regenerated — unless the user took over.
	let settled = false;
	$effect(() => {
		growth; // eslint-disable-line -- track so this re-runs as the system grows
		segments;
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

		let dragging = false, lx = 0, ly = 0;
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

<!-- svelte-ignore a11y_no_static_element_interactions a11y_mouse_events_have_key_events -->
<div class="root-system" bind:this={wrapEl} onmousemove={trackMouse}>
	<svg bind:this={svgEl} {viewBox} class:static-view={!interactive} preserveAspectRatio="xMidYMid meet">
		<defs>
			<filter id="rs-glow" x="-80%" y="-80%" width="260%" height="260%">
				<feGaussianBlur stdDeviation="3" result="b" />
				<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
			</filter>
			<filter id="rs-shadow" x="-30%" y="-30%" width="160%" height="160%">
				<feDropShadow dx="0" dy="1.1" stdDeviation="0.9" flood-color="#000" flood-opacity="0.45" />
			</filter>
			<radialGradient id="rs-leaf" cx="35%" cy="30%" r="80%">
				<stop offset="0%" stop-color="#bfe39a" />
				<stop offset="100%" stop-color="#6f9e54" />
			</radialGradient>
		</defs>

		{#if sprout}
			<!-- The above-ground reward: roots below feed the visible plant above. -->
			<g class="sprout">
				<line class="ground" x1="-70" y1="0" x2="70" y2="0" />
				<path class="stem" d="M0 0 Q -2 -20 0 -40" />
				<path d="M0 -28 Q -16 -34 -20 -20 Q -6 -20 0 -28 Z" fill="url(#rs-leaf)" />
				<path d="M0 -36 Q 15 -44 20 -30 Q 6 -29 0 -36 Z" fill="url(#rs-leaf)" />
				<circle class="crown" cx="0" cy="0" r="3.4" />
			</g>
		{/if}

		<!-- svelte-ignore a11y_no_static_element_interactions a11y_mouse_events_have_key_events -->
		<g class="roots" class:focusing={hovered} class:inert={!interactive} filter="url(#rs-shadow)" onmouseleave={() => (hovered = null)}>
			{#each visible as seg (seg.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_mouse_events_have_key_events -->
				<path
					d={pathOf(seg)}
					class="root depth-{seg.depth}"
					class:hl={hovered?.rootId === seg.rootId}
					style:stroke-width="{(seg.baseWidth * maturity).toFixed(2)}px"
					onmouseenter={() => (hovered = seg)}
					onclick={() => onselect?.(seg.rootId, seg.depth)}
					transition:draw={{ duration: 520, delay: seg.depth * 80, easing: cubicOut }}
				/>
			{/each}
		</g>

		<g class="tips" filter="url(#rs-glow)">
			{#each tips as t (t.rootId)}
				<g class="tip">
					<circle class="halo" cx={t.x2} cy={t.y2} r={(2.6 - t.depth * 0.4).toFixed(2)} />
					<circle class="core" cx={t.x2} cy={t.y2} r={(1.5 - t.depth * 0.25).toFixed(2)} />
				</g>
			{/each}
		</g>
	</svg>

	{#if tip}
		<div
			class="tooltip"
			style:left="{Math.min(mouse.x + 14, (wrapEl?.clientWidth ?? 9999) - 220)}px"
			style:top="{mouse.y + 14}px"
		>
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
	}
	.crown {
		fill: #8a6a3e;
	}

	.root {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		pointer-events: stroke;
		cursor: pointer;
		/* maturity thickening + hover fade animate smoothly */
		transition: stroke-width 0.8s ease, opacity 0.22s ease;
	}
	.depth-0 { stroke: var(--root-0); }
	.depth-1 { stroke: var(--root-1); }
	.depth-2 { stroke: var(--root-2); }
	.depth-3 { stroke: var(--root-3); }

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
	.tip .halo {
		fill: var(--tip-glow);
		opacity: 0.35;
		transform-box: fill-box;
		transform-origin: center;
		animation: rs-pulse 2.4s ease-in-out infinite;
	}
	@keyframes rs-pulse {
		0%, 100% { transform: scale(1); opacity: 0.9; }
		50% { transform: scale(1.55); opacity: 0.45; }
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
