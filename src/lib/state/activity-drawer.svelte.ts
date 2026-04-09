import type { ActivityFormData } from '$lib/types/schemas';

export const activityDrawerState = $state<{
    isOpen: boolean;
    data: ActivityFormData | null;
}>({
    isOpen: false,
    data: null,
});

export const openActivityDrawer = (data?: ActivityFormData) => {
    // We deep clone the data using structuredClone
    // or manually to avoid passing references from the dashboard directly
    activityDrawerState.data = data ? structuredClone($state.snapshot(data)) : null;
    activityDrawerState.isOpen = true;
};

export const closeActivityDrawer = () => {
    activityDrawerState.isOpen = false;
};
