/**
 * Turns FormData into a nested object. Use dot notation in input names:
 * - name="config.targetValue" → data.config.targetValue
 * - Multiple name="schedule.days" → data.schedule.days = ['mon', 'wed', 'fri']
 * Zod can then coerce and validate the result.
 */
export function formDataToObj(formData: FormData): Record<string, unknown> {
    const byKey: Record<string, string[]> = {};
    for (const [key, value] of formData.entries()) {
        const v = value?.toString?.();
        if (v === undefined || v === '') {
            continue;
        }
        if (!byKey[key]) {
            byKey[key] = [];
        }
        byKey[key].push(v);
    }

    const data: Record<string, unknown> = {};
    for (const [key, values] of Object.entries(byKey)) {
        const value = values.length > 1 ? values : values[0];
        if (value === undefined) {
            continue;
        }

        if (key.includes('.')) {
            const parts = key.split('.');
            let target = data;
            for (let i = 0; i < parts.length - 1; i++) {
                const p = parts[i];
                if (!(p in target) || typeof target[p] !== 'object' || target[p] === null) {
                    target[p] = {};
                }
                target = target[p] as Record<string, unknown>;
            }
            target[parts[parts.length - 1]] = value;
        } else {
            data[key] = value;
        }
    }
    return data;
}
