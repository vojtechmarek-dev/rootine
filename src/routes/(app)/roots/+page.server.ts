import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getGardenData } from '$lib/server/garden';

export const load: PageServerLoad = async (event) => {
    const session = event.locals.session ?? (await event.locals.auth());
    if (!session?.user?.id) {
        throw redirect(303, '/login');
    }

    return {
        session,
        gardenData: await getGardenData(session.user.id),
    };
};
