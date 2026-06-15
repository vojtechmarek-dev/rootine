import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDashboardActivities } from '$lib/server/dashboard';
import { createActivity } from '$lib/server/actions/createActivity';
import { toggleActivity } from '$lib/server/actions/toggleActivity';
import { updateActivity } from '$lib/server/actions/updateActivity';
import { archiveActivity } from '$lib/server/actions/archiveActivity';
import { skipDay } from '$lib/server/actions/skipDay';
import { DrawerActivitySchema, ArchiveActivityFormSchema, type UpdateActivity } from '$lib/types/schemas';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';
import { tzTodayDate } from '$lib/utils/date';

export const load: PageServerLoad = async (event) => {
    const session = event.locals.session ?? (await event.locals.auth());
    if (!session?.user?.id) {
        throw redirect(303, '/login');
    }

    // Default to the user's LOCAL today (from the tz cookie), not the server's UTC
    // day — otherwise just-after-midnight loads show yesterday for users east of UTC.
    const urlDate = event.url.searchParams.get('date');
    const targetDate = urlDate ? new Date(urlDate) : tzTodayDate(event.cookies.get('tz'));
    return {
        session,
        dashboardPayload: getDashboardActivities(session.user.id, targetDate),
    };
};

export const actions: Actions = {
    createActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }

        const form = await superValidate(event.request, zod4(DrawerActivitySchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        if (form.data.id) {
            return fail(400, { form });
        }

        const createPayload = { ...form.data };
        if ('id' in createPayload) {
            delete createPayload.id;
        }

        const outcome = await createActivity({ user: { id: session.user.id } }, createPayload);
        if ('success' in outcome && outcome.success) {
            return message(form, 'Activity created.');
        }

        return outcome;
    },

    toggleActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }
        // Resolve "today" in the user's timezone so the backfill window and the
        // logged timestamp match the day they're actually viewing.
        const localToday = tzTodayDate(event.cookies.get('tz'));
        const urlDate = event.url.searchParams.get('date');
        const targetDate = urlDate ? new Date(urlDate) : localToday;

        return toggleActivity({ user: { id: session.user.id } }, await event.request.formData(), targetDate, localToday);
    },

    updateActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }

        const form = await superValidate(event.request, zod4(DrawerActivitySchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        if (!form.data.id) {
            return fail(400, { form });
        }

        const updatePayload = form.data as UpdateActivity;

        const outcome = await updateActivity({ user: { id: session.user.id } }, updatePayload);
        if ('success' in outcome && outcome.success) {
            return message(form, 'Activity updated.');
        }

        return outcome;
    },

    archiveActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }

        const form = await superValidate(event.request, zod4(ArchiveActivityFormSchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        return archiveActivity({ user: { id: session.user.id } }, form.data.id);
    },

    skipDay: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }

        return skipDay({ user: { id: session.user.id } }, await event.request.formData());
    },
};
