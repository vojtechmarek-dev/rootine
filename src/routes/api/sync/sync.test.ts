import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
    db: {
        query: {
            activities: { findFirst: vi.fn() },
            logs: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('$lib/server/db/schema', () => ({
    activities: { id: 'id', userId: 'userId' },
    logs: { id: 'id', activityId: 'activityId', date: 'date' },
}));

import type { RequestEvent } from '@sveltejs/kit';
import { POST } from './+server';

type MockEventOptions = {
    auth?: () => Promise<unknown>;
    body?: unknown;
    rejectJson?: boolean;
};

function mockEvent(options: MockEventOptions = {}): RequestEvent {
    return {
        locals: {
            auth: options.auth ?? (() => Promise.resolve(null)),
        },
        request: {
            json: options.rejectJson
                ? () => Promise.reject(new SyntaxError('Unexpected token'))
                : () => Promise.resolve(options.body ?? {}),
        },
    } as unknown as RequestEvent;
}

function authedEvent(body: unknown) {
    return mockEvent({
        auth: () => Promise.resolve({ user: { id: crypto.randomUUID() } }),
        body,
    });
}

describe('POST /api/sync', () => {
    describe('auth guard', () => {
        it('returns 401 when session is null', async () => {
            const res = await POST(mockEvent());

            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ message: 'Unauthorized' });
        });

        it('returns 401 when session has no user id', async () => {
            const res = await POST(
                mockEvent({ auth: () => Promise.resolve({ user: {} }) })
            );

            expect(res.status).toBe(401);
        });
    });

    describe('body parsing', () => {
        it('returns 400 for unparseable JSON', async () => {
            const res = await POST(
                mockEvent({
                    auth: () => Promise.resolve({ user: { id: 'u1' } }),
                    rejectJson: true,
                })
            );

            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ message: 'Invalid JSON body' });
        });
    });

    describe('Zod validation', () => {
        it('rejects when activityId is missing', async () => {
            const res = await POST(
                authedEvent({ action: 'complete', date: new Date().toISOString() })
            );

            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ message: 'Invalid sync payload' });
        });

        it('rejects when activityId is not a UUID', async () => {
            const res = await POST(
                authedEvent({
                    activityId: 'not-a-uuid',
                    action: 'complete',
                    date: new Date().toISOString(),
                })
            );

            expect(res.status).toBe(400);
        });

        it('rejects when action is not complete or undo', async () => {
            const res = await POST(
                authedEvent({
                    activityId: crypto.randomUUID(),
                    action: 'delete',
                    date: new Date().toISOString(),
                })
            );

            expect(res.status).toBe(400);
        });

        it('rejects when date is not an ISO datetime', async () => {
            const res = await POST(
                authedEvent({
                    activityId: crypto.randomUUID(),
                    action: 'complete',
                    date: 'last-tuesday',
                })
            );

            expect(res.status).toBe(400);
        });

        it('rejects when date is missing', async () => {
            const res = await POST(
                authedEvent({
                    activityId: crypto.randomUUID(),
                    action: 'complete',
                })
            );

            expect(res.status).toBe(400);
        });

        it('rejects when logId is present but not a UUID', async () => {
            const res = await POST(
                authedEvent({
                    activityId: crypto.randomUUID(),
                    action: 'undo',
                    logId: 'bad-id',
                    date: new Date().toISOString(),
                })
            );

            expect(res.status).toBe(400);
        });
    });
});
