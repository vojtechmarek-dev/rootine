import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
    const session = event.locals.session ?? (await event.locals.auth());

    if (session) {
        throw redirect(303, '/');
    }

    return {};
};
