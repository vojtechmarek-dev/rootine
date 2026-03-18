export type SyncActionType = 'complete' | 'undo';

export interface PendingAction {
    id: string;
    activityId: string;
    action: SyncActionType;
    logId?: string;
    timestamp: number;
    date: string;
}
