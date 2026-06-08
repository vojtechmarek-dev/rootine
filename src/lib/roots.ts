/**
 * roots.ts — procedural generator for an organic, incrementally-growing root system.
 *
 * Pure and deterministic: a given `seed` always produces the same system, so a
 * user's "plant" is stable across reloads. You only need to persist { seed, growth }.
 *
 * Two entry points:
 *   - generateRootSystem(seed)  — one root system (legacy / single-plant).
 *   - generateGarden(habits)    — one root per habit, fanned from a shared origin.
 *     Each segment is tagged with its owning `activityId`, and `born` is LOCAL to
 *     that habit (1..N), so each habit reveals against its OWN completion count.
 *
 * Key idea: the *entire* system is generated up-front. Growth then reveals it
 * gradually — every Segment carries the step at which it appears (`born`), so the
 * UI shows everything where `born <= growth`. Raising growth never alters existing
 * segments, it only unlocks more of them. That's what makes growth animate cleanly
 * and stay consistent.
 */

export interface Segment {
    /** Stable unique id. Use this as the keyed-each key in Svelte. */
    id: number;
    /** Which habit (activity) this root belongs to. null = legacy single plant. */
    activityId: string | null;
    /** Which root (branch) this belongs to. Unique across the whole system. */
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
    /** Accent colour token (e.g. "emerald") for per-habit tinting. */
    color?: string;
    /**
     * For habit offshoots: the taproot `born` of the node this offshoot hangs
     * from. The taproot must be revealed at least this deep to host it.
     * Undefined for taproot segments.
     */
    attachBorn?: number;
}

export interface GenerateOptions {
    /** How many growth steps to simulate. Effectively the cap on total complexity. */
    maxSteps?: number;
    /** Origin of the taproot, in SVG world units. */
    origin?: { x: number; y: number };
    /** Deterministic seed for the shared tree shape (e.g. hash of userId). */
    seed?: number;
}

/** One habit mapped onto the shared tree — becomes one offshoot of the taproot. */
export interface GardenHabitInput {
    /** activity id — tags this habit's offshoot + sub-roots. */
    id: string;
    /** accent colour token; carried onto the habit's segments for tinting. */
    color?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const HALF_PI = Math.PI / 2; // "straight down" — in SVG, +y points downward.

// Stroke width per depth (taproot → fine root). Also used to taper along each root.
const DEPTH_WIDTH = [6.8, 3.7, 2.2, 1.35];

// Growth behaviour per depth. Deeper roots are shorter, thinner, wander more, and
// resist gravity less — that gradient is what reads as "roots" rather than "a tree".
const TIP_CFG = [
    { segLen: 24, maxSeg: 13, wander: 0.26, gravity: 0.34, branchEvery: 2 }, // taproot
    { segLen: 20, maxSeg: 7, wander: 0.52, gravity: 0.12, branchEvery: 3 }, //  main root
    { segLen: 15, maxSeg: 5, wander: 0.72, gravity: 0.08, branchEvery: 3 }, //  offshoot
    { segLen: 11, maxSeg: 3, wander: 0.95, gravity: 0.05, branchEvery: 9 }, //   fine root
];

/** Completion thresholds at which a habit earns a bigger bloom. */
export const MILESTONES = [7, 30, 100, 365] as const;

/** How many milestones a given completion count has passed (0..MILESTONES.length). */
export function milestoneTier(count: number): number {
    let tier = 0;
    for (const m of MILESTONES) {
        if (count >= m) tier++;
    }
    return tier;
}

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
    /** Owning habit (garden mode); null for the shared taproot. Inherited by offshoots. */
    activityId?: string | null;
    /** Owning habit's colour token; inherited by offshoots. */
    color?: string;
    /** Taproot born of this offshoot's attachment node; inherited by sub-branches. */
    attachBorn?: number;
}

interface SimulateParams {
    rng: () => number;
    origin: { x: number; y: number };
    dir0: number;
    maxSteps: number;
    activityId: string | null;
    color?: string;
    /** First segment id (ids stay unique when stitching multiple roots together). */
    startId: number;
    /** Scales gravitropism so fanned garden roots keep their lateral spread. */
    gravityScale?: number;
}

/**
 * Simulate ONE root system from a single starting tip. Shared by both public
 * generators. `born` is local (1..maxSteps) so the caller decides what growth
 * value reveals it.
 */
function simulateRoot(params: SimulateParams): { segments: Segment[]; nextId: number } {
    const { rng, origin, dir0, maxSteps, activityId, color, gravityScale = 1 } = params;
    const segments: Segment[] = [];
    let segId = params.startId;
    let rootCounter = 0;
    const prefix = activityId ?? 'r';

    const makeTip = (x: number, y: number, dir: number, depth: number): Tip => {
        const c = TIP_CFG[depth];
        return {
            x,
            y,
            dir,
            depth,
            rootId: `${prefix}:${rootCounter++}`,
            active: true,
            idx: 0,
            sinceBranch: 0,
            side: rng() < 0.5 ? 1 : -1,
            segLen: c.segLen * (0.9 + rng() * 0.2),
            maxSeg: Math.max(2, Math.round(c.maxSeg * (0.8 + rng() * 0.5))),
            wander: c.wander,
            gravity: c.gravity,
            branchEvery: c.branchEvery,
        };
    };

    const addSegment = (tip: Tip, step: number) => {
        const turn = (rng() - 0.5) * tip.wander;
        let dir = tip.dir + turn;
        dir += (HALF_PI - dir) * tip.gravity * gravityScale; // gravitropism: bend back toward "down"

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
            activityId,
            rootId: tip.rootId,
            depth: tip.depth,
            x1,
            y1,
            cx,
            cy,
            x2,
            y2,
            born: step,
            baseWidth,
            color,
        });

        tip.x = x2;
        tip.y = y2;
        tip.dir = dir;
        tip.idx++;
        if (tip.idx >= tip.maxSeg) tip.active = false;
    };

    const taproot = makeTip(origin.x, origin.y, dir0, 0);
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

    return { segments, nextId: segId };
}

/** Legacy single root system. Tags every segment with activityId = null. */
export function generateRootSystem(seed = 1, options: GenerateOptions = {}): Segment[] {
    const { segments } = simulateRoot({
        rng: mulberry32(seed),
        origin: options.origin ?? { x: 0, y: 0 },
        dir0: HALF_PI,
        maxSteps: options.maxSteps ?? 72,
        activityId: null,
        startId: 0,
    });
    return segments;
}

/** Deterministic string hash (FNV-1a) → per-habit offshoot variety. */
function hashStr(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Generate the central taproot — a single straight-ish root, ABSOLUTE coords. */
function growTaproot(rng: () => number, origin: { x: number; y: number }, length: number, startId: number): Segment[] {
    const out: Segment[] = [];
    const c = TIP_CFG[0];
    const segLen = c.segLen * (0.9 + rng() * 0.2);
    let x = origin.x;
    let y = origin.y;
    let dir = HALF_PI;
    for (let i = 1; i <= length; i++) {
        const turn = (rng() - 0.5) * c.wander;
        dir += turn;
        dir += (HALF_PI - dir) * c.gravity;
        const len = segLen * (0.85 + rng() * 0.3);
        const x1 = x;
        const y1 = y;
        const x2 = x1 + Math.cos(dir) * len;
        const y2 = y1 + Math.sin(dir) * len;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const perp = dir + HALF_PI;
        const off = (rng() - 0.5) * len * 0.4;
        const cx = mx + Math.cos(perp) * off;
        const cy = my + Math.sin(perp) * off;
        const t = length > 1 ? (i - 1) / (length - 1) : 0;
        const baseWidth = Math.max(0.9, DEPTH_WIDTH[0] * (1 - 0.5 * t));
        out.push({ id: startId++, activityId: null, rootId: 'tap', depth: 0, x1, y1, cx, cy, x2, y2, born: i, baseWidth });
        x = x2;
        y = y2;
    }
    return out;
}

/**
 * Generate ONE habit's offshoot as a sub-tree anchored at the origin, pointing
 * down-and-right (it is mirrored left at placement time). Coordinates are RELATIVE
 * to the attach point; `born` is local (1..M) so revealed length tracks the
 * habit's completion count. Tagged with the habit's activityId + colour.
 */
function growOffshoot(rng: () => number, activityId: string, color: string | undefined, maxSteps: number, startId: number): Segment[] {
    const out: Segment[] = [];
    let segId = startId;
    let rootCounter = 0;
    let born = 0;

    const makeTip = (x: number, y: number, dir: number, depth: number): Tip => {
        const c = TIP_CFG[depth];
        return {
            x,
            y,
            dir,
            depth,
            rootId: `${activityId}:${rootCounter++}`,
            active: true,
            idx: 0,
            sinceBranch: 0,
            side: rng() < 0.5 ? 1 : -1,
            segLen: c.segLen * (0.9 + rng() * 0.2),
            maxSeg: Math.max(2, Math.round(c.maxSeg * (0.8 + rng() * 0.5))),
            wander: c.wander,
            gravity: c.gravity,
            branchEvery: c.branchEvery,
        };
    };

    const addSegment = (tip: Tip) => {
        const turn = (rng() - 0.5) * tip.wander;
        let dir = tip.dir + turn;
        dir += (HALF_PI - dir) * tip.gravity;
        const len = tip.segLen * (0.85 + rng() * 0.3);
        const x1 = tip.x;
        const y1 = tip.y;
        const x2 = x1 + Math.cos(dir) * len;
        const y2 = y1 + Math.sin(dir) * len;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const perp = dir + HALF_PI;
        const off = (rng() - 0.5) * len * 0.55;
        const cx = mx + Math.cos(perp) * off;
        const cy = my + Math.sin(perp) * off;
        const t = tip.maxSeg > 1 ? tip.idx / (tip.maxSeg - 1) : 0;
        const baseWidth = Math.max(0.8, DEPTH_WIDTH[tip.depth] * (1 - 0.55 * t));
        out.push({ id: segId++, activityId, rootId: tip.rootId, depth: tip.depth, x1, y1, cx, cy, x2, y2, born: ++born, baseWidth, color });
        tip.x = x2;
        tip.y = y2;
        tip.dir = dir;
        tip.idx++;
        if (tip.idx >= tip.maxSeg) tip.active = false;
    };

    // Main root emerges down-and-right from the origin (mirrored left at placement).
    const main = makeTip(0, 0, HALF_PI - (0.55 + rng() * 0.5), 1);
    const tips: Tip[] = [main];

    for (let step = 1; step <= maxSteps; step++) {
        const active = tips.filter((t) => t.active);
        if (!active.length) break;
        const advancing: Tip[] = [];
        if (main.active) advancing.push(main);
        const others = active.filter((t) => t !== main);
        if (others.length) {
            const start = step % others.length;
            for (let k = 0; k < others.length && advancing.length < 3; k++) advancing.push(others[(start + k) % others.length]);
        }
        for (const t of advancing) addSegment(t);
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
    return out;
}

/**
 * The garden: ONE central taproot (absolute coords) plus, for each habit, an
 * offshoot generated RELATIVE to the origin. Offshoots are *not* attached here —
 * placement onto taproot nodes happens at reveal time (see Garden.svelte) so that
 * only ACTIVE habits occupy nodes and there are no bare gaps. This split also
 * lets each offshoot reveal by its own completion count (local `born`).
 *
 * Returns: taproot segments (activityId null) + every habit's offshoot segments
 * (activityId set, coords relative to attach point, no `attachBorn` yet).
 */
export function generateGarden(habits: GardenHabitInput[], options: GenerateOptions = {}): Segment[] {
    const origin = options.origin ?? { x: 0, y: 0 };
    const seed = options.seed ?? 1;
    const n = habits.length;

    // Taproot long enough to host one offshoot per node down its length + a tip,
    // so active offshoots cascade at increasing depths rather than clustering.
    const taprootLen = clamp(n + 3, 8, 18);
    const out: Segment[] = growTaproot(mulberry32(seed), origin, taprootLen, 0);
    let nextId = out.length;

    const offshootSteps = options.maxSteps ?? 40;
    for (const h of habits) {
        const rng = mulberry32((seed ^ hashStr(h.id)) >>> 0);
        const offshoot = growOffshoot(rng, h.id, h.color, offshootSteps, nextId);
        nextId += offshoot.length;
        for (const s of offshoot) out.push(s);
    }
    return out;
}

/** SVG path `d` string for a segment's quadratic curve. */
export function pathOf(s: Segment): string {
    return `M${s.x1.toFixed(2)} ${s.y1.toFixed(2)} Q${s.cx.toFixed(2)} ${s.cy.toFixed(2)} ${s.x2.toFixed(2)} ${s.y2.toFixed(2)}`;
}
