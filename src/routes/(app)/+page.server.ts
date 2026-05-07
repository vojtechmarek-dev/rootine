import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDashboardActivities } from '$lib/server/dashboard';
import { createActivity } from '$lib/server/actions/createActivity';
import { toggleActivity } from '$lib/server/actions/toggleActivity';
import { updateActivity } from '$lib/server/actions/updateActivity';
import { archiveActivity } from '$lib/server/actions/archiveActivity';
import { DrawerActivitySchema, ArchiveActivityFormSchema, type UpdateActivity } from '$lib/types/schemas';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async (event) => {
    const session = event.locals.session ?? (await event.locals.auth());
    if (!session?.user?.id) {
        throw redirect(303, '/login');
    }

    const urlDate = event.url.searchParams.get('date');
    const targetDate = urlDate ? new Date(urlDate) : new Date();
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
        const urlDate = event.url.searchParams.get('date');
        const targetDate = urlDate ? new Date(urlDate) : new Date();

        return toggleActivity({ user: { id: session.user.id } }, await event.request.formData(), targetDate);
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
};
