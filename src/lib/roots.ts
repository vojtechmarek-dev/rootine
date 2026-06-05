/**
 * roots.ts — procedural generator for an organic, incrementally-growing root system.
 *
 * Pure and deterministic: a given `seed` always produces the same system, so a
 * user's "plant" is stable across reloads. You only need to persist { seed, growth }.
 *
 * Key idea: the *entire* system is generated up-front. `growth` then reveals it
 * gradually — every Segment carries the step at which it appears (`born`), so the
 * UI shows everything where `born <= growth`. Raising growth never alters existing
 * segments, it only unlocks more of them. That's what makes growth animate cleanly
 * and stay consistent.
 */

export interface Segment {
	/** Stable unique id. Use this as the keyed-each key in Svelte. */
	id: number;
	/** Which root (branch) this belongs to. One root ≈ one habit. */
	rootId: string;
	/** 0 = taproot, 1 = main root, 2 = offshoot, 3 = fine root. Drives colour + size. */
	depth: number;
	/** Quadratic curve: start (x1,y1) → control (cx,cy) → end (x2,y2). */
	x1: number;
	y1: number;
	cx: number;
	cy: number;
	x2: number;
	y2: number;
	/** Growth step at which this segment appears. Reveal when born <= growth. */
	born: number;
	/** Stroke width here — tapers with depth and distance along the root. */
	baseWidth: number;
}

export interface GenerateOptions {
	/** How many growth steps to simulate. Effectively the cap on total complexity. */
	maxSteps?: number;
	/** Origin of the taproot, in SVG world units. */
	origin?: { x: number; y: number };
}

const HALF_PI = Math.PI / 2; // "straight down" — in SVG, +y points downward.

// Stroke width per depth (taproot → fine root). Also used to taper along each root.
const DEPTH_WIDTH = [6.8, 3.7, 2.2, 1.35];

// Growth behaviour per depth. Deeper roots are shorter, thinner, wander more, and
// resist gravity less — that gradient is what reads as "roots" rather than "a tree".
const TIP_CFG = [
	{ segLen: 24, maxSeg: 13, wander: 0.26, gravity: 0.34, branchEvery: 2 }, // taproot
	{ segLen: 20, maxSeg: 7, wander: 0.52, gravity: 0.12, branchEvery: 3 }, //  main root
	{ segLen: 15, maxSeg: 5, wander: 0.72, gravity: 0.08, branchEvery: 3 }, //  offshoot
	{ segLen: 11, maxSeg: 3, wander: 0.95, gravity: 0.05, branchEvery: 9 } //   fine root
];

/** Small fast seeded PRNG (mulberry32). Same seed → same sequence → same plant. */
function mulberry32(a: number) {
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A growing root end. Internal to the simulation. */
interface Tip {
	x: number;
	y: number;
	dir: number; // current heading, radians
	depth: number;
	rootId: string;
	active: boolean;
	idx: number; // how many segments this tip has produced
	sinceBranch: number;
	side: 1 | -1; // alternate branch side
	segLen: number;
	maxSeg: number;
	wander: number;
	gravity: number;
	branchEvery: number;
}

export function generateRootSystem(seed = 1, options: GenerateOptions = {}): Segment[] {
	const maxSteps = options.maxSteps ?? 72;
	const origin = options.origin ?? { x: 0, y: 0 };
	const rng = mulberry32(seed);

	const segments: Segment[] = [];
	let segId = 0;
	let rootCounter = 0;

	const makeTip = (x: number, y: number, dir: number, depth: number): Tip => {
		const c = TIP_CFG[depth];
		return {
			x,
			y,
			dir,
			depth,
			rootId: 'r' + rootCounter++,
			active: true,
			idx: 0,
			sinceBranch: 0,
			side: rng() < 0.5 ? 1 : -1,
			segLen: c.segLen * (0.9 + rng() * 0.2),
			maxSeg: Math.max(2, Math.round(c.maxSeg * (0.8 + rng() * 0.5))),
			wander: c.wander,
			gravity: c.gravity,
			branchEvery: c.branchEvery
		};
	};

	const addSegment = (tip: Tip, step: number) => {
		const turn = (rng() - 0.5) * tip.wander;
		let dir = tip.dir + turn;
		dir += (HALF_PI - dir) * tip.gravity; // gravitropism: bend back toward "down"

		const len = tip.segLen * (0.85 + rng() * 0.3);
		const x1 = tip.x;
		const y1 = tip.y;
		const x2 = x1 + Math.cos(dir) * len;
		const y2 = y1 + Math.sin(dir) * len;

		// control point = midpoint pushed sideways, for an organic curve
		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;
		const perp = dir + HALF_PI;
		const off = (rng() - 0.5) * len * 0.55;
		const cx = mx + Math.cos(perp) * off;
		const cy = my + Math.sin(perp) * off;

		const t = tip.maxSeg > 1 ? tip.idx / (tip.maxSeg - 1) : 0; // 0 at base → 1 at tip
		const baseWidth = Math.max(0.8, DEPTH_WIDTH[tip.depth] * (1 - 0.55 * t));

		segments.push({
			id: segId++,
			rootId: tip.rootId,
			depth: tip.depth,
			x1,
			y1,
			cx,
			cy,
			x2,
			y2,
			born: step,
			baseWidth
		});

		tip.x = x2;
		tip.y = y2;
		tip.dir = dir;
		tip.idx++;
		if (tip.idx >= tip.maxSeg) tip.active = false;
	};

	const taproot = makeTip(origin.x, origin.y, HALF_PI, 0);
	const tips: Tip[] = [taproot];

	for (let step = 1; step <= maxSteps; step++) {
		const active = tips.filter((t) => t.active);
		if (!active.length) break;

		// Advance the taproot every step, plus a *rotating* subset of other tips so
		// growth spreads evenly across the system instead of finishing one branch first.
		const others = active.filter((t) => t !== taproot);
		const advancing: Tip[] = [];
		if (taproot.active) advancing.push(taproot);
		if (others.length) {
			const start = step % others.length;
			for (let k = 0; k < others.length && advancing.length < 3; k++) {
				advancing.push(others[(start + k) % others.length]);
			}
		}

		for (const t of advancing) addSegment(t, step);

		// Branch from advanced tips (slightly delayed so the crown stays clean).
		for (const t of advancing) {
			t.sinceBranch++;
			if (t.depth < 3 && t.idx >= 2 && t.sinceBranch >= t.branchEvery && rng() < 0.92) {
				const spread = [1.0, 0.82, 0.72, 0.6][t.depth];
				const ang = t.dir + t.side * (spread * (0.7 + rng() * 0.6));
				tips.push(makeTip(t.x, t.y, ang, t.depth + 1));
				t.side *= -1;
				t.sinceBranch = 0;
			}
		}
	}

	return segments;
}

/** SVG path `d` string for a segment's quadratic curve. */
export function pathOf(s: Segment): string {
	return `M${s.x1.toFixed(2)} ${s.y1.toFixed(2)} Q${s.cx.toFixed(2)} ${s.cy.toFixed(2)} ${s.x2.toFixed(2)} ${s.y2.toFixed(2)}`;
}
