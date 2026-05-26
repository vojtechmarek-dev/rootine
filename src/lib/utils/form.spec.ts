import { describe, it, expect } from 'vitest';
import { formDataToObj } from './form';

function fd(entries: [string, string][]): FormData {
    const f = new FormData();
    for (const [k, v] of entries) {
        f.append(k, v);
    }
    return f;
}

describe('formDataToObj', () => {
    it('returns an empty object for empty FormData', () => {
        expect(formDataToObj(new FormData())).toEqual({});
    });

    it('maps flat keys to single values', () => {
        expect(formDataToObj(fd([['title', 'Push Day']]))).toEqual({ title: 'Push Day' });
    });

    it('skips empty-string values', () => {
        expect(formDataToObj(fd([['title', '']]))).toEqual({});
    });

    it('expands dot notation into nested objects', () => {
        expect(formDataToObj(fd([['config.targetValue', '3']]))).toEqual({
            config: { targetValue: '3' },
        });
    });

    it('handles deeply nested dot notation', () => {
        expect(formDataToObj(fd([['a.b.c', 'x']]))).toEqual({ a: { b: { c: 'x' } } });
    });

    it('collects repeated keys into an array', () => {
        expect(
            formDataToObj(
                fd([
                    ['schedule.days', 'mon'],
                    ['schedule.days', 'wed'],
                    ['schedule.days', 'fri'],
                ])
            )
        ).toEqual({ schedule: { days: ['mon', 'wed', 'fri'] } });
    });

    it('combines flat and nested keys', () => {
        expect(
            formDataToObj(
                fd([
                    ['title', 'Water'],
                    ['config.unit', 'liters'],
                    ['config.targetValue', '2'],
                ])
            )
        ).toEqual({ title: 'Water', config: { unit: 'liters', targetValue: '2' } });
    });
});
