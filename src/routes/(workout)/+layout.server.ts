import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
    const session = event.locals.session ?? (await event.locals.auth());

    return {
        session,
    };
};
