import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PendingAction } from '$lib/sync/types';
import {
    getQueue,
    addAction,
    removeAction,
    removeLastComplete,
    getPendingCountForActivity,
    createPendingAction,
    SYNC_QUEUE_CHANGED_EVENT,
} from '$lib/sync/queue';

function makePendingAction(overrides: Partial<PendingAction> = {}): PendingAction {
    return {
        id: crypto.randomUUID(),
        activityId: 'activity-1',
        action: 'complete',
        timestamp: Date.now(),
        date: new Date().toISOString(),
        ...overrides,
    };
}

describe('sync queue', () => {
    let store: Record<string, string>;
    let dispatchEvent: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        store = {};
        dispatchEvent = vi.fn();

        const localStorageMock = {
            getItem: vi.fn((key: string) => store[key] ?? null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value;
            }),
        };

        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('window', {
            localStorage: localStorageMock,
            dispatchEvent,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getQueue', () => {
        it('returns empty array when localStorage is empty', () => {
            expect(getQueue()).toEqual([]);
        });

        it('returns parsed actions from localStorage', () => {
            const action = makePendingAction();
            store['rootine.sync.queue'] = JSON.stringify([action]);

            expect(getQueue()).toEqual([action]);
        });

        it('returns empty array for corrupt JSON', () => {
            store['rootine.sync.queue'] = '{not-valid-json';

            expect(getQueue()).toEqual([]);
        });

        it('returns empty array when stored value is not an array', () => {
            store['rootine.sync.queue'] = JSON.stringify({ foo: 'bar' });

            expect(getQueue()).toEqual([]);
        });
    });

    describe('addAction', () => {
        it('adds action to an empty queue', () => {
            const action = makePendingAction();
            addAction(action);

            expect(getQueue()).toEqual([action]);
        });

        it('appends to an existing queue in FIFO order', () => {
            const a1 = makePendingAction({ id: 'a1' });
            const a2 = makePendingAction({ id: 'a2' });
            addAction(a1);
            addAction(a2);

            expect(getQueue()).toEqual([a1, a2]);
        });

        it('dispatches a queue-changed event', () => {
            addAction(makePendingAction());

            expect(dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({ type: SYNC_QUEUE_CHANGED_EVENT })
            );
        });
    });

    describe('removeAction', () => {
        it('removes an action by id', () => {
            const a1 = makePendingAction({ id: 'a1' });
            const a2 = makePendingAction({ id: 'a2' });
            addAction(a1);
            addAction(a2);

            removeAction('a1');

            expect(getQueue()).toEqual([a2]);
        });

        it('is a no-op when the id does not exist', () => {
            const a1 = makePendingAction({ id: 'a1' });
            addAction(a1);

            removeAction('nonexistent');

            expect(getQueue()).toEqual([a1]);
        });
    });

    describe('removeLastComplete', () => {
        it('removes the most recent complete for the given activity', () => {
            const a1 = makePendingAction({ id: 'a1', activityId: 'act-1', action: 'complete' });
            const a2 = makePendingAction({ id: 'a2', activityId: 'act-1', action: 'complete' });
            addAction(a1);
            addAction(a2);

            const removed = removeLastComplete('act-1');

            expect(removed).toEqual(a2);
            expect(getQueue()).toEqual([a1]);
        });

        it('returns null when there are no complete actions for the activity', () => {
            const undo = makePendingAction({ activityId: 'act-1', action: 'undo' });
            addAction(undo);

            const removed = removeLastComplete('act-1');

            expect(removed).toBeNull();
            expect(getQueue()).toEqual([undo]);
        });

        it('does not touch actions belonging to other activities', () => {
            const a1 = makePendingAction({ id: 'a1', activityId: 'act-1', action: 'complete' });
            const a2 = makePendingAction({ id: 'a2', activityId: 'act-2', action: 'complete' });
            addAction(a1);
            addAction(a2);

            removeLastComplete('act-2');

            expect(getQueue()).toEqual([a1]);
        });

        it('returns null on an empty queue', () => {
            expect(removeLastComplete('act-1')).toBeNull();
        });
    });

    describe('getPendingCountForActivity', () => {
        it('returns zeros for an empty queue', () => {
            expect(getPendingCountForActivity('act-1')).toEqual({ completes: 0, undos: 0 });
        });

        it('counts completes and undos separately', () => {
            addAction(makePendingAction({ activityId: 'act-1', action: 'complete' }));
            addAction(makePendingAction({ activityId: 'act-1', action: 'complete' }));
            addAction(makePendingAction({ activityId: 'act-1', action: 'undo' }));

            expect(getPendingCountForActivity('act-1')).toEqual({ completes: 2, undos: 1 });
        });

        it('ignores actions for other activities', () => {
            addAction(makePendingAction({ activityId: 'act-2', action: 'complete' }));

            expect(getPendingCountForActivity('act-1')).toEqual({ completes: 0, undos: 0 });
        });
    });

    describe('createPendingAction', () => {
        it('creates a well-formed pending action', () => {
            const action = createPendingAction({
                activityId: 'act-1',
                action: 'complete',
                date: '2025-06-01T12:00:00.000Z',
            });

            expect(action.id).toBeDefined();
            expect(action.activityId).toBe('act-1');
            expect(action.action).toBe('complete');
            expect(action.date).toBe('2025-06-01T12:00:00.000Z');
            expect(action.timestamp).toBeGreaterThan(0);
            expect(action.logId).toBeUndefined();
        });

        it('includes logId when provided', () => {
            const action = createPendingAction({
                activityId: 'act-1',
                action: 'undo',
                date: '2025-06-01T12:00:00.000Z',
                logId: 'log-abc',
            });

            expect(action.logId).toBe('log-abc');
        });
    });
});
