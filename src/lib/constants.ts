/**
 * Weekday abbreviations for schedule configuration (ISO-like: Mon=1)
 */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
