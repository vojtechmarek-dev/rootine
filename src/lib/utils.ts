import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

/** Stringify Zod treeified error for readable console/debug output (avoids [Array] etc.). */
export function formatZodErrorTree(error: z.ZodError): string {
    return JSON.stringify(z.treeifyError(error), null, 2);
}

const DEFAULT_TOAST_DESCRIPTION_LENGTH = 220;

export function toToastDescription(
    value: unknown,
    maxLength = DEFAULT_TOAST_DESCRIPTION_LENGTH
): string | undefined {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
