import { differenceInDays, differenceInHours, startOfDay } from 'date-fns';
import type { Activity } from '$lib/types/schemas';
import { WEEKDAYS } from '$lib/constants';

export function isScheduledForDate(
    activity: Activity,
    targetDate: Date
): boolean {
    const start = startOfDay(new Date(activity.startDate));
    const target = startOfDay(targetDate);

    // 1. Don't show habits before they started
    if (target < start) {
        return false;
    }

    // 2. Don't show archived activities (optional, usually filtered in DB)
    if (activity.archived) {
        return false;
    }

    // 3. Don't show activities after they ended
    if (activity.endDate) {
        const end = startOfDay(new Date(activity.endDate));
        if (target > end) {
            return false;
        }
    }

    // JS getDay(): 0=Sun..6=Sat, but WEEKDAYS is mon..sun
    const weekdayIndex = (target.getDay() + 6) % 7;
    const dayName = WEEKDAYS[weekdayIndex];

    // Schedule interpretation can differ by activity.type, so we branch first.
    switch (activity.type) {
        case 'habit': {
            return isScheduledBySchedule(activity.schedule, start, target, dayName);
        }
        case 'plant': {
            // For rolling intervals, plants typically anchor on "lastWatered" if present.
            const maybeLast = activity.config.lastWatered;
            const anchor = maybeLast ? startOfDay(new Date(maybeLast)) : start;
            return isScheduledBySchedule(activity.schedule, anchor, target, dayName);
        }
        case 'workout': {
            return isScheduledBySchedule(activity.schedule, start, target, dayName);
        }
        default: {
            return false;
        }
    }
}

function isScheduledBySchedule(
    schedule: Activity['schedule'],
    anchor: Date,
    target: Date,
    weekday: (typeof WEEKDAYS)[number]
): boolean {
    switch (schedule.type) {
        case 'daily': {
            return true;
        }
        case 'weekly': {
            return schedule.days.includes(weekday);
        }
        case 'interval': {
            const intervalVal = schedule.value ?? 1;

            if (schedule.unit === 'hours') {
                const diff = differenceInHours(target, anchor);
                return diff % intervalVal === 0;
            }

            const diff = differenceInDays(target, anchor);
            return diff % intervalVal === 0;
        }
        default: {
            return false;
        }
    }
}