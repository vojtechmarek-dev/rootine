import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

/** Stringify Zod treeified error for readable console/debug output (avoids [Array] etc.). */
export function formatZodErrorTree(error: z.ZodError): string {
    return JSON.stringify(z.treeifyError(error), null, 2);
}

/** Completions needed for a "done" day: habits use config.targetValue (≥1), others 1. */
export function activityTargetCount(activity: { type: string; config: Record<string, unknown> }): number {
    if (activity.type === 'habit' && typeof activity.config?.targetValue === 'number') {
        return Math.max(1, activity.config.targetValue);
    }
    return 1;
}

const DEFAULT_TOAST_DESCRIPTION_LENGTH = 220;

export function toToastDescription(value: unknown, maxLength = DEFAULT_TOAST_DESCRIPTION_LENGTH): string | undefined {
    if (!value) {
        return undefined;
    }

    let description: string | undefined;

    if (typeof value === 'string') {
        description = value.trim();
    } else if (value instanceof Error) {
        description = value.message.trim();
    } else {
        try {
            description = JSON.stringify(value);
        } catch {
            return undefined;
        }
    }

    const normalizedDescription = description.replace(/\s+/g, ' ').trim();

    if (!normalizedDescription) {
        return undefined;
    }

    if (normalizedDescription.length <= maxLength) {
        return normalizedDescription;
    }

    return `${normalizedDescription.slice(0, maxLength).trimEnd()}...`;
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type ActivityType = 'habit' | 'plant' | 'workout';

export function getActivityTypeLabel(type: string): string {
    if (type === 'habit') {
        return 'Habit';
    }
    if (type === 'plant') {
        return 'Plant';
    }
    if (type === 'workout') {
        return 'Workout';
    }
    return 'Habit';
}

type ActivityAccentClasses = {
    chip: string;
    bar: string;
    /** Inline styles, set only for custom hex colours (token colours use classes). */
    chipStyle?: string;
    barStyle?: string;
};

/** Hex values behind the named tokens — also the swatch palette for the picker. */
export const ACTIVITY_COLOR_PALETTE: Record<string, string> = {
    emerald: '#10b981',
    clay: '#b08968',
    amber: '#f59e0b',
    rose: '#b43822',
    violet: '#8b5cf6',
    blue: '#116cff',
    zinc: '#71717a',
};

export const ACTIVITY_COLOR_SWATCHES: string[] = Object.values(ACTIVITY_COLOR_PALETTE);

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string | null | undefined): value is string {
    return !!value && HEX_RE.test(value.trim());
}

/** Accent styles for a custom hex: translucent chip, near-solid bar. */
function hexAccent(hex: string): ActivityAccentClasses {
    const h = hex.trim();
    return {
        chip: '',
        bar: '',
        chipStyle: `background-color:${h}26;color:${h};`,
        barStyle: `background-color:${h}cc;`,
    };
}

const activityAccentClasses: Record<string, ActivityAccentClasses> = {
    zinc: {
        chip: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100',
        bar: 'bg-zinc-500/80 dark:bg-zinc-400/90',
    },
    emerald: {
        chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100',
        bar: 'bg-emerald-500/80 dark:bg-emerald-400/90',
    },
    blue: {
        chip: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100',
        bar: 'bg-blue-500/80 dark:bg-blue-400/90',
    },
    violet: {
        chip: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-100',
        bar: 'bg-violet-500/80 dark:bg-violet-400/90',
    },
    amber: {
        chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
        bar: 'bg-amber-500/80 dark:bg-amber-400/90',
    },
    rose: {
        chip: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-100',
        bar: 'bg-rose-500/80 dark:bg-rose-400/90',
    },
    forest: {
        chip: 'bg-success/15 text-success dark:bg-success/20',
        bar: 'bg-success/80',
    },
    clay: {
        chip: 'bg-clay/15 text-clay dark:bg-clay/20',
        bar: 'bg-clay/80',
    },
};

// Without an explicit colour, each type gets its own earthy accent so a
// default dashboard still reads as varied instead of uniformly grey.
const typeAccentDefaults: Record<string, string> = {
    habit: 'forest',
    plant: 'emerald',
    workout: 'clay',
};

export function getActivityAccentClasses(color: string | null | undefined, type?: string): ActivityAccentClasses {
    if (isHexColor(color)) {
        return hexAccent(color);
    }
    const normalized = (color ?? '').trim().toLowerCase();
    if (normalized && activityAccentClasses[normalized]) {
        return activityAccentClasses[normalized];
    }
    const fallback = type ? typeAccentDefaults[type] : undefined;
    return activityAccentClasses[fallback ?? 'zinc'] ?? activityAccentClasses.zinc;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
