import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getDashboardActivities } from '$lib/server/dashboard';
import { createActivity } from '$lib/server/actions/createActivity';
import { toggleActivity } from '$lib/server/actions/toggleActivity';

export const load: PageServerLoad = async (event) => {
    const { session } = await event.parent();
    const userId = session.user?.id;

    if (!userId) {
        return { activities: Promise.resolve([]) };
    }

    const urlDate = event.url.searchParams.get('date');
    const targetDate = urlDate ? new Date(urlDate) : new Date();
    const activities = getDashboardActivities(userId, targetDate);

    return {
        activities,
    };
};

export const actions: Actions = {
    createActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }
        return createActivity(
            { user: { id: session.user.id } },
            await event.request.formData()
        );
    },

    toggleActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }
        return toggleActivity(
            { user: { id: session.user.id } },
            await event.request.formData()
        );
    },
};
