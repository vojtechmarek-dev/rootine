import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';
import type { PendingAction } from '$lib/sync/types';
import { SYNC_QUEUE_CHANGED_EVENT, getQueue, removeAction } from '$lib/sync/queue';

type SyncResponse = {
    success?: boolean;
    logId?: string | null;
};

class SyncEngineState {
    pendingCount = $state<number>(0);
    isSyncing = $state<boolean>(false);
    private initialized = false;
    private syncPromise: Promise<void> | null = null;

    private refreshPendingCount() {
        this.pendingCount = getQueue().length;
    }

    async flushQueue() {
        if (!browser) {
            return;
        }

        if (!navigator.onLine) {
            this.refreshPendingCount();
            return;
        }

        if (this.syncPromise) {
            await this.syncPromise;
            return;
        }

        this.syncPromise = this.performFlush();
        await this.syncPromise;
        this.syncPromise = null;
    }

    private async performFlush() {
        const queue = getQueue();
        if (queue.length === 0) {
            this.refreshPendingCount();
            return;
        }

        this.isSyncing = true;
        let changed = false;

        for (const action of queue) {
            const synced = await this.syncAction(action);
            if (synced) {
                removeAction(action.id);
                changed = true;
                continue;
            }

            // Stop on first failure and preserve remaining order.
            break;
        }

        this.isSyncing = false;
        this.refreshPendingCount();

        if (changed) {
            await invalidateAll();
        }
    }

    private async syncAction(action: PendingAction): Promise<boolean> {
        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    activityId: action.activityId,
                    action: action.action,
                    logId: action.logId,
                    date: action.date,
                }),
            });

            if (!response.ok) {
                return false;
            }

            const payload = (await response.json()) as SyncResponse;
            return payload.success === true;
        } catch {
            return false;
        }
    }

    init() {
        if (!browser || this.initialized) {
            return () => { };
        }

        this.initialized = true;
        this.refreshPendingCount();

        const handleOnline = () => {
            void this.flushQueue();
        };

        const handleQueueChanged = () => {
            this.refreshPendingCount();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener(SYNC_QUEUE_CHANGED_EVENT, handleQueueChanged);

        if (navigator.onLine && this.pendingCount > 0) {
            void this.flushQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener(SYNC_QUEUE_CHANGED_EVENT, handleQueueChanged);
            this.initialized = false;
        };
    }
}

const syncEngine = new SyncEngineState();

export function initSyncEngine() {
    return syncEngine.init();
}

export function getSyncEngine() {
    return syncEngine;
}

export async function flushQueue() {
    await syncEngine.flushQueue();
}
