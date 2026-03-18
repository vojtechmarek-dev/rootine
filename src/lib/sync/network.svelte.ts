import { browser } from '$app/environment';

class NetworkState {
    isOnline = $state<boolean>(true);
    private initialized = false;

    init() {
        if (!browser || this.initialized) {
            return () => {};
        }

        this.initialized = true;
        this.isOnline = navigator.onLine;

        const handleOnline = () => {
            this.isOnline = true;
        };

        const handleOffline = () => {
            this.isOnline = false;
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            this.initialized = false;
        };
    }
}

const networkState = new NetworkState();

export function initNetworkStatus() {
    return networkState.init();
}

export function getNetworkStatus() {
    return networkState;
}
