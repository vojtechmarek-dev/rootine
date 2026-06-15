export type HapticIntensity = 'light' | 'medium' | 'strong' | 'success';

// Durations (ms) / patterns per intensity — tune here to manage feel globally.
const PATTERNS: Record<HapticIntensity, number | number[]> = {
    light: 12, // matches the current habit-complete tap
    medium: 20,
    strong: 35,
    success: [12, 40, 18],
};

/** Fire a haptic tap if the device/browser supports it; silently no-ops otherwise. */
export function haptic(intensity: HapticIntensity = 'light'): void {
    try {
        navigator.vibrate?.(PATTERNS[intensity]);
    } catch {
        /* vibrate unsupported — ignore */
    }
}
