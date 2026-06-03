import { dev } from '$app/environment';
import { toast } from 'svelte-sonner';
import { toToastDescription } from '$lib/utils';

// Stack traces / raw failure payloads can run long; allow more than the default
// description budget but still cap so the toast stays readable.
const DETAIL_MAX_LENGTH = 800;

/** Turn an arbitrary error-ish value into a readable, bounded string. */
function formatDetail(detail: unknown): string | undefined {
    if (detail == null) {
        return undefined;
    }
    if (detail instanceof Error) {
        return toToastDescription(detail.stack ?? detail.message, DETAIL_MAX_LENGTH);
    }
    return toToastDescription(detail, DETAIL_MAX_LENGTH);
}

type ToastErrorOptions = {
    /** User-facing detail. Always shown (e.g. validation summary). */
    description?: string;
    /** Technical detail (Error / raw action result). Shown only in dev builds. */
    detail?: unknown;
    duration?: number;
};

/**
 * Error toast with consistent styling. The `description` is always shown; the
 * technical `detail` (stack trace, raw result) is appended only outside prod so
 * users never see internals while developers still get them locally.
 */
export function toastError(message: string, options: ToastErrorOptions = {}) {
    const parts: string[] = [];
    if (options.description) {
        parts.push(options.description);
    }
    if (dev) {
        const formatted = formatDetail(options.detail);
        if (formatted) {
            parts.push(formatted);
        }
    }

    return toast.error(message, {
        description: parts.length ? parts.join('\n\n') : undefined,
        duration: options.duration,
    });
}

export function toastSuccess(message: string, options?: { description?: string; duration?: number }) {
    return toast.success(message, options);
}
