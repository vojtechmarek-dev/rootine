import type { LayoutServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';
import { DrawerActivitySchema, getEmptyDrawerActivity } from '$lib/types/schemas';

export const load: LayoutServerLoad = async (event) => {
    const session = event.locals.session ?? (await event.locals.auth());

    const activityForm = await superValidate(getEmptyDrawerActivity(), zod4(DrawerActivitySchema));

    return {
        session,
        activityForm,
    };
};
