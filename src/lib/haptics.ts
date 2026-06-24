import { settings } from '$lib/settings.svelte';

export type HapticIntensity = 'light' | 'medium' | 'strong' | 'success';

// Durations (ms) / patterns per intensity — tune here to manage feel globally.
const PATTERNS: Record<HapticIntensity, number | number[]> = {
    light: 12, // matches the current habit-complete tap
    medium: 20,
    strong: 35,
    success: [12, 40, 18],
};

/**
 * Fire a haptic tap if the device/browser supports it; silently no-ops
 * otherwise. The default tap (`'light'`) is scaled to the user's chosen
 * intensity (Settings → Haptics); semantic patterns like `'success'` are fired
 * as-is. When the preference is `'off'`, nothing fires.
 */
export function haptic(intensity: HapticIntensity = 'light'): void {
    const preference = settings.hapticIntensity;
    if (preference === 'off') {
        return;
    }
    // 'light' is the generic tap → honor the user's intensity; an explicit
    // non-default intensity (e.g. 'success') is intentional and kept.
    const resolved: HapticIntensity = intensity === 'light' ? preference : intensity;
    try {
        navigator.vibrate?.(PATTERNS[resolved]);
    } catch {
        /* vibrate unsupported — ignore */
    }
}
