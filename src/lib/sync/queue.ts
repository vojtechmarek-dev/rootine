import type { PendingAction, SyncActionType } from '$lib/sync/types';

const SYNC_QUEUE_KEY = 'rootine.sync.queue';
export const SYNC_QUEUE_CHANGED_EVENT = 'rootine:sync-queue-changed';

type PendingCountForActivity = {
    completes: number;
    undos: number;
};

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

function emitQueueChanged(): void {
    if (!isBrowser()) {
        return;
    }

    window.dispatchEvent(new CustomEvent(SYNC_QUEUE_CHANGED_EVENT));
}

function parseQueue(value: string | null): PendingAction[] {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value) as PendingAction[];
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // Ignore invalid local data and reset to empty queue.
    }

    return [];
}

function persistQueue(queue: PendingAction[]): void {
    if (!isBrowser()) {
        return;
    }

    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    emitQueueChanged();
}

export function createPendingAction(input: {
    activityId: string;
    action: SyncActionType;
    date: string;
    logId?: string;
}): PendingAction {
    return {
        id: crypto.randomUUID(),
        activityId: input.activityId,
        action: input.action,
        logId: input.logId,
        timestamp: Date.now(),
        date: input.date,
    };
}

export function getQueue(): PendingAction[] {
    if (!isBrowser()) {
        return [];
    }

    return parseQueue(localStorage.getItem(SYNC_QUEUE_KEY));
}

export function addAction(action: PendingAction): void {
    const queue = getQueue();
    queue.push(action);
    persistQueue(queue);
}

export function removeAction(id: string): void {
    const queue = getQueue();
    const nextQueue = queue.filter((item) => item.id !== id);
    persistQueue(nextQueue);
}

export function removeLastComplete(activityId: string): PendingAction | null {
    const queue = getQueue();
    let foundIndex = -1;

    for (let i = queue.length - 1; i >= 0; i -= 1) {
        const item = queue[i];
        if (item.activityId === activityId && item.action === 'complete') {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex === -1) {
        return null;
    }

    const [removed] = queue.splice(foundIndex, 1);
    persistQueue(queue);
    return removed ?? null;
}

export function getPendingCountForActivity(activityId: string): PendingCountForActivity {
    const queue = getQueue();
    let completes = 0;
    let undos = 0;

    for (const item of queue) {
        if (item.activityId === activityId) {
            if (item.action === 'complete') {
                completes += 1;
            } else if (item.action === 'undo') {
                undos += 1;
            }
        }
    }

    return { completes, undos };
}
