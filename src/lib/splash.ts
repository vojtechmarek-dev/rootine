export function hideSplash() {
    if (typeof document === 'undefined') {
        return;
    }
    const splash = document.getElementById('app-splash');
    if (splash) {
        splash.dataset.hidden = 'true';
        setTimeout(() => splash.remove(), 220);
    }
}
