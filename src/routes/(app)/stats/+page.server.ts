import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getStatsData } from '$lib/server/stats';

export const load: PageServerLoad = async (event) => {
    const session = event.locals.session ?? (await event.locals.auth());
    if (!session?.user?.id) {
        throw redirect(303, '/login');
    }

    // Streamed (no `await`) so navigation is snappy — the page renders a skeleton
    // and fills in. Safe to stream here: this page has no enhanced forms.
    return {
        session,
        stats: getStatsData(session.user.id),
    };
};
